/**
 * Endpoint: POST /api/collect-real
 * 
 * Coleta dados reais DI1 da API REST da B3 (TEMPO REAL APENAS)
 * 
 * IMPORTANTE: 
 * - A API B3 retorna APENAS dados atuais do mercado.
 * - Usa APENAS contratos DI1F (convenção Janeiro com F, ignora DI1J)
 * - Para dados históricos, use scripts/import-real-data.cjs
 * 
 * Processo:
 *   1. Usa data atual (hoje)
 *   2. Busca dados via API REST B3 (filtra apenas DI1F)
 *   3. Forward-fill: Contratos faltantes repetem cotação do dia anterior
 *   4. Validação (mínimo 7/9 contratos)
 *   5. UPSERT batch no Supabase (com deduplicação)
 *   6. Registro de metadata
 * 
 * Retorno:
 *   {success: true, date: '2025-11-22', records: 9, source: 'b3_api'}
 */

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('../lib/_shared');
const { fetchDI1DataFromAPI, validateExtractedData } = require('./utils/b3-api-client');
const { getLastBusinessDay } = require('./utils/b3-calendar');
const { getActiveContracts } = require('./utils/contract-manager');

module.exports = async (req, res) => {
  // CORS
  setCorsHeaders(res);
  if (handleOptions(req, res)) {
    return;
  }
  
  const startTime = Date.now();
  console.log('='.repeat(60));
  console.log('📊 COLLECT REAL - Coleta de Dados B3 (API REST)');
  console.log('='.repeat(60));
  
  // Global try-catch to prevent FUNCTION_INVOCATION_FAILED
  try {
    // 0. Rejeitar parâmetro date (API só funciona para dados atuais)
    if (req.query.date) {
      console.error(`❌ Parâmetro 'date' não é suportado`);
      return res.status(400).json({
        success: false,
        error: 'Parâmetro não suportado',
        message: 'A API B3 retorna apenas dados atuais. Para dados históricos, use scripts/import-real-data.cjs',
        rejected_date: req.query.date
      });
    }
    
    // 1. Determinar data atual (API B3 retorna APENAS dados atuais)
    const today = new Date();
    const targetDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const year = today.getFullYear();
    const expectedContracts = getActiveContracts(year);
    
    console.log(`📅 Data atual: ${targetDate}`);
    console.log(`⚠️  NOTA: API B3 retorna APENAS dados do mercado atual (não históricos)`);
    console.log(`📋 Contratos esperados (${year}): ${expectedContracts.join(', ')}`);
    console.log('');
    
    // 2. Buscar dados via API REST
    console.log('🌐 Step 1: Buscando dados via API B3...');
    const di1DataRaw = await fetchDI1DataFromAPI(targetDate);
    console.log('');
    
    // 3. Deduplicar (pegar última oferta de cada contrato)
    console.log('🔄 Step 2: Deduplicando...');
    const di1DataMap = new Map();
    for (const item of di1DataRaw) {
      di1DataMap.set(item.contract_code, item);
    }
    let di1Data = Array.from(di1DataMap.values());
    console.log(`   ${di1DataRaw.length} registros → ${di1Data.length} únicos`);
    console.log('');
    
    // 3.5. Forward-fill: Buscar contratos faltantes no dia anterior
    const foundContracts = di1Data.map(d => d.contract_code);
    const missingContracts = expectedContracts.filter(c => !foundContracts.includes(c));
    
    if (missingContracts.length > 0) {
      console.log('🔄 Step 2.5: Forward-fill para contratos faltantes...');
      console.log(`   Contratos não negociados hoje: ${missingContracts.join(', ')}`);
      
      // Buscar cotação mais recente de CADA contrato faltante (queries individuais)
      const supabase = getSupabaseClient();
      const fillCount = {filled: 0, missing: 0};
      
      for (const contract of missingContracts) {
        const { data: prevData, error: prevError } = await supabase
          .from('di1_prices')
          .select('rate, date')
          .eq('contract_code', contract)
          .order('date', { ascending: false })
          .limit(1)
          .single();
        
        if (prevError || !prevData) {
          console.warn(`   ⚠️  ${contract}: Sem dados anteriores disponíveis no banco`);
          fillCount.missing++;
        } else {
          di1Data.push({
            date: targetDate,
            contract_code: contract,
            rate: prevData.rate
          });
          console.log(`   ✓ ${contract}: ${prevData.rate.toFixed(4)}% (forward-fill de ${prevData.date})`);
          fillCount.filled++;
        }
      }
      
      console.log(`   Forward-fill: ${fillCount.filled} aplicados, ${fillCount.missing} sem histórico`);
      console.log('');
    }
    
    // 4. Validação
    console.log('✅ Step 3: Validação...');
    const validation = validateExtractedData(di1Data, 7);
    
    if (!validation.valid) {
      console.error(`❌ Validação falhou: ${validation.message}`);
      return res.status(400).json({
        success: false,
        error: 'Validação falhou',
        message: validation.message,
        found: di1Data.length,
        expected: expectedContracts.length
      });
    }
    
    console.log(`   ${validation.message}`);
    console.log('');
    
    // 5. UPSERT no Supabase
    console.log('💾 Step 4: UPSERT no Supabase...');
    const supabase = getSupabaseClient();
    
    const { data: upsertData, error: upsertError } = await supabase
      .from('di1_prices')
      .upsert(di1Data, {
        onConflict: 'contract_code,date',
        ignoreDuplicates: false
      });
    
    if (upsertError) {
      console.error(`❌ Erro no UPSERT: ${upsertError.message}`);
      throw upsertError;
    }
    
    console.log(`   ✅ ${di1Data.length} registros salvos`);
    console.log('');
    
    // 6. Registrar metadata
    console.log('📝 Step 5: Registrando metadata...');
    
    const rates = di1Data.map(d => d.rate);
    const actualContracts = di1Data.map(d => d.contract_code);
    
    const metadata = {
      source_type: 'b3_api',
      source_file: 'https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1',
      import_timestamp: new Date().toISOString(),
      records_raw: di1DataRaw.length,
      records_unique: di1Data.length,
      records_imported: di1Data.length,
      date_range_start: targetDate,
      date_range_end: targetDate,
      contracts_count: di1Data.length,
      contracts_list: actualContracts.join(', '),
      rate_min: Math.min(...rates),
      rate_max: Math.max(...rates),
      dedup_strategy: 'last_per_contract',
      notes: `Automated collection from B3 REST API. Imported: ${actualContracts[0]}-${actualContracts[actualContracts.length - 1]} (${actualContracts.length}/${expectedContracts.length} contracts). Deduped: ${di1DataRaw.length} → ${di1Data.length} records`
    };
    
    const { error: metadataError } = await supabase
      .from('import_metadata')
      .insert(metadata);
    
    if (metadataError) {
      console.warn(`⚠️  Erro ao salvar metadata: ${metadataError.message}`);
    } else {
      console.log('   ✅ Metadata registrada');
    }
    
    console.log('');
    
    // Resultado final
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('='.repeat(60));
    console.log(`✅ SUCESSO! Duração: ${duration}s`);
    console.log('='.repeat(60));
    console.log('');
    
    return res.status(200).json({
      success: true,
      date: targetDate,
      records: di1Data.length,
      source: 'b3_api',
      contracts: di1Data.map(d => d.contract_code),
      rate_range: {
        min: Math.min(...rates).toFixed(4),
        max: Math.max(...rates).toFixed(4)
      },
      duration: `${duration}s`,
      api_url: 'https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1'
    });
    
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error(`❌ ERRO: ${error.message}`);
    console.error('='.repeat(60));
    console.error(error.stack);
    console.error('');
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
