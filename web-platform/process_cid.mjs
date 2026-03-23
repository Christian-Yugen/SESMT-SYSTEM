import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'c:\\Users\\Usuário\\Desktop\\SESMT\\dados\\CID10.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const structuredData = {
    chapters: [],
    categories: {}
};

let currentChapter = null;

data.forEach((row, index) => {
    // Skip header row if it's the first one
    if (index === 0 && row['CID-10 - Lista de Tabulação para Morbidade'] === 'Capítulo') return;

    const colA = row['CID-10 - Lista de Tabulação para Morbidade']; // Capítulo ou vazio
    const colB = row['__EMPTY']; // Descrição
    const colC = row['__EMPTY_1']; // Código ou Faixa

    if (colA && colA.match(/^[IVXLC]+$/)) {
        // New Chapter
        currentChapter = {
            capitulo: colA,
            descricao: colB,
            range: colC
        };
        structuredData.chapters.push(currentChapter);
    } else if (colC) {
        // CID Category
        structuredData.categories[colC] = {
            desc: colB,
            cap: currentChapter ? currentChapter.capitulo : null,
            cap_desc: currentChapter ? currentChapter.descricao : null
        };
    }
});

fs.writeFileSync('c:\\Users\\Usuário\\Desktop\\SESMT\\web-platform\\src\\lib\\cid10-data.json', JSON.stringify(structuredData, null, 2));
console.log("Processado: ", structuredData.chapters.length, " capítulos e ", Object.keys(structuredData.categories).length, " categorias.");
