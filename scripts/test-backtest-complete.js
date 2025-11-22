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

async function runBacktest() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪  TESTE COMPLETO DE BACKTEST - Threshold 1.5');
  console.log('═══════════════════════════════════════════════════════\n');

  const startDate = '2024-11-21';
  const endDate = '2025-11-21';
  const ENTRY_THRESHOLD = 1.5;
  const EXIT_THRESHOLD = 0.5;
  const RISK_PER_TRADE = 10000;

  console.log(`📅 Período: ${startDate} até ${endDate}`);
  console.log(`🎯 Entry Threshold: |z| > ${ENTRY_THRESHOLD}`);
  console.log(`🚪 Exit Threshold: |z| < ${EXIT_THRESHOLD}`);
  console.log(`💰 Risco por Trade: R$ ${RISK_PER_TRADE.toLocaleString('pt-BR')}\n`);

  // Buscar oportunidades do cache
  const { data: opportunities, error } = await supabase
    .from('opportunities_cache')
    .select('*')
    .gte('calculated_at', startDate)
    .lte('calculated_at', endDate)
    .order('calculated_at', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar dados:', error);
    return;
  }

  if (!opportunities || opportunities.length === 0) {
    console.log('⚠️  Nenhuma oportunidade encontrada no período.');
    console.log('   Executando refresh para recalcular...\n');
    return;
  }

  console.log(`✅ ${opportunities.length} oportunidades carregadas do cache\n`);

  // Agrupar por data
  const oppsByDate = {};
  for (const opp of opportunities) {
    const date = opp.calculated_at?.substring(0, 10);
    if (!oppsByDate[date]) oppsByDate[date] = [];
    oppsByDate[date].push(opp);
  }

  const dates = Object.keys(oppsByDate).sort();
  console.log(`📊 Dados distribuídos em ${dates.length} dias\n`);

  // Simular trades
  const trades = [];
  const openPositions = new Map();
  let dailyPnL = [];
  let cumulativePnL = 0;

  for (const date of dates) {
    const dailyOpps = oppsByDate[date];
    let dailyPnLAmount = 0;

    for (const opp of dailyOpps) {
      const pairKey = `${opp.short_contract}_${opp.long_contract}`;
      const currentZScore = opp.z_score;
      const currentSpread = opp.current_spread;
      const position = openPositions.get(pairKey);

      // Verificar saída
      if (position) {
        if (Math.abs(currentZScore) < EXIT_THRESHOLD) {
          const spreadChange = currentSpread - position.entry_spread;
          const pnlBps = position.type === 'BUY' ? spreadChange : -spreadChange;
          const pnlReais = pnlBps * (RISK_PER_TRADE / 100);

          trades.push({
            pair: pairKey,
            entry_date: position.entry_date,
            exit_date: date,
            entry_zscore: position.entry_zscore,
            exit_zscore: currentZScore,
            type: position.type,
            pnl: pnlReais,
            pnl_bps: pnlBps
          });

          dailyPnLAmount += pnlReais;
          openPositions.delete(pairKey);
        }
      } else {
        // Verificar entrada
        if (Math.abs(currentZScore) > ENTRY_THRESHOLD) {
          const tradeType = currentZScore > 0 ? 'SELL' : 'BUY';
          
          openPositions.set(pairKey, {
            entry_spread: currentSpread,
            entry_zscore: currentZScore,
            entry_date: date,
            type: tradeType,
            risk_amount: RISK_PER_TRADE
          });
        }
      }
    }

    cumulativePnL += dailyPnLAmount;
    dailyPnL.push({
      date: date,
      daily_pnl: dailyPnLAmount,
      cumulative_pnl: cumulativePnL
    });
  }

  // Calcular métricas
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;

  // Sharpe Ratio
  const pnlArray = dailyPnL.map(d => d.daily_pnl);
  const meanDaily = calculateMean(pnlArray);
  const stdDevDaily = calculateStdDev(pnlArray, meanDaily);
  const sharpeRatio = stdDevDaily > 0 ? (meanDaily / stdDevDaily) * Math.sqrt(252) : 0;

  // Max Drawdown
  let maxDrawdown = 0;
  let peak = 0;
  for (const point of dailyPnL) {
    if (point.cumulative_pnl > peak) peak = point.cumulative_pnl;
    const drawdown = peak - point.cumulative_pnl;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Exibir resultados
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊  RESULTADOS DO BACKTEST');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📈 MÉTRICAS GERAIS:');
  console.log(`   Total de Trades: ${totalTrades}`);
  console.log(`   Trades Vencedores: ${winningTrades}`);
  console.log(`   Trades Perdedores: ${totalTrades - winningTrades}`);
  console.log(`   Win Rate: ${winRate.toFixed(1)}%`);
  console.log(`   P&L Total: R$ ${totalPnL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   P&L Médio: R$ ${avgPnL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   Sharpe Ratio: ${sharpeRatio.toFixed(2)}`);
  console.log(`   Max Drawdown: R$ ${maxDrawdown.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  if (totalTrades > 0) {
    console.log('\n📋 AMOSTRA DE TRADES (Top 10 por P&L):');
    const sortedTrades = [...trades].sort((a, b) => b.pnl - a.pnl);
    sortedTrades.slice(0, 10).forEach((t, idx) => {
      const signal = t.type === 'BUY' ? '🟢 COMPRA' : '🔴 VENDA';
      console.log(`\n   ${idx + 1}. ${signal} | ${t.pair}`);
      console.log(`      Entrada: ${t.entry_date} | z = ${t.entry_zscore.toFixed(2)}`);
      console.log(`      Saída: ${t.exit_date} | z = ${t.exit_zscore.toFixed(2)}`);
      console.log(`      P&L: R$ ${t.pnl.toFixed(2)} (${t.pnl_bps.toFixed(2)} bps)`);
    });

    // Distribuição por tipo
    const buyTrades = trades.filter(t => t.type === 'BUY');
    const sellTrades = trades.filter(t => t.type === 'SELL');
    
    console.log('\n\n📊 DISTRIBUIÇÃO POR TIPO:');
    console.log(`   🟢 Compras: ${buyTrades.length} trades (${(buyTrades.length/totalTrades*100).toFixed(1)}%)`);
    console.log(`   🔴 Vendas: ${sellTrades.length} trades (${(sellTrades.length/totalTrades*100).toFixed(1)}%)`);
  } else {
    console.log('\n⚠️  NENHUM TRADE EXECUTADO');
    console.log('   Possíveis causas:');
    console.log('   1. Cache de oportunidades não foi recalculado com dados históricos');
    console.log('   2. Z-scores no cache ainda usam cálculo antigo');
    console.log('   3. Dados insuficientes no período');
  }

  console.log('\n═══════════════════════════════════════════════════════');
}

runBacktest().catch(console.error);
