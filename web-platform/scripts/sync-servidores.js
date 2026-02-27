const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');
    lines.forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
    });
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Credenciais do Supabase não encontradas no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
    console.log('Iniciando sincronização (Modo Paralelo)...');
    const filePath = 'c:/Users/Usuário/Desktop/SESMT/dados/BancoDados16012026.xlsx';

    if (!fs.existsSync(filePath)) {
        console.error('Arquivo Excel não encontrado:', filePath);
        return;
    }

    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    console.log(`Lendo ${rows.length} registros do Excel...`);

    const CONCURRENCY = 10;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
        const batch = rows.slice(i, i + CONCURRENCY);

        await Promise.all(batch.map(async (row) => {
            const cpf = String(row['CPF.']).replace(/\D/g, '').padStart(11, '0');
            if (!cpf) return;

            const { error } = await supabase
                .from('servidores')
                .update({
                    sexo: row['Sexo'],
                    local_trabalho: row['Nome Local Trabalho'],
                    vinculo: row['Nome Vinculo']
                })
                .eq('cpf', cpf);

            if (error) {
                // Silenciosamente ignorar se não encontrar o servidor
                // (Muitos CPFs novos podem não estar no Table Editor ainda)
                errors++;
            } else {
                updated++;
            }
        }));

        if (i % 200 === 0) {
            console.log(`Processado: ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length}...`);
        }
    }

    console.log('--- Sincronização Finalizada ---');
    console.log(`Updates realizados: ${updated}`);
    console.log(`Registros ignorados/erros: ${errors}`);
}

sync();
