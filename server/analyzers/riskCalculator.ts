import { AVAILABLE_MATURITIES } from '../constants';
import { calculatePU, calculateDV01 } from '../utils/math';
import { DetailedOpportunity } from '../types';

export interface RiskAllocation {
  hedgeRatio: number;
  longContracts: number;
  shortContracts: number;
  exposureLong: number;
  exposureShort: number;
  estimatedRisk: number;
}

export const calculateDetailedRisk = (
  opportunity: DetailedOpportunity
): {
  puShort: number;
  puLong: number;
  dv01Short: number;
  dv01Long: number;
  hedgeRatio: number;
} => {
  const latest = opportunity.historicalData[opportunity.historicalData.length - 1];
  const shortConfig = AVAILABLE_MATURITIES.find(m => m.id === opportunity.shortId)!;
  const longConfig = AVAILABLE_MATURITIES.find(m => m.id === opportunity.longId)!;

  const puShort = calculatePU(latest.shortRate, shortConfig.defaultDu);
  const puLong = calculatePU(latest.longRate, longConfig.defaultDu);
  const dv01Short = calculateDV01(latest.shortRate, shortConfig.defaultDu);
  const dv01Long = calculateDV01(latest.longRate, longConfig.defaultDu);

  const hedgeRatio = dv01Short === 0 ? 0 : dv01Long / dv01Short;

  return {
    puShort,
    puLong,
    dv01Short,
    dv01Long,
    hedgeRatio
  };
};

export const calculateAllocation = (
  maxRiskBrl: number,
  stopLossBps: number,
  stressFactor: number,
  dv01Long: number,
  dv01Short: number
): RiskAllocation => {
  const hedgeRatio = dv01Short === 0 ? 0 : dv01Long / dv01Short;
  const riskPerContract = dv01Long * stopLossBps;
  
  if (riskPerContract <= 0 || stressFactor <= 0) {
    return {
      hedgeRatio,
      longContracts: 0,
      shortContracts: 0,
      exposureLong: 0,
      exposureShort: 0,
      estimatedRisk: 0
    };
  }

  const longContractsRaw = maxRiskBrl / (riskPerContract * stressFactor);
  const longContracts = Math.floor(Math.max(0, longContractsRaw));
  const shortContracts = Math.round(longContracts * hedgeRatio);

  return {
    hedgeRatio,
    longContracts,
    shortContracts,
    exposureLong: 0,
    exposureShort: 0,
    estimatedRisk: longContracts * riskPerContract
  };
};
