
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wybzkkejyraadabznjqg.supabase.co';
const supabaseAnonKey = 'sb_publishable_CTPgPELtIkN0sQb3RMLkFA_jCaTy0BJ';

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
