import { Opportunity } from '../types';

// Use Vercel API directly (backend is 100% serverless now)
const API_BASE_URL = 'https://curvadejuros.vercel.app/api';

export interface ScanResult {
  opportunities: Opportunity[];
  mode: 'LIVE' | 'SIMULATED';
}

export interface DetailedOpportunity extends Opportunity {
  meanSpread: number;
  stdDevSpread: number;
  cointegrationPValue: number;
  puShort: number;
  puLong: number;
  dv01Short: number;
  dv01Long: number;
  hedgeRatio: number;
}

export const fetchOpportunities = async (
  onProgress?: (percent: number, status: string) => void
): Promise<ScanResult> => {
  try {
    if (onProgress) {
      onProgress(10, 'Conectando ao servidor...');
    }

    const response = await fetch(`${API_BASE_URL}/opportunities`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch opportunities: ${response.statusText}`);
    }

    if (onProgress) {
      onProgress(50, 'Recebendo dados...');
    }

    const data = await response.json();
    
    if (onProgress) {
      onProgress(100, 'Concluído');
    }

    return {
      opportunities: data.opportunities || [],
      mode: data.mode || 'LIVE'
    };
  } catch (error) {
    console.error('Error fetching opportunities from backend:', error);
    if (onProgress) {
      onProgress(0, 'Erro na conexão');
    }
    throw error;
  }
};

export const fetchPairDetails = async (pairId: string): Promise<DetailedOpportunity> => {
  try {
    const response = await fetch(`${API_BASE_URL}/pair/${pairId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch pair details: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching details for pair ${pairId}:`, error);
    throw error;
  }
};

export const triggerRecalculation = async (): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/recalculate`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to trigger recalculation: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error triggering recalculation:', error);
    throw error;
  }
};
