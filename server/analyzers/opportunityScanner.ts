import { supabase, DI1Price } from '../config/supabase';
import { AVAILABLE_MATURITIES } from '../constants';
import { Opportunity, HistoricalData } from '../types';
import { calculateMean, calculateStdDev, calculateZScore, checkCointegration } from '../utils/math';
import { formatDateISO } from '../utils/businessDays';

export const getHistoricalDataFromDB = async (contractCode: string, days: number = 100): Promise<HistoricalData[]> => {
  const { data, error } = await supabase
    .from('di1_prices')
    .select('date, rate')
    .eq('contract_code', contractCode)
    .order('date', { ascending: false })
    .limit(days);

  if (error) {
    console.error(`Error fetching historical data for ${contractCode}:`, error);
    return [];
  }

  const records = (data || []).map(row => ({
    date: row.date,
    shortRate: 0,
    longRate: row.rate,
    spread: 0
  }));

  return records.reverse();
};

export const scanOpportunities = async (): Promise<Opportunity[]> => {
  const opportunities: Opportunity[] = [];
  
  for (let i = 0; i < AVAILABLE_MATURITIES.length; i++) {
    for (let j = i + 1; j < AVAILABLE_MATURITIES.length; j++) {
      const short = AVAILABLE_MATURITIES[i];
      const long = AVAILABLE_MATURITIES[j];

      const shortSeries = await getHistoricalDataFromDB(short.id, 100);
      const longSeries = await getHistoricalDataFromDB(long.id, 100);

      if (shortSeries.length === 0 || longSeries.length === 0) {
        console.warn(`No data for pair ${short.id} - ${long.id}`);
        continue;
      }

      const combinedHistory: HistoricalData[] = [];
      const minLen = Math.min(shortSeries.length, longSeries.length);
      
      for (let k = 0; k < minLen; k++) {
        const sRate = shortSeries[k].longRate;
        const lRate = longSeries[k].longRate;
        
        combinedHistory.push({
          date: shortSeries[k].date,
          shortRate: sRate,
          longRate: lRate,
          spread: parseFloat((lRate - sRate).toFixed(2))
        });
      }

      if (combinedHistory.length < 10) {
        console.warn(`Insufficient data for pair ${short.id} - ${long.id}: only ${combinedHistory.length} points`);
        continue;
      }

      const spreads = combinedHistory.map(d => d.spread);
      const mean = calculateMean(spreads);
      const stdDev = calculateStdDev(spreads, mean);
      const currentSpread = spreads[spreads.length - 1];
      const zScore = calculateZScore(currentSpread, mean, stdDev);

      let recommendation: 'BUY SPREAD' | 'SELL SPREAD' | 'NEUTRAL' = 'NEUTRAL';
      if (zScore < -1.5) recommendation = 'BUY SPREAD';
      if (zScore > 1.5) recommendation = 'SELL SPREAD';

      opportunities.push({
        id: `${short.id}-${long.id}`,
        shortId: short.id,
        longId: long.id,
        shortLabel: short.label.split(' ')[2].replace('(', '').replace(')', ''),
        longLabel: long.label.split(' ')[2].replace('(', '').replace(')', ''),
        zScore,
        currentSpread,
        recommendation,
        historicalData: combinedHistory
      });
    }
  }

  return opportunities.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
};

export const calculateDetailedMetrics = (opp: Opportunity) => {
  const spreads = opp.historicalData.map(d => d.spread);
  const meanSpread = calculateMean(spreads);
  const stdDevSpread = calculateStdDev(spreads, meanSpread);
  
  const shorts = opp.historicalData.map(d => d.shortRate);
  const longs = opp.historicalData.map(d => d.longRate);
  const cointegrationPValue = checkCointegration(shorts, longs);

  return {
    meanSpread,
    stdDevSpread,
    cointegrationPValue
  };
};
