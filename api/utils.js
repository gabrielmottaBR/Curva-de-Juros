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

// B3 Trading Holidays Multi-Year Calendar (2025-2030)
// Fixed holidays (same every year)
const B3_FIXED_HOLIDAYS = {
  newYear: { month: 1, day: 1 },
  tiradentes: { month: 4, day: 21 },
  labourDay: { month: 5, day: 1 },
  blackConsciousness: { month: 11, day: 20 },
  christmas: { month: 12, day: 25 }
};

// Movable holidays (based on Easter) - calculated dates for 2025-2030
const B3_MOVABLE_HOLIDAYS = {
  2025: {
    carnivalMonday: '2025-03-03',
    carnivalTuesday: '2025-03-04',
    goodFriday: '2025-04-18',
    corpusChristi: '2025-06-19'
  },
  2026: {
    carnivalMonday: '2026-02-16',
    carnivalTuesday: '2026-02-17',
    goodFriday: '2026-04-03',
    corpusChristi: '2026-06-04'
  },
  2027: {
    carnivalMonday: '2027-02-08',
    carnivalTuesday: '2027-02-09',
    goodFriday: '2027-03-26',
    corpusChristi: '2027-05-27'
  },
  2028: {
    carnivalMonday: '2028-02-28',
    carnivalTuesday: '2028-02-29',
    goodFriday: '2028-04-14',
    corpusChristi: '2028-06-15'
  },
  2029: {
    carnivalMonday: '2029-02-12',
    carnivalTuesday: '2029-02-13',
    goodFriday: '2029-03-30',
    corpusChristi: '2029-05-31'
  },
  2030: {
    carnivalMonday: '2030-03-04',
    carnivalTuesday: '2030-03-05',
    goodFriday: '2030-04-19',
    corpusChristi: '2030-06-20'
  }
};

// Generate complete holiday list for a given year
const generateB3HolidaysForYear = (year) => {
  const holidays = [];
  
  // Add fixed holidays
  for (const holiday of Object.values(B3_FIXED_HOLIDAYS)) {
    const dateStr = `${year}-${String(holiday.month).padStart(2, '0')}-${String(holiday.day).padStart(2, '0')}`;
    holidays.push(dateStr);
  }
  
  // Add movable holidays
  const movableHolidays = B3_MOVABLE_HOLIDAYS[year];
  if (movableHolidays) {
    holidays.push(...Object.values(movableHolidays));
  }
  
  return holidays;
};

// Generate complete holiday list for 2025-2030
const B3_ALL_HOLIDAYS = (() => {
  const allHolidays = [];
  for (let year = 2025; year <= 2030; year++) {
    allHolidays.push(...generateB3HolidaysForYear(year));
  }
  return allHolidays;
})();

// Business day functions
const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const isB3Holiday = (date) => {
  const dateStr = formatDateISO(date);
  return B3_ALL_HOLIDAYS.includes(dateStr);
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
  B3_ALL_HOLIDAYS,
  generateB3HolidaysForYear,
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
