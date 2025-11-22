require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Copiar funções de cálculo do backend
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

async function backtestWithThreshold(threshold = 1.5) {
  console.log(`🔍 Executando backtest com threshold |z| > ${threshold}...\n`);

  // Buscar dados históricos
  const { data: prices, error } = await supabase
    .from('di1_prices')
    .select('*')
    .gte('date', '2024-11-21')
    .lte('date', '2025-11-21')
    .order('date', { ascending: true });

  if (error || !prices) {
    console.error('❌ Erro ao buscar dados:', error);
    return;
  }

  // Agrupar por data
  const pricesByDate = {};
  for (const p of prices) {
    if (!pricesByDate[p.date]) pricesByDate[p.date] = {};
    pricesByDate[p.date][p.contract_code] = p.rate;
  }

  const dates = Object.keys(pricesByDate).sort();
  console.log(`📅 Período: ${dates[0]} até ${dates[dates.length - 1]} (${dates.length} dias)\n`);

  // Simular pares (DI1F27 vs DI1F28, DI1F28 vs DI1F29, etc)
  const pairs = [
    ['DI1F27', 'DI1F28'],
    ['DI1F28', 'DI1F29'],
    ['DI1F29', 'DI1F30'],
    ['DI1F30', 'DI1F31'],
    ['DI1F31', 'DI1F32'],
    ['DI1F32', 'DI1F33'],
    ['DI1F33', 'DI1F34']
  ];

  let totalSignals = 0;
  let maxZScore = -Infinity;
  let minZScore = Infinity;
  const allSignals = [];

  for (const [shortContract, longContract] of pairs) {
    // Calcular spreads históricos
    const spreads = [];
    const validDates = [];

    for (const date of dates) {
      const shortRate = pricesByDate[date][shortContract];
      const longRate = pricesByDate[date][longContract];
      
      if (shortRate && longRate) {
        spreads.push(shortRate - longRate);
        validDates.push(date);
      }
    }

    if (spreads.length < 20) continue;

    // Calcular estatísticas com janela móvel
    const LOOKBACK = 60; // 60 dias de lookback

    for (let i = LOOKBACK; i < spreads.length; i++) {
      const window = spreads.slice(i - LOOKBACK, i);
      const mean = calculateMean(window);
      const stdDev = calculateStdDev(window, mean);
      const currentSpread = spreads[i];
      const zScore = calculateZScore(currentSpread, mean, stdDev);

      if (Math.abs(zScore) > threshold) {
        totalSignals++;
        allSignals.push({
          date: validDates[i],
          pair: `${shortContract} vs ${longContract}`,
          zScore: zScore,
          spread: currentSpread,
          mean: mean,
          stdDev: stdDev
        });

        if (zScore > maxZScore) maxZScore = zScore;
        if (zScore < minZScore) minZScore = zScore;
      }
    }
  }

  console.log('📊 RESULTADOS:\n');
  console.log(`   Threshold usado: |z| > ${threshold}`);
  console.log(`   Total de sinais encontrados: ${totalSignals}`);
  
  if (totalSignals > 0) {
    console.log(`   Z-score mínimo: ${minZScore.toFixed(2)}`);
    console.log(`   Z-score máximo: ${maxZScore.toFixed(2)}`);
    
    const buySignals = allSignals.filter(s => s.zScore < -threshold);
    const sellSignals = allSignals.filter(s => s.zScore > threshold);
    
    console.log(`\n   🟢 Sinais de COMPRA (z < -${threshold}): ${buySignals.length}`);
    console.log(`   🔴 Sinais de VENDA (z > ${threshold}): ${sellSignals.length}`);

    console.log('\n📋 TOP 10 SINAIS MAIS EXTREMOS:\n');
    
    const sortedSignals = allSignals.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
    sortedSignals.slice(0, 10).forEach((s, idx) => {
      const signal = s.zScore > 0 ? '🔴 VENDA' : '🟢 COMPRA';
      console.log(`   ${idx + 1}. ${signal} | ${s.pair}`);
      console.log(`      Data: ${s.date} | Z-Score: ${s.zScore.toFixed(2)}`);
      console.log(`      Spread: ${s.spread.toFixed(4)} bps (média: ${s.mean.toFixed(4)}, σ: ${s.stdDev.toFixed(4)})`);
    });
  } else {
    console.log('\n⚠️  NENHUM sinal encontrado mesmo com threshold reduzido.');
    console.log('   Mercado extremamente estável no período analisado.');
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📈  Análise de Z-Scores com Threshold Flexível');
  console.log('═══════════════════════════════════════════════════════\n');

  // Testar com threshold 1.5
  await backtestWithThreshold(1.5);
  
  console.log('\n═══════════════════════════════════════════════════════\n');
  
  // Testar também com 1.0 para comparação
  await backtestWithThreshold(1.0);
  
  console.log('\n═══════════════════════════════════════════════════════');
}

main().catch(console.error);
