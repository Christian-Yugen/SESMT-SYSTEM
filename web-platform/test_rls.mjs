
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wybzkkejyraadabznjqg.supabase.co';
const supabaseAnonKey = 'sb_publishable_CTPgPELtIkN0sQb3RMLkFA_jCaTy0BJ';

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
