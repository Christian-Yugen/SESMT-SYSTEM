import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Erro: Chaves do Supabase não encontradas no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateData() {
    console.log('🚀 Iniciando migração de dados...');

    try {
        // 1. Migrar Funções (GHE)
        console.log('📦 Migrando Funções...');
        const funcoesData = JSON.parse(fs.readFileSync('./src/data/funcoes.json', 'utf8'));
        const funcoesFormatted = funcoesData.map((f) => ({
            cod: String(f.Cod),
            nome: f.Nome || f.FUNÇÃO,
            ghe: f.GHE,
            ghe_conj: f.GHE_CONJ || f['GHE CONJ']
        }));

        const { error: fError } = await supabase.from('funcoes').upsert(funcoesFormatted, { onConflict: 'cod' });
        if (fError) console.error('Erro ao migrar funções:', fError);
        else console.log('✅ Funções migradas com sucesso!');

        // 2. Migrar Configuração de Exames
        console.log('📦 Migrando Configuração de Exames...');
        const examesData = JSON.parse(fs.readFileSync('./src/data/exames.json', 'utf8'));
        const examesFormatted = [];

        // Admissional
        Object.entries(examesData.admissional).forEach(([ghe, data]) => {
            examesFormatted.push({
                aso_type: 'admissional',
                ghe: ghe,
                exames: data.exames,
                riscos: data.riscos,
                detalhes: data.detalhes
            });
        });

        // Demissional
        Object.entries(examesData.demissional).forEach(([ghe, data]) => {
            examesFormatted.push({
                aso_type: 'demissional',
                ghe: ghe,
                exames: data.exames,
                riscos: data.riscos,
                detalhes: data.detalhes
            });
        });

        const { error: eError } = await supabase.from('exames_config').upsert(examesFormatted, { onConflict: 'aso_type,ghe' });
        if (eError) console.error('Erro ao migrar exames:', eError);
        else console.log('✅ Configurações de exames migradas!');

        // 3. Migrar Servidores
        console.log('📦 Migrando Servidores...');
        const servidoresData = JSON.parse(fs.readFileSync('./src/data/servidores.json', 'utf8'));

        const batchSize = 100;
        const totalToMigrate = servidoresData.length;

        console.log(`📦 Preparando para migrar ${totalToMigrate} servidores em lotes de ${batchSize}...`);

        for (let i = 0; i < totalToMigrate; i += batchSize) {
            const batchRaw = servidoresData.slice(i, i + batchSize).map((s) => ({
                cpf: String(s.CPF || s['CPF.'] || "").replace(/\D/g, ""),
                nome: s.Nome,
                cargo: s.Cargo,
                matricula: String(s.Matrícula || ""),
                nascimento: s['Dt.Nascimento'] || s.Nascimento,
                secretaria: s.Secretaria
            })).filter(s => s.cpf && s.matricula); // Garantir que tem CPF e Matrícula

            // Remover duplicatas de CPF+Matrícula dentro do próprio lote (causa erro no Postgres)
            const batch = Array.from(new Map(batchRaw.map(item => [`${item.cpf}-${item.matricula}`, item])).values());

            const { error: sError } = await supabase.from('servidores').upsert(batch, { onConflict: 'cpf,matricula' });
            if (sError) console.error(`Erro no lote ${i}:`, sError);
            else console.log(`✅ Lote ${i + batch.length}/${totalToMigrate} processado...`);
        }

        console.log('🎉 Migração concluída!');
    } catch (err) {
        console.error('Erro geral na migração:', err);
    }
}

migrateData();
