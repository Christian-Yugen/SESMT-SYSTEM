 const xlsx = require('xlsx');
const fs = require('fs');

async function generate() {
    const filePath = 'c:/Users/Usuário/Desktop/SESMT/dados/BancoDados16012026.xlsx';
    if (!fs.existsSync(filePath)) {
        console.error('Arquivo Excel não encontrado');
        return;
    }

    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    let sql = '-- SQL Update Script para Servidores\n\n';

    // Para evitar problemas com o tamanho do script, vamos fazer em blocos
    // Mas o SQL Editor do Supabase aguenta bastante.

    rows.forEach(row => {
        let cpf = String(row['CPF.']).replace(/\D/g, '').padStart(11, '0');
        let sexo = row['Sexo'] ? row['Sexo'].toString().replace(/'/g, "''") : null;
        let local = row['Nome Local Trabalho'] ? row['Nome Local Trabalho'].toString().replace(/'/g, "''") : null;
        let vinculo = row['Nome Vinculo'] ? row['Nome Vinculo'].toString().replace(/'/g, "''") : null;

        if (cpf && cpf !== '00000000000') {
            sql += `UPDATE servidores SET sexo = ${sexo ? "'" + sexo + "'" : 'NULL'}, local_trabalho = ${local ? "'" + local + "'" : 'NULL'}, vinculo = ${vinculo ? "'" + vinculo + "'" : 'NULL'} WHERE cpf = '${cpf}';\n`;
        }
    });

    fs.writeFileSync('c:/Users/Usuário/Desktop/SESMT/update_servidores.sql', sql);
    console.log('Script SQL gerado com sucesso em c:/Users/Usuário/Desktop/SESMT/update_servidores.sql');
}

generate();
