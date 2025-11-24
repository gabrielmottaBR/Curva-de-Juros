// api/refresh.js - Lightweight recalculation using existing data

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('../lib/_shared');
const {
  AVAILABLE_MATURITIES,
  calculatePU,
  calculateDV01,
  calculateMean,
  calculateStdDev,
  calculateZScore,
  checkCointegration
} = require('../lib/utils');

// Get historical data from database
const getHistoricalData = async (supabase, contractCode, days = 60) => {
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

      const LOOKBACK = 30; // Lookback window for z-score calculation (optimized)
      const shortSeries = await getHistoricalData(supabase, short.id, LOOKBACK + 10);
      const longSeries = await getHistoricalData(supabase, long.id, LOOKBACK + 10);

      if (shortSeries.length === 0 || longSeries.length === 0) {
        continue;
      }

      // Align series by date before calculating spreads
      const longByDate = new Map(longSeries.map(l => [l.date, l.rate]));
      const spreads = shortSeries
        .filter(s => longByDate.has(s.date))
        .map(s => (s.rate - longByDate.get(s.date)) * 100);

      if (spreads.length < 20) continue;

      // Use only last LOOKBACK days for z-score calculation
      const recentSpreads = spreads.slice(-LOOKBACK);
      const currentSpread = recentSpreads[recentSpreads.length - 1];
      
      // Calculate raw stats in same scale as spreads (already in bps)
      const rawMean = calculateMean(recentSpreads);
      const rawStdDev = calculateStdDev(recentSpreads, rawMean);
      
      // Z-score calculation (all values in bps)
      const zScore = calculateZScore(currentSpread, rawMean, rawStdDev);
      
      // Store stats in bps for consistency
      const meanSpread = rawMean;
      const stdDevSpread = rawStdDev;

      const shortRates = shortSeries.map(s => s.rate);
      const longRates = longSeries.map(s => s.rate);
      const cointegrationPValue = checkCointegration(shortRates, longRates);

      // Z-score interpretation:
      // Z > 1.5: Spread is HIGH (above mean) → expect reversion DOWN → SELL SPREAD
      // Z < -1.5: Spread is LOW (below mean) → expect reversion UP → BUY SPREAD
      let recommendation = 'NEUTRAL';
      if (zScore > 1.5) recommendation = 'SELL SPREAD';
      else if (zScore < -1.5) recommendation = 'BUY SPREAD';

      const latestShort = shortSeries[shortSeries.length - 1];
      const latestLong = longSeries[longSeries.length - 1];
      
      const puShort = calculatePU(latestShort.rate, short.defaultDu);
      const puLong = calculatePU(latestLong.rate, long.defaultDu);
      const dv01Short = calculateDV01(latestShort.rate, short.defaultDu);
      const dv01Long = calculateDV01(latestLong.rate, long.defaultDu);
      const hedgeRatio = dv01Short === 0 ? 0 : dv01Long / dv01Short;

      // Build historical data aligned by date
      const historicalData = shortSeries
        .filter(s => longByDate.has(s.date))
        .map(s => ({
          date: s.date,
          shortRate: s.rate,
          longRate: longByDate.get(s.date),
          spread: (s.rate - longByDate.get(s.date)) * 100
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
