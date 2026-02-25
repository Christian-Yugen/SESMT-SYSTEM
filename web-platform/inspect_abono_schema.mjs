
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
    console.log("Inspecting abono_salarial table...");
    const { data, error } = await supabase.from('abono_salarial').select('*').limit(1);

    if (error) {
        console.error("Error:", error.message);
    } else if (data && data.length > 0) {
        console.log("Columns in abono_salarial:", Object.keys(data[0]));
    } else {
        console.log("No data in abono_salarial, checking schema via RPC or just trying to insert a dummy row...");
        // We can't easily get all columns without data if we don't have access to information_schema via RPC
        // But we can try a blind insert and see what works or check the .sql files.
    }
}

main();
