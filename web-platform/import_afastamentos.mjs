import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Variáveis de ambiente Supabase não encontradas!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const excelDateToISO = (serial) => {
  if (!serial || isNaN(serial)) return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
};

async function importData() {
  const filePath = 'c:\\Users\\Usuário\\Desktop\\SESMT\\dados\\Afastamentos.xlsx';
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Iniciando importação de ${rows.length} registros...`);

  for (const row of rows) {
    try {
      const cpf = String(row['CPF']).padStart(11, '0').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      const matricula = String(row['MATRICULA']);
      
      // Tentar encontrar o servidor para pegar a secretaria e cargo se não tiver
      const { data: servidor } = await supabase
        .from('servidores')
        .select('*')
        .eq('cpf', cpf.replace(/\D/g, ''))
        .eq('matricula', matricula)
        .maybeSingle();

      const dataInicio = excelDateToISO(row['INICIO AFAST']);
      const dataFim = excelDateToISO(row['FIM AFAST']);
      
      const { data: newRec, error } = await supabase
        .from('afastamentos')
        .insert({
          servidor_cpf: cpf.replace(/\D/g, ''),
          servidor_nome: row['NOME'],
          servidor_matricula: matricula,
          servidor_contrato: null, // Na planilha não tem contrato separado, assume-se do servidor se achado
          servidor_secretaria: row['SECRETARIA'] || servidor?.secretaria,
          natureza_cargo: row['NATUREZA CARGO'] || servidor?.natureza_cargo,
          tipo_afastamento: row['TIPO DE LICENÇA'],
          dias_afastado: row['DIAS DE AFAST'],
          data_inicio: dataInicio,
          data_fim: dataFim,
          situacao: row['STATUS'] === 'ATIVO' ? 'EM_ANDAMENTO' : 'FINALIZADO',
          status: 'ATIVO'
        })
        .select()
        .single();

      if (error) {
        console.error(`Erro ao importar ${row['NOME']}:`, error.message);
        continue;
      }

      // Importar CIDs
      if (row['CID']) {
        const cids = String(row['CID']).split(',').map(c => c.trim());
        for (const cidCode of cids) {
          await supabase.from('afastamento_cids').insert({
            afastamento_id: newRec.id,
            cid_codigo: cidCode,
            cid_descricao: 'Importado de Legado',
            cid_capitulo: 'Legado'
          });
        }
      }

      process.stdout.write('.');
    } catch (e) {
      console.error("Falha na linha:", row, e.message);
    }
  }

  console.log("\nImportação concluída!");
}

importData();
