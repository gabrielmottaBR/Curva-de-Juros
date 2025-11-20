export interface HistoricalData {
  date: string;
  shortRate: number;
  longRate: number;
  spread: number;
}

export interface Opportunity {
  id: string;
  shortId: string;
  longId: string;
  shortLabel: string;
  longLabel: string;
  zScore: number;
  currentSpread: number;
  recommendation: 'BUY SPREAD' | 'SELL SPREAD' | 'NEUTRAL';
  historicalData: HistoricalData[];
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
