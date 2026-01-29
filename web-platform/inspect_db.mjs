
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wybzkkejyraadabznjqg.supabase.co';
const supabaseAnonKey = 'sb_publishable_CTPgPELtIkN0sQb3RMLkFA_jCaTy0BJ';

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
