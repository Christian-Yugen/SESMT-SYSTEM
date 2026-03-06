const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\Users\\Usuário\\Desktop\\SESMT\\dados\\BancoDados16012026.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const range = XLSX.utils.decode_range(worksheet['!ref']);

console.log('Sheet Name:', sheetName);
console.log('Range:', worksheet['!ref']);

const headers = [];
for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
    headers.push(cell ? cell.v : `COL_${col}`);
}

console.log('Column AJ (Index 35) Header:', headers[35]);
console.log('Nearby Headers:', headers.slice(30, 40));

const rows = [];
for (let r = range.s.r + 1; r <= range.s.r + 10; r++) {
    const row = {};
    const cells = [0, 1, 2, 3, 35]; // A, B, C, D, AJ
    cells.forEach(c => {
        const cell = worksheet[XLSX.utils.encode_cell({ r: r, c: c })];
        row[headers[c] || `COL_${c}`] = cell ? cell.v : null;
    });
    rows.push(row);
}

console.log('Sample data:');
console.log(JSON.stringify(rows, null, 2));
