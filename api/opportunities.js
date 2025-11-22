// api/opportunities.js - List all opportunities

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('../lib/_shared');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { metadata } = req.query;
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

    const response = {
      success: true,
      opportunities: sorted,
      mode: 'LIVE',
      count: sorted.length
    };

    // Adicionar metadata se solicitado
    if (metadata === 'true' && data && data.length > 0) {
      const dates = data.map(row => row.calculated_at?.substring(0, 10) || row.date).filter(Boolean);
      dates.sort();
      
      response.metadata = {
        oldest_date: dates[0],
        latest_date: dates[dates.length - 1],
        total_days: dates.length
      };
    }

    res.status(200).json(response);

  } catch (err) {
    console.error('[Opportunities API] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
