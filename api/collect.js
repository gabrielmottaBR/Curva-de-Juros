// api/collect.js - Data Collection Endpoint (Vercel serverless)
// Ported from server/jobs/dailyCollection.ts + opportunityScanner.ts + riskCalculator.ts

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('./_shared');
const { JSDOM } = require('jsdom');
const {
  AVAILABLE_MATURITIES,
  calculatePU,
  calculateDV01,
  calculateMean,
  calculateStdDev,
  calculateZScore,
  checkCointegration,
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
      console.warn(`B3 fetch failed for ${dateStr}: HTTP ${response.status}`);
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
    console.error(`Error fetching B3 data for ${dateStr}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
};

// Get historical data from database
const getHistoricalDataFromDB = async (supabase, contractCode, days = 100) => {
  const { data, error } = await supabase
    .from('di1_prices')
    .select('date, rate')
    .eq('contract_code', contractCode)
    .order('date', { ascending: false })
    .limit(days);

  if (error) {
    console.error(`Error fetching historical data for ${contractCode}:`, error);
    return [];
  }

  const records = (data || []).map(row => ({
    date: row.date,
    rate: row.rate
  }));

  return records.reverse();
};

// Scan opportunities
const scanOpportunities = async (supabase) => {
  const opportunities = [];
  
  for (let i = 0; i < AVAILABLE_MATURITIES.length; i++) {
    for (let j = i + 1; j < AVAILABLE_MATURITIES.length; j++) {
      const short = AVAILABLE_MATURITIES[i];
      const long = AVAILABLE_MATURITIES[j];

      const shortSeries = await getHistoricalDataFromDB(supabase, short.id, 100);
      const longSeries = await getHistoricalDataFromDB(supabase, long.id, 100);

      if (shortSeries.length === 0 || longSeries.length === 0) {
        console.warn(`No data for pair ${short.id} - ${long.id}`);
        continue;
      }

      const combinedHistory = [];
      const minLen = Math.min(shortSeries.length, longSeries.length);
      
      for (let k = 0; k < minLen; k++) {
        const sRate = shortSeries[k].rate;
        const lRate = longSeries[k].rate;
        
        combinedHistory.push({
          date: shortSeries[k].date,
          shortRate: sRate,
          longRate: lRate,
          spread: parseFloat((lRate - sRate).toFixed(2))
        });
      }

      if (combinedHistory.length < 10) {
        console.warn(`Insufficient data for pair ${short.id} - ${long.id}: only ${combinedHistory.length} points`);
        continue;
      }

      const spreads = combinedHistory.map(d => d.spread);
      const mean = calculateMean(spreads);
      const stdDev = calculateStdDev(spreads, mean);
      const currentSpread = spreads[spreads.length - 1];
      const zScore = calculateZScore(currentSpread, mean, stdDev);

      let recommendation = 'NEUTRAL';
      if (zScore < -1.5) recommendation = 'BUY SPREAD';
      if (zScore > 1.5) recommendation = 'SELL SPREAD';

      opportunities.push({
        id: `${short.id}-${long.id}`,
        shortId: short.id,
        longId: long.id,
        shortLabel: short.label.split(' ')[2].replace('(', '').replace(')', ''),
        longLabel: long.label.split(' ')[2].replace('(', '').replace(')', ''),
        zScore,
        currentSpread,
        recommendation,
        historicalData: combinedHistory
      });
    }
  }

  return opportunities.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
};

// Calculate detailed metrics
const calculateDetailedMetrics = (opp) => {
  const spreads = opp.historicalData.map(d => d.spread);
  const meanSpread = calculateMean(spreads);
  const stdDevSpread = calculateStdDev(spreads, meanSpread);
  
  const shorts = opp.historicalData.map(d => d.shortRate);
  const longs = opp.historicalData.map(d => d.longRate);
  const cointegrationPValue = checkCointegration(shorts, longs);

  return {
    meanSpread,
    stdDevSpread,
    cointegrationPValue
  };
};

// Calculate risk metrics
const calculateDetailedRisk = (opportunity) => {
  const latest = opportunity.historicalData[opportunity.historicalData.length - 1];
  const shortConfig = AVAILABLE_MATURITIES.find(m => m.id === opportunity.shortId);
  const longConfig = AVAILABLE_MATURITIES.find(m => m.id === opportunity.longId);

  const puShort = calculatePU(latest.shortRate, shortConfig.defaultDu);
  const puLong = calculatePU(latest.longRate, longConfig.defaultDu);
  const dv01Short = calculateDV01(latest.shortRate, shortConfig.defaultDu);
  const dv01Long = calculateDV01(latest.longRate, longConfig.defaultDu);

  const hedgeRatio = dv01Short === 0 ? 0 : dv01Long / dv01Short;

  return {
    puShort,
    puLong,
    dv01Short,
    dv01Long,
    hedgeRatio
  };
};

// Recalculate opportunities
const recalculateOpportunities = async (supabase) => {
  console.log('[Collect] Recalculating opportunities...');

  const opportunities = await scanOpportunities(supabase);
  
  if (opportunities.length === 0) {
    console.warn('[Collect] No opportunities calculated.');
    return 0;
  }

  const cacheRecords = [];
  
  for (const opp of opportunities) {
    const metrics = calculateDetailedMetrics(opp);
    
    const oppWithMetrics = {
      ...opp,
      ...metrics
    };
    
    const riskMetrics = calculateDetailedRisk(oppWithMetrics);
    
    cacheRecords.push({
      pair_id: opp.id,
      short_id: opp.shortId,
      long_id: opp.longId,
      short_label: opp.shortLabel,
      long_label: opp.longLabel,
      z_score: opp.zScore,
      current_spread: opp.currentSpread,
      mean_spread: metrics.meanSpread,
      std_dev_spread: metrics.stdDevSpread,
      recommendation: opp.recommendation,
      cointegration_p_value: metrics.cointegrationPValue,
      calculated_at: new Date().toISOString(),
      details_json: JSON.stringify({
        historicalData: opp.historicalData,
        meanSpread: metrics.meanSpread,
        stdDevSpread: metrics.stdDevSpread,
        cointegrationPValue: metrics.cointegrationPValue,
        puShort: riskMetrics.puShort || 0,
        puLong: riskMetrics.puLong || 0,
        dv01Short: riskMetrics.dv01Short || 0,
        dv01Long: riskMetrics.dv01Long || 0,
        hedgeRatio: riskMetrics.hedgeRatio || 1
      })
    });
  }

  const { error } = await supabase
    .from('opportunities_cache')
    .upsert(cacheRecords, {
      onConflict: 'pair_id',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('[Collect] Error updating opportunities cache:', error);
    throw error;
  }

  console.log(`[Collect] ✓ Updated ${cacheRecords.length} opportunities in cache`);
  return cacheRecords.length;
};

// Collect daily data
const collectDailyData = async (supabase) => {
  const today = new Date();
  
  // Check if collection should start (21/11/2025)
  const startDate = new Date('2025-11-21T00:00:00-03:00');
  if (today < startDate) {
    console.log(`[Collect] Scheduled start date is ${startDate.toLocaleDateString('pt-BR')}. Skipping collection.`);
    return { skipped: true, reason: 'before_start_date' };
  }
  
  // Check if business day
  if (!isBusinessDay(today)) {
    console.log('[Collect] Today is not a business day. Skipping data collection.');
    return { skipped: true, reason: 'not_business_day' };
  }

  console.log(`[Collect] Starting daily data collection for ${formatDateISO(today)}...`);

  // Fetch rates from B3
  const rates = await fetchB3DailyRates(today);
  
  if (!rates || Object.keys(rates).length === 0) {
    console.warn('[Collect] No data available from B3. Skipping collection.');
    return { skipped: true, reason: 'no_b3_data' };
  }

  // Prepare records
  const records = [];
  
  for (const maturity of AVAILABLE_MATURITIES) {
    const rate = rates[maturity.id];
    if (rate && rate > 0) {
      records.push({
        contract_code: maturity.id,
        date: formatDateISO(today),
        rate: rate
      });
    }
  }

  // Insert into database
  if (records.length > 0) {
    const { error } = await supabase
      .from('di1_prices')
      .upsert(records, {
        onConflict: 'contract_code,date',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('[Collect] Error inserting daily data:', error);
      throw error;
    }

    console.log(`[Collect] ✓ Inserted ${records.length} contracts for ${formatDateISO(today)}`);
  }

  // Recalculate opportunities
  const opportunitiesCount = await recalculateOpportunities(supabase);

  return {
    skipped: false,
    pricesCollected: records.length,
    opportunitiesAnalyzed: opportunitiesCount
  };
};

// Main handler (Vercel serverless function)
module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  try {
    console.log('[Collect] Data collection triggered');
    
    const supabase = getSupabaseClient();
    const result = await collectDailyData(supabase);
    
    if (result.skipped) {
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: result.reason,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      success: true,
      pricesCollected: result.pricesCollected,
      opportunitiesAnalyzed: result.opportunitiesAnalyzed,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Collect] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
