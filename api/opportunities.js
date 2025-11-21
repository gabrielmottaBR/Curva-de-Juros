// api/opportunities.js - List all opportunities

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('./_shared');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('opportunities_cache')
      .select('*')
      .order('calculated_at', { ascending: false });

    if (error) {
      console.error('[Opportunities API] Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch opportunities' });
    }

    const opportunities = (data || []).map(row => ({
      id: row.pair_id,
      shortId: row.short_id,
      longId: row.long_id,
      shortLabel: row.short_label,
      longLabel: row.long_label,
      zScore: row.z_score,
      currentSpread: row.current_spread,
      recommendation: row.recommendation,
      historicalData: []
    }));

    const sorted = opportunities.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

    res.status(200).json({
      opportunities: sorted,
      mode: 'LIVE',
      count: sorted.length
    });

  } catch (err) {
    console.error('[Opportunities API] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
