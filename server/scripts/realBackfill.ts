import { supabase, DI1Price } from '../config/supabase';
import { AVAILABLE_MATURITIES } from '../constants';
import { formatDateISO, getLastNBusinessDays, formatDateBR } from '../utils/businessDays';
import { fetchB3RatesForDate } from '../collectors/b3Scraper';
import { recalculateOpportunities } from '../jobs/dailyCollection';

export const runRealBackfill = async (days: number = 100): Promise<void> => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Starting REAL DATA backfill for last ${days} business days`);
  console.log(`Contracts: ${AVAILABLE_MATURITIES.map(m => m.id).join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const businessDays = getLastNBusinessDays(days);
  const records: DI1Price[] = [];
  let successCount = 0;
  let failCount = 0;

  console.log(`Processing ${businessDays.length} business days...\n`);

  for (let i = 0; i < businessDays.length; i++) {
    const date = businessDays[i];
    const dateStr = formatDateISO(date);
    const dateBR = formatDateBR(date);
    const progress = ((i + 1) / businessDays.length * 100).toFixed(1);
    
    console.log(`[${progress}%] Fetching ${dateBR} (${dateStr})...`);

    try {
      const rates = await fetchB3RatesForDate(date);
      
      if (rates && rates.length > 0) {
        rates.forEach(rate => {
          records.push({
            contract_code: rate.contractCode,
            date: dateStr,
            rate: rate.rate
          });
        });
        successCount++;
        console.log(`  ✓ Found ${rates.length} contracts`);
      } else {
        failCount++;
        console.log(`  ✗ No data available`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      failCount++;
      console.log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Collection Summary:`);
  console.log(`  Success: ${successCount} days`);
  console.log(`  Failed:  ${failCount} days`);
  console.log(`  Total records: ${records.length}`);
  console.log(`${'='.repeat(60)}\n`);

  if (records.length === 0) {
    console.log('⚠️  No records to insert. Backfill aborted.\n');
    return;
  }

  console.log(`Clearing old data from database...`);
  const { error: deleteError } = await supabase
    .from('di1_prices')
    .delete()
    .neq('id', 0);

  if (deleteError) {
    console.error('Error clearing old data:', deleteError);
  } else {
    console.log('✓ Old data cleared\n');
  }

  console.log(`Inserting ${records.length} new records into database...`);

  const { error: insertError } = await supabase
    .from('di1_prices')
    .upsert(records, {
      onConflict: 'contract_code,date',
      ignoreDuplicates: false
    });

  if (insertError) {
    console.error('❌ Error inserting data:', insertError);
    throw insertError;
  }

  console.log(`✓ Successfully inserted ${records.length} records\n`);

  console.log('Recalculating opportunities from real data...\n');
  await recalculateOpportunities();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✓ BACKFILL COMPLETED SUCCESSFULLY');
  console.log(`${'='.repeat(60)}\n`);
};

if (require.main === module) {
  runRealBackfill(100).then(() => {
    console.log('Backfill script finished.\n');
    process.exit(0);
  }).catch(err => {
    console.error('Backfill script failed:', err);
    process.exit(1);
  });
}
