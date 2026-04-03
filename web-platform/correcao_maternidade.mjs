/**
 * Correção de dados — Licenças Maternidade
 *
 * Aplica 3 correções com snapshot before/after para auditoria:
 *
 *  CORREÇÃO 1 — TIPO-1  (27 registros)
 *    tipo_afastamento "AUX. DOENÇA" → "LICENÇA MATERNIDADE"
 *    IDs: 607,610,621,624,633,659,660,666,667,687,695,696,697,700,701,
 *         707,725,726,733,740,752,766,767,769,775,788,789
 *
 *  CORREÇÃO 2 — TIPO-2  (7 registros)
 *    Inserir CID Z34 nos registros sem CID vinculado
 *    IDs: 845,846,847,848,849,850,851
 *
 *  CORREÇÃO 3 — TIPO-3  (38 registros de afastamento_cids)
 *    cid_codigo "LICENÇA MATERNIDADE" → "Z34"
 *    cid_codigo "O820" → "O82.0" (1 registro — afastamento 735)
 *
 * Execução: node correcao_maternidade.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ---------------------------------------------------------------------------
// IDs levantados pelo diagnostico_maternidade.mjs
// ---------------------------------------------------------------------------
const IDS_TIPO1 = [607, 610, 621, 624, 633, 659, 660, 666, 667, 687, 695,
                   696, 697, 700, 701, 707, 725, 726, 733, 740, 752, 766,
                   767, 769, 775, 788, 789];

const IDS_TIPO2 = [845, 846, 847, 848, 849, 850, 851];

const CID_Z34 = {
  cid_codigo: 'Z34',
  cid_descricao: 'Supervisão de gravidez normal',
  cid_capitulo: 'Capítulo XXI - Contatos com serviços de saúde',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let erros = 0;
let sucessos = 0;

function hr() { console.log('-'.repeat(90)); }
function section(t) { hr(); console.log(`\n  ${t}\n`); }

function ok(msg) { console.log(`  ✓ ${msg}`); sucessos++; }
function fail(msg, err) { console.error(`  ✗ ${msg}: ${err}`); erros++; }

// ---------------------------------------------------------------------------
// SNAPSHOT — estado antes das correções
// ---------------------------------------------------------------------------
async function snapshot() {
  // Registros TIPO-1
  const { data: snap1, error: e1 } = await supabase
    .from('afastamentos')
    .select('id, tipo_afastamento, servidor_nome, data_inicio')
    .in('id', IDS_TIPO1);

  if (e1) { fail('Snapshot TIPO-1', e1.message); return null; }

  // Registros TIPO-2
  const { data: snap2, error: e2 } = await supabase
    .from('afastamentos')
    .select('id, servidor_nome, data_inicio')
    .in('id', IDS_TIPO2);

  if (e2) { fail('Snapshot TIPO-2', e2.message); return null; }

  // CIDs malformados
  const { data: snap3a, error: e3a } = await supabase
    .from('afastamento_cids')
    .select('id, afastamento_id, cid_codigo, cid_descricao, cid_capitulo')
    .eq('cid_codigo', 'LICENÇA MATERNIDADE');

  const { data: snap3b, error: e3b } = await supabase
    .from('afastamento_cids')
    .select('id, afastamento_id, cid_codigo, cid_descricao, cid_capitulo')
    .eq('cid_codigo', 'O820');

  if (e3a) { fail('Snapshot TIPO-3a', e3a.message); return null; }
  if (e3b) { fail('Snapshot TIPO-3b', e3b.message); return null; }

  return { snap1, snap2, snap3a, snap3b: snap3b ?? [] };
}

// ---------------------------------------------------------------------------
// CORREÇÃO 1 — tipo_afastamento "AUX. DOENÇA" → "LICENÇA MATERNIDADE"
// ---------------------------------------------------------------------------
async function corrigir_tipo1() {
  section(`CORREÇÃO 1 — Tipo afastamento (${IDS_TIPO1.length} registros)`);

  const { data, error } = await supabase
    .from('afastamentos')
    .update({ tipo_afastamento: 'LICENÇA MATERNIDADE' })
    .in('id', IDS_TIPO1)
    .select('id, tipo_afastamento, servidor_nome');

  if (error) {
    fail('UPDATE tipo_afastamento', error.message);
    return;
  }

  for (const r of (data ?? [])) {
    ok(`ID ${r.id} — ${r.servidor_nome} → tipo = "${r.tipo_afastamento}"`);
  }

  if ((data?.length ?? 0) !== IDS_TIPO1.length) {
    console.warn(`  ⚠  Esperado ${IDS_TIPO1.length} atualizações, recebido ${data?.length ?? 0}`);
  }
}

// ---------------------------------------------------------------------------
// CORREÇÃO 2 — Inserir CID Z34 nos registros sem CID
// ---------------------------------------------------------------------------
async function corrigir_tipo2() {
  section(`CORREÇÃO 2 — Inserir CID Z34 (${IDS_TIPO2.length} registros)`);

  // Verificar se algum já tem CID (segurança contra dupla execução)
  const { data: existentes } = await supabase
    .from('afastamento_cids')
    .select('afastamento_id')
    .in('afastamento_id', IDS_TIPO2);

  const jaTemCid = new Set((existentes ?? []).map(r => r.afastamento_id));

  for (const afastamentoId of IDS_TIPO2) {
    if (jaTemCid.has(afastamentoId)) {
      console.log(`  ⏭  ID ${afastamentoId} — CID já existe, pulando`);
      continue;
    }

    const { error } = await supabase
      .from('afastamento_cids')
      .insert({ afastamento_id: afastamentoId, ...CID_Z34 });

    if (error) {
      fail(`INSERT CID para afastamento_id ${afastamentoId}`, error.message);
    } else {
      ok(`ID ${afastamentoId} — CID Z34 inserido`);
    }
  }
}

// ---------------------------------------------------------------------------
// CORREÇÃO 3a — cid_codigo "LICENÇA MATERNIDADE" → "Z34"
// ---------------------------------------------------------------------------
async function corrigir_tipo3a() {
  section(`CORREÇÃO 3a — CID malformado "LICENÇA MATERNIDADE" → "Z34"`);

  const { data, error } = await supabase
    .from('afastamento_cids')
    .update({
      cid_codigo: CID_Z34.cid_codigo,
      cid_descricao: CID_Z34.cid_descricao,
      cid_capitulo: CID_Z34.cid_capitulo,
    })
    .eq('cid_codigo', 'LICENÇA MATERNIDADE')
    .select('id, afastamento_id, cid_codigo');

  if (error) {
    fail('UPDATE cid_codigo LICENÇA MATERNIDADE', error.message);
    return;
  }

  console.log(`  Registros atualizados: ${data?.length ?? 0}`);
  for (const r of (data ?? [])) {
    ok(`afastamento_cid.id ${r.id} (afastamento_id ${r.afastamento_id}) → ${r.cid_codigo}`);
  }
}

// ---------------------------------------------------------------------------
// CORREÇÃO 3b — cid_codigo "O820" → "O82.0"
// ---------------------------------------------------------------------------
async function corrigir_tipo3b() {
  section(`CORREÇÃO 3b — CID malformado "O820" → "O82.0" (afastamento 735)`);

  const { data, error } = await supabase
    .from('afastamento_cids')
    .update({ cid_codigo: 'O82.0' })
    .eq('cid_codigo', 'O820')
    .select('id, afastamento_id, cid_codigo');

  if (error) {
    fail('UPDATE cid_codigo O820', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('  ⏭  Nenhum registro com "O820" encontrado (pode já ter sido corrigido).');
    return;
  }

  for (const r of data) {
    ok(`afastamento_cid.id ${r.id} (afastamento_id ${r.afastamento_id}) → ${r.cid_codigo}`);
  }
}

// ---------------------------------------------------------------------------
// VALIDAÇÃO FINAL — reexecutar diagnóstico simplificado
// ---------------------------------------------------------------------------
async function validacao_final() {
  section('VALIDAÇÃO FINAL — Estado pós-correção');

  const { data: todos } = await supabase
    .from('afastamentos')
    .select('id, tipo_afastamento, afastamento_cids(cid_codigo)');

  if (!todos) { fail('Busca validação', 'sem dados'); return; }

  let tipo1Restantes = 0;
  let tipo2Restantes = 0;
  let tipo3Restantes = 0;

  for (const r of todos) {
    const tipoNorm = (r.tipo_afastamento || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ehMaternidade = tipoNorm.includes('MATERNIDADE');
    const cids = r.afastamento_cids ?? [];
    const temCidMaternidade = cids.some(c => (c.cid_codigo || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('MATERNIDADE'));
    const temCidMalformado = cids.some(c => !/^[A-Z]\d{2}(\.\d{1,2})?$/.test((c.cid_codigo || '').trim().toUpperCase()));

    if (!ehMaternidade && temCidMaternidade) tipo1Restantes++;
    if (ehMaternidade && cids.length === 0) tipo2Restantes++;
    if (temCidMalformado && (ehMaternidade || temCidMaternidade)) tipo3Restantes++;
  }

  console.log(`  TIPO-1 restantes (tipo errado + CID maternidade): ${tipo1Restantes === 0 ? '0 ✓' : tipo1Restantes + ' ✗'}`);
  console.log(`  TIPO-2 restantes (sem CID):                       ${tipo2Restantes === 0 ? '0 ✓' : tipo2Restantes + ' ✗'}`);
  console.log(`  TIPO-3 restantes (CID malformado):                ${tipo3Restantes === 0 ? '0 ✓' : tipo3Restantes + ' ✗'}`);

  if (tipo1Restantes === 0 && tipo2Restantes === 0 && tipo3Restantes === 0) {
    console.log('\n  ✓✓ TODOS OS PROBLEMAS CORRIGIDOS. Base de maternidade está íntegra.\n');
  } else {
    console.log('\n  ⚠  Ainda existem problemas — execute diagnostico_maternidade.mjs para detalhar.\n');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n' + '='.repeat(90));
  console.log('  SESMT — CORREÇÃO DE DADOS: LICENÇAS MATERNIDADE');
  console.log('  Data: ' + new Date().toLocaleString('pt-BR'));
  console.log('='.repeat(90) + '\n');

  // Snapshot antes
  section('SNAPSHOT — Estado antes das correções');
  const snap = await snapshot();
  if (!snap) {
    console.error('  Snapshot falhou. Abortando por segurança.');
    process.exit(1);
  }

  console.log(`  Registros TIPO-1 (tipo errado):    ${snap.snap1.length}`);
  console.log(`  Registros TIPO-2 (sem CID):        ${snap.snap2.length}`);
  console.log(`  Registros TIPO-3 "LICENÇA MAT.":   ${snap.snap3a.length}`);
  console.log(`  Registros TIPO-3 "O820":           ${snap.snap3b.length}`);

  // Aplicar correções
  await corrigir_tipo1();
  await corrigir_tipo2();
  await corrigir_tipo3a();
  await corrigir_tipo3b();

  // Resultado
  hr();
  console.log(`\n  Operações com sucesso: ${sucessos}`);
  console.log(`  Erros:                 ${erros}`);

  await validacao_final();
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
