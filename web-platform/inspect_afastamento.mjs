
import xlsx from 'xlsx';
import path from 'path';

const filePath = 'c:/Users/Usuário/Desktop/SESMT/dados/Afastamentos.xlsx';

const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet).slice(0, 5);

console.log('Sample data from Afastamentos.xlsx:');
console.log(JSON.stringify(data, null, 2));
