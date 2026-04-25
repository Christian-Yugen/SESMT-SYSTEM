
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

async function checkSESMTTables() {
    const { error: errHist } = await supabase.from('aso_history').select('id').limit(1);
    console.log('aso_history check:', errHist ? errHist.message : 'OK');

    const { error: errServ } = await supabase.from('servidores').select('id').limit(1);
    console.log('servidores check:', errServ ? errServ.message : 'OK');

    const { error: errProf } = await supabase.from('profiles').select('id').limit(1);
    console.log('profiles check:', errProf ? errProf.message : 'OK');
}

checkSESMTTables();
