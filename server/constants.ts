export enum Maturity {
  JAN27 = 'DI1F27',
  JAN28 = 'DI1F28',
  JAN29 = 'DI1F29',
  JAN30 = 'DI1F30',
  JAN31 = 'DI1F31',
  JAN32 = 'DI1F32',
  JAN33 = 'DI1F33',
  JAN34 = 'DI1F34',
  JAN35 = 'DI1F35',
}

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

export const DAYS_IN_YEAR = 252;
export const FACE_VALUE = 100000;
