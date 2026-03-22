const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:/Users/Usuário/Desktop/SESMT/dados/BancoDados21032026.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const headers = data[0];
console.log('--- Cabeçalhos do Excel ---');
headers.forEach((h, i) => {
    console.log(`${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i/26) : ''}: ${h}`);
});

const sampleRow = data[1];
console.log('--- Amostra da Primeira Linha ---');
headers.forEach((h, i) => {
    console.log(`${h}: ${sampleRow[i]}`);
});
