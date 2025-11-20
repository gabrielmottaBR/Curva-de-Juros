import { supabase, DI1Price } from '../config/supabase';
import { fetchB3DailyRates } from '../collectors/b3Scraper';
import { AVAILABLE_MATURITIES } from '../constants';
import { getLastNBusinessDays, formatDateISO } from '../utils/businessDays';

export const populateInitialData = async (days: number = 100): Promise<void> => {
  console.log(`Starting initial population of ${days} business days...`);
  
  const businessDays = getLastNBusinessDays(days);
  let successCount = 0;
  let failCount = 0;

  for (const date of businessDays) {
    console.log(`Fetching data for ${formatDateISO(date)}...`);
    
    const rates = await fetchB3DailyRates(date);
    
    if (!rates || Object.keys(rates).length === 0) {
      console.warn(`No data available for ${formatDateISO(date)}`);
      failCount++;
      continue;
    }

    const records: DI1Price[] = [];
    
    for (const maturity of AVAILABLE_MATURITIES) {
      const rate = rates[maturity.id];
      if (rate && rate > 0) {
        records.push({
          contract_code: maturity.id,
          date: formatDateISO(date),
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
        console.error(`Error inserting data for ${formatDateISO(date)}:`, error);
        failCount++;
      } else {
        console.log(`✓ Inserted ${records.length} contracts for ${formatDateISO(date)}`);
        successCount++;
      }
    } else {
      failCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\nInitial population completed:`);
  console.log(`  Success: ${successCount} days`);
  console.log(`  Failed: ${failCount} days`);
  console.log(`  Total: ${businessDays.length} days`);
};

export const checkIfDataExists = async (): Promise<boolean> => {
  const { count, error } = await supabase
    .from('di1_prices')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error checking if data exists:', error);
    return false;
  }

  return (count || 0) > 0;
};
