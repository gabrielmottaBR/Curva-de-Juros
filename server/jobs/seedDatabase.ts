import { supabase, DI1Price } from '../config/supabase';
import { AVAILABLE_MATURITIES } from '../constants';
import { formatDateISO, getLastNBusinessDays } from '../utils/businessDays';
import { recalculateOpportunities } from './dailyCollection';

export const seedDatabaseWithSimulatedData = async (days: number = 100): Promise<void> => {
  console.log(`\nSeeding database with ${days} days of simulated data...`);
  
  const businessDays = getLastNBusinessDays(days);
  const records: DI1Price[] = [];

  AVAILABLE_MATURITIES.forEach((maturity, index) => {
    const startRate = 10.80 + (index * 0.65);
    const volatility = 0.08;
    const drift = 0.002;
    
    let currentRate = startRate;

    businessDays.forEach((date) => {
      const change = (Math.random() - 0.5) * volatility + (Math.random() > 0.5 ? drift : -drift);
      currentRate += change;
      
      if (currentRate < 9) currentRate = 9;
      if (currentRate > 16) currentRate = 16;

      records.push({
        contract_code: maturity.id,
        date: formatDateISO(date),
        rate: parseFloat(currentRate.toFixed(4))
      });
    });
  });

  console.log(`Inserting ${records.length} simulated records...`);

  const { error } = await supabase
    .from('di1_prices')
    .upsert(records, {
      onConflict: 'contract_code,date',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Error seeding database:', error);
    throw error;
  }

  console.log(`✓ Successfully seeded ${records.length} records`);
  console.log('Calculating initial opportunities...\n');
  
  await recalculateOpportunities();
  
  console.log('✓ Database seeded and opportunities calculated\n');
};
