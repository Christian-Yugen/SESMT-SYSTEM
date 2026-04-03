/**
 * Diagnóstico: Levantamento de afastamentos sem CID e discrepância de contagem
 *
 * Compara public.afastamentos (base operacional, lida pelo CID Analytics)
 * com abs_intel.abs_fact_afastamento_evento (base analítica, lida pela Epidemiologia).
 *
 * Execução: node diagnostico_sem_cid.mjs
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
// Lógica de maternidade espelhada do código TypeScript (afastamentos-elegibilidade.ts)
// ---------------------------------------------------------------------------
const MATERNITY_MARKER = 'MATERNIDADE';
function isMaternitySignal(value) {
  if (!value) return false;
  return value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(MATERNITY_MARKER);
}
function isMaternityRecord(record) {
  if (isMaternitySignal(record.tipo_afastamento)) return true;
  return (record.afastamento_cids ?? []).some(
    (cid) =>
      isMaternitySignal(cid.cid_codigo) ||
      isMaternitySignal(cid.cid_descricao) ||
      isMaternitySignal(cid.cid_capitulo),
  );
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
function hr() { console.log('-'.repeat(80)); }
function section(title) { hr(); console.log(`\n  ${title}\n`); }

// ---------------------------------------------------------------------------
// BLOCO 1: Contagem geral em public.afastamentos
// ---------------------------------------------------------------------------
async function bloco1_contagem_publica() {
  section('BLOCO 1 — Contagem em public.afastamentos (base operacional)');

  const { data: todos, error } = await supabase
    .from('afastamentos')
    .select('id, tipo_afastamento, servidor_cpf, servidor_nome, data_inicio, data_fim, dias_afastado, situacao, status, afastamento_cids(cid_codigo, cid_descricao, cid_capitulo)');

  if (error) {
    console.error('Erro ao buscar afastamentos:', error.message);
    return null;
  }

  const total = todos.length;
  const maternidade = todos.filter(isMaternityRecord);
  const elegíveis = todos.filter(r => !isMaternityRecord(r));
  const semCid = elegíveis.filter(r => !r.afastamento_cids || r.afastamento_cids.length === 0);
  const comCid = elegíveis.filter(r => r.afastamento_cids && r.afastamento_cids.length > 0);

  // Maternidades sem CID — esperado (não precisam de CID)
  const maternidadeSemCid = maternidade.filter(r => !r.afastamento_cids || r.afastamento_cids.length === 0);
  const maternidadeComCid = maternidade.filter(r => r.afastamento_cids && r.afastamento_cids.length > 0);

  console.log(`  Total bruto em public.afastamentos:               ${total}`);
  console.log(`  ┌─ Maternidade (política A1):                     ${maternidade.length}`);
  console.log(`  │    → Com CID (ex: CID Z34):                     ${maternidadeComCid.length}`);
  console.log(`  │    → Sem CID (esperado — não é problema):       ${maternidadeSemCid.length}`);
  console.log(`  └─ Não-maternidade (elegíveis para análise):      ${elegíveis.length}`);
  console.log(`       → Com ao menos 1 CID em afastamento_cids:   ${comCid.length}`);
  console.log(`       → SEM nenhum CID em afastamento_cids:       ${semCid.length}  ← PROBLEMA REAL`);

  return { todos, elegíveis, semCid, maternidade, maternidadeSemCid };
}

// ---------------------------------------------------------------------------
// BLOCO 2: Listagem dos registros elegíveis sem CID
// ---------------------------------------------------------------------------
async function bloco2_sem_cid(semCid) {
  if (!semCid || semCid.length === 0) {
    section('BLOCO 2 — Registros sem CID');
    console.log('  Nenhum registro elegível sem CID encontrado. base está íntegra!');
    return;
  }

  section(`BLOCO 2 — Detalhamento dos ${semCid.length} registro(s) sem CID`);
  console.log(`  ${'ID'.padEnd(8)} ${'CPF'.padEnd(15)} ${'NOME'.padEnd(35)} ${'DATA_INICIO'.padEnd(12)} ${'DIAS'.padEnd(6)} ${'SITUACAO'.padEnd(15)} TIPO`);
  console.log(`  ${'-'.repeat(110)}`);

  for (const r of semCid) {
    const id    = String(r.id).padEnd(8);
    const cpf   = (r.servidor_cpf || '').padEnd(15);
    const nome  = (r.servidor_nome || '').slice(0, 34).padEnd(35);
    const ini   = (r.data_inicio || '').padEnd(12);
    const dias  = String(r.dias_afastado || 0).padEnd(6);
    const sit   = (r.situacao || '').padEnd(15);
    const tipo  = r.tipo_afastamento || '(nulo)';
    console.log(`  ${id} ${cpf} ${nome} ${ini} ${dias} ${sit} ${tipo}`);
  }

  // Classificação dos motivos
  const nulos = semCid.filter(r => !r.tipo_afastamento);
  const auxDoenca = semCid.filter(r => (r.tipo_afastamento || '').toUpperCase().includes('DOEN'));
  const outros = semCid.filter(r => r.tipo_afastamento && !auxDoenca.map(x => x.id).includes(r.id));

  console.log(`\n  Classificação por tipo:`);
  console.log(`    - tipo_afastamento nulo/vazio:  ${nulos.length}`);
  console.log(`    - AUX. DOENÇA (sem CID):        ${auxDoenca.length}`);
  console.log(`    - Outros tipos sem CID:          ${outros.length}`);
  if (outros.length > 0) {
    const tipos = [...new Set(outros.map(r => r.tipo_afastamento))];
    tipos.forEach(t => console.log(`      · ${t}`));
  }
}

// ---------------------------------------------------------------------------
// BLOCO 3: Cross-reference com abs_intel (ajuda a entender os 24 de diferença)
// ---------------------------------------------------------------------------
async function bloco3_abs_intel(todosDaPublica) {
  section('BLOCO 3 — Cross-reference: public.afastamentos × abs_intel');

  // Buscar hashes dos eventos no abs_intel
  const { data: absEventos, error: errAbs } = await supabase
    .from('abs_fact_afastamento_evento')
    .select('afastamento_id, source_event_hash, tipo_licenca, data_inicio')
    // Supabase REST => schema abs_intel precisa de search_path ou prefixo
    // Se der erro, o schema não está exposto via PostgREST — use SQL direto
    .limit(5000);

  if (errAbs) {
    console.log(`  ⚠  abs_intel não acessível via PostgREST anônimo: ${errAbs.message}`);
    console.log(`  → Execute as queries SQL abaixo diretamente no SQL Editor do Supabase.\n`);
    bloco3_sql_fallback(todosDaPublica);
    return;
  }

  const hashesAbsIntel = new Set(absEventos.map(e => e.source_event_hash).filter(Boolean));
  const totalAbsIntel = absEventos.length;
  const maternidadeAbsIntel = absEventos.filter(e =>
    isMaternitySignal(e.tipo_licenca)
  ).length;

  console.log(`  abs_intel eventos total:                   ${totalAbsIntel}`);
  console.log(`  abs_intel excluídos maternidade:           ${maternidadeAbsIntel}`);
  console.log(`  abs_intel elegíveis:                       ${totalAbsIntel - maternidadeAbsIntel}`);

  // Registros da public que têm hash_auditoria e podemos cruzar
  const publicComHash = todosDaPublica.filter(r => r.hash_auditoria);
  const publicSemHash = todosDaPublica.filter(r => !r.hash_auditoria);
  console.log(`\n  public.afastamentos com hash_auditoria:    ${publicComHash.length}`);
  console.log(`  public.afastamentos sem hash_auditoria:    ${publicSemHash.length}`);
  if (publicSemHash.length > 0) {
    console.log(`  ⚠  Registros sem hash_auditoria podem ter sido ETL-deduplicados.`);
  }
}

function bloco3_sql_fallback(todos) {
  section('BLOCO 3b — SQL para executar no SQL Editor do Supabase');

  console.log(`-- =========================================================`);
  console.log(`-- DIAGNÓSTICO: Discrepância de contagem entre as duas bases`);
  console.log(`-- Execute no SQL Editor do Supabase Dashboard`);
  console.log(`-- =========================================================\n`);

  console.log(`-- 1) Contagem geral em public.afastamentos`);
  console.log(`SELECT`);
  console.log(`  COUNT(*) AS total_bruto,`);
  console.log(`  COUNT(*) FILTER (WHERE UPPER(tipo_afastamento) LIKE '%MATERNIDADE%') AS maternidade,`);
  console.log(`  COUNT(*) FILTER (WHERE UPPER(tipo_afastamento) NOT LIKE '%MATERNIDADE%'`);
  console.log(`                     OR tipo_afastamento IS NULL)                       AS elegiveis`);
  console.log(`FROM public.afastamentos;\n`);

  console.log(`-- 2) Registros elegíveis sem nenhum CID em afastamento_cids`);
  console.log(`SELECT`);
  console.log(`  a.id,`);
  console.log(`  a.servidor_cpf,`);
  console.log(`  a.servidor_nome,`);
  console.log(`  a.data_inicio,`);
  console.log(`  a.data_fim,`);
  console.log(`  a.dias_afastado,`);
  console.log(`  a.tipo_afastamento,`);
  console.log(`  a.situacao,`);
  console.log(`  a.status`);
  console.log(`FROM public.afastamentos a`);
  console.log(`WHERE NOT (UPPER(COALESCE(a.tipo_afastamento,'')) LIKE '%MATERNIDADE%')`);
  console.log(`  AND NOT EXISTS (`);
  console.log(`        SELECT 1 FROM public.afastamento_cids c WHERE c.afastamento_id = a.id`);
  console.log(`  )`);
  console.log(`ORDER BY a.data_inicio DESC;\n`);

  console.log(`-- 3) Contagem em abs_intel.abs_fact_afastamento_evento`);
  console.log(`SELECT`);
  console.log(`  COUNT(*) AS total,`);
  console.log(`  COUNT(*) FILTER (WHERE UPPER(tipo_licenca) LIKE '%MATERNIDADE%') AS maternidade,`);
  console.log(`  COUNT(*) FILTER (WHERE UPPER(tipo_licenca) NOT LIKE '%MATERNIDADE%') AS elegiveis`);
  console.log(`FROM abs_intel.abs_fact_afastamento_evento;\n`);

  console.log(`-- 4) Cross-reference por hash_auditoria:`);
  console.log(`--    Registros em public.afastamentos que NÃO existem em abs_intel`);
  console.log(`--    (candidatos que o ETL ainda não processou ou foram ignorados)`);
  console.log(`SELECT`);
  console.log(`  a.id,`);
  console.log(`  a.servidor_cpf,`);
  console.log(`  a.servidor_nome,`);
  console.log(`  a.data_inicio,`);
  console.log(`  a.tipo_afastamento,`);
  console.log(`  a.hash_auditoria,`);
  console.log(`  a.situacao`);
  console.log(`FROM public.afastamentos a`);
  console.log(`WHERE NOT (UPPER(COALESCE(a.tipo_afastamento,'')) LIKE '%MATERNIDADE%')`);
  console.log(`  AND a.hash_auditoria IS NOT NULL`);
  console.log(`  AND NOT EXISTS (`);
  console.log(`        SELECT 1`);
  console.log(`        FROM abs_intel.abs_fact_afastamento_evento e`);
  console.log(`        WHERE e.source_event_hash = a.hash_auditoria`);
  console.log(`  )`);
  console.log(`ORDER BY a.data_inicio DESC;\n`);

  console.log(`-- 5) Registros em abs_intel que NÃO existem mais em public.afastamentos`);
  console.log(`--    (registros deletados da operacional mas permaneceram na analítica)`);
  console.log(`SELECT`);
  console.log(`  e.afastamento_id AS abs_intel_id,`);
  console.log(`  e.source_event_hash,`);
  console.log(`  e.tipo_licenca,`);
  console.log(`  e.data_inicio,`);
  console.log(`  e.situacao`);
  console.log(`FROM abs_intel.abs_fact_afastamento_evento e`);
  console.log(`WHERE NOT (UPPER(tipo_licenca) LIKE '%MATERNIDADE%')`);
  console.log(`  AND e.source_event_hash IS NOT NULL`);
  console.log(`  AND NOT EXISTS (`);
  console.log(`        SELECT 1`);
  console.log(`        FROM public.afastamentos a`);
  console.log(`        WHERE a.hash_auditoria = e.source_event_hash`);
  console.log(`  )`);
  console.log(`ORDER BY e.data_inicio DESC;\n`);

  console.log(`-- 6) Duplicates em public.afastamentos por hash_auditoria`);
  console.log(`--    (mesmo evento registrado mais de uma vez)`);
  console.log(`SELECT`);
  console.log(`  hash_auditoria,`);
  console.log(`  COUNT(*) AS duplicatas,`);
  console.log(`  MIN(id) AS id_mais_antigo,`);
  console.log(`  MAX(id) AS id_mais_recente,`);
  console.log(`  MIN(data_inicio::text) AS data_inicio`);
  console.log(`FROM public.afastamentos`);
  console.log(`WHERE hash_auditoria IS NOT NULL`);
  console.log(`GROUP BY hash_auditoria`);
  console.log(`HAVING COUNT(*) > 1`);
  console.log(`ORDER BY duplicatas DESC;\n`);
}

// ---------------------------------------------------------------------------
// BLOCO 4: Resumo e recomendações
// ---------------------------------------------------------------------------
function bloco4_resumo(semCid, maternidadeSemCid) {
  section('BLOCO 4 — Resumo e recomendações');

  if (!semCid) {
    console.log('  Não foi possível concluir o diagnóstico (erro na busca).');
    return;
  }

  console.log(`  Maternidades sem CID: ${maternidadeSemCid?.length ?? 0}  → NORMAL (maternidade não exige CID)`);
  console.log('');

  if (semCid.length === 0) {
    console.log('  ✓ Todos os registros não-maternidade têm ao menos 1 CID. Integridade OK.');
    console.log('  A diferença entre as telas é devida à deduplicação do ETL em abs_intel,');
    console.log('  não a ausência de CID.');
  } else {
    console.log(`  ✗ ${semCid.length} afastamento(s) não-maternidade sem CID (problema real).`);
    console.log('');
    console.log('  AÇÃO RECOMENDADA:');
    console.log('  Para cada ID listado no Bloco 2:');
    console.log('  1. Acesse o cadastro do afastamento no sistema operacional.');
    console.log('  2. Verifique se o campo CID está preenchido na planilha de origem.');
    console.log('  3. Importe ou preencha manualmente o CID no campo `afastamento_cids`.');
    console.log('  4. Após a correção, re-execute o ETL do abs_intel para sincronizar.');
  }

  hr();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('  SESMT — Diagnóstico de Integridade: Afastamentos sem CID');
  console.log('  Data: ' + new Date().toLocaleString('pt-BR'));
  console.log('='.repeat(80) + '\n');

  const result = await bloco1_contagem_publica();
  if (!result) return;

  const { todos, elegíveis, semCid, maternidade, maternidadeSemCid } = result;

  await bloco2_sem_cid(semCid);
  await bloco3_abs_intel(todos);
  bloco4_resumo(semCid, maternidadeSemCid);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
