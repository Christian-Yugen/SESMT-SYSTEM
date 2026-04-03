/**
 * Relatório de integridade — Licenças Maternidade
 *
 * Identifica 3 categorias de erro:
 *
 *  TIPO-1: tipo_afastamento = "AUX. DOENÇA" (ou qualquer valor diferente de LICENÇA MATERNIDADE)
 *          mas o CID registrado contém sinal de maternidade (ex: "LICENAMATERNIDADE", "Z34", "O80", etc.)
 *          → Problema: tipo incorreto, deveria ser "LICENÇA MATERNIDADE"
 *
 *  TIPO-2: tipo_afastamento contém "MATERNIDADE" (correto) mas sem nenhum CID registrado
 *          → Problema: falta vincular CID (Z34.x ou O80.x etc.) ao registro
 *
 *  TIPO-3: CID com código malformado / inválido vinculado a um registro de maternidade
 *          (ex: "LICENAMATERNIDADE", "LICENCAMATERNIDADE", "MATERNIDADE", texto livre)
 *          → Problema: código não é CID-10 válido, deve ser substituído por Z34 ou O80
 *
 * Execução: node diagnostico_maternidade.mjs
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
// Helpers
// ---------------------------------------------------------------------------

function normalize(v) {
  if (!v) return '';
  return v.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** CID-10 válido: letra + 2 dígitos, opcionalmente ponto + dígito(s) */
function isValidCid10(code) {
  if (!code) return false;
  return /^[A-Z]\d{2}(\.\d{1,2})?$/.test(code.trim().toUpperCase());
}

function hasMaternitySignal(str) {
  return normalize(str).includes('MATERNIDADE') || normalize(str).includes('MATERN');
}

function hr() { console.log('-'.repeat(100)); }
function section(t) { hr(); console.log(`\n  ${t}\n`); }

