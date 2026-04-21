import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './.env.local' });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE) {
  console.error('Faltam variáveis no .env.local');
  process.exit(2);
}
const supabase = createClient(SUPABASE_URL, SERVICE);
(async () => {
  const { data, error, count } = await supabase
    .from('atestados_import')
    .select('id,matricula,nome,cid,qtde_dias,periodo', { count: 'exact' })
    .limit(5);
  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('Count (service):', count ?? (data || []).length);
    console.table(data || []);
  }
  process.exit(0);
})();
