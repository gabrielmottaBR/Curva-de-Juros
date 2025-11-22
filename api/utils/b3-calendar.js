/**
 * B3 Calendar - Calendário de Dias Úteis da B3
 * 
 * Gerencia feriados da B3 e cálculo de dias úteis
 */

// Feriados B3 2025-2030 (expandir conforme necessário)
const B3_HOLIDAYS = {
  2025: [
    '2025-01-01', // Confraternização Universal
    '2025-01-25', // Aniversário de São Paulo
    '2025-03-04', // Carnaval
    '2025-04-18', // Paixão de Cristo
    '2025-04-21', // Tiradentes
    '2025-05-01', // Dia do Trabalho
    '2025-06-19', // Corpus Christi
    '2025-07-09', // Revolução Constitucionalista
    '2025-09-07', // Independência do Brasil
    '2025-10-12', // Nossa Senhora Aparecida
    '2025-11-02', // Finados
    '2025-11-15', // Proclamação da República
    '2025-11-20', // Consciência Negra
    '2025-12-25', // Natal
    '2025-12-31'  // Encerramento do ano
  ],
  2026: [
    '2026-01-01', '2026-01-25', '2026-02-17', '2026-04-03',
    '2026-04-21', '2026-05-01', '2026-06-04', '2026-07-09',
    '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15',
    '2026-11-20', '2026-12-25', '2026-12-31'
  ],
  2027: [
    '2027-01-01', '2027-01-25', '2027-02-09', '2027-03-26',
    '2027-04-21', '2027-05-01', '2027-05-27', '2027-07-09',
    '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15',
    '2027-11-20', '2027-12-25', '2027-12-31'
  ]
};

/**
 * Verifica se uma data é dia útil (não é fim de semana nem feriado)
 * @param {Date|string} date - Data a verificar
 * @returns {boolean} True se é dia útil
 */
function isBusinessDay(date) {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : new Date(date);
  
  // Verifica fim de semana
  const dayOfWeek = d.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false; // Domingo ou Sábado
  }
  
  // Verifica feriado
  const year = d.getFullYear();
  const dateStr = d.toISOString().split('T')[0];
  
  if (B3_HOLIDAYS[year]) {
    return !B3_HOLIDAYS[year].includes(dateStr);
  }
  
  // Se ano não tem feriados cadastrados, assume que é dia útil
  return true;
}

/**
 * Retorna o último dia útil anterior à data fornecida
 * @param {Date|string} date - Data de referência (default: hoje)
 * @returns {string} Data do último dia útil em formato YYYY-MM-DD
 */
function getLastBusinessDay(date = new Date()) {
  let d = typeof date === 'string' ? new Date(date + 'T12:00:00') : new Date(date);
  
  // Retroceder até encontrar um dia útil
  while (true) {
    d.setDate(d.getDate() - 1); // Volta 1 dia
    
    if (isBusinessDay(d)) {
      return d.toISOString().split('T')[0]; // YYYY-MM-DD
    }
  }
}

/**
 * Retorna o próximo dia útil após a data fornecida
 * @param {Date|string} date - Data de referência (default: hoje)
 * @returns {string} Data do próximo dia útil em formato YYYY-MM-DD
 */
function getNextBusinessDay(date = new Date()) {
  let d = typeof date === 'string' ? new Date(date + 'T12:00:00') : new Date(date);
  
  // Avançar até encontrar um dia útil
  while (true) {
    d.setDate(d.getDate() + 1); // Avança 1 dia
    
    if (isBusinessDay(d)) {
      return d.toISOString().split('T')[0]; // YYYY-MM-DD
    }
  }
}

/**
 * Calcula número de dias úteis entre duas datas
 * @param {Date|string} startDate - Data inicial
 * @param {Date|string} endDate - Data final
 * @returns {number} Número de dias úteis
 */
function countBusinessDays(startDate, endDate) {
  const start = typeof startDate === 'string' ? new Date(startDate + 'T12:00:00') : new Date(startDate);
  const end = typeof endDate === 'string' ? new Date(endDate + 'T12:00:00') : new Date(endDate);
  
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Adiciona feriados para um ano específico
 * @param {number} year - Ano
 * @param {string[]} holidays - Array de datas em formato YYYY-MM-DD
 */
function addHolidays(year, holidays) {
  B3_HOLIDAYS[year] = holidays;
}

module.exports = {
  isBusinessDay,
  getLastBusinessDay,
  getNextBusinessDay,
  countBusinessDays,
  addHolidays,
  B3_HOLIDAYS
};
