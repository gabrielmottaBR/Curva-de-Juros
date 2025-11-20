import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ 
        error: 'Server configuration error',
        mode: 'ERROR'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cachedOpportunities, error: cacheError } = await supabase
      .from('opportunities_cache')
      .select('*')
      .order('z_score', { ascending: false });

    if (cacheError) {
      console.error('Error fetching from cache:', cacheError);
      return res.status(500).json({ 
        error: 'Database error',
        mode: 'ERROR'
      });
    }

    if (!cachedOpportunities || cachedOpportunities.length === 0) {
      console.log('No cached opportunities found');
      return res.status(200).json({
        opportunities: [],
        count: 0,
        mode: 'LIVE',
        timestamp: new Date().toISOString()
      });
    }

    const opportunities = cachedOpportunities.map(row => ({
      id: row.pair_id,
      shortId: row.short_id,
      longId: row.long_id,
      shortLabel: row.short_label,
      longLabel: row.long_label,
      currentSpread: row.current_spread,
      zScore: row.z_score,
      recommendation: row.recommendation,
      historicalData: []
    }));

    const sorted = opportunities.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

    return res.status(200).json({
      opportunities: sorted,
      count: sorted.length,
      mode: 'LIVE'
    });

  } catch (error) {
    console.error('Error in opportunities endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      mode: 'ERROR'
    });
  }
}
