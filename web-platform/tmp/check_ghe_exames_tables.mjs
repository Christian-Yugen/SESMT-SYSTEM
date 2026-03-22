
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const tables = ['ghe_records', 'exams_by_function', 'ghe', 'exames', 'funcoes_exames'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`❌ Tabela ${table}: ${error.message}`);
        } else {
            console.log(`✅ Tabela ${table} encontrada! Colunas:`, data.length > 0 ? Object.keys(data[0]) : 'Vazia');
        }
    }
}

checkTables();
