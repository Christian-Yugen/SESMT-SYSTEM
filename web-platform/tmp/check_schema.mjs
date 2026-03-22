
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_info', { t_name: 'aso_history' });
    
    if (error) {
        // Se RPC falhar, tenta via query direta (se permitido)
        console.log("RPC failed, trying raw query...");
        const { data: rawData, error: rawError } = await supabase
            .from('aso_history')
            .select('*')
            .limit(1);
            
        if (rawData && rawData.length > 0) {
            console.log("Columns:", Object.keys(rawData[0]));
        } else {
            console.error("Could not fetch schema info.");
        }
    } else {
        console.log("Schema Info:", data);
    }
}

checkSchema();
