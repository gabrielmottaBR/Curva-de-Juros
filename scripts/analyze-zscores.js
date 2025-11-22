require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeZScores() {
  console.log('🔍 Analisando z-scores históricos...\n');

  const { data, error } = await supabase
    .from('opportunities_cache')
    .select('pair_id, short_label, long_label, z_score, current_spread, calculated_at')
    .order('z_score', { ascending: true });

  if (error) {
    console.error('❌ Erro ao consultar banco:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Nenhum dado encontrado no banco de dados');
    return;
  }

  const zscores = data.map(d => d.z_score).filter(z => z !== null && !isNaN(z));
  
  const minZScore = Math.min(...zscores);
  const maxZScore = Math.max(...zscores);
  
  const extremosNegativos = data.filter(d => d.z_score < -2).sort((a, b) => a.z_score - b.z_score);
  const extremosPositivos = data.filter(d => d.z_score > 2).sort((a, b) => b.z_score - a.z_score);
  
  console.log('📊 ESTATÍSTICAS GERAIS:');
  console.log(`   Total de registros: ${data.length}`);
  console.log(`   Z-score mínimo: ${minZScore.toFixed(2)}`);
  console.log(`   Z-score máximo: ${maxZScore.toFixed(2)}`);
  console.log(`   Oportunidades de COMPRA (z < -2): ${extremosNegativos.length}`);
  console.log(`   Oportunidades de VENDA (z > 2): ${extremosPositivos.length}`);
  console.log(`   Total de sinais de entrada (|z| > 2): ${extremosNegativos.length + extremosPositivos.length}\n`);

  if (extremosNegativos.length > 0) {
    console.log('📈 TOP 10 OPORTUNIDADES DE COMPRA (z-score mais negativo):');
    extremosNegativos.slice(0, 10).forEach((opp, idx) => {
      const date = opp.calculated_at?.substring(0, 10) || 'N/A';
      console.log(`   ${idx + 1}. ${opp.short_label} vs ${opp.long_label}`);
      console.log(`      Z-Score: ${opp.z_score.toFixed(2)} | Spread: ${opp.current_spread?.toFixed(2) || 'N/A'} bps | Data: ${date}`);
    });
    console.log();
  }

  if (extremosPositivos.length > 0) {
    console.log('📉 TOP 10 OPORTUNIDADES DE VENDA (z-score mais positivo):');
    extremosPositivos.slice(0, 10).forEach((opp, idx) => {
      const date = opp.calculated_at?.substring(0, 10) || 'N/A';
      console.log(`   ${idx + 1}. ${opp.short_label} vs ${opp.long_label}`);
      console.log(`      Z-Score: ${opp.z_score.toFixed(2)} | Spread: ${opp.current_spread?.toFixed(2) || 'N/A'} bps | Data: ${date}`);
    });
    console.log();
  }

  if (extremosNegativos.length === 0 && extremosPositivos.length === 0) {
    console.log('⚠️  NENHUM sinal de entrada encontrado (|z-score| > 2)');
    console.log('   Isso significa que a estratégia de backtesting NÃO executaria trades.');
    console.log('   Período analisado pode ter spreads muito estáveis.\n');
  }

  const datas = [...new Set(data.map(d => d.calculated_at?.substring(0, 10)).filter(Boolean))].sort();
  if (datas.length > 0) {
    console.log(`📅 PERÍODO DOS DADOS:`);
    console.log(`   Primeira data: ${datas[0]}`);
    console.log(`   Última data: ${datas[datas.length - 1]}`);
    console.log(`   Total de dias: ${datas.length}`);
  }
}

analyzeZScores().catch(console.error);
