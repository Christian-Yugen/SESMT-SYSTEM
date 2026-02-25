
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const cols = ['status', 'secretaria', 'observacoes', 'portaria', 'assomasul_data', 'inicio', 'quant'];
    console.log("Checking columns one by one...");

    for (const col of cols) {
        const { error } = await supabase.from('abono_salarial').select(col).limit(1);
        if (error) {
            console.log(`Column '${col}': MISSING (${error.message})`);
        } else {
            console.log(`Column '${col}': EXISTS`);
        }
    }
}

main();
