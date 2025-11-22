import { FACE_VALUE, DAYS_IN_YEAR } from '../constants';
import { HistoricalData, RiskParams } from '../types';

// --- Financial Formulas ---

/**
 * Calculates the Unit Price (PU) of a DI1 contract.
 * @param ratePct Annual rate in percentage (e.g., 11.5 for 11.5%)
 * @param du Number of business days until maturity
 */
export const calculatePU = (ratePct: number, du: number): number => {
  const factor = 1 + (ratePct / 100);
  const power = du / DAYS_IN_YEAR;
  return FACE_VALUE / Math.pow(factor, power);
};

/**
 * Calculates the DV01 (Dollar Value of 1 basis point).
 * Uses Finite Difference Method: Abs(PU(rate) - PU(rate + 1bp))
 */
export const calculateDV01 = (ratePct: number, du: number): number => {
  const basePU = calculatePU(ratePct, du);
  const shockedPU = calculatePU(ratePct + 0.01, du); // +1 bp shock
  return Math.abs(basePU - shockedPU);
};

/**
 * Calculates the simple spread.
 */
export const calculateSpread = (longRate: number, shortRate: number): number => {
  return longRate - shortRate;
};

// --- Statistics ---

export const calculateMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
};

export const calculateStdDev = (values: number[], mean: number): number => {
  if (values.length < 2) return 0;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = calculateMean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
};

export const calculateZScore = (currentVal: number, mean: number, stdDev: number): number => {
  if (stdDev === 0) return 0;
  return (currentVal - mean) / stdDev;
};

/**
 * Simplified Cointegration Check (Proxy).
 * Real ADF (Augmented Dickey-Fuller) is complex for pure JS without heavy libs.
 * We use a correlation and mean-reversion speed proxy for this frontend demonstration.
 * Returns a "pseudo p-value" where < 0.05 suggests cointegration.
 */
export const checkCointegration = (shortRates: number[], longRates: number[]): number => {
  // 1. Calculate Spread series
  const spread = longRates.map((l, i) => l - shortRates[i]);
  
  // 2. Check for mean reversion by looking at zero crossings relative to mean
  const mean = calculateMean(spread);
  let crossings = 0;
  for (let i = 1; i < spread.length; i++) {
    if ((spread[i] - mean) * (spread[i-1] - mean) < 0) {
      crossings++;
    }
  }
  
  // Heuristic: More crossings = more stationary (mean reverting). 
  // In 100 days, < 5 crossings is bad (high p-value), > 20 is good (low p-value).
  const maxCrossings = 25;
  const pValueProxy = Math.max(0.01, 1 - (Math.min(crossings, maxCrossings) / maxCrossings));
  
  return Number(pValueProxy.toFixed(3));
};

// --- Risk Allocation ---

export const calculateAllocation = (
  riskParams: RiskParams,
  dv01Long: number,
  dv01Short: number,
  puLong?: number,
  puShort?: number
) => {
  const hedgeRatio = dv01Short === 0 ? 0 : dv01Long / dv01Short;
  
  // Theoretical Risk Calculation:
  // Risk = Contracts * DV01 * StopLossBps
  // ContractsLong = MaxRisk / (DV01_Long * StopLoss * Stress)
  
  const riskPerContract = dv01Long * riskParams.stopLossBps;
  
  if (riskPerContract <= 0 || riskParams.stressFactor <= 0) {
     return {
      hedgeRatio,
      longContracts: 0,
      shortContracts: 0,
      exposureLong: 0,
      exposureShort: 0,
      estimatedRisk: 0,
      estimatedMargin: 0
    };
  }

  // Max contracts allowed by risk budget
  // Uses maxRiskBrl and stressFactor from the RiskParams interface correctly now
  const longContractsRaw = riskParams.maxRiskBrl / (riskPerContract * riskParams.stressFactor);
  
  // Ensure unitary lots (integers)
  const longContracts = Math.floor(Math.max(0, longContractsRaw));
  
  // Hedge quantity
  const shortContractsRaw = longContracts * hedgeRatio;
  // Rounding to nearest integer for optimal hedge
  const shortContracts = Math.round(shortContractsRaw);

  // Calculate estimated margin requirement
  // B3 margin for DI1 futures ≈ 12% of notional value per contract
  // Margin = (Long Contracts × PU Long + Short Contracts × PU Short) × 12%
  let estimatedMargin = 0;
  if (puLong && puShort) {
    const MARGIN_RATE = 0.12; // 12% margin requirement (approximate)
    const notionalLong = longContracts * puLong;
    const notionalShort = shortContracts * puShort;
    estimatedMargin = (notionalLong + notionalShort) * MARGIN_RATE;
  }

  return {
    hedgeRatio,
    longContracts,
    shortContracts,
    exposureLong: 0, // Calculated in component using PU
    exposureShort: 0, // Calculated in component using PU
    estimatedRisk: longContracts * riskPerContract,
    estimatedMargin
  };
};