
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

async function checkRLS() {
    console.log('Testing upsert locally...');
    // This will likely fail because I'm not authenticated in the script context, 
    // but the error message will be very useful.
    const testId = '00000000-0000-0000-0000-000000000000';
    const { error } = await supabase.from('profiles').upsert({
        id: testId,
        email: 'test@example.com',
        role: 'viewer'
    });

    if (error) {
        console.log('Upsert test error (expected if RLS is on):', error.message, error.details);
    } else {
        console.log('Upsert test success! (No RLS or open RLS)');
    }
}

checkRLS();
