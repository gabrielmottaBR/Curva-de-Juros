import { Maturity } from './types';

// Filtered to only include January (DI1F) maturities as requested
export const AVAILABLE_MATURITIES = [
  { id: Maturity.JAN25, label: 'Jan 25 (DI1F25)', defaultDu: 120 },
  { id: Maturity.JAN26, label: 'Jan 26 (DI1F26)', defaultDu: 370 },
  { id: Maturity.JAN27, label: 'Jan 27 (DI1F27)', defaultDu: 620 },
  { id: Maturity.JAN29, label: 'Jan 29 (DI1F29)', defaultDu: 1120 },
  { id: Maturity.JAN31, label: 'Jan 31 (DI1F31)', defaultDu: 1620 },
];

// Simplified holiday logic or constants for simulation
export const DAYS_IN_YEAR = 252;
export const FACE_VALUE = 100000;

export const RISK_DEFAULTS = {
  maxRiskBrl: 5000,
  stopLossBps: 20,
  stressFactor: 1.0,
};