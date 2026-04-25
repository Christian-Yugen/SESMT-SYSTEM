
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

async function inspectProfiles() {
    console.log('Querying profiles table...');
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error fetching profiles:', error.message);
    } else {
        console.log('Data found in profiles:', data);
    }

    // Try to get column names by selecting a non-existent column to see the error message or just select one row
    const { data: cols, error: colErr } = await supabase.from('profiles').select().limit(1);
    if (cols && cols.length > 0) {
        console.log('Columns in profiles:', Object.keys(cols[0]));
    }
}

inspectProfiles();
