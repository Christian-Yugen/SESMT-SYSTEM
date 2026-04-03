import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const DADOS_DIR = path.resolve(ROOT, '../dados');
const TMP_DIR = path.resolve(ROOT, 'tmp');
const REPORT_PATH = path.join(TMP_DIR, 'absenteismo_phase3_offline_audit_report.json');
const EVENT_DIAGNOSTICS_PATH = path.join(TMP_DIR, 'absenteismo_phase3_offline_event_diagnostics.json');

const args = process.argv.slice(2);
if (args.length > 0) {
  console.error('BLOQUEIO: este artefato e offline-only e nao aceita parametros de execucao.');
  process.exit(1);
}

function normalizeText(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function normalizeCpf(v) {
  const digits = String(v ?? '').replace(/\D/g, '');
  if (!digits) return null;
  return digits.padStart(11, '0').slice(-11);
}

function normalizeNumberString(v) {
  const s = normalizeText(v);
  if (!s) return null;
  return s.replace(/\.0+$/, '');
}

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return new Date(v.getTime());
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateIso(v) {
  const d = toDate(v);
  return d ? d.toISOString().slice(0, 10) : null;
}

function monthKey(dateIso) {
  if (!dateIso) return null;
  return Number(dateIso.slice(0, 4) + dateIso.slice(5, 7));
}

function splitCid(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[;,/]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function normalizeCid(code) {
  const s = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!s) return null;
  if (s.length <= 3) return s;
  return `${s.slice(0, 3)}.${s.slice(3)}`;
}

function hashEvent(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function yearsBetween(dateA, dateB) {
  if (!dateA || !dateB) return null;
  const a = toDate(dateA);
  const b = toDate(dateB);
  if (!a || !b) return null;
  let years = b.getUTCFullYear() - a.getUTCFullYear();
  const monthDelta = b.getUTCMonth() - a.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && b.getUTCDate() < a.getUTCDate())) {
    years -= 1;
  }
  return years;
}

function daysBetween(dateA, dateB) {
  const a = toDate(dateA);
  const b = toDate(dateB);
  if (!a || !b) return null;
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function faixaEtaria(idade) {
  if (idade === null || idade === undefined || Number.isNaN(idade)) return 'NAO_INFORMADO';
  if (idade < 25) return 'ATE_24';
  if (idade < 35) return '25_34';
  if (idade < 45) return '35_44';
  if (idade < 55) return '45_54';
  if (idade < 65) return '55_64';
  return '65_MAIS';
}

function faixaTempoServico(dias) {
  if (dias === null || dias === undefined || Number.isNaN(dias)) return 'NAO_INFORMADO';
  if (dias < 365) return 'ATE_1_ANO';
  if (dias < 365 * 3) return '1_A_3_ANOS';
  if (dias < 365 * 5) return '3_A_5_ANOS';
  if (dias < 365 * 10) return '5_A_10_ANOS';
  if (dias < 365 * 20) return '10_A_20_ANOS';
  return '20_ANOS_MAIS';
}

function choosePrimaryServidor(rows) {
  const sorted = [...rows].sort((a, b) => {
    const scoreA = (a.nome ? 1 : 0) + (a.data_nascimento ? 1 : 0) + (a.sexo ? 1 : 0);
    const scoreB = (b.nome ? 1 : 0) + (b.data_nascimento ? 1 : 0) + (b.sexo ? 1 : 0);
    return scoreB - scoreA;
  });
  return sorted[0];
}

function buildTempoRows(minDateIso, maxDateIso) {
  const out = [];
  if (!minDateIso || !maxDateIso) return out;

  const start = new Date(minDateIso + 'T00:00:00.000Z');
  const end = new Date(maxDateIso + 'T00:00:00.000Z');

  for (let d = new Date(start.getTime()); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const dow = d.getUTCDay();
    const mappedDow = dow === 0 ? 7 : dow;
    const isWeekend = mappedDow >= 6;

    out.push({
      data_calendario: d.toISOString().slice(0, 10),
      ano: year,
      semestre: month <= 6 ? 1 : 2,
      trimestre: Math.floor((month - 1) / 3) + 1,
      mes: month,
      dia: day,
      competencia_yyyymm: Number(`${year}${String(month).padStart(2, '0')}`),
      dia_semana: mappedDow,
      nome_dia_semana: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'][mappedDow - 1],
      nome_mes: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][month - 1],
      is_fim_semana: isWeekend,
      is_dia_util: !isWeekend,
    });
  }

  return out;
}

