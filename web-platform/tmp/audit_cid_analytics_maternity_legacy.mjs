import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO: variaveis Supabase ausentes (NEXT_PUBLIC_SUPABASE_URL e chave).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const cidJsonPath = path.resolve('src/lib/cid10-data.json');
const cidJson = JSON.parse(fs.readFileSync(cidJsonPath, 'utf-8'));
const categories = cidJson.categories || {};
const chapters = cidJson.chapters || [];

function toUpperNoAccents(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function normalizeCID(code) {
  if (!code) return '';
  const clean = String(code)
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, '');
  if (clean.length === 4) {
    return `${clean.substring(0, 3)}.${clean.substring(3)}`;
  }
  return clean;
}

function isMaternity(value) {
  return toUpperNoAccents(value).includes('MATERNIDADE');
}

function isLegacyLike(value) {
  const txt = toUpperNoAccents(value).trim();
  return (
    txt.length === 0 ||
    /NAO INFORMADO|SEM CID|LEGADO|DESCRICAO NAO INFORMADA|CAPITULO NAO INFORMADO|N\/A/.test(txt)
  );
}

function getChapterByRange(code) {
  const normalized = normalizeCID(code);
  if (!normalized) return null;

  const firstChar = normalized.charAt(0).toUpperCase();
  const numPart = parseInt(normalized.substring(1, 3), 10);
  if (Number.isNaN(numPart)) return null;

  for (const chapter of chapters) {
    const ranges = String(chapter.range || '').split(',');
    for (const range of ranges) {
      const [startRaw, endRaw] = range.trim().split('-');
      if (!startRaw || !endRaw) continue;

      const start = startRaw.trim();
      const end = endRaw.trim();
      const startLetter = start.charAt(0);
      const startNum = parseInt(start.substring(1), 10);
      const endLetter = end.charAt(0);
      const endNum = parseInt(end.substring(1), 10);

      if (firstChar < startLetter || firstChar > endLetter) continue;
      if (firstChar === startLetter && numPart < startNum) continue;
      if (firstChar === endLetter && numPart > endNum) continue;

      return chapter.capitulo || null;
    }
  }

  return null;
}

function getCanonicalFromJson(code) {
  const c = normalizeCID(code);
  if (!c) {
    return {
      code: c,
      desc: 'DESCRICAO NAO INFORMADA',
      chapter: 'CAPITULO NAO INFORMADO',
    };
  }

  const category = categories[c];
  if (category) {
    return {
      code: c,
      desc: category.desc || 'DESCRICAO NAO INFORMADA',
      chapter: category.cap || getChapterByRange(c) || 'CAPITULO NAO INFORMADO',
    };
  }

  return {
    code: c,
    desc: 'Descricao nao encontrada na lista simplificada',
    chapter: getChapterByRange(c) || 'CAPITULO NAO INFORMADO',
  };
}

async function fetchAllAfastamentos() {
  const all = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('afastamentos')
      .select('id, tipo_afastamento, data_inicio, dias_afastado, afastamento_cids (cid_codigo, cid_descricao, cid_capitulo)')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

async function fetchCidMap(codes) {
  const map = new Map();
  const list = Array.from(new Set(codes.filter(Boolean)));
  const chunkSize = 250;

  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize);
    const withChapter = await supabase
      .from('cid10')
      .select('codigo, descricao, capitulo')
      .in('codigo', chunk);

    let rows = withChapter.data;
    let err = withChapter.error;

    if (err) {
      const fallback = await supabase
        .from('cid10')
        .select('codigo, descricao')
        .in('codigo', chunk);
      rows = fallback.data;
      err = fallback.error;
    }

    if (err) continue;

    (rows || []).forEach((row) => {
      const c = normalizeCID(row.codigo);
      if (!c) return;
      map.set(c, {
        desc: (row.descricao || '').trim(),
        chapter: (row.capitulo || '').trim(),
      });
    });
  }

  return map;
}

function shouldExcludeByCurrentRule(record) {
  if (isMaternity(record.tipo_afastamento)) return true;
  const cids = record.afastamento_cids || [];
  return cids.some(
    (cid) =>
      isMaternity(cid.cid_codigo) ||
      isMaternity(cid.cid_descricao) ||
      isMaternity(cid.cid_capitulo),
  );
}

