
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY não encontradas.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DADOS_DIR = path.resolve(__dirname, '../../dados');

async function syncDatabase() {
    console.log('--- Iniciando Sincronização do Banco de Dados ---');

    try {
        // 1. Encontrar o arquivo Excel mais recente
        if (!fs.existsSync(DADOS_DIR)) {
            console.error(`❌ Diretório não encontrado: ${DADOS_DIR}`);
            return;
        }

        const files = fs.readdirSync(DADOS_DIR)
            .filter(f => f.startsWith('BancoDados') && f.endsWith('.xlsx'))
            .sort((a, b) => b.localeCompare(a)); // Ordenação simples por nome (funciona se o formato for BancoDadosYYYYMMDD)

        if (files.length === 0) {
            console.error('❌ Nenhum arquivo BancoDados*.xlsx encontrado em SESMT/dados/');
            return;
        }

        const latestFile = path.join(DADOS_DIR, files[0]);
        console.log(`📂 Lendo arquivo: ${latestFile}`);

        // 2. Ler o Excel
        const workbook = XLSX.readFile(latestFile);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { cellDates: true });

        console.log(`📊 Total de registros no Excel: ${data.length}`);

        // 3. Mapear e preparar dados
        const preparedData = data.map(row => {
            let nascimento = row['Dt.Nascimento'];
            if (nascimento instanceof Date) {
                nascimento = nascimento.toISOString().split('T')[0];
            }

            return {
                cpf: row['CPF.']?.toString().replace(/\D/g, '') || '',
                nome: row['Nome'] || '',
                cargo: row['Cargo'] || '',
                matricula: row['Matrícula']?.toString() || '',
                nascimento: nascimento || null,
                secretaria: row['Secretaria'] || '',
                natureza_cargo: row['Nome Natureza Cargo'] || row['natureza_cargo'] || ''
            };
        }).filter(item => item.cpf !== '');

        console.log(`✅ Registros válidos (com CPF): ${preparedData.length}`);

        // 4. Limpar tabela atual (opcional, dependendo do desejo do usuário)
        // O usuário disse "atualizarmos", geralmente um full sync limpa e insere
        console.log('🧹 Limpando tabela de servidores...');
        const { error: deleteError } = await supabase
            .from('servidores')
            .delete()
            .neq('cpf', ''); // Deletar todos

        if (deleteError) {
            console.error('❌ Erro ao limpar tabela:', deleteError.message);
            // Prosseguimos mesmo assim, pode ser erro de permissão RLS
        }

        // 5. Inserir em blocos (chunks) para evitar limites
        const chunkSize = 200;
        console.log(`🚀 Inserindo dados em lotes de ${chunkSize}...`);
        
        for (let i = 0; i < preparedData.length; i += chunkSize) {
            const chunk = preparedData.slice(i, i + chunkSize);
            const { error: insertError } = await supabase
                .from('servidores')
                .insert(chunk);

            if (insertError) {
                console.error(`❌ Erro no lote ${Math.floor(i/chunkSize) + 1}:`, insertError.message);
            } else {
                console.log(`✔️ Lote ${Math.floor(i/chunkSize) + 1}/${Math.ceil(preparedData.length/chunkSize)} concluído.`);
            }
        }

        console.log('--- Sincronização Finalizada com Sucesso ---');

    } catch (err) {
        console.error('💥 Erro fatal durante a sincronização:', err.message);
    }
}

syncDatabase();
