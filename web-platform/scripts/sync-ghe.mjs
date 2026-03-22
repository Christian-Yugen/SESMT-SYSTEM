
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

async function syncGHE() {
    console.log(`--- Sincronização de GHE (${IS_DRY_RUN ? 'SIMULAÇÃO' : 'REAL'}) ---`);

    try {
        const file = path.join(DADOS_DIR, 'GHE.xlsx');
        if (!fs.existsSync(file)) throw new Error('Arquivo GHE.xlsx não encontrado.');

        const workbook = XLSX.readFile(file);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log(`📊 Total no Excel: ${data.length} registros.`);

        const preparedData = data.map(row => ({
            cod: row['Cod']?.toString().trim() || '',
            nome: row['Nome']?.toString().trim().toUpperCase() || '',
            ghe: row['GHE']?.toString().trim() || '',
            ghe_conj: row['GHE CONJ']?.toString().trim() || ''
        })).filter(r => r.cod);

        console.log(`✅ Registros válidos: ${preparedData.length}`);

        if (IS_DRY_RUN) {
            console.log('⚠️ SIMULAÇÃO CONCLUÍDA.');
            return;
        }

        // Upsert no banco
        const { error } = await supabase
            .from('funcoes')
            .upsert(preparedData, { onConflict: 'cod' });

        if (error) throw error;
        console.log('✅ Sincronização GHE finalizada com sucesso!');

    } catch (err) {
        console.error('💥 Erro:', err.message);
    }
}

syncGHE();
