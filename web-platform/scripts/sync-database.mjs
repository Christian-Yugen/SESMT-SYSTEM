
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não encontrada no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DADOS_DIR = path.resolve(__dirname, '../../dados');
const BACKUP_FILE = path.join(__dirname, '../tmp/servidores_backup_completo.json');

const IS_DRY_RUN = process.argv.includes('--dry-run');

// Função auxiliar para formatar datas (Excel Date -> YYYY-MM-DD)
function formatDate(val) {
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (!val) return null;
    return val.toString().trim();
}

// Função para gerar chave única do vínculo
function getUniqueKey(cpf, matricula, contrato) {
    const cleanCpf = cpf?.toString().replace(/\D/g, '') || '';
    const cleanMat = matricula?.toString().trim() || 'X';
    const cleanCont = contrato?.toString().trim() || '1';
    return `${cleanCpf}_${cleanMat}_${cleanCont}`;
}

async function runSync() {
    console.log(`--- Iniciando Sincronização Inteligente V2 (${IS_DRY_RUN ? 'SIMULAÇÃO' : 'REAL'}) ---`);

    try {
        // 1. Ler dados atuais do Banco (Paginado)
        console.log('🔄 Lendo estado atual do banco para backup...');
        let dbRows = [];
        let from = 0;
        const step = 1000;
        while (true) {
            const { data, error } = await supabase.from('servidores').select('*').range(from, from + step - 1);
            if (error) throw new Error(`Erro ao ler banco: ${error.message}`);
            dbRows = dbRows.concat(data);
            if (data.length < step) break;
            from += step;
        }
        console.log(`✅ Banco de dados atual: ${dbRows.length} registros.`);
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(dbRows, null, 2));

        // 3. Ler novo Excel (Prioridade: AtualizacaoBancoDados.xlsx)
        const possibleNames = ['AtualizacaoBancoDados.xlsx', 'AtualizaçãoBancoDados.xlsx'];
        let latestFile = possibleNames
            .map(n => path.join(DADOS_DIR, n))
            .find(p => fs.existsSync(p));

        if (!latestFile) {
            console.log('💡 Dica: Nenhuma planilha "AtualizacaoBancoDados.xlsx" encontrada. Buscando sequencial...');
            const files = fs.readdirSync(DADOS_DIR)
                .filter(f => f.startsWith('BancoDados') && f.endsWith('.xlsx'))
                .sort((a, b) => b.localeCompare(a));

            if (files.length === 0) throw new Error('Nenhum arquivo BancoDados*.xlsx ou AtualizacaoBancoDados.xlsx encontrado.');
            latestFile = path.join(DADOS_DIR, files[0]);
        }
        
        console.log(`📂 Processando Excel: ${latestFile}`);

        const workbook = XLSX.readFile(latestFile);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelData = XLSX.utils.sheet_to_json(sheet, { cellDates: true });
        console.log(`📊 Total no Excel: ${excelData.length} registros.`);

        const excelMap = new Map();
        excelData.forEach(row => {
            const mapped = {
                cpf: row['CPF.']?.toString().replace(/\D/g, '') || '',
                nome: row['Nome']?.toString().trim().toUpperCase() || '',
                cargo: row['Cargo']?.toString().trim().toUpperCase() || '',
                matricula: row['Matrícula']?.toString().trim() || '',
                nascimento: formatDate(row['Dt.Nascimento']),
                secretaria: row['Secretaria']?.toString().trim().toUpperCase() || '',
                contrato: row['Contrato']?.toString().trim() || '1',
                sexo: row['Sexo']?.toString() || '',
                local_trabalho: row['Nome Local Trabalho']?.toString() || '',
                vinculo: row['Nome Vinculo']?.toString() || '',
                natureza_cargo: row['Nome Natureza Cargo']?.toString() || '',
                // NOVOS CAMPOS:
                admissao: formatDate(row['Dt.Admissão']),
                deficiencia_rais: row['Deficiência RAIS']?.toString() || '',
                pis_pasep: row['PIS/PASEP/NIT']?.toString() || ''
            };
            
            if (mapped.cpf) {
                const key = getUniqueKey(mapped.cpf, mapped.matricula, mapped.contrato);
                excelMap.set(key, mapped);
            }
        });

        const dbMap = new Map();
        dbRows.forEach(row => {
            const key = getUniqueKey(row.cpf, row.matricula, row.contrato);
            dbMap.set(key, row);
        });

        // 3. Comparar (Diff)
        const toInsert = [];
        const toUpdate = [];
        const toDeleteIds = [];

        excelMap.forEach((excelRow, key) => {
            const dbRow = dbMap.get(key);
            if (!dbRow) {
                toInsert.push(excelRow);
            } else {
                // Verificar se algo relevante mudou (inclusive os novos campos)
                const hasChanged = 
                    excelRow.nome !== dbRow.nome ||
                    excelRow.cargo !== dbRow.cargo ||
                    excelRow.secretaria !== dbRow.secretaria ||
                    excelRow.admissao !== dbRow.admissao ||
                    excelRow.pis_pasep !== dbRow.pis_pasep ||
                    excelRow.deficiencia_rais !== dbRow.deficiencia_rais;
                
                if (hasChanged) {
                    toUpdate.push(excelRow);
                }
            }
        });

        dbMap.forEach((dbRow, key) => {
            if (!excelMap.has(key)) toDeleteIds.push(dbRow.id);
        });

        console.log('\n--- Relatório Final de Sincronização ---');
        console.log(`🆕 Novos Vínculos (Incluindo Admitidos 2026): ${toInsert.length}`);
        console.log(`📝 Atualizados (Mudança funcional/dados): ${toUpdate.length}`);
        console.log(`🗑️ Removidos (Demitidos): ${toDeleteIds.length}`);
        console.log(`⚖️ Total Final Esperado: ${excelMap.size}`);

        if (IS_DRY_RUN) {
            console.log('\n⚠️ SIMULAÇÃO CONCLUÍDA. Nenhuma alteração real feita.');
            return;
        }

        // 4. Aplicar
        if (toDeleteIds.length > 0) {
            console.log(`🗑️ Removendo ${toDeleteIds.length} demitidos...`);
            const { error: delErr } = await supabase.from('servidores').delete().in('id', toDeleteIds);
            if (delErr) throw delErr;
        }

        const upserts = [...toInsert, ...toUpdate];
        if (upserts.length > 0) {
            console.log(`🚀 Sincronizando ${upserts.length} admitidos/atualizados...`);
            const chunkSize = 200;
            for (let i = 0; i < upserts.length; i += chunkSize) {
                const chunk = upserts.slice(i, i + chunkSize);
                const { error: upErr } = await supabase.from('servidores').upsert(chunk, { onConflict: 'cpf,matricula,contrato' });
                if (upErr) throw upErr;
                console.log(`✓ Progresso: ${i + chunk.length}/${upserts.length}`);
            }
        }

        console.log('\n✅ SINCRONIZAÇÃO FINALIZADA COM SUCESSO!');

    } catch (err) {
        console.error('\n💥 Erro crítico:', err.message);
    }
}

runSync();
