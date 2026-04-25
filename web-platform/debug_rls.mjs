
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugTables() {
    console.log('--- Checking SERVIDORES table ---');
    const { data: serv, error: servErr } = await supabase
        .from('servidores')
        .select('*')
        .limit(1);

    if (servErr) {
        console.error('Error fetching servidores:', servErr.message);
    } else {
        console.log('Servidores found:', serv.length > 0 ? 'Yes' : 'No (Empty or RLS blocked)');
        if (serv.length > 0) console.log('Sample servidor:', serv[0]);
    }

    console.log('\n--- Checking FUNCOES table ---');
    const { data: func, error: funcErr } = await supabase
        .from('funcoes')
        .select('*')
        .limit(1);

    if (funcErr) {
        console.error('Error fetching funcoes:', funcErr.message);
    } else {
        console.log('Funcoes found:', func.length > 0 ? 'Yes' : 'No (Empty or RLS blocked)');
        if (func.length > 0) console.log('Sample funcao:', func[0]);
    }

    console.log('\n--- Checking EXAMES_CONFIG table ---');
    const { data: config, error: configErr } = await supabase
        .from('exames_config')
        .select('*')
        .limit(1);

    if (configErr) {
        console.error('Error fetching exames_config:', configErr.message);
    } else {
        console.log('Exames config found:', config.length > 0 ? 'Yes' : 'No (Empty or RLS blocked)');
    }
}

debugTables();
