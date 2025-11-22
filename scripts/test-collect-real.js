#!/usr/bin/env node

/**
 * Test Script: Collect Real Data
 * 
 * Testa o endpoint /api/collect-real localmente
 * 
 * Usage:
 *   node scripts/test-collect-real.js [YYYY-MM-DD]
 * 
 * Exemplos:
 *   node scripts/test-collect-real.js              # Último dia útil
 *   node scripts/test-collect-real.js 2025-11-19   # Data específica
 */

const http = require('http');

const targetDate = process.argv[2] || ''; // Data opcional

console.log('='.repeat(60));
console.log('🧪 TEST: Collect Real Data');
console.log('='.repeat(60));
console.log('');

if (targetDate) {
  console.log(`📅 Data alvo: ${targetDate}`);
} else {
  console.log('📅 Data alvo: Último dia útil (automático)');
}

console.log('🌐 Endpoint: http://localhost:3000/api/collect-real');
console.log('');
console.log('Aguardando resposta (pode levar até 60s)...');
console.log('');

const url = targetDate 
  ? `http://localhost:3000/api/collect-real?date=${targetDate}`
  : 'http://localhost:3000/api/collect-real';

const startTime = Date.now();

http.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('='.repeat(60));
    console.log(`📊 RESULTADO (${res.statusCode}) - ${duration}s`);
    console.log('='.repeat(60));
    console.log('');
    
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('✅ SUCESSO!');
        console.log('');
        console.log(`   Data:         ${result.date}`);
        console.log(`   Registros:    ${result.records}`);
        console.log(`   Source:       ${result.source}`);
        console.log(`   Contratos:    ${result.contracts.join(', ')}`);
        console.log(`   Taxa mín:     ${result.rate_range.min}%`);
        console.log(`   Taxa máx:     ${result.rate_range.max}%`);
        console.log(`   Duração:      ${result.duration}`);
        console.log(`   PDF URL:      ${result.pdf_url}`);
        console.log('');
        
        process.exit(0);
      } else {
        console.log('❌ ERRO!');
        console.log('');
        console.log(`   Erro:    ${result.error}`);
        console.log(`   Mensagem: ${result.message || 'N/A'}`);
        console.log('');
        
        process.exit(1);
      }
    } catch (error) {
      console.log('❌ ERRO ao parsear resposta!');
      console.log('');
      console.log('Resposta raw:');
      console.log(data);
      console.log('');
      
      process.exit(1);
    }
  });
}).on('error', (error) => {
  console.log('');
  console.log('='.repeat(60));
  console.log('❌ ERRO DE CONEXÃO');
  console.log('='.repeat(60));
  console.log('');
  console.log(error.message);
  console.log('');
  console.log('⚠️  Certifique-se de que o servidor local está rodando:');
  console.log('   npm run server');
  console.log('');
  
  process.exit(1);
});
