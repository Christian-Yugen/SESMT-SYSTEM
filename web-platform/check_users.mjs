
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wybzkkejyraadabznjqg.supabase.co';
const supabaseAnonKey = 'sb_publishable_CTPgPELtIkN0sQb3RMLkFA_jCaTy0BJ'; // Note: This is usually the service role key for admin tasks, but I'll try with what I have or ask the user.
// Wait, the anon key might not have permission to update roles if RLS is on.
// I'll check the profiles table first.

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Profiles:', JSON.stringify(data, null, 2));
    }
}

checkProfiles();
