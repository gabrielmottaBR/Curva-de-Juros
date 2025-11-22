/**
 * BDI Parser - Extração de Dados DI1 de PDFs BDI_05
 * 
 * Extrai dados de contratos DI1 do boletim diário BDI_05 (Clearing) da B3
 * usando pdf-parse e lógica de rolling window para validar contratos
 */

const pdf = require('pdf-parse');
const { getActiveContracts } = require('../utils/contract-manager');

/**
 * Parseia PDF BDI_05 e extrai dados DI1
 * @param {Buffer} pdfBuffer - Buffer do PDF
 * @param {string} date - Data de referência (YYYY-MM-DD)
 * @returns {Promise<Array>} Array de {date, contract_code, rate}
 */
async function parseBDIPDF(pdfBuffer, date) {
  try {
    console.log(`[BDI Parser] Iniciando parse do PDF para ${date}...`);
    
    // Parse PDF para texto
    const data = await pdf(pdfBuffer);
    const text = data.text;
    
    console.log(`[BDI Parser] PDF parsed. Total de páginas: ${data.numpages}`);
    
    // Obter contratos ativos para o ano
    const year = new Date(date).getFullYear();
    const activeContracts = getActiveContracts(year);
    
    console.log(`[BDI Parser] Contratos esperados (${year}): ${activeContracts.join(', ')}`);
    
    // Extrair linhas DI1
    const di1Data = extractDI1Lines(text, activeContracts, date);
    
    console.log(`[BDI Parser] ✅ Encontrados ${di1Data.length}/${activeContracts.length} contratos`);
    
    return di1Data;
    
  } catch (error) {
    console.error(`[BDI Parser] ❌ Erro ao parsear PDF: ${error.message}`);
    throw error;
  }
}

/**
 * Extrai linhas DI1 do texto do PDF
 * @param {string} text - Texto completo do PDF
 * @param {string[]} activeContracts - Contratos ativos para buscar
 * @param {string} date - Data de referência
 * @returns {Array} Array de {date, contract_code, rate}
 */
function extractDI1Lines(text, activeContracts, date) {
  const results = [];
  const lines = text.split('\n');
  
  // Padrões de regex para matching
  // Formato esperado: DI1F27  13.4123  ou DI1F27 13,4123
  const di1Patterns = activeContracts.map(contract => ({
    contract,
    // Pattern flexível: contrato + espaços + número decimal
    regex: new RegExp(`${contract}\\s+(\\d{1,3}[\\.,]\\d{2,6})`, 'i')
  }));
  
  // Procurar por linhas que contenham dados DI1
  for (const line of lines) {
    for (const { contract, regex } of di1Patterns) {
      const match = line.match(regex);
      
      if (match) {
        // Extrair taxa (converter vírgula para ponto)
        const rateStr = match[1].replace(',', '.');
        const rate = parseFloat(rateStr);
        
        // Validar taxa (razoabilidade: 5% a 30%)
        if (rate >= 5.0 && rate <= 30.0) {
          results.push({
            date: date,
            contract_code: contract,
            rate: rate
          });
          
          console.log(`[BDI Parser]   ✓ ${contract}: ${rate.toFixed(4)}%`);
        } else {
          console.warn(`[BDI Parser]   ⚠️  ${contract}: Taxa inválida ${rate}% (fora do range 5-30%)`);
        }
        
        break; // Encontrou contrato, ir para próximo
      }
    }
  }
  
  // Identificar contratos faltantes
  const foundContracts = results.map(r => r.contract_code);
  const missingContracts = activeContracts.filter(c => !foundContracts.includes(c));
  
  if (missingContracts.length > 0) {
    console.warn(`[BDI Parser]   ⚠️  Contratos faltando: ${missingContracts.join(', ')}`);
  }
  
  return results;
}

/**
 * Validação de dados extraídos
 * @param {Array} data - Dados extraídos
 * @param {number} minContracts - Mínimo de contratos esperados (default: 7)
 * @returns {Object} {valid: boolean, message: string}
 */
function validateExtractedData(data, minContracts = 7) {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      valid: false,
      message: 'Nenhum dado DI1 encontrado no PDF'
    };
  }
  
  if (data.length < minContracts) {
    return {
      valid: false,
      message: `Apenas ${data.length} contratos encontrados (mínimo: ${minContracts})`
    };
  }
  
  // Verificar duplicatas
  const contracts = data.map(d => d.contract_code);
  const unique = new Set(contracts);
  
  if (contracts.length !== unique.size) {
    return {
      valid: false,
      message: 'Contratos duplicados encontrados'
    };
  }
  
  return {
    valid: true,
    message: `${data.length} contratos válidos`
  };
}

module.exports = {
  parseBDIPDF,
  validateExtractedData
};
