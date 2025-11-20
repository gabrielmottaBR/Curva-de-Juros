const FACE_VALUE = 100000;
const DAYS_IN_YEAR = 252;

export const calculatePU = (ratePct: number, du: number): number => {
  const factor = 1 + (ratePct / 100);
  const power = du / DAYS_IN_YEAR;
  return FACE_VALUE / Math.pow(factor, power);
};

export const calculateDV01 = (ratePct: number, du: number): number => {
  const basePU = calculatePU(ratePct, du);
  const shockedPU = calculatePU(ratePct + 0.01, du);
  return Math.abs(basePU - shockedPU);
};

export const calculateSpread = (longRate: number, shortRate: number): number => {
  return longRate - shortRate;
};

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

export const checkCointegration = (shortRates: number[], longRates: number[]): number => {
  const spread = longRates.map((l, i) => l - shortRates[i]);
  
  const mean = calculateMean(spread);
  let crossings = 0;
  for (let i = 1; i < spread.length; i++) {
    if ((spread[i] - mean) * (spread[i-1] - mean) < 0) {
      crossings++;
    }
  }
  
  const maxCrossings = 25;
  const pValueProxy = Math.max(0.01, 1 - (Math.min(crossings, maxCrossings) / maxCrossings));
  
  return Number(pValueProxy.toFixed(3));
};
