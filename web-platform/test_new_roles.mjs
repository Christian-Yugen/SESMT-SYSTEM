
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
    const { data: users } = await supabase.from('profiles').select('*').limit(1);
    const testUser = users[0];

    console.log(`Testing update to analytic_manager...`);
    const { error: err1 } = await supabase.from('profiles').update({ role: 'analytic_manager' }).eq('id', testUser.id);
    console.log('Result analytic_manager:', err1 ? 'FAILED: ' + err1.message : 'SUCCESS');

    console.log(`Testing update to social_assistant...`);
    const { error: err2 } = await supabase.from('profiles').update({ role: 'social_assistant' }).eq('id', testUser.id);
    console.log('Result social_assistant:', err2 ? 'FAILED: ' + err2.message : 'SUCCESS');

    // Restore
    await supabase.from('profiles').update({ role: testUser.role }).eq('id', testUser.id);
}

main();
