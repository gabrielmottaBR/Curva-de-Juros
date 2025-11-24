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

// --- B3 Margin Calculation (Real Data) ---

/**
 * B3 Margin Lookup Table
 * Based on real simulations from simulador.b3.com.br (November 2025)
 * 
 * Data points:
 * - F27 vs F28 (1y): 15 short + 12 long = R$ 18.434,83
 * - F27 vs F29 (2y): 15 short + 10 long = R$ 22.820,20
 * - F27 vs F30 (3y): 16 short + 10 long = R$ 29.716,04
 * - F27 vs F31 (4y): 15 short + 9 long = R$ 30.505,72
 * - F27 vs F32 (5y): 15 short + 9 long = R$ 32.021,53
 */
interface MarginTableEntry {
  yearDiff: number;
  baseMarginPerShort: number;
  imbalanceFactor: number;
}

const B3_MARGIN_TABLE: MarginTableEntry[] = [
  { yearDiff: 1, baseMarginPerShort: 1129, imbalanceFactor: 500 },
  { yearDiff: 2, baseMarginPerShort: 1355, imbalanceFactor: 500 },
  { yearDiff: 3, baseMarginPerShort: 1670, imbalanceFactor: 500 },
  { yearDiff: 4, baseMarginPerShort: 1834, imbalanceFactor: 500 },
  { yearDiff: 5, baseMarginPerShort: 1935, imbalanceFactor: 500 },
];

/**
 * Calculates estimated B3 margin requirement for DI1 spread positions
 * Uses lookup table based on real B3 simulator data
 * 
 * PRECISION:
 * - 99.99% accuracy for tested cases (yearDiff 1-5)
 * - Interpolated values for yearDiff outside 1-5 range (lower precision)
 * 
 * @param shortContracts Number of short contracts
 * @param longContracts Number of long contracts  
 * @param shortMaturity Short leg maturity (e.g., "DI1F27")
 * @param longMaturity Long leg maturity (e.g., "DI1F28")
 * @returns Estimated margin in BRL
 */
export const calculateB3Margin = (
  shortContracts: number,
  longContracts: number,
  shortMaturity: string,
  longMaturity: string
): number => {
  if (shortContracts === 0 && longContracts === 0) return 0;

  const shortYearStr = shortMaturity.match(/(\d{2})$/)?.[1];
  const longYearStr = longMaturity.match(/(\d{2})$/)?.[1];
  
  if (!shortYearStr || !longYearStr) {
    console.warn(`Invalid maturity format: ${shortMaturity} or ${longMaturity}`);
    return 0;
  }

  const shortYear = parseInt(shortYearStr) + 2000;
  const longYear = parseInt(longYearStr) + 2000;
  const yearDiff = Math.abs(longYear - shortYear);

  if (yearDiff === 0) return 0;

  let entry = B3_MARGIN_TABLE.find(e => e.yearDiff === yearDiff);
  
  if (!entry) {
    if (yearDiff < 1) {
      entry = B3_MARGIN_TABLE[0];
    } else if (yearDiff > 5) {
      entry = B3_MARGIN_TABLE[B3_MARGIN_TABLE.length - 1];
    } else {
      const lower = B3_MARGIN_TABLE.find(e => e.yearDiff < yearDiff);
      const upper = B3_MARGIN_TABLE.find(e => e.yearDiff > yearDiff);
      if (lower && upper) {
        const ratio = (yearDiff - lower.yearDiff) / (upper.yearDiff - lower.yearDiff);
        entry = {
          yearDiff,
          baseMarginPerShort: lower.baseMarginPerShort + ratio * (upper.baseMarginPerShort - lower.baseMarginPerShort),
          imbalanceFactor: lower.imbalanceFactor + ratio * (upper.imbalanceFactor - lower.imbalanceFactor)
        };
      } else {
        entry = B3_MARGIN_TABLE[B3_MARGIN_TABLE.length - 1];
      }
    }
  }

  const baseMargin = shortContracts * entry.baseMarginPerShort;
  const imbalanceMargin = Math.abs(shortContracts - longContracts) * entry.imbalanceFactor;
  const totalMargin = baseMargin + imbalanceMargin;

  return Math.round(totalMargin);
};

