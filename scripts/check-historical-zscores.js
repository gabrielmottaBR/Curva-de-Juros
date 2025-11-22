const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function analyzeHistoricalZScores() {
  console.log('🔍 Analisando z-scores históricos via Backtest...\n');

  const url = 'https://curvadejuros.vercel.app/api/backtest?start_date=2024-11-21&end_date=2025-11-21&trade_type=BOTH&risk_per_trade=10000';
  
  try {
    const data = await httpsGet(url);

    if (!data.success) {
      console.error('❌ Erro:', data.error || 'Resposta inválida');
      return;
    }

    console.log('✅ Backtest executado com sucesso!\n');
    console.log('📊 RESULTADOS:');
    console.log(`   Total de trades: ${data.metrics.total_trades}`);
    console.log(`   Win rate: ${data.metrics.win_rate.toFixed(1)}%`);
    console.log(`   P&L total: R$ ${data.metrics.pnl_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   Sharpe ratio: ${data.metrics.sharpe_ratio.toFixed(2)}`);
    console.log('');

    if (data.trades && data.trades.length > 0) {
      const buyTrades = data.trades.filter(t => t.type === 'BUY');
      const sellTrades = data.trades.filter(t => t.type === 'SELL');

      console.log('📈 SINAIS ENCONTRADOS (|z-score| > 2):\n');
      console.log(`   🟢 COMPRAS (z < -2): ${buyTrades.length} sinais`);
      if (buyTrades.length > 0) {
        const minZ = Math.min(...buyTrades.map(t => t.entry_zscore));
        console.log(`      Z-score mais extremo: ${minZ.toFixed(2)}`);
      }

      console.log(`   🔴 VENDAS (z > 2): ${sellTrades.length} sinais`);
      if (sellTrades.length > 0) {
        const maxZ = Math.max(...sellTrades.map(t => t.entry_zscore));
        console.log(`      Z-score mais extremo: ${maxZ.toFixed(2)}`);
      }

      console.log('\n📋 AMOSTRA DE TRADES (primeiros 5):');
      data.trades.slice(0, 5).forEach((t, idx) => {
        console.log(`   ${idx + 1}. ${t.pair} (${t.type})`);
        console.log(`      Entrada: ${t.entry_date} | z = ${t.entry_zscore.toFixed(2)}`);
        console.log(`      Saída: ${t.exit_date} | z = ${t.exit_zscore.toFixed(2)}`);
        console.log(`      P&L: R$ ${t.pnl.toFixed(2)} (${t.pnl_bps.toFixed(2)} bps)`);
      });
    } else {
      console.log('⚠️  NENHUM TRADE EXECUTADO');
      console.log('   Isso significa que NENHUM z-score ultrapassou ±2 no período histórico.');
      console.log('   Os spreads entre contratos DI1 estiveram muito estáveis.\n');
      console.log('💡 Sugestões:');
      console.log('   1. Ajustar threshold de entrada (ex: |z| > 1.5)');
      console.log('   2. Coletar mais dados históricos de períodos voláteis');
      console.log('   3. Aguardar eventos de mercado que gerem distorções');
    }
  } catch (error) {
    console.error('❌ Erro ao executar análise:', error.message);
  }
}

analyzeHistoricalZScores();
