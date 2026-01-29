
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wybzkkejyraadabznjqg.supabase.co';
const supabaseAnonKey = 'sb_publishable_CTPgPELtIkN0sQb3RMLkFA_jCaTy0BJ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
    const { data: serv, error: errServ } = await supabase.from('servidores').select('count');
    console.log('Servidores count error:', errServ);

    const { data: prof, error: errProf } = await supabase.from('profiles').select('count');
    console.log('Profiles count error:', errProf);
}

checkTables();
