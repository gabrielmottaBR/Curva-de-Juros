import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { calculateDetailedRisk } from '../analyzers/riskCalculator';
import { AVAILABLE_MATURITIES } from '../constants';
import { DetailedOpportunity, Opportunity } from '../types';

const router = Router();

router.get('/opportunities', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('opportunities_cache')
      .select('*')
      .order('calculated_at', { ascending: false });

    if (error) {
      console.error('Error fetching opportunities:', error);
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

    res.json({
      opportunities: sorted,
      mode: 'LIVE',
      count: sorted.length
    });

  } catch (err) {
    console.error('Unexpected error in GET /opportunities:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pair/:pairId', async (req: Request, res: Response) => {
  try {
    const { pairId } = req.params;

    const { data, error } = await supabase
      .from('opportunities_cache')
      .select('*')
      .eq('pair_id', pairId)
      .single();

    if (error || !data) {
      console.error('Error fetching pair details:', error);
      return res.status(404).json({ error: 'Pair not found' });
    }

    const details = JSON.parse(data.details_json);
    
    const opportunity: DetailedOpportunity = {
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
      recommendation: data.recommendation as 'BUY SPREAD' | 'SELL SPREAD' | 'NEUTRAL',
      historicalData: details.historicalData || [],
      puShort: 0,
      puLong: 0,
      dv01Short: 0,
      dv01Long: 0,
      hedgeRatio: 0
    };

    const riskMetrics = calculateDetailedRisk(opportunity);
    
    const response: DetailedOpportunity = {
      ...opportunity,
      ...riskMetrics
    };

    res.json(response);

  } catch (err) {
    console.error('Unexpected error in GET /pair/:pairId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/recalculate', async (req: Request, res: Response) => {
  try {
    const { recalculateOpportunities } = await import('../jobs/dailyCollection');
    await recalculateOpportunities();
    res.json({ success: true, message: 'Opportunities recalculated successfully' });
  } catch (err) {
    console.error('Error recalculating opportunities:', err);
    res.status(500).json({ error: 'Failed to recalculate opportunities' });
  }
});

export default router;
