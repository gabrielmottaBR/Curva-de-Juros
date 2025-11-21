// api/pair/[pairId].js - Get pair details

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pairId } = req.query;

    const { data, error } = await supabase
      .from('opportunities_cache')
      .select('*')
      .eq('pair_id', pairId)
      .single();

    if (error || !data) {
      console.error('Error fetching pair details:', error);
      return res.status(404).json({ error: 'Pair not found' });
    }

    const details = JSON.parse(data.details_json || '{}');
    
    const response = {
      id: data.pair_id,
      shortId: data.short_id,
      longId: data.long_id,
      shortLabel: data.short_label,
      longLabel: data.long_label,
      zScore: data.z_score,
      currentSpread: data.current_spread,
      meanSpread: data.mean_spread,
      stdDevSpread: data.std_dev_spread,
      cointegrationPValue: data.cointegration_p_value || 0,
      recommendation: data.recommendation,
      historicalData: details.historicalData || [],
      puShort: details.puShort || 0,
      puLong: details.puLong || 0,
      dv01Short: details.dv01Short || 0,
      dv01Long: details.dv01Long || 0,
      hedgeRatio: details.hedgeRatio || 1
    };

    res.status(200).json(response);

  } catch (err) {
    console.error('Unexpected error in GET /api/pair/:pairId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