function sanitizeCidOccurrence(cid, cidMap) {
  const normalizedCode = normalizeCID(cid.cid_codigo || '');
  const db = cidMap.get(normalizedCode);
  const canonical = getCanonicalFromJson(normalizedCode);

  const descRaw = (cid.cid_descricao || '').trim();
  const chapterRaw = (cid.cid_capitulo || '').trim();

  const desc = isLegacyLike(descRaw)
    ? (!isLegacyLike(db?.desc) ? db.desc : canonical.desc)
    : descRaw;

  const chapter = isLegacyLike(chapterRaw)
    ? (!isLegacyLike(db?.chapter) ? db.chapter : canonical.chapter)
    : chapterRaw;

  return {
    code: normalizedCode || (cid.cid_codigo || '').trim(),
    desc,
    chapter,
  };
}

async function main() {
  const rows = await fetchAllAfastamentos();

  const totalAfastamentos = rows.length;
  const withTipoMaternidade = rows.filter((r) => isMaternity(r.tipo_afastamento));
  const withCidMaternidade = rows.filter((r) =>
    (r.afastamento_cids || []).some(
      (c) => isMaternity(c.cid_codigo) || isMaternity(c.cid_descricao) || isMaternity(c.cid_capitulo),
    ),
  );

  const filteredRows = rows.filter((r) => !shouldExcludeByCurrentRule(r));

  const remainingOccurrencesRaw = filteredRows.flatMap((r) =>
    (r.afastamento_cids || []).map((c) => ({ recordId: r.id, ...c })),
  );

  const cidCodes = remainingOccurrencesRaw.map((o) => normalizeCID(o.cid_codigo || '')).filter(Boolean);
  const cidMap = await fetchCidMap(cidCodes);

  const remainingOccurrencesSanitized = remainingOccurrencesRaw.map((occ) => ({
    recordId: occ.recordId,
    raw: occ,
    sanitized: sanitizeCidOccurrence(occ, cidMap),
  }));

  const leakMaternityAfterFilter = remainingOccurrencesRaw.filter(
    (o) => isMaternity(o.cid_codigo) || isMaternity(o.cid_descricao) || isMaternity(o.cid_capitulo),
  );

  const leakLegacyAfterSanitize = remainingOccurrencesSanitized.filter(
    (o) => isLegacyLike(o.sanitized.desc) || isLegacyLike(o.sanitized.chapter),
  );

  const legacyRawBeforeSanitize = remainingOccurrencesRaw.filter(
    (o) => isLegacyLike(o.cid_descricao) || isLegacyLike(o.cid_capitulo),
  );

  const sampleMaternity = leakMaternityAfterFilter.slice(0, 10).map((o) => ({
    recordId: o.recordId,
    cid_codigo: o.cid_codigo,
    cid_descricao: o.cid_descricao,
    cid_capitulo: o.cid_capitulo,
  }));

  const sampleLegacyAfterSanitize = leakLegacyAfterSanitize.slice(0, 10).map((o) => ({
    recordId: o.recordId,
    code: o.sanitized.code,
    desc: o.sanitized.desc,
    chapter: o.sanitized.chapter,
    raw_desc: o.raw.cid_descricao,
    raw_chapter: o.raw.cid_capitulo,
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      totalAfastamentos,
      totalAfastamentosExcluidosRegraMaternidade: totalAfastamentos - filteredRows.length,
      totalAfastamentosRestantesAnalise: filteredRows.length,
    },
    detections: {
      afastamentosComTipoMaternidade: withTipoMaternidade.length,
      afastamentosComMaternidadeEmCamposCid: withCidMaternidade.length,
      ocorrenciasCidRestantesPosFiltro: remainingOccurrencesRaw.length,
      ocorrenciasCidComMaternidadePosFiltro: leakMaternityAfterFilter.length,
      ocorrenciasCidComLegadoAntesSanitizacao: legacyRawBeforeSanitize.length,
      ocorrenciasCidComLegadoAposSanitizacao: leakLegacyAfterSanitize.length,
    },
    samples: {
      maternidadePosFiltro: sampleMaternity,
      legadoAposSanitizacao: sampleLegacyAfterSanitize,
    },
  };

  const outputPath = path.resolve('tmp', 'cid_analytics_audit_report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('RELATORIO_CID_ANALYTICS_AUDIT');
  console.log(JSON.stringify(report, null, 2));
  console.log(`Arquivo salvo em: ${outputPath}`);
}

main().catch((err) => {
  console.error('Falha na auditoria:', err?.message || err);
  process.exit(1);
});
