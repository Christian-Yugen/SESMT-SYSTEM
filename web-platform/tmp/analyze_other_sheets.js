const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DADOS_DIR = 'c:/Users/Usuário/Desktop/SESMT/dados';
const files = fs.readdirSync(DADOS_DIR).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

console.log('--- Resumo das Planilhas Auxiliares ---');

files.forEach(file => {
    if (file.includes('BancoDados')) return;
    
    try {
        const workbook = XLSX.readFile(path.join(DADOS_DIR, file));
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headers = data[0] || [];
        
        console.log(`\n📄 Arquivo: ${file}`);
        console.log(`   Colunas: ${headers.slice(0, 10).join(', ')}${headers.length > 10 ? '...' : ''}`);
        console.log(`   Registros: ${data.length - 1}`);
    } catch (e) {
        console.log(`   Erro ao ler ${file}: ${e.message}`);
    }
});
