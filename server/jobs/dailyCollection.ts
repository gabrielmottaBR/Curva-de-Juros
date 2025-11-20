import cron from 'node-cron';
import { supabase, DI1Price, OpportunityCache } from '../config/supabase';
import { fetchB3DailyRates } from '../collectors/b3Scraper';
import { scanOpportunities, calculateDetailedMetrics } from '../analyzers/opportunityScanner';
import { calculateDetailedRisk } from '../analyzers/riskCalculator';
import { AVAILABLE_MATURITIES } from '../constants';
import { isBusinessDay, formatDateISO } from '../utils/businessDays';

export const collectDailyData = async (): Promise<void> => {
  const today = new Date();
  
  if (!isBusinessDay(today)) {
    console.log('Today is not a business day. Skipping data collection.');
    return;
  }

  console.log(`Starting daily data collection for ${formatDateISO(today)}...`);

  const rates = await fetchB3DailyRates(today);
  
  if (!rates || Object.keys(rates).length === 0) {
    console.warn('No data available from B3. Skipping collection.');
    return;
  }

  const records: DI1Price[] = [];
  
  for (const maturity of AVAILABLE_MATURITIES) {
    const rate = rates[maturity.id];
    if (rate && rate > 0) {
      records.push({
        contract_code: maturity.id,
        date: formatDateISO(today),
        rate: rate
      });
    }
  }

  if (records.length > 0) {
    const { error } = await supabase
      .from('di1_prices')
      .upsert(records, {
        onConflict: 'contract_code,date',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error inserting daily data:', error);
      return;
    }

    console.log(`✓ Inserted ${records.length} contracts for ${formatDateISO(today)}`);
  }

  await recalculateOpportunities();
};

export const recalculateOpportunities = async (): Promise<void> => {
  console.log('Recalculating opportunities...');

  const opportunities = await scanOpportunities();
  
  if (opportunities.length === 0) {
    console.warn('No opportunities calculated.');
    return;
  }

  const cacheRecords: OpportunityCache[] = [];
  
  for (const opp of opportunities) {
    const metrics = calculateDetailedMetrics(opp);
    
    cacheRecords.push({
      pair_id: opp.id,
      short_id: opp.shortId,
      long_id: opp.longId,
      short_label: opp.shortLabel,
      long_label: opp.longLabel,
      z_score: opp.zScore,
      current_spread: opp.currentSpread,
      mean_spread: metrics.meanSpread,
      std_dev_spread: metrics.stdDevSpread,
      recommendation: opp.recommendation,
      cointegration_p_value: metrics.cointegrationPValue,
      details_json: JSON.stringify({
        historicalData: opp.historicalData
      })
    });
  }

  const { error } = await supabase
    .from('opportunities_cache')
    .upsert(cacheRecords, {
      onConflict: 'pair_id',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Error updating opportunities cache:', error);
    return;
  }

  console.log(`✓ Updated ${cacheRecords.length} opportunities in cache`);
};

export const startDailyCronJob = (): void => {
  cron.schedule('0 21 * * *', async () => {
    console.log('\n=== CRON JOB TRIGGERED: 21:00 Brasília Time ===');
    await collectDailyData();
  }, {
    timezone: 'America/Sao_Paulo'
  });

  console.log('Daily cron job scheduled for 21:00 Brasília Time (America/Sao_Paulo)');
  console.log(`Current server time: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
};
