// api/utils.js - Math and utility functions (ported from TypeScript)

const FACE_VALUE = 100000;
const DAYS_IN_YEAR = 252;

// Contract configurations
const AVAILABLE_MATURITIES = [
  { id: 'DI1F27', label: 'Jan 27 (DI1F27)', defaultDu: 620 },
  { id: 'DI1F28', label: 'Jan 28 (DI1F28)', defaultDu: 870 },
  { id: 'DI1F29', label: 'Jan 29 (DI1F29)', defaultDu: 1120 },
  { id: 'DI1F30', label: 'Jan 30 (DI1F30)', defaultDu: 1370 },
  { id: 'DI1F31', label: 'Jan 31 (DI1F31)', defaultDu: 1620 },
  { id: 'DI1F32', label: 'Jan 32 (DI1F32)', defaultDu: 1870 },
  { id: 'DI1F33', label: 'Jan 33 (DI1F33)', defaultDu: 2120 },
  { id: 'DI1F34', label: 'Jan 34 (DI1F34)', defaultDu: 2370 },
  { id: 'DI1F35', label: 'Jan 35 (DI1F35)', defaultDu: 2620 },
];

// Math functions
const calculatePU = (ratePct, du) => {
  const factor = 1 + (ratePct / 100);
  const power = du / DAYS_IN_YEAR;
  return FACE_VALUE / Math.pow(factor, power);
};

const calculateDV01 = (ratePct, du) => {
  const basePU = calculatePU(ratePct, du);
  const shockedPU = calculatePU(ratePct + 0.01, du);
  return Math.abs(basePU - shockedPU);
};

const calculateMean = (values) => {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
};

const calculateStdDev = (values, mean) => {
  if (values.length < 2) return 0;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = calculateMean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
};

const calculateZScore = (currentVal, mean, stdDev) => {
  if (stdDev === 0) return 0;
  return (currentVal - mean) / stdDev;
};

const checkCointegration = (shortRates, longRates) => {
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

// B3 Trading Holidays 2025 (ISO format: YYYY-MM-DD)
const B3_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-03-03', // Carnival Monday
  '2025-03-04', // Carnival Tuesday
  '2025-04-18', // Good Friday
  '2025-04-21', // Tiradentes' Day
  '2025-05-01', // Labour Day
  '2025-06-19', // Corpus Christi
  '2025-11-20', // Black Consciousness Day
  '2025-12-25'  // Christmas Day
];

// Business day functions
const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const isB3Holiday = (date) => {
  const dateStr = formatDateISO(date);
  return B3_HOLIDAYS_2025.includes(dateStr);
};

const isBusinessDay = (date) => {
  return !isWeekend(date) && !isB3Holiday(date);
};

const formatDateISO = (date) => {
  return date.toISOString().split('T')[0];
};

const formatDateForB3 = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

module.exports = {
  FACE_VALUE,
  DAYS_IN_YEAR,
  AVAILABLE_MATURITIES,
  B3_HOLIDAYS_2025,
  calculatePU,
  calculateDV01,
  calculateMean,
  calculateStdDev,
  calculateZScore,
  checkCointegration,
  isWeekend,
  isB3Holiday,
  isBusinessDay,
  formatDateISO,
  formatDateForB3
};
