import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltam variáveis NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  try {
    console.log('Usando SUPABASE_URL=', SUPABASE_URL.replace(/https:\/\/(.*?)\..*/, 'https://$1...'));

    const { count, error: countError } = await supabase
      .from('atestados_import')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Erro ao contar registros:', countError);
    } else {
      console.log('Total de registros em atestados_import:', count ?? 'desconhecido');
    }

    const { data, error } = await supabase
      .from('atestados_import')
      .select('matricula,nome,cid,qtde_dias,periodo')
      .limit(5);

    if (error) {
      console.error('Erro ao buscar amostra:', error);
    } else {
      console.log('Amostra (até 5 linhas):');
      console.table(data || []);
    }
  } catch (err) {
    console.error('Erro inesperado:', err);
  }
  process.exit(0);
})();
