import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/opportunities', async (req: Request, res: Response) => {
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
    console.error('Unexpected error in GET /api/opportunities:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/pair/:pairId', async (req: Request, res: Response) => {
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

    res.json(response);

  } catch (err) {
    console.error('Unexpected error in GET /api/pair/:pairId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/recalculate', async (req: Request, res: Response) => {
  try {
    res.json({ 
      success: true, 
      message: 'Recalculation is handled by scheduled job on Replit backend',
      note: 'Data is refreshed daily at 21:00 Brasília time'
    });
  } catch (err) {
    console.error('Error in recalculate endpoint:', err);
    res.status(500).json({ error: 'Failed to recalculate opportunities' });
  }
});

export default app;
