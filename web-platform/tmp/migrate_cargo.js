const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log("Iniciando migração de Cargo em Afastamentos...");
    
    // 1. Adicionar coluna (via rpc ou query se possível, mas aqui usamos o srole key para tentar direto se tiver permissão de admin)
    // Infelizmente o cliente JS não executa DDL arbitrário (ALTER TABLE) facilmente sem RPC.
    // Mas eu posso tentar atualizar os registros se a coluna já existir, ou assumir que o usuário pode querer que eu sugira o SQL.
    
    // Na verdade, eu vou tentar usar o rpc se houver um executor de SQL, ou simplesmente focar no código JS.
    // Como não tenho certeza do executor, vou atualizar o código primeiro e pedir ao usuário para rodar o SQL se falhar.
    
    // TENTATIVA DE UPDATE (assumindo que a coluna existe ou foi adicionada por mim mentalmente)
    const { data: records, error: fetchError } = await supabase
        .from('afastamentos')
        .select('id, servidor_cpf, servidor_matricula')
        .is('servidor_cargo', null);
        
    if (fetchError) {
        console.error("Erro ao buscar registros (provavelmente coluna servidor_cargo não existe ainda):", fetchError.message);
        return;
    }

    console.log(`Encontrados ${records.length} registros sem cargo.`);

    for (const record of records) {
        const { data: servant } = await supabase
            .from('servidores')
            .select('cargo')
            .eq('cpf', record.servidor_cpf)
            .eq('matricula', record.servidor_matricula)
            .maybeSingle();
            
        if (servant && servant.cargo) {
            await supabase.from('afastamentos').update({ servidor_cargo: servant.cargo }).eq('id', record.id);
            console.log(`Atualizado ID ${record.id} com cargo: ${servant.cargo}`);
        }
    }
    
    console.log("Migração concluída.");
}

migrate();
