require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Pairs to analyze
const PAIRS = [
  { short: 'DI1F27', long: 'DI1F28' },
  { short: 'DI1F27', long: 'DI1F29' },
  { short: 'DI1F27', long: 'DI1F30' },
  { short: 'DI1F29', long: 'DI1F31' },
  { short: 'DI1F30', long: 'DI1F31' },
  { short: 'DI1F30', long: 'DI1F32' }
];

// Lookback periods to test
const LOOKBACK_PERIODS = [20, 30, 40, 50, 60];

// Trading parameters
const ENTRY_THRESHOLD = 1.5;
const EXIT_THRESHOLD = 0.5;
const RISK_PER_TRADE = 5000; // R$ 5,000

// Statistical functions
function calculateMean(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function calculateStdDev(arr, mean) {
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function calculateSharpeRatio(returns) {
  if (returns.length === 0) return 0;
  const meanReturn = calculateMean(returns);
  const stdReturn = calculateStdDev(returns, meanReturn);
  if (stdReturn === 0) return 0;
  // Annualized Sharpe (assuming ~252 trading days)
  return (meanReturn / stdReturn) * Math.sqrt(252);
}

function calculateMaxDrawdown(equity) {
  let maxDrawdown = 0;
  let peak = equity[0];
  
  for (let i = 1; i < equity.length; i++) {
    if (equity[i] > peak) {
      peak = equity[i];
    } else {
      const drawdown = (peak - equity[i]) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }
  
  return maxDrawdown;
}

async function fetchHistoricalData(shortId, longId) {
  const { data, error } = await supabase
    .from('di1_prices')
    .select('date, contract_code, rate')
    .in('contract_code', [shortId, longId])
    .order('date', { ascending: true });

  if (error) throw error;

  // Organize by date
  const dateMap = {};
  data.forEach(row => {
    if (!dateMap[row.date]) {
      dateMap[row.date] = {};
    }
    dateMap[row.date][row.contract_code] = row.rate;
  });

  // Filter only dates with both contracts
  const dates = Object.keys(dateMap)
    .filter(date => dateMap[date][shortId] && dateMap[date][longId])
    .sort();

  return dates.map(date => ({
    date,
    shortRate: dateMap[date][shortId],
    longRate: dateMap[date][longId],
    spread: dateMap[date][longId] - dateMap[date][shortId]
  }));
}

function runBacktest(historicalData, lookback) {
  const trades = [];
  let position = null; // { type: 'BUY' or 'SELL', entrySpread, entryDate, entryZ }
  
  for (let i = lookback; i < historicalData.length; i++) {
    const current = historicalData[i];
    
    // Calculate z-score using lookback window
    const window = historicalData.slice(i - lookback, i);
    const spreads = window.map(d => d.spread);
    const mean = calculateMean(spreads);
    const stdDev = calculateStdDev(spreads, mean);
    const zScore = calculateZScore(current.spread, mean, stdDev);

    // Entry logic
    if (!position) {
      if (zScore > ENTRY_THRESHOLD) {
        // Sell spread (short long, long short)
        position = {
          type: 'SELL',
          entrySpread: current.spread,
          entryDate: current.date,
          entryZ: zScore
        };
      } else if (zScore < -ENTRY_THRESHOLD) {
        // Buy spread (long long, short short)
        position = {
          type: 'BUY',
          entrySpread: current.spread,
          entryDate: current.date,
          entryZ: zScore
        };
      }
    }
    // Exit logic
    else {
      const shouldExit = Math.abs(zScore) < EXIT_THRESHOLD;
      
      if (shouldExit) {
        const spreadChange = current.spread - position.entrySpread;
        const bpsProfit = position.type === 'BUY' ? spreadChange : -spreadChange;
        
        // Convert bps to R$ (simplified: 1 bps move = risk/100)
        const plBrl = (bpsProfit / 100) * RISK_PER_TRADE;
        
        trades.push({
          type: position.type,
          entryDate: position.entryDate,
          exitDate: current.date,
          entryZ: position.entryZ,
          exitZ: zScore,
          entrySpread: position.entrySpread,
          exitSpread: current.spread,
          bpsProfit,
          plBrl
        });
        
        position = null;
      }
    }
  }

  return trades;
}

function calculateMetrics(trades) {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPlBrl: 0,
      avgPlBrl: 0,
      sharpeRatio: 0,
      maxDrawdown: 0
    };
  }

  const winningTrades = trades.filter(t => t.plBrl > 0).length;
  const losingTrades = trades.filter(t => t.plBrl < 0).length;
  const totalPlBrl = trades.reduce((sum, t) => sum + t.plBrl, 0);
  const avgPlBrl = totalPlBrl / trades.length;
  
  // Calculate equity curve
  let equity = [0];
  trades.forEach(t => {
    equity.push(equity[equity.length - 1] + t.plBrl);
  });
  
  // Calculate returns (daily returns from trade P&L)
  const returns = trades.map(t => t.plBrl);
  const sharpeRatio = calculateSharpeRatio(returns);
  const maxDrawdown = calculateMaxDrawdown(equity);

  return {
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    winRate: (winningTrades / trades.length) * 100,
    totalPlBrl,
    avgPlBrl,
    sharpeRatio,
    maxDrawdown: maxDrawdown * 100 // as percentage
  };
}

async function optimizeLookback() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔬  OTIMIZAÇÃO DO LOOKBACK PERIOD (Z-SCORE)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`📊 Testando lookbacks: ${LOOKBACK_PERIODS.join(', ')} dias`);
  console.log(`📈 Pares analisados: ${PAIRS.length}`);
  console.log(`⚙️  Entry threshold: |z| > ${ENTRY_THRESHOLD}`);
  console.log(`⚙️  Exit threshold: |z| < ${EXIT_THRESHOLD}`);
  console.log(`💰 Risco por trade: R$ ${RISK_PER_TRADE.toLocaleString('pt-BR')}\n`);
  
  const results = [];
  
  for (const lookback of LOOKBACK_PERIODS) {
    console.log(`\n${'─'.repeat(63)}`);
    console.log(`⏱️  Testando LOOKBACK = ${lookback} dias...`);
    console.log(`${'─'.repeat(63)}\n`);
    
    let allTrades = [];
    
    for (const pair of PAIRS) {
      const historicalData = await fetchHistoricalData(pair.short, pair.long);
      
      if (historicalData.length < lookback + 10) {
        console.log(`   ⚠️  ${pair.short} vs ${pair.long}: Dados insuficientes (${historicalData.length} dias)`);
        continue;
      }
      
      const trades = runBacktest(historicalData, lookback);
      allTrades = allTrades.concat(trades);
      
      console.log(`   ✓ ${pair.short} vs ${pair.long}: ${trades.length} trades`);
    }
    
    const metrics = calculateMetrics(allTrades);
    
    results.push({
      lookback,
      ...metrics
    });
    
    console.log(`\n   📊 RESULTADO CONSOLIDADO (${lookback} dias):`);
    console.log(`      Total de Trades: ${metrics.totalTrades}`);
    console.log(`      Win Rate: ${metrics.winRate.toFixed(1)}%`);
    console.log(`      P&L Total: R$ ${metrics.totalPlBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`      P&L Médio: R$ ${metrics.avgPlBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`      Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`);
    console.log(`      Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}%`);
  }
  
  // Summary table
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('📊  RESUMO COMPARATIVO');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('LOOKBACK | TRADES | WIN RATE |  P&L TOTAL  | P&L MÉDIO | SHARPE | DRAWDOWN');
  console.log('─'.repeat(78));
  
  results.forEach(r => {
    console.log(
      `  ${String(r.lookback).padStart(2)}d    | ` +
      `  ${String(r.totalTrades).padStart(3)}   | ` +
      `  ${r.winRate.toFixed(1).padStart(5)}%  | ` +
      `R$ ${r.totalPlBrl.toFixed(2).padStart(9)} | ` +
      `R$ ${r.avgPlBrl.toFixed(2).padStart(7)} | ` +
      ` ${r.sharpeRatio.toFixed(2).padStart(5)} | ` +
      ` ${r.maxDrawdown.toFixed(1).padStart(5)}%`
    );
  });
  
  // Find best by Sharpe Ratio
  const bestBySharpe = results.reduce((best, current) => 
    current.sharpeRatio > best.sharpeRatio ? current : best
  );
  
  // Find best by total P&L
  const bestByPL = results.reduce((best, current) => 
    current.totalPlBrl > best.totalPlBrl ? current : best
  );
  
  // Find best by win rate
  const bestByWinRate = results.reduce((best, current) => 
    current.winRate > best.winRate ? current : best
  );
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏆  VENCEDORES POR MÉTRICA');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`🎯 MELHOR SHARPE RATIO: ${bestBySharpe.lookback} dias (Sharpe: ${bestBySharpe.sharpeRatio.toFixed(2)})`);
  console.log(`   → Trades: ${bestBySharpe.totalTrades} | Win Rate: ${bestBySharpe.winRate.toFixed(1)}% | P&L: R$ ${bestBySharpe.totalPlBrl.toFixed(2)}`);
  
  console.log(`\n💰 MELHOR P&L TOTAL: ${bestByPL.lookback} dias (P&L: R$ ${bestByPL.totalPlBrl.toFixed(2)})`);
  console.log(`   → Trades: ${bestByPL.totalTrades} | Win Rate: ${bestByPL.winRate.toFixed(1)}% | Sharpe: ${bestByPL.sharpeRatio.toFixed(2)}`);
  
  console.log(`\n🎲 MELHOR WIN RATE: ${bestByWinRate.lookback} dias (Win Rate: ${bestByWinRate.winRate.toFixed(1)}%)`);
  console.log(`   → Trades: ${bestByWinRate.totalTrades} | P&L: R$ ${bestByWinRate.totalPlBrl.toFixed(2)} | Sharpe: ${bestByWinRate.sharpeRatio.toFixed(2)}`);
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅  RECOMENDAÇÃO FINAL');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`🏅 O lookback de ${bestBySharpe.lookback} dias apresenta o MELHOR SHARPE RATIO,`);
  console.log(`   indicando retorno ajustado ao risco superior.\n`);
  
  if (bestBySharpe.lookback !== 60) {
    console.log(`⚠️  AÇÃO NECESSÁRIA: Atualizar lookback de 60 → ${bestBySharpe.lookback} dias em:`);
    console.log(`   - api/backtest.js (linha ~84)`);
    console.log(`   - api/refresh.js (query .limit(...))\n`);
  } else {
    console.log(`✅ O lookback atual (60 dias) já é o valor otimizado!\n`);
  }
  
  return {
    results,
    bestBySharpe,
    bestByPL,
    bestByWinRate
  };
}

// Run optimization
optimizeLookback()
  .then(result => {
    console.log('\n✅ Otimização concluída com sucesso!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erro durante otimização:', error);
    process.exit(1);
  });
