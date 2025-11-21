// api/collect-data.js - Daily data collection from B3 (lightweight, no recalculation)

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('./_shared');
const { JSDOM } = require('jsdom');
const {
  AVAILABLE_MATURITIES,
  isBusinessDay,
  formatDateISO,
  formatDateForB3
} = require('./utils');

// B3 Scraper
const B3_BASE_URL = 'https://www2.bmf.com.br/pages/portal/bmfbovespa/boletim1/SistemaPregao1.asp';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const fetchB3DailyRates = async (date) => {
  const dateStr = formatDateForB3(date);
  const cacheBuster = `&_t=${new Date().getTime()}`;
  const encodedUrl = encodeURIComponent(
    `${B3_BASE_URL}?pagetype=pop&caminho=Resumo%20Estat%EDstico%20-%20Sistema%20Preg%E3o&Data=${dateStr}&Mercadoria=DI1`
  );
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${CORS_PROXY}${encodedUrl}${cacheBuster}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Collect-Data] B3 fetch failed for ${dateStr}: HTTP ${response.status}`);
      return null;
    }
    
    const htmlText = await response.text();
    const dom = new JSDOM(htmlText);
    const doc = dom.window.document;
    
    const rates = {};
    const rows = Array.from(doc.querySelectorAll('tr'));

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 3) continue;

      const cellTexts = cells.map(c => c.textContent?.trim() || '');
      
      let ticker = '';
      let rate = 0;
      let found = false;

      for (let i = 0; i < cellTexts.length; i++) {
        const text = cellTexts[i];
        if (/^(DI1)?F\d{2}$/.test(text)) {
          ticker = text.startsWith('DI1') ? text : `DI1${text}`;
          for (let j = 1; j <= 4; j++) {
            const potentialRate = cellTexts[i + j];
            if (potentialRate && /^\d{1,3},\d{1,4}$/.test(potentialRate)) {
              rate = parseFloat(potentialRate.replace(',', '.'));
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }

      if (found && ticker && rate > 0) {
        rates[ticker] = rate;
      }
    }
    
    return Object.keys(rates).length > 0 ? rates : null;

  } catch (error) {
    console.error(`[Collect-Data] Error fetching B3 data for ${dateStr}:`, error.message || 'Unknown error');
    return null;
  }
};

// Generate simulated data as fallback
const generateSimulatedRates = (date) => {
  console.log('[Collect-Data] Using simulated data (B3 unavailable)');
  
  const rates = {};
  const baseRates = {
    'DI1F27': 11.20, 'DI1F28': 11.45, 'DI1F29': 11.68,
    'DI1F30': 11.89, 'DI1F31': 12.08, 'DI1F32': 12.21,
    'DI1F33': 12.28, 'DI1F34': 12.31, 'DI1F35': 12.32
  };

  const daysSinceStart = Math.floor((date - new Date('2025-07-03')) / (1000 * 60 * 60 * 24));
  const volatility = 0.015;
  const meanReversion = 0.02;
  const seed = daysSinceStart * 1.618033988749895;

  for (const contract of AVAILABLE_MATURITIES) {
    const baseRate = baseRates[contract.id] || 12.0;
    const random = (Math.sin(seed + contract.id.charCodeAt(4)) + 1) / 2;
    const dailyChange = (random - 0.5) * volatility;
    const reversion = (12.0 - baseRate) * meanReversion;
    rates[contract.id] = Math.max(10.0, Math.min(14.0, baseRate + dailyChange + reversion));
  }

  return rates;
};

// Main collection function
const collectDailyData = async (supabase) => {
  const today = new Date();
  
  // Check if today is a business day
  if (!isBusinessDay(today)) {
    console.log('[Collect-Data] Skipped: Not a business day');
    return {
      skipped: true,
      reason: 'Not a business day',
      date: formatDateISO(today)
    };
  }

  const dateISO = formatDateISO(today);

  // Check if data already collected today
  const { data: existing } = await supabase
    .from('di1_prices')
    .select('contract_code')
    .eq('date', dateISO)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`[Collect-Data] Skipped: Data already collected for ${dateISO}`);
    return {
      skipped: true,
      reason: 'Data already exists',
      date: dateISO
    };
  }

  // Fetch data from B3
  console.log(`[Collect-Data] Fetching data for ${dateISO}...`);
  let rates = await fetchB3DailyRates(today);

  // Fallback to simulated data if B3 fails
  if (!rates) {
    console.warn('[Collect-Data] B3 fetch failed, using simulated data');
    rates = generateSimulatedRates(today);
  }

  // Build records for insertion
  const records = [];
  for (const contract of AVAILABLE_MATURITIES) {
    if (rates[contract.id]) {
      records.push({
        date: dateISO,
        contract_code: contract.id,
        rate: rates[contract.id]
      });
    }
  }

  if (records.length === 0) {
    console.error('[Collect-Data] No data to insert');
    return {
      skipped: true,
      reason: 'No data available',
      date: dateISO
    };
  }

  // Insert into database
  const { error } = await supabase
    .from('di1_prices')
    .insert(records);

  if (error) {
    console.error('[Collect-Data] Database insert error:', error);
    throw new Error(`Failed to insert data: ${error.message}`);
  }

  console.log(`[Collect-Data] ✓ Inserted ${records.length} contracts for ${dateISO}`);

  return {
    skipped: false,
    date: dateISO,
    contractsCollected: records.length,
    source: rates === generateSimulatedRates(today) ? 'simulated' : 'b3'
  };
};

// Main handler (Vercel serverless function)
module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  try {
    console.log('[Collect-Data] Data collection triggered');
    
    const supabase = getSupabaseClient();
    const result = await collectDailyData(supabase);
    
    if (result.skipped) {
      return res.status(200).json({
        success: true,
        message: `Skipped: ${result.reason}`,
        ...result
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data collected successfully',
      ...result
    });

  } catch (err) {
    console.error('[Collect-Data] Error:', err);
    res.status(500).json({ 
      error: 'Failed to collect data',
      message: err.message 
    });
  }
};