/**
 * Calculates target spreads for gain and loss based on trade direction
 * 
 * For BUY SPREAD (buying when z < -1.5, spread is LOW):
 *   - Target Gain: current + stopGain (spread increases)
 *   - Target Loss: current - stopLoss (spread decreases further)
 * 
 * For SELL SPREAD (selling when z > 1.5, spread is HIGH):
 *   - Target Gain: current - stopGain (spread decreases)
 *   - Target Loss: current + stopLoss (spread increases further)
 */
export const calculateTargetSpreads = (
  currentSpread: number,
  recommendation: 'BUY SPREAD' | 'SELL SPREAD' | 'NEUTRAL',
  stopGainBps: number,
  stopLossBps: number
): { targetGain: number; targetLoss: number } => {
  if (recommendation === 'NEUTRAL') {
    return { targetGain: currentSpread, targetLoss: currentSpread };
  }

  if (recommendation === 'BUY SPREAD') {
    return {
      targetGain: currentSpread + stopGainBps,
      targetLoss: currentSpread - stopLossBps
    };
  }

  // SELL SPREAD
  return {
    targetGain: currentSpread - stopGainBps,
    targetLoss: currentSpread + stopLossBps
  };
};

/**
 * Estimates half-life for spread convergence using AR(1) mean-reversion model
 * Based on first-order autocorrelation (lag-1 correlation)
 * 
 * Formula: half-life = ln(2) / (-ln(ρ₁))
 * where ρ₁ is the lag-1 autocorrelation coefficient
 * 
 * Returns estimated business days for spread to converge halfway to mean
 * Returns 0 if data is insufficient or model assumptions are violated
 */
export const calculateHalfLife = (
  historicalData: HistoricalData[] | undefined,
  currentZScore: number
): number => {
  if (!historicalData || historicalData.length < 20) return 0;

  const spreads = historicalData.map(d => d.spread);
  const mean = calculateMean(spreads);
  
  const deviations = spreads.map(s => s - mean);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < deviations.length - 1; i++) {
    numerator += deviations[i] * deviations[i + 1];
  }
  
  for (let i = 0; i < deviations.length; i++) {
    denominator += deviations[i] * deviations[i];
  }
  
  if (denominator === 0) return 0;
  
  const rho1 = numerator / denominator;
  
  if (rho1 <= 0 || rho1 >= 1) return 0;
  
  const halfLife = Math.log(2) / (-Math.log(rho1));
  
  return Math.max(1, Math.min(Math.round(halfLife), 252));
};

// --- Risk Allocation ---

export const calculateAllocation = (
  riskParams: RiskParams,
  dv01Long: number,
  dv01Short: number,
  puLong?: number,
  puShort?: number,
  shortMaturity?: string,
  longMaturity?: string
) => {
  const hedgeRatio = dv01Short === 0 ? 0 : dv01Long / dv01Short;
  
  const riskPerContract = dv01Long * riskParams.stopLossBps;
  
  if (riskPerContract <= 0) {
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

  const longContractsRaw = riskParams.maxRiskBrl / riskPerContract;
  const longContracts = Math.floor(Math.max(0, longContractsRaw));
  
  const shortContractsRaw = longContracts * hedgeRatio;
  const shortContracts = Math.round(shortContractsRaw);

  let estimatedMargin = 0;
  if (shortMaturity && longMaturity) {
    estimatedMargin = calculateB3Margin(shortContracts, longContracts, shortMaturity, longMaturity);
  }

  return {
    hedgeRatio,
    longContracts,
    shortContracts,
    exposureLong: 0,
    exposureShort: 0,
    estimatedRisk: longContracts * riskPerContract,
    estimatedMargin
  };
};