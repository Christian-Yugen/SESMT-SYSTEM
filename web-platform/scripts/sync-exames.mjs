
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

const IS_DRY_RUN = process.argv.includes('--dry-run');

async function processFile(filename, tipo) {
    const filePath = path.join(DADOS_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Arquivo ${filename} não encontrado. Pulando.`);
        return [];
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    return data.map(row => {
        const exames = [];
        for (let i = 1; i <= 9; i++) {
            const val = row[`EXAME ${i}`];
            if (val && val.toString().trim()) {
                exames.push(val.toString().trim());
            }
        }
        
        return {
            tipo: tipo,
            funcao: row['FUNÇÃO']?.toString().trim().toUpperCase() || '',
            ghe: row['GHE']?.toString().trim() || '',
            exames: exames
        };
    }).filter(r => r.funcao);
}

async function syncExames() {
    console.log(`--- Sincronização de Exames por Função (${IS_DRY_RUN ? 'SIMULAÇÃO' : 'REAL'}) ---`);

    try {
        const admissionais = await processFile('EXAMES ADMISSIONAL.xlsx', 'admissional');
        const demissionais = await processFile('EXAMES DEMISSIONAL.xlsx', 'demissional');
        
        const allData = [...admissionais, ...demissionais];
        console.log(`📊 Total de registros processados: ${allData.length}`);

        if (IS_DRY_RUN) {
            console.log('⚠️ SIMULAÇÃO CONCLUÍDA.');
            return;
        }

        // Upsert no banco
        const chunkSize = 100;
        for (let i = 0; i < allData.length; i += chunkSize) {
            const chunk = allData.slice(i, i + chunkSize);
            const { error } = await supabase
                .from('exams_by_function')
                .upsert(chunk, { onConflict: 'tipo,funcao,ghe' });
            
            if (error) throw error;
            console.log(`✓ Progresso: ${i + chunk.length}/${allData.length}`);
        }

        console.log('✅ Sincronização de Exames finalizada com sucesso!');

    } catch (err) {
        console.error('💥 Erro:', err.message);
    }
}

syncExames();
