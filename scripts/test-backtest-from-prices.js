require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function calculateMean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStdDev(values, mean) {
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

async function backtestFromPrices() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪  TESTE COMPLETO - Backtest com Threshold 1.5');
  console.log('═══════════════════════════════════════════════════════\n');

  const ENTRY_THRESHOLD = 1.5;
  const EXIT_THRESHOLD = 0.5;
  const RISK_PER_TRADE = 10000;
  const LOOKBACK = 60; // Janela para calcular z-score

  console.log(`🎯 Entry: |z| > ${ENTRY_THRESHOLD}`);
  console.log(`🚪 Exit: |z| < ${EXIT_THRESHOLD}`);
  console.log(`💰 Risco: R$ ${RISK_PER_TRADE.toLocaleString('pt-BR')}`);
  console.log(`📊 Lookback: ${LOOKBACK} dias\n`);

  // Buscar preços históricos
  const { data: prices, error } = await supabase
    .from('di1_prices')
    .select('*')
    .gte('date', '2024-11-21')
    .lte('date', '2025-11-21')
    .order('date', { ascending: true });

  if (error || !prices) {
    console.error('❌ Erro:', error);
    return;
  }

  // Agrupar por data
  const pricesByDate = {};
  for (const p of prices) {
    if (!pricesByDate[p.date]) pricesByDate[p.date] = {};
    pricesByDate[p.date][p.contract_code] = p.rate;
  }

  const dates = Object.keys(pricesByDate).sort();
  console.log(`✅ ${prices.length} preços carregados (${dates.length} dias)\n`);

  // Pares a testar
  const pairs = [
    ['DI1F27', 'DI1F28'],
    ['DI1F28', 'DI1F29'],
    ['DI1F29', 'DI1F30'],
    ['DI1F30', 'DI1F31'],
    ['DI1F31', 'DI1F32'],
    ['DI1F32', 'DI1F33']
  ];

  const trades = [];
  const openPositions = new Map();
  let dailyPnL = [];
  let cumulativePnL = 0;

  // Para cada par, calcular spreads e z-scores
  for (const [shortContract, longContract] of pairs) {
    const pairKey = `${shortContract}_${longContract}`;
    const spreads = [];
    const validDates = [];

    // Montar série de spreads
    for (const date of dates) {
      const shortRate = pricesByDate[date][shortContract];
      const longRate = pricesByDate[date][longContract];
      
      if (shortRate && longRate) {
        spreads.push(shortRate - longRate);
        validDates.push(date);
      }
    }

    if (spreads.length < LOOKBACK + 10) continue;

    // Simular trades com janela móvel
    for (let i = LOOKBACK; i < spreads.length; i++) {
      const window = spreads.slice(i - LOOKBACK, i);
      const mean = calculateMean(window);
      const stdDev = calculateStdDev(window, mean);
      const currentSpread = spreads[i];
      const zScore = calculateZScore(currentSpread, mean, stdDev);
      const date = validDates[i];

      const position = openPositions.get(pairKey);

      // Verificar saída
      if (position) {
        if (Math.abs(zScore) < EXIT_THRESHOLD) {
          const spreadChange = currentSpread - position.entry_spread;
          const pnlBps = position.type === 'BUY' ? spreadChange : -spreadChange;
          const pnlReais = pnlBps * (RISK_PER_TRADE / 100);

          trades.push({
            pair: pairKey,
            entry_date: position.entry_date,
            exit_date: date,
            entry_zscore: position.entry_zscore,
            exit_zscore: zScore,
            type: position.type,
            pnl: pnlReais,
            pnl_bps: pnlBps
          });

          openPositions.delete(pairKey);
        }
      } else {
        // Verificar entrada
        if (Math.abs(zScore) > ENTRY_THRESHOLD) {
          const tradeType = zScore > 0 ? 'SELL' : 'BUY';
          
          openPositions.set(pairKey, {
            entry_spread: currentSpread,
            entry_zscore: zScore,
            entry_date: date,
            type: tradeType
          });
        }
      }
    }
  }

  // Calcular P&L diário
  const pnlByDate = {};
  for (const trade of trades) {
    if (!pnlByDate[trade.exit_date]) pnlByDate[trade.exit_date] = 0;
    pnlByDate[trade.exit_date] += trade.pnl;
  }

  for (const date of dates) {
    const dailyPnLAmount = pnlByDate[date] || 0;
    cumulativePnL += dailyPnLAmount;
    dailyPnL.push({
      date: date,
      daily_pnl: dailyPnLAmount,
      cumulative_pnl: cumulativePnL
    });
  }

  // Métricas
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const losingTrades = totalTrades - winningTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;

  const pnlArray = dailyPnL.map(d => d.daily_pnl);
  const meanDaily = calculateMean(pnlArray);
  const stdDevDaily = calculateStdDev(pnlArray, meanDaily);
  const sharpeRatio = stdDevDaily > 0 ? (meanDaily / stdDevDaily) * Math.sqrt(252) : 0;

  let maxDrawdown = 0;
  let peak = 0;
  for (const point of dailyPnL) {
    if (point.cumulative_pnl > peak) peak = point.cumulative_pnl;
    const drawdown = peak - point.cumulative_pnl;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Resultados
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊  RESULTADOS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📈 MÉTRICAS:');
  console.log(`   Total de Trades: ${totalTrades}`);
  console.log(`   Vencedores: ${winningTrades} | Perdedores: ${losingTrades}`);
  console.log(`   Win Rate: ${winRate.toFixed(1)}%`);
  console.log(`   P&L Total: R$ ${totalPnL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   P&L Médio: R$ ${avgPnL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   Sharpe Ratio: ${sharpeRatio.toFixed(2)}`);
  console.log(`   Max Drawdown: R$ ${maxDrawdown.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  if (totalTrades > 0) {
    const buyTrades = trades.filter(t => t.type === 'BUY');
    const sellTrades = trades.filter(t => t.type === 'SELL');
    
    console.log('\n📊 DISTRIBUIÇÃO:');
    console.log(`   🟢 Compras: ${buyTrades.length} (${(buyTrades.length/totalTrades*100).toFixed(1)}%)`);
    console.log(`   🔴 Vendas: ${sellTrades.length} (${(sellTrades.length/totalTrades*100).toFixed(1)}%)`);

    console.log('\n📋 TOP 5 MELHORES TRADES:');
    const sorted = [...trades].sort((a, b) => b.pnl - a.pnl);
    sorted.slice(0, 5).forEach((t, idx) => {
      const signal = t.type === 'BUY' ? '🟢' : '🔴';
      console.log(`   ${idx + 1}. ${signal} ${t.pair} | ${t.entry_date} → ${t.exit_date}`);
      console.log(`      z: ${t.entry_zscore.toFixed(2)} → ${t.exit_zscore.toFixed(2)} | P&L: R$ ${t.pnl.toFixed(2)}`);
    });

    console.log('\n📋 TOP 5 PIORES TRADES:');
    sorted.slice(-5).reverse().forEach((t, idx) => {
      const signal = t.type === 'BUY' ? '🟢' : '🔴';
      console.log(`   ${idx + 1}. ${signal} ${t.pair} | ${t.entry_date} → ${t.exit_date}`);
      console.log(`      z: ${t.entry_zscore.toFixed(2)} → ${t.exit_zscore.toFixed(2)} | P&L: R$ ${t.pnl.toFixed(2)}`);
    });
  } else {
    console.log('\n⚠️  NENHUM TRADE EXECUTADO');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅  TESTE CONCLUÍDO');
  console.log('═══════════════════════════════════════════════════════\n');
}

backtestFromPrices().catch(console.error);
