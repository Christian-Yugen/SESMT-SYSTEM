import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Faltam variáveis no .env.local'); process.exit(2); }
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const reportPath = path.resolve(__dirname, '../out/discarded_atestados_report.json');
if (!fs.existsSync(reportPath)) { console.error('Relatório não encontrado:', reportPath); process.exit(2); }
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const discarded = report.discarded || [];
if (discarded.length === 0) { console.log('Nenhuma linha descartada para aplicar.'); process.exit(0); }

const rows = discarded.map((d) => d.transformed).filter(Boolean);
console.log('Linhas a inserir/upsert:', rows.length);

const BATCH = 100;
(async () => {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('atestados_import')
      .upsert(batch, { onConflict: 'matricula,contrato,periodo,cid' })
      .select('id');
    if (error) {
      console.error('Erro no batch:', error.message || error);
      process.exit(1);
    }
    inserted += (data || []).length;
    process.stdout.write(`\rInseridos/atualizados: ${inserted} / ${rows.length}`);
  }
  console.log('\nConcluído. Inseridos/atualizados:', inserted);
  process.exit(0);
})();
