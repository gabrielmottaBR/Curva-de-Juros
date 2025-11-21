// api/refresh.js - Lightweight recalculation using existing data

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('./_shared');
const {
  AVAILABLE_MATURITIES,
  calculatePU,
  calculateDV01,
  calculateMean,
  calculateStdDev,
  calculateZScore,
  checkCointegration
} = require('./utils');

// Get historical data from database
const getHistoricalData = async (supabase, contractCode, days = 100) => {
  const { data, error } = await supabase
    .from('di1_prices')
    .select('date, rate')
    .eq('contract_code', contractCode)
    .order('date', { ascending: false })
    .limit(days);

  if (error) {
    console.error(`[Refresh] Error fetching data for ${contractCode}:`, error);
    return [];
  }

  return (data || []).reverse();
};

// Scan opportunities
const scanOpportunities = async (supabase) => {
  const opportunities = [];
  
  for (let i = 0; i < AVAILABLE_MATURITIES.length; i++) {
    for (let j = i + 1; j < AVAILABLE_MATURITIES.length; j++) {
      const short = AVAILABLE_MATURITIES[i];
      const long = AVAILABLE_MATURITIES[j];

      const shortSeries = await getHistoricalData(supabase, short.id, 100);
      const longSeries = await getHistoricalData(supabase, long.id, 100);

      if (shortSeries.length === 0 || longSeries.length === 0) {
        continue;
      }

      const spreads = shortSeries.map((s, idx) => {
        if (idx >= longSeries.length) return null;
        return s.rate - longSeries[idx].rate;
      }).filter(s => s !== null);

      if (spreads.length < 20) continue;

      const meanSpread = calculateMean(spreads);
      const stdDevSpread = calculateStdDev(spreads);
      const currentSpread = spreads[spreads.length - 1];
      const zScore = calculateZScore(currentSpread, meanSpread, stdDevSpread);

      const shortRates = shortSeries.map(s => s.rate);
      const longRates = longSeries.map(s => s.rate);
      const cointegrationPValue = checkCointegration(shortRates, longRates);

      let recommendation = 'NEUTRO';
      if (zScore > 1.5) recommendation = 'VENDER SPREAD';
      else if (zScore < -1.5) recommendation = 'COMPRAR SPREAD';

      const latestShort = shortSeries[shortSeries.length - 1];
      const latestLong = longSeries[longSeries.length - 1];
      
      const puShort = calculatePU(latestShort.rate, short.du);
      const puLong = calculatePU(latestLong.rate, long.du);
      const dv01Short = calculateDV01(latestShort.rate, short.du);
      const dv01Long = calculateDV01(latestLong.rate, long.du);
      const hedgeRatio = dv01Short / dv01Long;

      const historicalData = shortSeries.map((s, idx) => ({
        date: s.date,
        shortRate: s.rate,
        longRate: longSeries[idx]?.rate || 0,
        spread: s.rate - (longSeries[idx]?.rate || 0)
      }));

      opportunities.push({
        pair_id: `${short.id}_${long.id}`,
        short_id: short.id,
        long_id: long.id,
        short_label: short.label,
        long_label: long.label,
        z_score: zScore,
        current_spread: currentSpread,
        mean_spread: meanSpread,
        std_dev_spread: stdDevSpread,
        cointegration_p_value: cointegrationPValue,
        recommendation,
        details_json: JSON.stringify({
          historicalData,
          puShort,
          puLong,
          dv01Short,
          dv01Long,
          hedgeRatio
        })
      });
    }
  }

  return opportunities;
};

// Update cache
const updateCache = async (supabase, opportunities) => {
  if (opportunities.length === 0) return 0;

  // Delete old cache
  await supabase.from('opportunities_cache').delete().neq('pair_id', '___DUMMY___');

  // Insert new cache
  const { error } = await supabase
    .from('opportunities_cache')
    .insert(opportunities.map(opp => ({
      ...opp,
      calculated_at: new Date().toISOString()
    })));

  if (error) {
    console.error('[Refresh] Error updating cache:', error);
    throw error;
  }

  return opportunities.length;
};

// Main handler
module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Refresh] Starting lightweight recalculation...');
    
    const supabase = getSupabaseClient();
    const opportunities = await scanOpportunities(supabase);
    const count = await updateCache(supabase, opportunities);

    console.log(`[Refresh] ✓ Updated ${count} opportunities`);

    res.status(200).json({
      success: true,
      message: 'Opportunities recalculated successfully',
      count,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[Refresh] Error:', err);
    res.status(500).json({ 
      error: 'Failed to refresh opportunities',
      message: err.message 
    });
  }
};
