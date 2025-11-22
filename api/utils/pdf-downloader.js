/**
 * PDF Downloader - Download de PDFs BDI da B3 com Retry
 * 
 * Faz download dos boletins diários BDI_05 (Clearing) da B3
 * com retry automático e tratamento de erros
 */

/**
 * Faz download de PDF BDI_05 para uma data específica
 * @param {string} date - Data em formato YYYY-MM-DD
 * @param {number} maxRetries - Número máximo de tentativas (default: 3)
 * @returns {Promise<Buffer>} Buffer do PDF
 */
async function downloadBDIPDF(date, maxRetries = 3) {
  const dateFormatted = date.replace(/-/g, ''); // 2025-11-19 → 20251119
  const url = `https://arquivos.b3.com.br/bdi/download/bdi/${date}/BDI_05_${dateFormatted}.pdf`;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[PDF Download] Tentativa ${attempt}/${maxRetries}: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`[PDF Download] ✅ Sucesso! Tamanho: ${(buffer.length / 1024).toFixed(2)} KB`);
      
      return buffer;
      
    } catch (error) {
      lastError = error;
      console.error(`[PDF Download] ❌ Falha na tentativa ${attempt}: ${error.message}`);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        console.log(`[PDF Download] ⏳ Aguardando ${waitTime}ms antes de retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Falha após ${maxRetries} tentativas: ${lastError.message}`);
}

/**
 * Verifica se PDF existe para uma data específica
 * @param {string} date - Data em formato YYYY-MM-DD
 * @returns {Promise<boolean>} True se PDF existe
 */
async function checkBDIPDFExists(date) {
  try {
    const dateFormatted = date.replace(/-/g, '');
    const url = `https://arquivos.b3.com.br/bdi/download/bdi/${date}/BDI_05_${dateFormatted}.pdf`;
    
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
    
  } catch (error) {
    return false;
  }
}

/**
 * Monta URL do PDF BDI_05 para uma data
 * @param {string} date - Data em formato YYYY-MM-DD
 * @returns {string} URL completa do PDF
 */
function getBDIPDFUrl(date) {
  const dateFormatted = date.replace(/-/g, '');
  return `https://arquivos.b3.com.br/bdi/download/bdi/${date}/BDI_05_${dateFormatted}.pdf`;
}

module.exports = {
  downloadBDIPDF,
  checkBDIPDFExists,
  getBDIPDFUrl
};
