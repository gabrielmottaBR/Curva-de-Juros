/**
 * B3 API Client - Coleta de Dados DI1 via API REST
 * 
 * Consome a API pública da B3 para obter cotações DI1 em tempo real
 * Endpoint: https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1
 */

const { getActiveContracts } = require('./contract-manager');

/**
 * Busca dados DI1 da API REST da B3 (TEMPO REAL)
 * 
 * IMPORTANTE: Esta API retorna APENAS os dados atuais do mercado.
 * Não suporta consulta de dados históricos.
 * 
 * @param {string} date - Data de referência (YYYY-MM-DD) para registro no banco
 * @returns {Promise<Array>} Array de {date, contract_code, rate}
 */
async function fetchDI1DataFromAPI(date) {
  try {
    console.log(`[B3 API] Buscando dados DI1 do mercado ATUAL (será registrado como ${date})...`);
    
    const url = 'https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1';
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.Scty || !Array.isArray(data.Scty)) {
      throw new Error('Formato de resposta inválido da API B3');
    }
    
    console.log(`[B3 API] ✅ API retornou ${data.Scty.length} contratos`);
    
    // Extrair dados DI1 relevantes
    const di1Data = extractDI1Data(data.Scty, date);
    
    console.log(`[B3 API] ✅ Encontrados ${di1Data.length} contratos ativos`);
    
    return di1Data;
    
  } catch (error) {
    console.error(`[B3 API] ❌ Erro ao buscar dados: ${error.message}`);
    throw error;
  }
}

/**
 * Extrai e filtra dados DI1 relevantes da resposta da API
 * @param {Array} securities - Array de contratos da API
 * @param {string} date - Data de referência
 * @returns {Array} Array de {date, contract_code, rate}
 */
function extractDI1Data(securities, date) {
  const results = [];
  
  // Obter contratos ativos para o ano
  const year = new Date(date).getFullYear();
  const activeContracts = getActiveContracts(year);
  
  console.log(`[B3 API] Contratos esperados (${year}): ${activeContracts.join(', ')}`);
  
  // Mapear contratos da API
  for (const security of securities) {
    // O código está no campo 'symb' (ex: DI1J30)
    const apiSymbol = security.symb;
    
    if (!apiSymbol || !apiSymbol.startsWith('DI1')) {
      continue;
    }
    
    // Converter formato API (DI1J30) para nosso formato (DI1F30)
    // J = Janeiro (todos os DI1 vencem em Janeiro)
    const normalizedSymbol = apiSymbol.replace('DI1J', 'DI1F');
    
    // Verificar se é um contrato ativo
    if (!activeContracts.includes(normalizedSymbol)) {
      continue;
    }
    
    // Extrair taxa (curPrc é o preço atual - taxa em % a.a.)
    const currentPrice = security.SctyQtn?.curPrc;
    
    if (!currentPrice || typeof currentPrice !== 'number') {
      console.warn(`[B3 API]   ⚠️  ${normalizedSymbol}: Sem preço disponível`);
      continue;
    }
    
    // Validar taxa (razoabilidade: 5% a 30%)
    if (currentPrice < 5.0 || currentPrice > 30.0) {
      console.warn(`[B3 API]   ⚠️  ${normalizedSymbol}: Taxa fora do range ${currentPrice}% (esperado: 5-30%)`);
      continue;
    }
    
    results.push({
      date: date,
      contract_code: normalizedSymbol,
      rate: currentPrice
    });
    
    console.log(`[B3 API]   ✓ ${normalizedSymbol}: ${currentPrice.toFixed(4)}%`);
  }
  
  // Identificar contratos faltantes
  const foundContracts = results.map(r => r.contract_code);
  const missingContracts = activeContracts.filter(c => !foundContracts.includes(c));
  
  if (missingContracts.length > 0) {
    console.warn(`[B3 API]   ⚠️  Contratos faltando: ${missingContracts.join(', ')}`);
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
      message: 'Nenhum dado DI1 encontrado na API'
    };
  }
  
  if (data.length < minContracts) {
    return {
      valid: false,
      message: `Apenas ${data.length} contratos encontrados (mínimo: ${minContracts})`
    };
  }
  
  return {
    valid: true,
    message: `${data.length} contratos validados com sucesso`
  };
}

/**
 * Testa conectividade com a API B3
 * @returns {Promise<boolean>} True se API está acessível
 */
async function testAPIConnection() {
  try {
    const url = 'https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1';
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

module.exports = {
  fetchDI1DataFromAPI,
  validateExtractedData,
  testAPIConnection
};
