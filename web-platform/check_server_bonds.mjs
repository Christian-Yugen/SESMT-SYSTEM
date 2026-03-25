
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Environment variables must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkServer() {
    const { data, error } = await supabase
        .from('servidores')
        .select('*')
        .eq('cpf', '10533603803');

    if (error) {
        console.error('Error fetching server:', error.message);
    } else {
        console.log(`Bonds found for CPF 10533603803:`, data.length);
        console.log(JSON.stringify(data, null, 2));
    }
}

checkServer();