// ---------------------------------------------------------------------------
// Buscar todos os afastamentos com CIDs
// ---------------------------------------------------------------------------
async function fetchAll() {
  const { data, error } = await supabase
    .from('afastamentos')
    .select(`
      id,
      servidor_cpf,
      servidor_nome,
      servidor_matricula,
      servidor_secretaria,
      servidor_cargo,
      natureza_cargo,
      tipo_afastamento,
      data_inicio,
      data_fim,
      dias_afastado,
      situacao,
      status,
      is_acidente_trabalho,
      afastamento_cids (
        id,
        cid_codigo,
        cid_descricao,
        cid_capitulo
      )
    `);

  if (error) {
    console.error('Erro ao buscar dados:', error.message);
    process.exit(1);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Classificação
// ---------------------------------------------------------------------------
function classify(records) {
  const tipo1 = [];  // tipo errado, CID diz maternidade
  const tipo2 = [];  // tipo correto, sem CID
  const tipo3 = [];  // tipo correto OU errado, CID malformado

  for (const r of records) {
    const tipoNorm = normalize(r.tipo_afastamento || '');
    const ehMaternidadePorTipo = tipoNorm.includes('MATERNIDADE');

    const cids = r.afastamento_cids ?? [];
    const cidsMalformados = cids.filter(c => !isValidCid10(c.cid_codigo));
    const cidsComSinalMaternidade = cids.filter(c =>
      hasMaternitySignal(c.cid_codigo) ||
      hasMaternitySignal(c.cid_descricao) ||
      hasMaternitySignal(c.cid_capitulo)
    );

    // TIPO-1: tipo ≠ maternidade mas CID indica maternidade
    if (!ehMaternidadePorTipo && cidsComSinalMaternidade.length > 0) {
      tipo1.push({ ...r, _cidsProblema: cidsComSinalMaternidade });
    }

    // TIPO-2: tipo = maternidade mas sem CID
    if (ehMaternidadePorTipo && cids.length === 0) {
      tipo2.push(r);
    }

    // TIPO-3: qualquer registro de maternidade (por tipo ou por CID) com CID malformado
    if (cidsMalformados.length > 0 && (ehMaternidadePorTipo || cidsComSinalMaternidade.length > 0)) {
      tipo3.push({ ...r, _cidsMalformados: cidsMalformados });
    }
  }

  return { tipo1, tipo2, tipo3 };
}

// ---------------------------------------------------------------------------
// Formatação de linha de servidor
// ---------------------------------------------------------------------------
function linhaServidor(r) {
  const id   = String(r.id).padEnd(7);
  const cpf  = (r.servidor_cpf || '').padEnd(15);
  const nome = (r.servidor_nome || '').slice(0, 32).padEnd(33);
  const ini  = (r.data_inicio || '').padEnd(12);
  const fim  = (r.data_fim || '').padEnd(12);
  const dias = String(r.dias_afastado ?? 0).padEnd(5);
  const sit  = (r.situacao || '').padEnd(14);
  return `  ${id} ${cpf} ${nome} ${ini} ${fim} ${dias} ${sit}`;
}

// ---------------------------------------------------------------------------
// RELATÓRIO
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n' + '='.repeat(100));
  console.log('  SESMT — RELATÓRIO DE INTEGRIDADE: LICENÇAS MATERNIDADE');
  console.log('  Data: ' + new Date().toLocaleString('pt-BR'));
  console.log('='.repeat(100) + '\n');

  const todos = await fetchAll();
  const { tipo1, tipo2, tipo3 } = classify(todos);

  // Total geral de maternidades (todos os que têm sinal de maternidade por qualquer via)
  const todasMaternidades = todos.filter(r =>
    normalize(r.tipo_afastamento || '').includes('MATERNIDADE') ||
    (r.afastamento_cids ?? []).some(c =>
      hasMaternitySignal(c.cid_codigo) || hasMaternitySignal(c.cid_descricao) || hasMaternitySignal(c.cid_capitulo)
    )
  );

  console.log(`  Total de registros no sistema:                               ${todos.length}`);
  console.log(`  Total com algum sinal de maternidade (tipo ou CID):          ${todasMaternidades.length}`);
  console.log('');
  console.log(`  ✗ TIPO-1  tipo_afastamento ≠ LICENÇA MATERNIDADE + CID maternidade:  ${tipo1.length}`);
  console.log(`  ✗ TIPO-2  tipo = LICENÇA MATERNIDADE + sem CID vinculado:             ${tipo2.length}`);
  console.log(`  ✗ TIPO-3  CID malformado (código não é CID-10 válido):                ${tipo3.length}`);
  console.log('');

  // =========================================================================
  // TIPO-1
  // =========================================================================
  section(`TIPO-1 — "AUX. DOENÇA" (ou tipo incorreto) com CID de maternidade  [${tipo1.length} registro(s)]`);

  if (tipo1.length === 0) {
    console.log('  Nenhum registro nessa categoria.');
  } else {
    console.log(`  ${'ID'.padEnd(7)} ${'CPF'.padEnd(15)} ${'NOME'.padEnd(33)} ${'INÍCIO'.padEnd(12)} ${'FIM'.padEnd(12)} ${'DIAS'.padEnd(5)} ${'SITUAÇÃO'.padEnd(14)} TIPO_ATUAL`);
    console.log(`  ${'-'.repeat(130)}`);
    for (const r of tipo1) {
      console.log(`${linhaServidor(r)} ${r.tipo_afastamento || '(nulo)'}`);
      for (const c of r._cidsProblema) {
        console.log(`         ↳ CID: [${c.cid_codigo}] ${c.cid_descricao || ''} | Capítulo: ${c.cid_capitulo || 'N/A'}`);
      }
    }

    console.log('\n  Resumo por tipo_afastamento atual:');
    const byTipo = {};
    for (const r of tipo1) {
      const k = r.tipo_afastamento || '(nulo)';
      byTipo[k] = (byTipo[k] || 0) + 1;
    }
    for (const [k, v] of Object.entries(byTipo)) {
      console.log(`    · "${k}": ${v}`);
    }

    console.log('\n  Correção necessária:');
    console.log('    UPDATE afastamentos SET tipo_afastamento = \'LICENÇA MATERNIDADE\'');
    console.log('    WHERE id IN (' + tipo1.map(r => r.id).join(', ') + ');');
  }

  // =========================================================================
  // TIPO-2
  // =========================================================================
  section(`TIPO-2 — LICENÇA MATERNIDADE sem CID vinculado  [${tipo2.length} registro(s)]`);

  if (tipo2.length === 0) {
    console.log('  Nenhum registro nessa categoria.');
  } else {
    console.log(`  ${'ID'.padEnd(7)} ${'CPF'.padEnd(15)} ${'NOME'.padEnd(33)} ${'INÍCIO'.padEnd(12)} ${'FIM'.padEnd(12)} ${'DIAS'.padEnd(5)} SITUAÇÃO`);
    console.log(`  ${'-'.repeat(105)}`);
    for (const r of tipo2) {
      console.log(linhaServidor(r));
    }

    console.log('\n  Nota: CID recomendado para licença maternidade sem complicação: Z34 (Supervisão de gravidez normal)');
    console.log('  Alternativas: Z34.0, Z34.8, O80 (Parto único espontâneo), conforme laudo médico.');
  }

  // =========================================================================
  // TIPO-3
  // =========================================================================
  section(`TIPO-3 — CID com código malformado (não é CID-10 válido)  [${tipo3.length} registro(s)]`);

  if (tipo3.length === 0) {
    console.log('  Nenhum registro nessa categoria.');
  } else {
    console.log(`  ${'ID'.padEnd(7)} ${'CPF'.padEnd(15)} ${'NOME'.padEnd(33)} ${'TIPO_AFASTAMENTO'.padEnd(22)} INÍCIO`);
    console.log(`  ${'-'.repeat(110)}`);
    for (const r of tipo3) {
      const id   = String(r.id).padEnd(7);
      const cpf  = (r.servidor_cpf || '').padEnd(15);
      const nome = (r.servidor_nome || '').slice(0, 32).padEnd(33);
      const tipo = (r.tipo_afastamento || '').padEnd(22);
      const ini  = r.data_inicio || '';
      console.log(`  ${id} ${cpf} ${nome} ${tipo} ${ini}`);
      for (const c of r._cidsMalformados) {
        console.log(`         ↳ CID inválido: [${c.cid_codigo}] ${c.cid_descricao || ''} | Capítulo: ${c.cid_capitulo || 'N/A'}`);
      }
    }

    console.log('\n  Códigos malformados encontrados:');
    const codigosInvalidos = {};
    for (const r of tipo3) {
      for (const c of r._cidsMalformados) {
        codigosInvalidos[c.cid_codigo] = (codigosInvalidos[c.cid_codigo] || 0) + 1;
      }
    }
    for (const [k, v] of Object.entries(codigosInvalidos)) {
      console.log(`    · "${k}": ${v} ocorrência(s)`);
    }
  }

  // =========================================================================
  // TABELA CONSOLIDADA — todos os problemáticos
  // =========================================================================
  const todosProblematicos = new Map();
  for (const r of [...tipo1, ...tipo2]) {
    todosProblematicos.set(r.id, r);
  }
  for (const r of tipo3) {
    todosProblematicos.set(r.id, r);
  }

  section(`TABELA CONSOLIDADA — ${todosProblematicos.size} registro(s) com ao menos 1 problema`);

  if (todosProblematicos.size === 0) {
    console.log('  Nenhum problema encontrado. Todos os registros de maternidade estão íntegros.');
  } else {
    console.log(`  ${'ID'.padEnd(7)} ${'NOME'.padEnd(33)} ${'INÍCIO'.padEnd(12)} TIPO_AFASTAMENTO                  PROBLEMAS`);
    console.log(`  ${'-'.repeat(120)}`);
    for (const r of todosProblematicos.values()) {
      const emTipo1 = tipo1.some(x => x.id === r.id);
      const emTipo2 = tipo2.some(x => x.id === r.id);
      const emTipo3 = tipo3.some(x => x.id === r.id);
      const flags = [
        emTipo1 ? 'T1:tipo-errado' : '',
        emTipo2 ? 'T2:sem-CID' : '',
        emTipo3 ? 'T3:CID-malformado' : '',
      ].filter(Boolean).join(' + ');

      const id   = String(r.id).padEnd(7);
      const nome = (r.servidor_nome || '').slice(0, 32).padEnd(33);
      const ini  = (r.data_inicio || '').padEnd(12);
      const tipo = (r.tipo_afastamento || '(nulo)').padEnd(34);
      console.log(`  ${id} ${nome} ${ini} ${tipo} ${flags}`);
    }
  }

  hr();
  console.log('\n  FIM DO RELATÓRIO\n');
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
