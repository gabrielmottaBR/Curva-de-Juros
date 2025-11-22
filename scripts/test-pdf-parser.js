/**
 * Script de Teste - Parser de PDF BDI
 * Testa download e extração de dados DI1
 */

const https = require('https');
const { extractText } = require('unpdf');

async function testPDFParser() {
  try {
    console.log('📥 Baixando PDF de teste da B3...');
    
    // Data de teste: 21/11/2024 (quinta-feira)
    const testDate = '2024-11-21';
    const url = `https://www.b3.com.br/pesquisapregao/download?filelist=BDI_05_${testDate.replace(/-/g, '')}.pdf`;
    
    console.log(`URL: ${url}`);
    
    const pdfBuffer = await downloadPDF(url);
    console.log(`✅ PDF baixado: ${pdfBuffer.length} bytes`);
    
    // Converter para Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);
    console.log(`✅ Convertido para Uint8Array: ${uint8Array.length} bytes`);
    
    // Extrair texto
    console.log('📄 Extraindo texto do PDF...');
    const { text, totalPages } = await extractText(uint8Array, { mergePages: true });
    
    console.log(`✅ Texto extraído:`);
    console.log(`   - Total de páginas: ${totalPages}`);
    console.log(`   - Caracteres: ${text.length}`);
    console.log('');
    console.log('--- PREVIEW (primeiros 1000 caracteres) ---');
    console.log(text.substring(0, 1000));
    console.log('--- FIM PREVIEW ---');
    console.log('');
    
    // Procurar por DI1
    const di1Matches = text.match(/DI1F\d{2}/g);
    if (di1Matches) {
      console.log(`✅ Encontrados ${di1Matches.length} contratos DI1: ${[...new Set(di1Matches)].join(', ')}`);
    } else {
      console.log('❌ Nenhum contrato DI1 encontrado no texto extraído');
    }
    
    // Procurar por padrão de taxa
    const lines = text.split('\n');
    console.log('');
    console.log('--- Linhas contendo DI1 ---');
    for (const line of lines.slice(0, 100)) {
      if (line.includes('DI1')) {
        console.log(line);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
}

function downloadPDF(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

testPDFParser();
