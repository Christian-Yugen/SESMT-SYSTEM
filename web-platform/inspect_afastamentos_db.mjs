
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(tableName) {
    console.log(`--- Inspecting ${tableName} table ---`);
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (error) {
        console.error(`ERROR in ${tableName}:`, JSON.stringify(error, null, 2));
    } else if (data && data.length > 0) {
        console.log(`COLUMNS in ${tableName}:`, Object.keys(data[0]));
        console.log(`SAMPLE in ${tableName}:`, JSON.stringify(data[0], null, 2));
    } else {
        console.log(`NO DATA in ${tableName}`);
    }
}

async function main() {
    await inspectTable('afastamentos');
    await inspectTable('afastamentos_logs');
    await inspectTable('afastamento_cids');
    await inspectTable('portarias_afastamento');
}

main();
