
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

async function inspectColumns() {
    console.log('--- Buscando Colunas: servidores ---');
    // Tentativa usando query direta se RLS permitir leitura da information_schema (raro)
    // Mas o PostgREST expõe as colunas NO erro de um select se filtrarmos por uma inexistente,
    // ou podemos tentar usar um RPC se houver.
    
    // Melhor forma: tentar inserir um objeto vazio e ver o erro ou se ele insere e nos retorna as chaves
    const { data: cols, error: colErr } = await supabase
        .from('servidores')
        .select('*')
        .limit(0);

    if (colErr) {
        console.error('Erro:', colErr.message);
    } else {
        console.log('Colunas (via select 0):', cols);
    }

    // Outra tentativa: RPC customizado que costuma existir em alguns templates
    // Se não, vamos olhar o código que USA servidores no app.
}

inspectColumns();
