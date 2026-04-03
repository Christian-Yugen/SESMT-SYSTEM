/**
 * fix_cid_chapters.mjs
 *
 * Resolve cid_descricao e cid_capitulo na tabela public.afastamento_cids
 * para todos os registros com cid_capitulo = 'Legado' ou 'CAPITULO_NAO_INFORMADO'.
 *
 * Uso: node fix_cid_chapters.mjs
 *
 * Após execução com sucesso: re-execute database/etl/001_abs_intel_controlled_etl.sql
 */

import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env.local') });

// ---------------------------------------------------------------------------
// 1. Montar catálogo CID10: código → { descricao, capitulo }
// ---------------------------------------------------------------------------

function resolveChapter(code) {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  const letter = c[0];
  const num = parseFloat(c.slice(1)) || 0;

  if (letter === 'A' || letter === 'B') return 'I';
  if (letter === 'C') return 'II';
  if (letter === 'D') return num <= 48 ? 'II' : 'III';
  if (letter === 'E') return 'IV';
  if (letter === 'F') return 'V';
  if (letter === 'G') return 'VI';
  if (letter === 'H') return num <= 59 ? 'VII' : 'VIII';
  if (letter === 'I') return 'IX';
  if (letter === 'J') return 'X';
  if (letter === 'K') return 'XI';
  if (letter === 'L') return 'XII';
  if (letter === 'M') return 'XIII';
  if (letter === 'N') return 'XIV';
  if (letter === 'O') return 'XV';
  if (letter === 'P') return 'XVI';
  if (letter === 'Q') return 'XVII';
  if (letter === 'R') return 'XVIII';
  if (letter === 'S' || letter === 'T') return 'XIX';
  if (letter === 'V' || letter === 'W' || letter === 'X' || letter === 'Y') return 'XX';
  if (letter === 'Z') return 'XXI';
  return null;
}

function buildCidCatalog() {
  const wb = XLSX.readFile(resolve(__dirname, '../dados/CID10Descricao.xlsx'));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const catalog = new Map();
  for (const row of rows) {
    const code = String(row[0] || '').trim().toUpperCase();
    const desc = String(row[1] || '').trim();
    if (!code || code === 'CID') continue;
    catalog.set(code, desc);
  }
  console.log(`Catálogo CID10 carregado: ${catalog.size} códigos`);
  return catalog;
}

function lookupCid(code, catalog) {
  if (!code) return { descricao: 'DESCRICAO_NAO_INFORMADA', capitulo: 'CAPITULO_NAO_INFORMADO' };

  const upper = code.trim().toUpperCase();

  // Tentativa 1: código exato (ex: F33.2)
  if (catalog.has(upper)) {
    return { descricao: catalog.get(upper), capitulo: resolveChapter(upper) };
  }

  // Tentativa 2: código sem ponto (ex: F332 → F33.2)
  const comPonto = upper.replace(/^([A-Z][0-9]{2})([0-9])/, '$1.$2');
  if (comPonto !== upper && catalog.has(comPonto)) {
    return { descricao: catalog.get(comPonto), capitulo: resolveChapter(comPonto) };
  }

  // Tentativa 3: prefixo de categoria (3 chars, ex: F33.2 → F33)
  const prefix3 = upper.slice(0, 3);
  if (catalog.has(prefix3)) {
    return { descricao: catalog.get(prefix3), capitulo: resolveChapter(prefix3) };
  }

  // Tentativa 4: só o capítulo, sem descrição no catálogo
  const capitulo = resolveChapter(upper);
  if (capitulo) {
    return { descricao: `Código ${upper}`, capitulo };
  }

  return { descricao: 'DESCRICAO_NAO_INFORMADA', capitulo: 'CAPITULO_NAO_INFORMADO' };
}

// ---------------------------------------------------------------------------
// 2. Conectar ao Supabase e atualizar registros
// ---------------------------------------------------------------------------

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.');
    process.exit(1);
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const catalog = buildCidCatalog();

  // Buscar todos os registros com capitulo = 'Legado' ou 'CAPITULO_NAO_INFORMADO'
  const { data: rows, error: fetchError } = await client
    .from('afastamento_cids')
    .select('id, cid_codigo, cid_capitulo')
    .or("cid_capitulo.eq.Legado,cid_capitulo.eq.CAPITULO_NAO_INFORMADO");

  if (fetchError) {
    console.error('Erro ao buscar registros:', fetchError.message);
    process.exit(1);
  }

  console.log(`\nRegistros a corrigir: ${rows.length}`);

  let atualizados = 0;
  let erros = 0;
  const resumoCapitulos = {};

  // Processar em lotes de 50
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const lote = rows.slice(i, i + BATCH);
    const promises = lote.map(async (row) => {
      const { descricao, capitulo } = lookupCid(row.cid_codigo, catalog);

      // Contar distribuição por capítulo
      const cap = capitulo || 'NAO_RESOLVIDO';
      resumoCapitulos[cap] = (resumoCapitulos[cap] || 0) + 1;

      const { error: updateError } = await client
        .from('afastamento_cids')
        .update({ cid_descricao: descricao, cid_capitulo: capitulo || 'CAPITULO_NAO_INFORMADO' })
        .eq('id', row.id);

      if (updateError) {
        console.error(`  Erro ao atualizar id=${row.id} (${row.cid_codigo}):`, updateError.message);
        erros++;
      } else {
        atualizados++;
      }
    });

    await Promise.all(promises);
    process.stdout.write(`\r  Processando... ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  console.log(`\n\n✓ Atualizados: ${atualizados}`);
  if (erros > 0) console.log(`✗ Erros:       ${erros}`);
  console.log('\nDistribuição por capítulo:');
  Object.entries(resumoCapitulos)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cap, qty]) => console.log(`  Cap. ${cap}: ${qty} registros`));

  // Verificar resultado final
  const { count: legadoRestante } = await client
    .from('afastamento_cids')
    .select('*', { count: 'exact', head: true })
    .eq('cid_capitulo', 'Legado');
  
  console.log(`\nValidação final: registros 'Legado' restantes = ${legadoRestante}`);
  if (legadoRestante === 0) {
    console.log('\n✓ public.afastamento_cids corrigida com sucesso!');
    console.log('  Próximo passo: re-execute o ETL 001_abs_intel_controlled_etl.sql no Supabase.');
  } else {
    console.log(`\n⚠ Ainda há ${legadoRestante} registros com 'Legado'. Verifique manualmente.`);
  }
}

run().catch((err) => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
