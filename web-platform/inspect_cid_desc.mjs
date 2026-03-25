import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'c:\\Users\\Usuário\\Desktop\\SESMT\\dados\\CID10Descricao.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('--- HEADERS / FIRST 10 ROWS ---');
    for (let i = 0; i < Math.min(10, data.length); i++) {
        console.log(`Row ${i}:`, data[i]);
    }
    console.log('Total rows:', data.length);
} catch (err) {
    console.error('Error reading excel:', err);
}
