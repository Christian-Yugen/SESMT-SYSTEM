
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

async function inspectSchema() {
    console.log('--- Inspeção de Esquema: servidores ---');
    
    // Tenta obter definições de colunas via query direta se possível, ou via RPC customizado se existir.
    // Como padrão, vamos tentar buscar a estrutura através do PostgREST.
    const { data: servidores, error } = await supabase
        .from('servidores')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Erro ao ler tabela servidores:', error.message);
    } else {
        console.log('✅ Conexão com servidores OK.');
        if (servidores.length > 0) {
            console.log('Colunas detectadas:', Object.keys(servidores[0]));
            console.log('Amostra:', servidores[0]);
        } else {
            console.log('⚠️ Tabela servidores está vazia.');
        }
    }

    // Também verificar se existe a coluna 'contrato' na tabela
    // Isso é crucial para o plano do usuário.
}

inspectSchema();
