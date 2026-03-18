
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

async function checkIndexes() {
    console.log("Checking indexes for aso_history...");
    
    // We can't query pg_indexes directly via Anon Key usually,
    // but we can try to trigger a conflict to see what happens.
    // Or just check if we can get table info.
    
    const { data, error } = await supabase.rpc('get_table_info', { t_name: 'aso_history' });
    if (error) {
        console.log("Could not use RPC get_table_info. This is expected if not defined.");
    }
    
    // Let's try to insert a dummy record twice to see if it allows duplicates.
    const dummy = {
        servidor_cpf: '00000000000',
        servidor_nome: 'TEST DUPLICATE',
        aso_type: 'TEST'
    };
    
    console.log("Trying first insert...");
    const { error: err1 } = await supabase.from('aso_history').insert(dummy);
    console.log("Result 1:", err1 ? err1.message : "Success");
    
    console.log("Trying second insert (identical)...");
    const { error: err2 } = await supabase.from('aso_history').insert(dummy);
    console.log("Result 2:", err2 ? err2.message : "Success (Duplicates allowed)");
}

checkIndexes();
