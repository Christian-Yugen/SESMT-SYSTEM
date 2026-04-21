import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega .env.local relativo ao script
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Faltam variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

const csvPath = path.resolve(__dirname, '../../dados/out/janAmar26__Planilha1.csv');
if (!fs.existsSync(csvPath)) {
  console.error('Arquivo CSV não encontrado em:', csvPath);
  process.exit(2);
}

console.log('Lendo CSV em', csvPath);
const wb = XLSX.readFile(csvPath, { raw: true });
const sheet = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
console.log('Linhas no CSV (incluindo cabeçalho):', raw.length);

// Map de cabeçalhos para colunas da tabela staging/final
const headerMap = {
  'MATRICULA': 'matricula',
  'CONTRATO': 'contrato',
  'NOME': 'nome',
  'NOME CARGO': 'nome_cargo',
  'SEXO': 'sexo',
  'NOME DIVISAO': 'nome_divisao',
  'LOCAL DE TRABALHO': 'local_de_trabalho',
  'NOME UNIDADE': 'nome_unidade',
  'DETALHES VINCULO': 'detalhes_vinculo',
  'VINCULO': 'vinculo',
  'DT ADMISSAO': 'dt_admissao',
  'CID': 'cid',
  'QTDE DIAS': 'qtde_dias',
  'QTDE AFASTAMENTOS': 'qtde_afastamentos',
  'PERIODO': 'periodo'
};

const transformRow = (r) => {
  const obj = {};
  Object.keys(headerMap).forEach((h) => {
    const key = headerMap[h];
    // Alguns headers podem ter sido lidos com capitalização diferente
    const rawValue = r[h] !== undefined ? r[h] : r[h.toLowerCase()] || '';
    obj[key] = ('' + rawValue).trim();
  });

  // Aplicar regras de transformação similares ao SQL
  const safeInt = (v) => {
    const s = (v || '').toString().trim();
    return /^[0-9]+$/.test(s) ? parseInt(s, 10) : null;
  };

  const safeDate = (v) => {
    const s = (v || '').toString().trim();
    if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return s; // mantemos como string 'YYYY-MM-DD'
    return null;
  };

  const periodo = safeDate(obj.periodo);
  const dt_admissao = safeDate(obj.dt_admissao);
  const cid = obj.cid === '0' || obj.cid === '' ? null : obj.cid;

  return {
    matricula: obj.matricula || null,
    contrato: obj.contrato || null,
    nome: obj.nome || null,
    nome_cargo: obj.nome_cargo || null,
    sexo: obj.sexo || null,
    nome_divisao: obj.nome_divisa || obj.nome_divisao || null,
    local_de_trabalho: obj.local_de_trabalho || null,
    nome_unidade: obj.nome_unidade || null,
    detalhes_vinculo: obj.detalhes_vinculo || null,
    vinculo: obj.vinculo || null,
    dt_admissao: dt_admissao,
    cid: cid,
    qtde_dias: safeInt(obj.qtde_dias),
    qtde_afastamentos: safeInt(obj.qtde_afastamentos),
    periodo: periodo,
  };
};

// Deduplicar pelo índice único real: matricula|periodo|cid
// (mesma pessoa pode ter múltiplos CIDs no mesmo período)
const seen = new Set();
const rows = [];
for (const r of raw.map(transformRow)) {
  if (!r.matricula) continue;
  const key = `${r.matricula}|${r.periodo ?? 'null'}|${r.cid ?? 'null'}`;
  if (!seen.has(key)) { seen.add(key); rows.push(r); }
}
console.log('Linhas válidas para inserção (sem duplicatas por mat+per+cid):', rows.length);

// Inserir em lotes
const BATCH = 200;
(async () => {
  let total = 0;
  let errors = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('atestados_import')
      .upsert(batch, { onConflict: 'matricula,periodo,cid' })
      .select('id');
    if (error) {
      console.error(`\n[ERRO] batch ${Math.floor(i / BATCH) + 1}:`, error.message);
      console.error('  1ª linha do batch:', JSON.stringify(batch[0]));
      errors++;
    } else {
      total += (data || []).length;
      process.stdout.write(`\rInseridos: ${total} / ${rows.length}   `);
    }
  }
  console.log('\n');
  if (errors > 0) console.warn(`Concluído com ${errors} erro(s) em lotes.`);
  else console.log('✔ Importação concluída! Total inserido/atualizado:', total);
  process.exit(0);
})();
