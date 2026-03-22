
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllDuplicates() {
    console.log('--- Buscando TODOS os registros (sem limite) ---');
    const { data: rows, error } = await supabase
        .from('servidores')
        .select('cpf, matricula, nome')
        .limit(10000); // 5169 is less than 10000

    if (error) {
        console.error(error.message);
        return;
    }

    const seen = new Map();
    const dups = [];
    rows.forEach(r => {
        const key = `${r.cpf}_${r.matricula}`;
        if (seen.has(key)) {
            dups.push({ key, nome: r.nome, originalNome: seen.get(key).nome });
        } else {
            seen.set(key, r);
        }
    });

    console.log(`Total de registros: ${rows.length}`);
    console.log(`Duplicatas (CPF+Matrícula): ${dups.length}`);
    if (dups.length > 0) {
        console.log('Exemplos de duplicatas detectadas:');
        dups.slice(0, 10).forEach(d => console.log(`- ${d.key}: ${d.nome} (vs ${d.originalNome})`));
    }
}

checkAllDuplicates();
