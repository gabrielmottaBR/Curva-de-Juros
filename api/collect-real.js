/**
 * Endpoint: POST /api/collect-real
 * 
 * Coleta dados reais DI1 do PDF BDI_05 da B3
 * 
 * Query params:
 *   - date (opcional): Data em formato YYYY-MM-DD (default: último dia útil)
 * 
 * Processo:
 *   1. Calcula data alvo (último pregão se não especificada)
 *   2. Download PDF BDI_05 com retry
 *   3. Parse e extração de dados DI1
 *   4. Validação (mínimo 7/9 contratos)
 *   5. UPSERT batch no Supabase
 *   6. Registro de metadata
 * 
 * Retorno:
 *   {success: true, date: '2025-11-19', records: 9, source: 'bdi_pdf'}
 */

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('./_shared');
const { downloadBDIPDF, getBDIPDFUrl } = require('./utils/pdf-downloader');
const { parseBDIPDF, validateExtractedData } = require('./parsers/bdi-parser');
const { getLastBusinessDay } = require('./utils/b3-calendar');
const { getActiveContracts } = require('./utils/contract-manager');

module.exports = async (req, res) => {
  // CORS
  if (handleOptions(req, res)) {
    return;
  }
  setCorsHeaders(res);
  
  const startTime = Date.now();
  console.log('='.repeat(60));
  console.log('📊 COLLECT REAL - Coleta de Dados B3');
  console.log('='.repeat(60));
  
  try {
    // 1. Determinar data alvo (usar let para permitir fallback)
    const originalDate = req.query.date || getLastBusinessDay();
    let targetDate = originalDate;
    let year = new Date(targetDate).getFullYear();
    let expectedContracts = getActiveContracts(year);
    
    console.log(`📅 Data alvo: ${targetDate}`);
    console.log(`📋 Contratos esperados (${year}): ${expectedContracts.join(', ')}`);
    console.log('');
    
    // 2. Download PDF
    console.log('📥 Step 1: Download PDF BDI_05...');
    let pdfUrl = getBDIPDFUrl(targetDate);
    console.log(`   URL: ${pdfUrl}`);
    
    let pdfBuffer;
    try {
      pdfBuffer = await downloadBDIPDF(targetDate, 3);
    } catch (downloadError) {
      console.error(`❌ Falha no download: ${downloadError.message}`);
      
      // Tentar dia útil anterior
      const previousDay = getLastBusinessDay(new Date(targetDate));
      console.log(`🔄 Tentando dia anterior: ${previousDay}`);
      
      try {
        pdfBuffer = await downloadBDIPDF(previousDay, 2);
        
        // Atualizar todas variáveis dependentes da data
        targetDate = previousDay;
        year = new Date(targetDate).getFullYear();
        expectedContracts = getActiveContracts(year);
        pdfUrl = getBDIPDFUrl(targetDate);
        
        console.log(`✅ Sucesso com ${previousDay}`);
      } catch (retryError) {
        return res.status(404).json({
          success: false,
          error: 'PDF não encontrado',
          message: `Não foi possível baixar PDF para ${originalDate} ou ${previousDay}`,
          url: getBDIPDFUrl(originalDate)
        });
      }
    }
    
    console.log('');
    
    // 3. Parse PDF
    console.log('🔍 Step 2: Parse PDF...');
    const di1Data = await parseBDIPDF(pdfBuffer, targetDate);
    console.log('');
    
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
    const fallbackUsed = targetDate !== originalDate;
    
    const metadata = {
      source_type: 'bdi_pdf',
      source_file: `BDI_05_${targetDate.replace(/-/g, '')}.pdf`,
      import_timestamp: new Date().toISOString(),
      records_raw: di1Data.length,
      records_unique: di1Data.length,
      records_imported: di1Data.length,
      date_range_start: targetDate,
      date_range_end: targetDate,
      contracts_count: di1Data.length,
      contracts_list: actualContracts.join(', '),
      rate_min: Math.min(...rates),
      rate_max: Math.max(...rates),
      dedup_strategy: 'none',
      notes: `Automated collection from B3 BDI_05 PDF. Imported: ${actualContracts[0]}-${actualContracts[actualContracts.length - 1]} (${actualContracts.length}/${expectedContracts.length} contracts)${fallbackUsed ? `. Fallback from ${originalDate} to ${targetDate}` : ''}`
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
      source: 'bdi_pdf',
      contracts: di1Data.map(d => d.contract_code),
      rate_range: {
        min: Math.min(...rates).toFixed(4),
        max: Math.max(...rates).toFixed(4)
      },
      duration: `${duration}s`,
      pdf_url: pdfUrl
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
