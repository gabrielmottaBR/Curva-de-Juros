export enum Maturity {
  JAN25 = 'DI1F25',
  JUL25 = 'DI1N25',
  JAN26 = 'DI1F26',
  JAN27 = 'DI1F27',
  JAN29 = 'DI1F29',
  JAN31 = 'DI1F31',
}

export interface MarketDataPoint {
  date: string;
  maturity: string;
  rate: number; // Annual Rate in % (e.g., 10.50)
  du: number; // Business Days to maturity
}

export interface HistoricalData {
  date: string;
  shortRate: number;
  longRate: number;
  spread: number; // Long - Short
}

export interface CalculationResult {
  puShort: number;
  puLong: number;
  dv01Short: number;
  dv01Long: number;
  currentSpread: number;
  meanSpread: number;
  stdDevSpread: number;
  zScore: number;
  cointegrationPValue: number; // Simplified ADF proxy
  hedgeRatio: number;
  recommendation: 'BUY SPREAD' | 'SELL SPREAD' | 'NEUTRAL';
}

export interface RiskParams {
  maxRiskBrl: number;
  stopLossBps: number;
  stressFactor: number; // Multiplier for stress testing
}

export interface Allocation {
  longContracts: number;
  shortContracts: number;
  exposureLong: number;
  exposureShort: number;
  estimatedMargin: number;
}

export interface Opportunity {
  id: string; // e.g., "DI1F25-DI1F27"
  shortId: string;
  longId: string;
  shortLabel: string;
  longLabel: string;
  zScore: number;
  currentSpread: number;
  recommendation: 'BUY SPREAD' | 'SELL SPREAD' | 'NEUTRAL';
  historicalData: HistoricalData[]; // Store data here to ensure consistency between list and detail view
}