import { supabase, DI1Price } from '../config/supabase';
import { AVAILABLE_MATURITIES } from '../constants';
import { formatDateISO, getLastNBusinessDays } from '../utils/businessDays';
import { recalculateOpportunities } from '../jobs/dailyCollection';

/**
 * Enhanced backfill with realistic market-based simulated data
 * Uses actual Brazilian market characteristics:
 * - Selic rate around 10.5-11.5%
 * - Term structure with positive slope
 * - Realistic volatility and correlation
 * - Mean-reverting spreads
 */
export const runEnhancedBackfill = async (days: number = 100): Promise<void> => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Enhanced Backfill - Market-Based Realistic Data`);
  console.log(`Generating ${days} business days for ${AVAILABLE_MATURITIES.length} contracts`);
  console.log(`${'='.repeat(70)}\n`);
  
  const businessDays = getLastNBusinessDays(days);
  const records: DI1Price[] = [];

  const baseRates: { [key: string]: number } = {
    'DI1F27': 11.20,
    'DI1F28': 11.45,
    'DI1F29': 11.65,
    'DI1F30': 11.82,
    'DI1F31': 11.96,
    'DI1F32': 12.08,
    'DI1F33': 12.18,
    'DI1F34': 12.26,
    'DI1F35': 12.32,
  };

  const volatilities: { [key: string]: number } = {
    'DI1F27': 0.12,
    'DI1F28': 0.14,
    'DI1F29': 0.15,
    'DI1F30': 0.16,
    'DI1F31': 0.17,
    'DI1F32': 0.18,
    'DI1F33': 0.19,
    'DI1F34': 0.19,
    'DI1F35': 0.20,
  };

  const currentRates: { [key: string]: number } = { ...baseRates };
  const trends: { [key: string]: number } = {};
  
  AVAILABLE_MATURITIES.forEach(m => {
    trends[m.id] = (Math.random() - 0.5) * 0.001;
  });

  console.log('Base Rates (starting point):');
  Object.entries(baseRates).forEach(([contract, rate]) => {
    console.log(`  ${contract}: ${rate.toFixed(2)}%`);
  });
  console.log('');

  console.log(`Generating ${businessDays.length} days of data...\n`);

  businessDays.forEach((date, index) => {
    const dateStr = formatDateISO(date);
    const progress = ((index + 1) / businessDays.length * 100).toFixed(1);
    
    if (index % 20 === 0) {
      console.log(`[${progress}%] Processing ${dateStr}...`);
    }

    AVAILABLE_MATURITIES.forEach(maturity => {
      const contract = maturity.id;
      const vol = volatilities[contract];
      const trend = trends[contract];
      
      const shock = (Math.random() - 0.5) * vol;
      const meanReversion = (baseRates[contract] - currentRates[contract]) * 0.05;
      
      currentRates[contract] += shock + trend + meanReversion;
      
      currentRates[contract] = Math.max(9.0, Math.min(15.0, currentRates[contract]));

      records.push({
        contract_code: contract,
        date: dateStr,
        rate: parseFloat(currentRates[contract].toFixed(4))
      });
    });

    if (index % 5 === 0) {
      AVAILABLE_MATURITIES.forEach(m => {
        trends[m.id] = (Math.random() - 0.5) * 0.002;
      });
    }
  });

  console.log(`\n✓ Generated ${records.length} records\n`);

  console.log('Clearing existing data...');
  const { error: deleteError } = await supabase
    .from('di1_prices')
    .delete()
    .neq('id', 0);

  if (deleteError) {
    console.error('Error clearing data:', deleteError);
  } else {
    console.log('✓ Old data cleared\n');
  }

  console.log(`Inserting ${records.length} records into Supabase...`);

  const batchSize = 500;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from('di1_prices')
      .insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      throw error;
    }
    
    const progress = Math.min(100, ((i + batchSize) / records.length * 100)).toFixed(1);
    console.log(`  Progress: ${progress}%`);
  }

  console.log(`\n✓ Successfully inserted ${records.length} records\n`);

  console.log('Recalculating opportunities...\n');
  await recalculateOpportunities();
  
  console.log(`${'='.repeat(70)}`);
  console.log('✓ ENHANCED BACKFILL COMPLETED');
  console.log(`  Total Records: ${records.length}`);
  console.log(`  Date Range: ${formatDateISO(businessDays[0])} to ${formatDateISO(businessDays[businessDays.length - 1])}`);
  console.log(`  Contracts: ${AVAILABLE_MATURITIES.length}`);
  console.log(`${'='.repeat(70)}\n`);
};

runEnhancedBackfill(100).then(() => {
  console.log('Backfill completed successfully.\n');
  process.exit(0);
}).catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
