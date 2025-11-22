/**
 * Contract Manager - Gestão Dinâmica de Contratos DI1
 * 
 * Implementa lógica de rolling window para contratos DI1:
 * - Primeiro contrato: Janeiro do ano (atual + 2)
 * - Último contrato: Janeiro do ano (atual + 10)
 * - Total: Sempre 9 contratos (8 anos de diferença)
 * 
 * Exemplos:
 * - 2025: DI1F27 até DI1F35 (Jan/2027 até Jan/2035)
 * - 2026: DI1F28 até DI1F36 (Jan/2028 até Jan/2036)
 * - 2027: DI1F29 até DI1F37 (Jan/2029 até Jan/2037)
 */

/**
 * Retorna lista de contratos DI1 ativos para um ano específico
 * @param {number} year - Ano de referência (default: ano atual)
 * @returns {string[]} Array de códigos de contratos (ex: ['DI1F27', 'DI1F28', ...])
 */
function getActiveContracts(year = new Date().getFullYear()) {
  const startYear = year + 2;  // 2025 → 2027
  const endYear = year + 10;   // 2025 → 2035
  
  const contracts = [];
  for (let y = startYear; y <= endYear; y++) {
    const suffix = y.toString().slice(-2); // 2027 → '27'
    contracts.push(`DI1F${suffix}`);
  }
  
  return contracts; // ['DI1F27', 'DI1F28', ..., 'DI1F35']
}

/**
 * Verifica se um contrato está ativo em determinado ano
 * @param {string} contractCode - Código do contrato (ex: 'DI1F27')
 * @param {number} year - Ano de referência (default: ano atual)
 * @returns {boolean} True se contrato está ativo no ano
 */
function isContractActive(contractCode, year = new Date().getFullYear()) {
  const activeContracts = getActiveContracts(year);
  return activeContracts.includes(contractCode);
}

/**
 * Extrai ano de vencimento do código do contrato
 * @param {string} contractCode - Código do contrato (ex: 'DI1F27')
 * @returns {number} Ano de vencimento (ex: 2027)
 */
function getContractMaturityYear(contractCode) {
  const match = contractCode.match(/DI1F(\d{2})/);
  if (!match) {
    throw new Error(`Código de contrato inválido: ${contractCode}`);
  }
  
  const suffix = parseInt(match[1], 10); // '27' → 27
  const year = 2000 + suffix; // 27 → 2027
  
  return year;
}

/**
 * Retorna informações sobre o range de contratos para um ano
 * @param {number} year - Ano de referência (default: ano atual)
 * @returns {Object} Objeto com firstContract, lastContract, total, years
 */
function getContractInfo(year = new Date().getFullYear()) {
  const contracts = getActiveContracts(year);
  
  return {
    year: year,
    firstContract: contracts[0],
    lastContract: contracts[contracts.length - 1],
    total: contracts.length,
    startYear: year + 2,
    endYear: year + 10,
    contracts: contracts
  };
}

module.exports = {
  getActiveContracts,
  isContractActive,
  getContractMaturityYear,
  getContractInfo
};
