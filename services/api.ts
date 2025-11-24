import { Opportunity } from '../types';

// Use relative path /api for all environments
// Works with Vite proxy in development and same-origin requests in production
const API_BASE_URL = '/api';

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

export interface RealTimeSpread {
  shortRate: number;
  longRate: number;
  spread: number;
  timestamp: string;
}

export const fetchRealTimeSpread = async (shortId: string, longId: string): Promise<RealTimeSpread | null> => {
  try {
    const response = await fetch('https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1', {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn('Failed to fetch real-time data from B3 API');
      return null;
    }

    const data = await response.json();
    
    if (!data.Scty || !Array.isArray(data.Scty)) {
      console.warn('Invalid B3 API response format');
      return null;
    }

    const shortContract = data.Scty.find((s: any) => s.symb === shortId);
    const longContract = data.Scty.find((s: any) => s.symb === longId);
    
    if (!shortContract?.SctyQtn?.curPrc || !longContract?.SctyQtn?.curPrc) {
      console.warn('Contract prices not found in B3 API response');
      return null;
    }

    const shortRate = shortContract.SctyQtn.curPrc;
    const longRate = longContract.SctyQtn.curPrc;
    const spread = (shortRate - longRate) * 100;

    return {
      shortRate,
      longRate,
      spread,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching real-time spread from B3:', error);
    return null;
  }
};
