import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pairId } = req.query;

    if (!pairId || typeof pairId !== 'string') {
      return res.status(400).json({ error: 'Invalid pair ID' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: opportunity, error } = await supabase
      .from('opportunities_cache')
      .select('*')
      .eq('pair_id', pairId)
      .single();

    if (error || !opportunity) {
      console.error(`Error fetching pair ${pairId}:`, error);
      return res.status(404).json({ error: 'Pair not found' });
    }

    const details = JSON.parse(opportunity.details_json || '{}');
    
    const response = {
      id: opportunity.pair_id,
      shortId: opportunity.short_id,
      longId: opportunity.long_id,
      shortLabel: opportunity.short_label,
      longLabel: opportunity.long_label,
      currentSpread: opportunity.current_spread,
      zScore: opportunity.z_score,
      recommendation: opportunity.recommendation,
      meanSpread: opportunity.mean_spread,
      stdDevSpread: opportunity.std_dev_spread,
      cointegrationPValue: opportunity.cointegration_p_value || 0,
      historicalData: details.historicalData || [],
      puShort: details.puShort || 0,
      puLong: details.puLong || 0,
      dv01Short: details.dv01Short || 0,
      dv01Long: details.dv01Long || 0,
      hedgeRatio: details.hedgeRatio || 1
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in pair endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
