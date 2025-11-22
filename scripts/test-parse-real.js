const fs = require('fs');
const { extractText } = require('unpdf');

async function test() {
  console.log('📄 Testando parse do PDF real...');
  
  const pdfBuffer = fs.readFileSync('/tmp/test1.pdf');
  console.log(`PDF size: ${pdfBuffer.length} bytes`);
  
  const uint8Array = new Uint8Array(pdfBuffer);
  const { text, totalPages } = await extractText(uint8Array, { mergePages: true });
  
  console.log(`\n✅ Extração concluída:`);
  console.log(`- Páginas: ${totalPages}`);
  console.log(`- Caracteres: ${text.length}`);
  
  // Procurar DI1
  const di1Lines = text.split('\n').filter(line => line.includes('DI1F'));
  console.log(`\n📊 Linhas com DI1F (primeiras 20):`);
  di1Lines.slice(0, 20).forEach(line => console.log(line.trim()));
  
  // Testar regex
  console.log(`\n🔍 Testando regex de extração:`);
  const testContracts = ['DI1F27', 'DI1F28', 'DI1F29'];
  for (const contract of testContracts) {
    const regex = new RegExp(`${contract}\\s+(\\d{1,3}[\\.,]\\d{2,6})`, 'i');
    for (const line of text.split('\n')) {
      const match = line.match(regex);
      if (match) {
        console.log(`✅ ${contract}: ${match[1]} (linha: ${line.trim().substring(0, 100)})`);
        break;
      }
    }
  }
}

test().catch(console.error);
