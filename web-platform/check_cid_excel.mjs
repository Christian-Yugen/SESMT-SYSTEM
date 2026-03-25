import XLSX from 'xlsx';

const filePath = 'c:\\Users\\Usuário\\Desktop\\SESMT\\dados\\CID10.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log("Colunas detectadas:", Object.keys(data[0] || {}));
console.log("Primeiras 3 linhas:", data.slice(0, 3));
