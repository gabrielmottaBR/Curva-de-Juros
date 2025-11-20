import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface DI1Price {
  id?: number;
  contract_code: string;
  date: string;
  rate: number;
  price?: number;
  volume?: number;
  created_at?: string;
}

export interface OpportunityCache {
  id?: number;
  pair_id: string;
  short_id: string;
  long_id: string;
  short_label: string;
  long_label: string;
  z_score: number;
  current_spread: number;
  mean_spread: number;
  std_dev_spread: number;
  recommendation: string;
  cointegration_p_value?: number;
  calculated_at?: string;
  details_json: string;
}