function buildSnapshotRows(vinculos, competencias) {
  const out = [];

  for (const comp of competencias) {
    const year = Number(String(comp).slice(0, 4));
    const month = Number(String(comp).slice(4, 6));
    const refDateIso = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    const agg = new Map();

    for (const v of vinculos) {
      const idade = yearsBetween(v.data_nascimento, refDateIso);
      const tsDias = daysBetween(v.data_admissao, refDateIso);
      const key = [
        comp,
        v.secretaria || '',
        v.cargo || '',
        v.natureza_cargo || '',
        v.sexo || 'NAO_INFORMADO',
        faixaEtaria(idade),
        faixaTempoServico(tsDias),
        v.local_trabalho || '',
      ].join('|');
      agg.set(key, (agg.get(key) || 0) + 1);
    }

    for (const [key, qtd] of agg.entries()) {
      const [competencia_yyyymm, secretaria, cargo, natureza_cargo, sexo, faixa_etaria, faixa_tempo_servico, local_trabalho] = key.split('|');
      out.push({
        competencia_yyyymm: Number(competencia_yyyymm),
        secretaria: secretaria || null,
        cargo: cargo || null,
        natureza_cargo: natureza_cargo || null,
        sexo: sexo || null,
        faixa_etaria,
        faixa_tempo_servico,
        local_trabalho: local_trabalho || null,
        qtd_populacao_ativa: qtd,
      });
    }
  }

  return out;
}

function buildConsistencyChecks(events, cidsByHash) {
  let checkedEvents = 0;
  let daysConsistent = 0;
  let weightsConsistent = 0;
  const toleranceDays = 0.02;
  const toleranceWeight = 0.0001;

  for (const ev of events) {
    const cidRows = cidsByHash.get(ev.source_event_hash) || [];
    if (cidRows.length === 0) continue;
    checkedEvents += 1;

    const totalWeight = cidRows.reduce((acc, r) => acc + (r.occurrence_weight || 0), 0);
    if (Math.abs(totalWeight - 1) <= toleranceWeight) {
      weightsConsistent += 1;
    }

    if (ev.dias_afastado !== null && ev.dias_afastado !== undefined) {
      const totalAllocated = cidRows.reduce((acc, r) => acc + (r.allocated_days || 0), 0);
      if (Math.abs(totalAllocated - ev.dias_afastado) <= toleranceDays) {
        daysConsistent += 1;
      }
    }
  }

  return {
    events_checked: checkedEvents,
    tolerance_days: toleranceDays,
    tolerance_weight: toleranceWeight,
    events_with_weight_sum_1: weightsConsistent,
    events_with_allocated_days_consistent: daysConsistent,
  };
}

