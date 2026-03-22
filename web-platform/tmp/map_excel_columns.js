const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:/Users/Usuário/Desktop/SESMT/dados/BancoDados21032026.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Get headers correctly identifying the columns
const range = XLSX.utils.decode_range(sheet['!ref']);
const headers = [];
for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + "1";
    const cell = sheet[address];
    headers.push({ col: XLSX.utils.encode_col(C), val: cell ? cell.v : undefined });
}

console.log('--- Mapeamento de Colunas do Excel ---');
headers.forEach(h => {
    console.log(`${h.col}: ${h.val}`);
});
