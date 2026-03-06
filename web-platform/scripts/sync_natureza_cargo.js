const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const excelPath = 'c:\\Users\\Usuário\\Desktop\\SESMT\\dados\\BancoDados16012026.xlsx';

async function syncNatureza() {
    console.log('Iniciando sincronização de Natureza do Cargo (Versão Robusta)...');

    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`Lidos ${data.length} registros do Excel.`);

    // Agrupar CPFs por Natureza do Cargo para otimizar updates na tabela servidores
    const groups = {};
    const natureMap = {};

    for (const row of data) {
        const cpf = row['CPF.'] || row['CPF'];
        const natureza = row['Nome Natureza Cargo'];
        if (!cpf || !natureza) continue;

        const cleanCpf = String(cpf).replace(/\D/g, '').padStart(11, '0');
        if (!groups[natureza]) groups[natureza] = [];
        groups[natureza].push(cleanCpf);
        natureMap[cleanCpf] = natureza;
    }

    const natures = Object.keys(groups);
    console.log(`Agrupados em ${natures.length} naturezas distintas.`);

    // 1. Atualizar Tabela Servidores
    for (const natureza of natures) {
        const cpfs = groups[natureza];
        console.log(`Sincronizando servidores: ${natureza} (${cpfs.length} CPFs)...`);
        const chunkSize = 50;
        for (let i = 0; i < cpfs.length; i += chunkSize) {
            const chunk = cpfs.slice(i, i + chunkSize);
            await supabase.from('servidores').update({ natureza_cargo: natureza }).in('cpf', chunk);
        }
    }

    // 2. Atualizar Tabela Abono Salarial
    console.log('--- Iniciando Sincronização da Tabela Abono Salarial ---');
    const { data: abonos, error: fetchError } = await supabase.from('abono_salarial').select('id, cpf, natureza_cargo');

    if (fetchError) {
        console.error('Erro ao buscar abonos:', fetchError.message);
        return;
    }

    console.log(`Lidos ${abonos.length} registros de abono para verificação.`);

    let updatedCount = 0;
    let matchCount = 0;
    let noMatchCount = 0;

    for (const abono of abonos) {
        const cleanAbonoCpf = String(abono.cpf).replace(/\D/g, '').padStart(11, '0');
        const nat = natureMap[cleanAbonoCpf];

        if (nat) {
            matchCount++;
            if (abono.natureza_cargo !== nat) {
                const { error } = await supabase
                    .from('abono_salarial')
                    .update({ natureza_cargo: nat })
                    .eq('id', abono.id);

                if (error) {
                    console.error(`Erro no ID ${abono.id} (CPF: ${cleanAbonoCpf}):`, error.message);
                } else {
                    updatedCount++;
                }
            }
        } else {
            noMatchCount++;
        }
    }

    console.log('--- Resumo Final ---');
    console.log(`Registros de Abono processados: ${abonos.length}`);
    console.log(`Matches encontrados no Excel: ${matchCount}`);
    console.log(`Sem correspondência no Excel: ${noMatchCount}`);
    console.log(`Atualizações realizadas (mudança de valor): ${updatedCount}`);
    console.log('Sincronização concluída.');
}

syncNatureza();