function main() {
  const startedAt = new Date().toISOString();
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const fileCad = path.join(DADOS_DIR, 'AtualizacaoBancoDados.xlsx');
  const fileAfast = path.join(DADOS_DIR, 'Afastamentos.xlsx');

  if (!fs.existsSync(fileCad) || !fs.existsSync(fileAfast)) {
    throw new Error('Planilhas obrigatorias nao encontradas em ../dados');
  }

  const cadWb = XLSX.readFile(fileCad);
  const cadSheet = cadWb.Sheets[cadWb.SheetNames[0]];
  const cadRows = XLSX.utils.sheet_to_json(cadSheet, { raw: false, defval: null });

  const afWb = XLSX.readFile(fileAfast);
  const afSheet = afWb.Sheets[afWb.SheetNames[0]];
  const afRows = XLSX.utils.sheet_to_json(afSheet, { raw: false, defval: null });

  const vinculos = [];
  const servidoresByCpf = new Map();
  const vinculoByKey = new Map();

  for (const r of cadRows) {
    const cpf = normalizeCpf(r['CPF.'] ?? r['CPF']);
    const matricula = normalizeNumberString(r['Matrícula']);
    const contrato = normalizeNumberString(r['Contrato']);
    if (!cpf || !matricula || !contrato) continue;

    const vinculo = {
      cpf,
      matricula,
      contrato,
      nome: normalizeText(r['Nome']),
      sexo: normalizeText(r['Sexo'])?.toUpperCase() || 'NAO_INFORMADO',
      data_nascimento: toDateIso(r['Dt.Nascimento']),
      data_admissao: toDateIso(r['Dt.Admissão']),
      secretaria: normalizeText(r['Secretaria']),
      cargo: normalizeText(r['Cargo']),
      natureza_cargo: normalizeText(r['Nome Natureza Cargo']),
      local_trabalho: normalizeText(r['Nome Local Trabalho']),
      cpf_mascarado: normalizeText(r['CPF com mascara']),
      raca_cor: normalizeText(r['Nome Raça Cor']),
      instrucao: normalizeText(r['Instrução']),
      estado_civil: normalizeText(r['Nome Estado Civil']),
      nacionalidade: normalizeText(r['Nome Nacionalidade']),
      deficiencia_rais: normalizeText(r['Deficiência RAIS']),
    };

    const uniqueKey = `${cpf}|${matricula}|${contrato}`;
    if (!vinculoByKey.has(uniqueKey)) {
      vinculoByKey.set(uniqueKey, vinculo);
      vinculos.push(vinculo);
    }

    if (!servidoresByCpf.has(cpf)) servidoresByCpf.set(cpf, []);
    servidoresByCpf.get(cpf).push(vinculo);
  }

  const dimServidorRows = [];
  for (const [cpf, rows] of servidoresByCpf.entries()) {
    const base = choosePrimaryServidor(rows);
    dimServidorRows.push({
      cpf,
      nome: base.nome || `SERVIDOR_${cpf}`,
      cpf_mascarado: base.cpf_mascarado,
      sexo: base.sexo,
      data_nascimento: base.data_nascimento,
      raca_cor: base.raca_cor,
      instrucao: base.instrucao,
      estado_civil: base.estado_civil,
      nacionalidade: base.nacionalidade,
      deficiencia_rais: base.deficiencia_rais,
    });
  }

  const candidatosPorCpfMat = new Map();
  for (const v of vinculos) {
    const key = `${v.cpf}|${v.matricula}`;
    if (!candidatosPorCpfMat.has(key)) candidatosPorCpfMat.set(key, []);
    candidatosPorCpfMat.get(key).push(v);
  }

  const eventRowsRaw = [];
  const cidRowsRaw = [];
  let eventsWithoutContract = 0;
  let eventsWithoutResolvedVinculo = 0;

  for (const r of afRows) {
    const cpf = normalizeCpf(r['CPF']);
    const matricula = normalizeNumberString(r['MATRICULA']);
    const contratoIn = normalizeNumberString(r['CONTRATO']);
    const tipoLicenca = normalizeText(r['TIPO DE LICENÇA']) || 'NAO_INFORMADO';
    const dataInicio = toDateIso(r['INICIO AFAST']);
    const dataFim = toDateIso(r['FIM AFAST']);
    const diasFromSheet = normalizeText(r['DIAS DE AFAST']) ? Number(r['DIAS DE AFAST']) : null;

    if (!cpf || !matricula || !dataInicio) continue;

    let contratoResolvido = contratoIn;
    if (!contratoResolvido) {
      eventsWithoutContract += 1;
      const candidatos = candidatosPorCpfMat.get(`${cpf}|${matricula}`) || [];
      if (candidatos.length === 1) contratoResolvido = candidatos[0].contrato;
    }

    const vinculoKey = contratoResolvido ? `${cpf}|${matricula}|${contratoResolvido}` : null;
    const vinculoResolvido = vinculoKey ? vinculoByKey.has(vinculoKey) : false;
    if (!vinculoResolvido) eventsWithoutResolvedVinculo += 1;

    const diasCalc = dataFim ? ((daysBetween(dataInicio, dataFim) ?? 0) + 1) : null;
    const diasAfastado = diasFromSheet ?? diasCalc;

    const cids = splitCid(r['CID']).map(normalizeCid).filter(Boolean);
    const cidsNormalized = cids.length ? [...new Set(cids)] : ['SEM_CID'];

    const sourceEventHash = hashEvent([
      cpf,
      matricula,
      contratoResolvido || 'SEM_CONTRATO',
      tipoLicenca,
      dataInicio || 'SEM_DATA_INICIO',
      dataFim || 'SEM_DATA_FIM',
      cidsNormalized.join('|'),
    ].join('::'));

    const ev = {
      source_event_hash: sourceEventHash,
      chave_vinculo_bruta_cpf: cpf,
      chave_vinculo_bruta_matricula: matricula,
      chave_vinculo_bruta_contrato: contratoResolvido,
      tipo_licenca: tipoLicenca,
      situacao: normalizeText(r['SITUAÇÃO']),
      status: normalizeText(r['STATUS']),
      condicao: normalizeText(r['CONDIÇÃO']),
      data_inicio: dataInicio,
      data_fim: dataFim,
      dias_afastado: diasAfastado,
      pendente_resolucao_vinculo: !vinculoResolvido,
      _cids: cidsNormalized,
    };

    eventRowsRaw.push(ev);

    const qtd = cidsNormalized.length;
    const weight = Number((1 / qtd).toFixed(6));
    const allocated = diasAfastado !== null && diasAfastado !== undefined
      ? Number((Number(diasAfastado) / qtd).toFixed(4))
      : null;

    cidsNormalized.forEach((cid, idx) => {
      cidRowsRaw.push({
        source_event_hash: sourceEventHash,
        cid_codigo: cid,
        cid_ordem: idx + 1,
        occurrence_weight: weight,
        allocated_days: allocated,
      });
    });
  }

  const eventByHash = new Map();
  const rawCountByHash = new Map();
  for (const ev of eventRowsRaw) {
    rawCountByHash.set(ev.source_event_hash, (rawCountByHash.get(ev.source_event_hash) || 0) + 1);
    if (!eventByHash.has(ev.source_event_hash)) eventByHash.set(ev.source_event_hash, ev);
  }
  const eventos = [...eventByHash.values()];
  const eventosColapsados = eventRowsRaw.length - eventos.length;
  const collapsedHashSet = new Set(
    [...rawCountByHash.entries()].filter(([, count]) => count > 1).map(([hash]) => hash),
  );

  const hashesValidos = new Set(eventos.map((x) => x.source_event_hash));
  const cids = cidRowsRaw.filter((x) => hashesValidos.has(x.source_event_hash));

  const cidsByHash = new Map();
  for (const c of cids) {
    if (!cidsByHash.has(c.source_event_hash)) cidsByHash.set(c.source_event_hash, []);
    cidsByHash.get(c.source_event_hash).push(c);
  }

  const competencias = [...new Set(eventos.map((x) => monthKey(x.data_inicio)).filter(Boolean))].sort();
  const snapshots = buildSnapshotRows(vinculos, competencias);

  const datas = eventos.flatMap((e) => [e.data_inicio, e.data_fim]).filter(Boolean).sort();
  const minDate = datas[0] || null;
  const maxDate = datas[datas.length - 1] || null;
  const dimTempoRows = buildTempoRows(minDate, maxDate);

  const checks = buildConsistencyChecks(eventos, cidsByHash);

  const eventDiagnostics = eventos.map((ev) => {
    const cidRows = cidsByHash.get(ev.source_event_hash) || [];

    // Dedupe exclusivo do diagnostico: evita dupla contagem quando evento foi colapsado por hash.
    const uniqueCidRows = [];
    const seenCidDiagnosticKeys = new Set();
    for (const row of cidRows) {
      const diagnosticCidKey = `${ev.source_event_hash}|${row.cid_ordem}|${row.cid_codigo}`;
      if (seenCidDiagnosticKeys.has(diagnosticCidKey)) continue;
      seenCidDiagnosticKeys.add(diagnosticCidKey);
      uniqueCidRows.push(row);
    }

    const somaAllocatedDays = uniqueCidRows.reduce((acc, row) => acc + (row.allocated_days || 0), 0);
    const somaOccurrenceWeight = uniqueCidRows.reduce((acc, row) => acc + (row.occurrence_weight || 0), 0);

    const diasEvento = ev.dias_afastado;
    const deltaAllocatedDays =
      diasEvento === null || diasEvento === undefined
        ? null
        : Number((somaAllocatedDays - Number(diasEvento)).toFixed(6));
    const deltaWeightSum1 = Number((somaOccurrenceWeight - 1).toFixed(6));

    const allocatedDaysConsistente =
      diasEvento !== null && diasEvento !== undefined
        ? Math.abs(deltaAllocatedDays || 0) <= checks.tolerance_days
        : false;
    const weightSumConsistente = Math.abs(deltaWeightSum1) <= checks.tolerance_weight;

    return {
      source_event_hash: ev.source_event_hash,
      cpf_normalizado: ev.chave_vinculo_bruta_cpf,
      matricula: ev.chave_vinculo_bruta_matricula,
      contrato_resolvido: ev.chave_vinculo_bruta_contrato,
      quantidade_cids: uniqueCidRows.length,
      dias_evento: diasEvento,
      soma_allocated_days: Number(somaAllocatedDays.toFixed(6)),
      delta_allocated_days: deltaAllocatedDays,
      soma_occurrence_weight: Number(somaOccurrenceWeight.toFixed(6)),
      delta_weight_sum_1: deltaWeightSum1,
      allocated_days_consistente: allocatedDaysConsistente,
      weight_sum_consistente: weightSumConsistente,
      evento_colapsado_por_hash: collapsedHashSet.has(ev.source_event_hash),
    };
  });

  const metrics = {
    mode: 'offline-dry-run-only',
    policy: {
      db_write_capability: false,
      accepts_apply: false,
      requires_service_role: false,
      schema_mutation: false,
      migrations_execution: false,
    },
    started_at: startedAt,
    sources: {
      cadastro_rows_in: cadRows.length,
      afastamentos_rows_in: afRows.length,
    },
    processed: {
      servidores_unique: dimServidorRows.length,
      vinculos_unique: vinculos.length,
      eventos_raw: eventRowsRaw.length,
      eventos_unique_after_hash: eventos.length,
      eventos_collapsed_by_hash: eventosColapsados,
      cid_occurrences: cids.length,
      eventos_multiplos_cids: eventos.filter((e) => e._cids.length > 1).length,
      competencias_generated: competencias.length,
      dim_tempo_rows_generated: dimTempoRows.length,
      snapshots_generated: snapshots.length,
    },
    resolution: {
      eventos_sem_contrato_origem: eventsWithoutContract,
      eventos_sem_vinculo_resolvido: eventsWithoutResolvedVinculo,
      coverage_cpf: {
        total: afRows.length,
        validos: afRows.filter((r) => normalizeCpf(r['CPF'])).length,
      },
      coverage_cpf_matricula: {
        total: afRows.length,
        validos: afRows.filter((r) => normalizeCpf(r['CPF']) && normalizeNumberString(r['MATRICULA'])).length,
      },
      coverage_cpf_matricula_contrato: {
        total: afRows.length,
        validos: afRows.filter((r) => normalizeCpf(r['CPF']) && normalizeNumberString(r['MATRICULA']) && normalizeNumberString(r['CONTRATO'])).length,
      },
    },
    consistency: checks,
    residuals: {
      pendencias_resolucao_vinculo: eventos.filter((e) => e.pendente_resolucao_vinculo).length,
      cid_vazio_substituido_sem_cid: eventos.filter((e) => e._cids.length === 1 && e._cids[0] === 'SEM_CID').length,
    },
    diagnostics: {
      event_diagnostics_path: EVENT_DIAGNOSTICS_PATH,
      event_diagnostics_count: eventDiagnostics.length,
    },
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(metrics, null, 2));
  fs.writeFileSync(
    EVENT_DIAGNOSTICS_PATH,
    JSON.stringify(
      {
        mode: 'offline-dry-run-only',
        generated_at: startedAt,
        tolerance_days: checks.tolerance_days,
        tolerance_weight: checks.tolerance_weight,
        events_raw: eventRowsRaw.length,
        events_unique_after_hash: eventos.length,
        events_collapsed_by_hash: eventosColapsados,
        event_diagnostics: eventDiagnostics,
      },
      null,
      2,
    ),
  );

  console.log('Modo: offline-dry-run-only');
  console.log(`Servidores unicos: ${metrics.processed.servidores_unique}`);
  console.log(`Vinculos unicos: ${metrics.processed.vinculos_unique}`);
  console.log(`Eventos unicos: ${metrics.processed.eventos_unique_after_hash}`);
  console.log(`Ocorrencias CID: ${metrics.processed.cid_occurrences}`);
  console.log(`Snapshots gerados (local): ${metrics.processed.snapshots_generated}`);
  console.log(`Relatorio JSON: ${REPORT_PATH}`);
  console.log(`Diagnostico por evento JSON: ${EVENT_DIAGNOSTICS_PATH}`);
}

try {
  main();
} catch (err) {
  console.error('FALHA FASE 3 OFFLINE:', err.message);
  process.exit(1);
}
