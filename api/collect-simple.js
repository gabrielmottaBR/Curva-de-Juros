// api/collect-simple.js - Simplified data collection (simulation only for now)

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('./_shared');
const {
  AVAILABLE_MATURITIES,
  isBusinessDay,
  formatDateISO
} = require('./utils');

// Get last business day
const getLastBusinessDay = (fromDate) => {
  const date = new Date(fromDate);
  date.setDate(date.getDate() - 1);
  
  while (!isBusinessDay(date)) {
    date.setDate(date.getDate() - 1);
  }
  
  return date;
};

// Generate simulated rate
const generateSimulatedRate = (contractId, date) => {
  const baseRates = {
    'DI1F27': 11.20, 'DI1F28': 11.45, 'DI1F29': 11.68,
    'DI1F30': 11.89, 'DI1F31': 12.08, 'DI1F32': 12.21,
    'DI1F33': 12.28, 'DI1F34': 12.31, 'DI1F35': 12.32
  };

  const daysSinceStart = Math.floor((date - new Date('2025-07-03')) / 86400000);
  const volatility = 0.015;
  const seed = daysSinceStart * 1.618033988749895 + contractId.charCodeAt(4);
  
  const baseRate = baseRates[contractId] || 12.0;
  const random = (Math.sin(seed) + 1) / 2;
  const dailyChange = (random - 0.5) * volatility;
  
  return Math.max(10.0, Math.min(14.0, baseRate + dailyChange));
};

// Main collection function (simulated data only)
const collectDailyData = async (supabase, targetDate = null) => {
  const today = new Date();
  const collectionDate = targetDate || getLastBusinessDay(today);
  const dateISO = formatDateISO(collectionDate);

  console.log(`[Collect-Simple] Target date: ${dateISO}`);

  // Check if already collected
  const { data: existing } = await supabase
    .from('di1_prices')
    .select('contract_code')
    .eq('date', dateISO)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`[Collect-Simple] Skipped: Data exists for ${dateISO}`);
    return {
      skipped: true,
      reason: 'already_collected',
      date: dateISO
    };
  }

  // Generate simulated data for all contracts
  console.log(`[Collect-Simple] Generating simulated data for ${dateISO}...`);
  
  const records = AVAILABLE_MATURITIES.map(contract => {
    const rate = generateSimulatedRate(contract.id, collectionDate);
    console.log(`[Collect-Simple] ${contract.id}: ${rate.toFixed(2)}%`);
    
    return {
      date: dateISO,
      contract_code: contract.id,
      rate: rate
    };
  });

  // Insert to database
  const { error } = await supabase
    .from('di1_prices')
    .insert(records);

  if (error) {
    console.error('[Collect-Simple] Database error:', error);
    throw new Error(`DB insert failed: ${error.message}`);
  }

  console.log(`[Collect-Simple] ✓ Inserted 9 contracts (all simulated)`);

  return {
    skipped: false,
    date: dateISO,
    contractsCollected: 9,
    b3Contracts: 0,
    simulatedContracts: 9,
    source: 'simulated',
    note: 'Using simplified collection (simulated data only)'
  };
};

// Main handler
module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  try {
    console.log('[Collect-Simple] === Simplified data collection started ===');
    
    const supabase = getSupabaseClient();
    const result = await collectDailyData(supabase);
    
    if (result.skipped) {
      return res.status(200).json({
        success: true,
        message: `Skipped: ${result.reason}`,
        ...result
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data collected successfully',
      ...result
    });

  } catch (err) {
    console.error('[Collect-Simple] === Error ===', err);
    res.status(500).json({ 
      success: false,
      error: 'Data collection failed',
      message: err.message 
    });
  }
};
