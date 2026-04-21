import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.resolve(__dirname, '../../dados/out/janAmar26__Planilha1.csv');
if (!fs.existsSync(csvPath)) { console.error('CSV não encontrado em', csvPath); process.exit(2); }

const wb = XLSX.readFile(csvPath, { raw: true });
const sheet = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
console.log('Linhas no CSV (incluindo cabeçalho):', raw.length);

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
    const rawValue = r[h] !== undefined ? r[h] : r[h.toLowerCase()] || '';
    obj[key] = ('' + rawValue).trim();
  });
  const safeInt = (v) => { const s = (v || '').toString().trim(); return /^[0-9]+$/.test(s) ? parseInt(s,10) : null; };
  const safeDate = (v) => { const s = (v || '').toString().trim(); if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return s; return null; };
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

const transformed = raw.map(transformRow);
const seen = new Map();
const results = [];
for (let i = 0; i < transformed.length; i++) {
  const t = transformed[i];
  const r = raw[i];
  const row = i + 1;
  if (!t.matricula) {
    results.push({ row, reason: 'missing_matricula', raw: r, transformed: t });
    continue;
  }
  const key = `${t.matricula}|${t.periodo ?? 'null'}|${t.cid ?? 'null'}`;
  if (!seen.has(key)) {
    seen.set(key, row);
    results.push({ row, reason: 'kept', raw: r, transformed: t });
  } else {
    results.push({ row, reason: 'duplicate', duplicate_of_row: seen.get(key), raw: r, transformed: t });
  }
}

const discarded = results.filter((x) => x.reason !== 'kept');
console.log('Total descartado:', discarded.length, 'Total mantido:', results.filter(r=>r.reason==='kept').length);

// Garantir diretório out
const outDir = path.resolve(__dirname, '../out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'discarded_atestados_report.json'), JSON.stringify({ summary: { total_rows: raw.length, kept: results.filter(r=>r.reason==='kept').length, discarded: discarded.length }, discarded }, null, 2));

// CSV resumo
const csvLines = [];
csvLines.push('row,reason,duplicate_of,matricula,nome,cid,periodo');
for (const d of discarded) {
  const mat = (d.transformed.matricula ?? '') + '';
  const nome = (d.transformed.nome ?? '') + '';
  const cid = (d.transformed.cid ?? '') + '';
  const periodo = (d.transformed.periodo ?? '') + '';
  const dup = d.duplicate_of_row ? d.duplicate_of_row : '';
  csvLines.push(`${d.row},${d.reason},${dup},"${mat}","${nome}","${cid}","${periodo}"`);
}
fs.writeFileSync(path.join(outDir, 'discarded_atestados_report.csv'), csvLines.join('\n'));

console.log('Relatórios gerados em:', outDir);
console.log('Mostrando descartados:');
for (const d of discarded) {
  const mat = d.transformed.matricula ?? '';
  const nome = d.transformed.nome ?? '';
  const cid = d.transformed.cid ?? '';
  const periodo = d.transformed.periodo ?? '';
  if (d.reason === 'missing_matricula') console.log(`${d.row}: MISSING MATRICULA — nome="${nome}" periodo="${periodo}"`);
  else console.log(`${d.row}: DUPLICATE of ${d.duplicate_of_row} — matricula=${mat} nome="${nome}" cid=${cid} periodo=${periodo}`);
}

process.exit(0);
