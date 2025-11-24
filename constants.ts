import { Maturity } from './types';

// DI1 futures contracts from 2027 to 2035
export const AVAILABLE_MATURITIES = [
  { id: Maturity.JAN27, label: 'Jan 27 (DI1F27)', defaultDu: 620 },
  { id: Maturity.JAN28, label: 'Jan 28 (DI1F28)', defaultDu: 870 },
  { id: Maturity.JAN29, label: 'Jan 29 (DI1F29)', defaultDu: 1120 },
  { id: Maturity.JAN30, label: 'Jan 30 (DI1F30)', defaultDu: 1370 },
  { id: Maturity.JAN31, label: 'Jan 31 (DI1F31)', defaultDu: 1620 },
  { id: Maturity.JAN32, label: 'Jan 32 (DI1F32)', defaultDu: 1870 },
  { id: Maturity.JAN33, label: 'Jan 33 (DI1F33)', defaultDu: 2120 },
  { id: Maturity.JAN34, label: 'Jan 34 (DI1F34)', defaultDu: 2370 },
  { id: Maturity.JAN35, label: 'Jan 35 (DI1F35)', defaultDu: 2620 },
];

// Simplified holiday logic or constants for simulation
export const DAYS_IN_YEAR = 252;
export const FACE_VALUE = 100000;

export const RISK_DEFAULTS = {
  maxRiskBrl: 5000,
  stopLossBps: 20,
  stopGainBps: 30,
};