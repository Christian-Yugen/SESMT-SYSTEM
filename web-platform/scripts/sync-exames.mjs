
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não encontrada no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DADOS_DIR = path.resolve(__dirname, '../../dados');

const IS_DRY_RUN = process.argv.includes('--dry-run');

async function processFile(filename, asoType) {
    const filePath = path.join(DADOS_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Arquivo ${filename} não encontrado. Pulando.`);
        return [];
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    return data.map(row => {
        const exames = [];
        // Tenta capturar de EXAME 1 a EXAME 20 para garantir
        for (let i = 1; i <= 20; i++) {
            const val = row[`EXAME ${i}`] || row[`EXAME${i}`];
            if (val && val.toString().trim()) {
                exames.push(val.toString().trim());
            }
        }
        
        return {
            aso_type: asoType,
            funcao: row['FUNÇÃO']?.toString().trim().toUpperCase() || '',
            ghe: row['GHE']?.toString().trim() || '',
            riscos: row['Riscos Ocupacionais']?.toString().trim() || '',
            detalhes: row['Riscos Ocupacionais - Detalhes']?.toString().trim() || '',
            exames: exames
        };
    }).filter(r => r.funcao && r.ghe);
}

async function syncExames() {
    console.log(`--- Sincronização de exames_config (${IS_DRY_RUN ? 'SIMULAÇÃO' : 'REAL'}) ---`);

    try {
        const admissionais = await processFile('EXAMES ADMISSIONAL.xlsx', 'admissional');
        const demissionais = await processFile('EXAMES DEMISSIONAL.xlsx', 'demissional');
        
        const allData = [...admissionais, ...demissionais];
        console.log(`📊 Total de registros processados: ${allData.length}`);

        if (allData.length > 0) {
            console.log("Exemplo do primeiro registro:", JSON.stringify(allData[0], null, 2));
        }

        if (IS_DRY_RUN) {
            console.log('⚠️ SIMULAÇÃO CONCLUÍDA.');
            return;
        }

        // Upsert no banco
        const chunkSize = 100;
        for (let i = 0; i < allData.length; i += chunkSize) {
            const chunk = allData.slice(i, i + chunkSize);
            const { error } = await supabase
                .from('exames_config')
                .upsert(chunk, { onConflict: 'aso_type,ghe' });
            
            if (error) throw error;
            console.log(`✓ Progresso: ${i + chunk.length}/${allData.length}`);
        }

        console.log('✅ Sincronização de exames_config finalizada com sucesso!');

    } catch (err) {
        console.error('💥 Erro:', err.message);
    }
}

syncExames();
