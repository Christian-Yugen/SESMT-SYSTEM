import XLSX from 'xlsx';
import path from 'path';

const filePath = 'c:\\Users\\Usuário\\Desktop\\SESMT\\dados\\Afastamentos.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log("Colunas detectadas:", Object.keys(data[0] || {}));
console.log("Primeira linha:", data[0]);
