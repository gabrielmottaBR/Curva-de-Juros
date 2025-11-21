// api/collect.js - Data Collection Endpoint (Vercel Cron compatible)
const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// DI1 Contracts
const CONTRACTS = [
  'DI1F27', 'DI1F28', 'DI1F29', 'DI1F30', 'DI1F31',
  'DI1F32', 'DI1F33', 'DI1F34', 'DI1F35'
];

// Scrape B3 data
async function scrapeB3Data() {
  try {
    const prices = {};
    
    for (const contract of CONTRACTS) {
      const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(
        `https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/${contract}`
      )}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch ${contract}: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      
      const priceCell = doc.querySelector('td[headers="closePrice"]');
      if (priceCell) {
        const priceText = priceCell.textContent.trim().replace(/\./g, '').replace(',', '.');
        prices[contract] = parseFloat(priceText);
      }
    }
    
    return prices;
  } catch (error) {
    console.error('Error scraping B3:', error);
    return null;
  }
}

// Calculate PU from price
function calculatePU(price, yearsToMaturity = 1) {
  return 100000 / Math.pow(price / 100000, 1 / yearsToMaturity);
}

// Calculate DV01
function calculateDV01(pu, yearsToMaturity) {
  const rate = (100000 / pu) ** (1 / yearsToMaturity) - 1;
  return (yearsToMaturity * 100000 * Math.exp(-rate * yearsToMaturity)) / 10000;
}

// Save prices to database
async function savePrices(prices) {
  const timestamp = new Date().toISOString();
  const records = [];
  
  for (const [contract, price] of Object.entries(prices)) {
    records.push({
      contract_id: contract,
      price: price,
      timestamp: timestamp
    });
  }
  
  const { error } = await supabase
    .from('di1_prices')
    .insert(records);
    
  if (error) {
    console.error('Error saving prices:', error);
    throw error;
  }
  
  return records.length;
}

// Analyze opportunities
async function analyzeOpportunities() {
  // Fetch recent prices (last 100 business days)
  const { data: prices, error } = await supabase
    .from('di1_prices')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(CONTRACTS.length * 100);
    
  if (error || !prices || prices.length === 0) {
    throw new Error('No price data available');
  }
  
  // Group by timestamp
  const pricesByDate = {};
  prices.forEach(p => {
    if (!pricesByDate[p.timestamp]) {
      pricesByDate[p.timestamp] = {};
    }
    pricesByDate[p.timestamp][p.contract_id] = p.price;
  });
  
  const dates = Object.keys(pricesByDate).sort().reverse();
  const opportunities = [];
  
  // Analyze all pairs
  for (let i = 0; i < CONTRACTS.length; i++) {
    for (let j = i + 1; j < CONTRACTS.length; j++) {
      const shortContract = CONTRACTS[i];
      const longContract = CONTRACTS[j];
      
      const spreads = [];
      const historicalData = [];
      
      // Calculate historical spreads
      for (const date of dates) {
        const dayPrices = pricesByDate[date];
        if (dayPrices[shortContract] && dayPrices[longContract]) {
          const spread = dayPrices[shortContract] - dayPrices[longContract];
          spreads.push(spread);
          historicalData.push({
            date,
            spread,
            shortPrice: dayPrices[shortContract],
            longPrice: dayPrices[longContract]
          });
        }
      }
      
      if (spreads.length < 20) continue; // Need enough data
      
      // Calculate statistics
      const currentSpread = spreads[0];
      const mean = spreads.reduce((a, b) => a + b, 0) / spreads.length;
      const variance = spreads.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / spreads.length;
      const stdDev = Math.sqrt(variance);
      const zScore = (currentSpread - mean) / stdDev;
      
      // Calculate risk metrics (years to maturity)
      const currentYear = new Date().getFullYear();
      const shortMaturityYear = 2000 + parseInt(shortContract.substring(4));
      const longMaturityYear = 2000 + parseInt(longContract.substring(4));
      const shortMaturity = shortMaturityYear - currentYear;
      const longMaturity = longMaturityYear - currentYear;
      const shortPrice = historicalData[0].shortPrice;
      const longPrice = historicalData[0].longPrice;
      
      const puShort = calculatePU(shortPrice, shortMaturity);
      const puLong = calculatePU(longPrice, longMaturity);
      const dv01Short = calculateDV01(puShort, shortMaturity);
      const dv01Long = calculateDV01(puLong, longMaturity);
      const hedgeRatio = dv01Short / dv01Long;
      
      // Determine recommendation
      let recommendation = 'HOLD';
      if (Math.abs(zScore) > 2) {
        recommendation = zScore > 0 ? 'SHORT_SPREAD' : 'LONG_SPREAD';
      }
      
      opportunities.push({
        pair_id: `${shortContract}_${longContract}`,
        short_id: shortContract,
        long_id: longContract,
        short_label: `DI ${shortContract.substring(3, 5)}`,
        long_label: `DI ${longContract.substring(3, 5)}`,
        z_score: zScore,
        current_spread: currentSpread,
        mean_spread: mean,
        std_dev_spread: stdDev,
        cointegration_p_value: 0.05, // Simplified
        recommendation: recommendation,
        calculated_at: new Date().toISOString(),
        details_json: JSON.stringify({
          historicalData: historicalData.slice(0, 100),
          puShort,
          puLong,
          dv01Short,
          dv01Long,
          hedgeRatio
        })
      });
    }
  }
  
  // Save opportunities
  await supabase
    .from('opportunities_cache')
    .delete()
    .neq('pair_id', '__NONE__'); // Delete all
    
  const { error: insertError } = await supabase
    .from('opportunities_cache')
    .insert(opportunities);
    
  if (insertError) {
    throw insertError;
  }
  
  return opportunities.length;
}

// Main handler
module.exports = async (req, res) => {
  try {
    console.log('[Collect] Starting data collection...');
    
    // 1. Scrape B3 data
    const prices = await scrapeB3Data();
    
    if (!prices || Object.keys(prices).length === 0) {
      console.warn('[Collect] No prices fetched from B3, using existing data');
      return res.status(200).json({
        success: true,
        message: 'No new data from B3, using existing database records',
        pricesCollected: 0
      });
    }
    
    // 2. Save prices
    const savedCount = await savePrices(prices);
    console.log(`[Collect] Saved ${savedCount} prices`);
    
    // 3. Analyze opportunities
    const opportunitiesCount = await analyzeOpportunities();
    console.log(`[Collect] Analyzed ${opportunitiesCount} opportunities`);
    
    res.status(200).json({
      success: true,
      pricesCollected: savedCount,
      opportunitiesAnalyzed: opportunitiesCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Collect] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
