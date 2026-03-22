
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceError() {
    console.log('--- Identificando Colunas via Erro ---');
    // Filtrar por uma coluna que definitivamente não existe para ver a mensagem de erro
    // Às vezes o PostgREST responde com "Could not find column... did you mean...?"
    const { error } = await supabase
        .from('servidores')
        .select('coluna_que_nao_existe')
        .limit(1);

    if (error) {
        console.log('Mensagem de Erro:', error.message);
        console.log('Dica (Hint):', error.hint);
        console.log('Detalhes:', error.details);
    }
}

forceError();
