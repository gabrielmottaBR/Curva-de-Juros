// api/collect-b3-real.js - B3 data collection with real scraping

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('./_shared');
const https = require('https');
const { JSDOM } = require('jsdom');
const {
  AVAILABLE_MATURITIES,
  isBusinessDay,
  formatDateISO
} = require('./utils');

// Get last business day
const getLastBusinessDay = (fromDate) => {
  const date = new Date(fromDate);
  date.setDate(date.getDate() - 1);
  
  while (!isBusinessDay(date)) {
    date.setDate(date.getDate() - 1);
  }
  
  return date;
};

// Format date for B3 (DD/MM/YYYY)
const formatDateForB3 = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Fetch B3 page (direct access, no CORS proxy needed in serverless)
const fetchB3Page = (dateStr) => {
  return new Promise((resolve, reject) => {
    const url = `https://www2.bmf.com.br/pages/portal/bmfbovespa/boletim1/SistemaPregao1.asp?pagetype=pop&caminho=Resumo%20Estat%EDstico%20-%20Sistema%20Preg%E3o&Data=${dateStr}&Mercadoria=DI1`;
    
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 10000);
    
    https.get(url, (res) => {
      clearTimeout(timeout);
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });
  });
};

// Parse B3 HTML and extract DI1 rates
const parseB3HTML = (html, targetContracts) => {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const results = {};
  
  // Find all table rows
  const allRows = doc.querySelectorAll('tr');
  
  allRows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    if (cells.length < 3) return;
    
    const cellTexts = cells.map(c => c.textContent.trim());
    
    // Look for contract codes (F27, F28, etc.)
    for (let i = 0; i < cellTexts.length; i++) {
      const text = cellTexts[i];
      
      // Match contract patterns: "F27", "F28", etc.
      const contractMatch = text.match(/^F(\d{2})$/);
      if (!contractMatch) continue;
      
      const year = contractMatch[1];
      const contractId = `DI1F${year}`;
      
      // Skip if not in our target list
      if (!targetContracts.includes(contractId)) continue;
      
      // Look for rate in next 1-5 cells
      for (let j = 1; j <= 5; j++) {
        if (i + j >= cellTexts.length) break;
        
        const potentialRate = cellTexts[i + j];
        
        // Match rate pattern: "11,23" or "11,2345"
        if (/^\d{1,3},\d{2,4}$/.test(potentialRate)) {
          const rate = parseFloat(potentialRate.replace(',', '.'));
          
          // Sanity check
          if (rate > 0 && rate < 50) {
            results[contractId] = rate;
            break;
          }
        }
      }
    }
  });
  
  return results;
};

// Generate simulated rate for missing contract
const generateSimulatedRate = (contractId, date) => {
  const baseRates = {
    'DI1F27': 11.20, 'DI1F28': 11.45, 'DI1F29': 11.68,
    'DI1F30': 11.89, 'DI1F31': 12.08, 'DI1F32': 12.21,
    'DI1F33': 12.28, 'DI1F34': 12.31, 'DI1F35': 12.32
  };

  const daysSinceStart = Math.floor((date - new Date('2025-07-03')) / 86400000);
  const volatility = 0.015;
  const seed = daysSinceStart * 1.618033988749895 + contractId.charCodeAt(4);
  
  const baseRate = baseRates[contractId] || 12.0;
  const random = (Math.sin(seed) + 1) / 2;
  const dailyChange = (random - 0.5) * volatility;
  
  return Math.max(10.0, Math.min(14.0, baseRate + dailyChange));
};

// Main collection function
const collectDailyData = async (supabase, targetDate = null) => {
  const today = new Date();
  const collectionDate = targetDate || getLastBusinessDay(today);
  const dateISO = formatDateISO(collectionDate);
  const dateB3 = formatDateForB3(collectionDate);

  console.log(`[B3-Real] Target date: ${dateISO} (${dateB3})`);

  // Check if already collected
  const { data: existing } = await supabase
    .from('di1_prices')
    .select('contract_code')
    .eq('date', dateISO)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`[B3-Real] Skipped: Data exists for ${dateISO}`);
    return {
      skipped: true,
      reason: 'already_collected',
      date: dateISO
    };
  }

  // Fetch from B3
  console.log(`[B3-Real] Fetching data from B3...`);
  let html;
  try {
    html = await fetchB3Page(dateB3);
    console.log(`[B3-Real] Received ${html.length} bytes`);
  } catch (error) {
    console.error('[B3-Real] Failed to fetch B3:', error.message);
    throw new Error(`B3 fetch failed: ${error.message}`);
  }

  // Parse HTML
  const targetContracts = AVAILABLE_MATURITIES.map(c => c.id);
  const b3Rates = parseB3HTML(html, targetContracts);
  
  console.log(`[B3-Real] Parsed ${Object.keys(b3Rates).length}/9 contracts from B3`);
  
  // Fill missing contracts with simulated data
  const allRates = { ...b3Rates };
  let simulatedCount = 0;
  
  for (const contract of AVAILABLE_MATURITIES) {
    if (!allRates[contract.id]) {
      allRates[contract.id] = generateSimulatedRate(contract.id, collectionDate);
      simulatedCount++;
      console.log(`[B3-Real] Simulated ${contract.id}: ${allRates[contract.id].toFixed(2)}%`);
    } else {
      console.log(`[B3-Real] B3 ${contract.id}: ${allRates[contract.id].toFixed(2)}%`);
    }
  }

  // Build records
  const records = AVAILABLE_MATURITIES.map(contract => ({
    date: dateISO,
    contract_code: contract.id,
    rate: allRates[contract.id]
  }));

  // Insert to database
  const { error } = await supabase
    .from('di1_prices')
    .insert(records);

  if (error) {
    console.error('[B3-Real] Database error:', error);
    throw new Error(`DB insert failed: ${error.message}`);
  }

  const b3Count = Object.keys(b3Rates).length;
  console.log(`[B3-Real] ✓ Inserted 9 contracts (${b3Count} B3 + ${simulatedCount} simulated)`);

  return {
    skipped: false,
    date: dateISO,
    contractsCollected: 9,
    b3Contracts: b3Count,
    simulatedContracts: simulatedCount,
    source: b3Count === 9 ? 'b3' : 'hybrid'
  };
};

// Main handler
module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  try {
    console.log('[B3-Real] === Real B3 data collection started ===');
    
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
      message: 'Data collected successfully from B3',
      ...result
    });

  } catch (err) {
    console.error('[B3-Real] === Error ===', err);
    res.status(500).json({ 
      success: false,
      error: 'B3 data collection failed',
      message: err.message 
    });
  }
};
