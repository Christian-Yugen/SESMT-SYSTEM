import type { AfastamentoRecord } from "@/types";
import { getCIDDetails, normalizeCID } from "./cid-utils";
import type {
  AfastamentoEventFact,
  CidAnalyticsDataset,
  CidAnalyticsMetrics,
  CidAnalyticsPolicy,
  CidOccurrenceFact,
  DurationBand,
  RecurrenceWindowDays,
  TemporalDimension,
  TrendPoint,
} from "@/types/afastamentos-cid-analytics";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const CID_ANALYTICS_DEFAULT_POLICY: CidAnalyticsPolicy = {
  recurrencePrimaryWindowDays: 180,
  recurrenceAvailableWindows: [90, 180, 365],
  multiCidMode: "dual-layer",
  daysAllocationMode: "shared-days",
  durationBands: [
    { key: "d1_3", label: "1-3 dias", minDays: 1, maxDays: 3 },
    { key: "d4_7", label: "4-7 dias", minDays: 4, maxDays: 7 },
    { key: "d8_14", label: "8-14 dias", minDays: 8, maxDays: 14 },
    { key: "d15_30", label: "15-30 dias", minDays: 15, maxDays: 30 },
    { key: "d31_90", label: "31-90 dias", minDays: 31, maxDays: 90 },
    { key: "d91_plus", label: "91+ dias", minDays: 91, maxDays: null },
  ],
};

function cleanText(
  value: string | null | undefined,
  fallback = "NAO INFORMADO",
) {
  const raw = (value || "").trim();
  return raw.length > 0 ? raw : fallback;
}

function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

export function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calcInclusiveDays(
  startDate: string | null,
  endDate: string | null,
): number {
  const start = safeDate(startDate);
  const end = safeDate(endDate);
  if (!start || !end) return 0;
  const diff = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
  return diff >= 0 ? diff + 1 : 0;
}

function getQuarter(month: number): 1 | 2 | 3 | 4 {
  if (month <= 3) return 1;
  if (month <= 6) return 2;
  if (month <= 9) return 3;
  return 4;
}

function getWeekOfYear(date: Date): number {
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const current = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayDiff = Math.floor(
    (current.getTime() - yearStart.getTime()) / MS_PER_DAY,
  );
  return Math.floor((dayDiff + yearStart.getUTCDay() + 1) / 7) + 1;
}

function buildTemporalDimension(startDate: string): TemporalDimension {
  const dt = safeDate(startDate) || new Date(`${startDate}T00:00:00`);
  const year = dt.getUTCFullYear();
  const month = dt.getUTCMonth() + 1;
  const quarter = getQuarter(month);
  return {
    year,
    month,
    quarter,
    competency: `${year}-${String(month).padStart(2, "0")}`,
    week: getWeekOfYear(dt),
  };
}

function getDurationBand(
  daysAway: number,
  bands: DurationBand[],
): DurationBand {
  const found = bands.find((band) => {
    if (daysAway < band.minDays) return false;
    if (band.maxDays === null) return true;
    return daysAway <= band.maxDays;
  });
  return found || bands[bands.length - 1];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function sumByKey<T>(
  items: T[],
  keyFactory: (item: T) => string,
  valueFactory: (item: T) => number,
) {
  const map: Record<string, number> = {};
  items.forEach((item) => {
    const key = keyFactory(item);
    map[key] = (map[key] || 0) + valueFactory(item);
  });
  return map;
}

function toRanking(map: Record<string, number>) {
  return Object.entries(map)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

interface ServerEpisodeAccumulator {
  lastEndDate: string | null;
  episodeCount: number;
  cumulativeDays: number;
}

function isRecurrentWithinWindow(
  daysSincePrevious: number | null,
  window: RecurrenceWindowDays,
): boolean {
  if (daysSincePrevious === null) return false;
  return daysSincePrevious <= window;
}

function daysBetween(
  prevEndDate: string | null,
  currentStartDate: string,
): number | null {
  const prev = safeDate(prevEndDate);
  const current = safeDate(currentStartDate);
  if (!prev || !current) return null;
  return Math.floor((current.getTime() - prev.getTime()) / MS_PER_DAY);
}

function isPlaceholderCidValue(value: string | null | undefined): boolean {
  const normalized = (value || "").trim().toUpperCase();
  return (
    normalized.length === 0 ||
    normalized === "SEM CID" ||
    normalized === "NAO INFORMADO" ||
    normalized === "DESCRICAO NAO INFORMADA" ||
    normalized === "CAPITULO NAO INFORMADO" ||
    normalized === "N/A"
  );
}

function resolveCidFields(
  rawCode: string | null | undefined,
  rawDesc: string | null | undefined,
  rawChapter: string | null | undefined,
) {
  const normalizedCode = normalizeCID(rawCode || "");
  const catalog = normalizedCode ? getCIDDetails(normalizedCode) : null;

  const code = normalizedCode || "SEM CID";
  const descFromRaw = cleanText(rawDesc, "DESCRICAO NAO INFORMADA");
  const chapterFromRaw = cleanText(rawChapter, "CAPITULO NAO INFORMADO");

  const desc =
    isPlaceholderCidValue(descFromRaw) && catalog?.desc
      ? catalog.desc
      : descFromRaw;

  const chapter =
    isPlaceholderCidValue(chapterFromRaw) && catalog?.chapter
      ? catalog.chapter
      : chapterFromRaw;

  return { code, desc, chapter };
}

function pickPrimaryCid(record: AfastamentoRecord) {
  const cid = (record.afastamento_cids || [])[0];
  return resolveCidFields(
    cid?.cid_codigo,
    cid?.cid_descricao,
    cid?.cid_capitulo,
  );
}

function buildCidOccurrences(
  record: AfastamentoRecord,
  daysAway: number,
  policy: CidAnalyticsPolicy,
) {
  const cids =
    record.afastamento_cids && record.afastamento_cids.length > 0
      ? record.afastamento_cids
      : [
          {
            cid_codigo: "SEM CID",
            cid_descricao: "DESCRICAO NAO INFORMADA",
            cid_capitulo: "CAPITULO NAO INFORMADO",
          },
        ];

  const weight = 1 / cids.length;
  return cids
    .map(
      (cid): CidOccurrenceFact => ({
        eventId: record.id,
        servidorCpf: cleanText(record.servidor_cpf),
        cidCode: cleanText(cid.cid_codigo, "SEM CID"),
        cidDesc: cleanText(cid.cid_descricao, "DESCRICAO NAO INFORMADA"),
        cidChapter: cleanText(cid.cid_capitulo, "CAPITULO NAO INFORMADO"),
        occurrenceWeight: weight,
        allocatedDays:
          policy.daysAllocationMode === "shared-days"
            ? daysAway * weight
            : daysAway,
        startDate: toDateOnly(record.data_inicio) || "",
        endDate: toDateOnly(record.data_fim),
        daysAway,
        secretaria: cleanText(record.servidor_secretaria),
        cargo: cleanText(record.servidor_cargo),
        naturezaCargo: cleanText(record.natureza_cargo),
        tipoAfastamento: cleanText(record.tipo_afastamento),
        isAcidenteTrabalho: Boolean(record.is_acidente_trabalho),
        competency: buildTemporalDimension(
          toDateOnly(record.data_inicio) || "1970-01-01",
        ).competency,
      }),
    )
    .map((row) => {
      const resolved = resolveCidFields(
        row.cidCode,
        row.cidDesc,
        row.cidChapter,
      );
      return {
        ...row,
        cidCode: resolved.code,
        cidDesc: resolved.desc,
        cidChapter: resolved.chapter,
      };
    });
}

export function buildCidAnalyticsDataset(
  records: AfastamentoRecord[],
  policy: CidAnalyticsPolicy = CID_ANALYTICS_DEFAULT_POLICY,
): CidAnalyticsDataset {
  const sorted = [...records].sort((a, b) => {
    const cpfCmp = cleanText(a.servidor_cpf).localeCompare(
      cleanText(b.servidor_cpf),
    );
    if (cpfCmp !== 0) return cpfCmp;
    return cleanText(a.data_inicio).localeCompare(cleanText(b.data_inicio));
  });

  const serverAcc: Record<string, ServerEpisodeAccumulator> = {};
  const events: AfastamentoEventFact[] = [];
  const cidOccurrences: CidOccurrenceFact[] = [];

  sorted.forEach((record) => {
    const servidorCpf = cleanText(record.servidor_cpf);
    const startDate = toDateOnly(record.data_inicio) || "";
    const endDate = toDateOnly(record.data_fim);
    const createdAt = toDateOnly(record.criado_em) || startDate;
    const updatedAt =
      toDateOnly(
        (record as unknown as { atualizado_em?: string }).atualizado_em,
      ) || createdAt;

    const derivedDays = calcInclusiveDays(startDate, endDate);
    const daysAway =
      record.dias_afastado && record.dias_afastado > 0
        ? record.dias_afastado
        : derivedDays;

    const temporal = buildTemporalDimension(
      startDate || createdAt || "1970-01-01",
    );
    const primaryCid = pickPrimaryCid(record);

    const acc = serverAcc[servidorCpf] || {
      lastEndDate: null,
      episodeCount: 0,
      cumulativeDays: 0,
    };

    const daysSincePreviousEpisode = daysBetween(acc.lastEndDate, startDate);
    acc.episodeCount += 1;
    acc.cumulativeDays += daysAway;
    acc.lastEndDate = endDate || startDate;
    serverAcc[servidorCpf] = acc;

    const recurrence90 = isRecurrentWithinWindow(daysSincePreviousEpisode, 90);
    const recurrence180 = isRecurrentWithinWindow(
      daysSincePreviousEpisode,
      180,
    );
    const recurrence365 = isRecurrentWithinWindow(
      daysSincePreviousEpisode,
      365,
    );

    events.push({
      event: {
        afastamentoId: record.id,
        servidorCpf,
        eventKey: `${record.id}-${servidorCpf}`,
        startDate,
        endDate,
        daysAway,
        situacao: cleanText(record.situacao),
        status: cleanText(record.status),
        createdAt,
        updatedAt,
      },
      clinical: {
        tipoAfastamento: cleanText(record.tipo_afastamento),
        isAcidenteTrabalho: Boolean(record.is_acidente_trabalho),
        cidCode: primaryCid.code,
        cidDesc: primaryCid.desc,
        cidChapter: primaryCid.chapter,
      },
      occupational: {
        secretaria: cleanText(record.servidor_secretaria),
        cargo: cleanText(record.servidor_cargo),
        naturezaCargo: cleanText(record.natureza_cargo),
        contrato: cleanText(record.servidor_contrato),
        matricula: cleanText(record.servidor_matricula),
      },
      temporal,
      recurrence: {
        episodeNumber: acc.episodeCount,
        isRecurrent90: recurrence90,
        isRecurrent180: recurrence180,
        isRecurrent365: recurrence365,
        isRecurrentPrimary:
          policy.recurrencePrimaryWindowDays === 90
            ? recurrence90
            : policy.recurrencePrimaryWindowDays === 180
              ? recurrence180
              : recurrence365,
        daysSincePreviousEpisode,
        cumulativeDaysByServidor: acc.cumulativeDays,
      },
      cidCountInEvent: Math.max(1, record.afastamento_cids?.length || 0),
    });

    cidOccurrences.push(...buildCidOccurrences(record, daysAway, policy));
  });

  const metrics = buildCidAnalyticsMetrics(events, cidOccurrences, policy);

  return {
    policy,
    events,
    cidOccurrences,
    metrics,
  };
}

export function buildCidAnalyticsMetrics(
  events: AfastamentoEventFact[],
  cidOccurrences: CidOccurrenceFact[],
  policy: CidAnalyticsPolicy,
  totalEventsOverride?: number,
): CidAnalyticsMetrics {
  const totalAfastamentos = totalEventsOverride ?? events.length;
  const totalServidoresAfastados = new Set(
    events.map((e) => e.event.servidorCpf),
  ).size;
  const allDays = events.map((e) => e.event.daysAway);
  // Usa allocatedDays das ocorrências CID para que, quando há filtro de capítulo,
  // os dias sejam proporcionais (consistente com Epidemiologia). Sem filtro de
  // capítulo, sum(allocatedDays) == sum(daysAway) pois as frações somam 1 por evento.
  const totalDiasPerdidos =
    cidOccurrences.length > 0
      ? cidOccurrences.reduce(
          (acc, occ) => acc + (occ.allocatedDays ?? occ.daysAway),
          0,
        )
      : allDays.reduce((acc, days) => acc + days, 0);
  const duracaoMedia =
    totalAfastamentos > 0 ? totalDiasPerdidos / totalAfastamentos : 0;
  const duracaoMediana = median(allDays);

  const recurringEvents = events.filter((e) => e.recurrence.isRecurrentPrimary);
  const percentualRecorrenciaPrimaryWindow =
    totalAfastamentos > 0
      ? (recurringEvents.length / totalAfastamentos) * 100
      : 0;
  const diasAcumuladosServidoresRecorrentes = recurringEvents.reduce(
    (acc, e) => acc + e.event.daysAway,
    0,
  );

  const concentracaoPorCapitulo = sumByKey(
    cidOccurrences,
    (row) => row.cidChapter,
    (row) => row.occurrenceWeight,
  );

  const concentracaoPorCid = sumByKey(
    cidOccurrences,
    (row) => `${row.cidCode} - ${row.cidDesc}`,
    (row) => row.occurrenceWeight,
  );

  const concentracaoPorSecretaria = sumByKey(
    events,
    (row) => row.occupational.secretaria,
    () => 1,
  );

  const concentracaoPorCargo = sumByKey(
    events,
    (row) => row.occupational.cargo,
    () => 1,
  );

  const rankingImpactoDiasPorSecretaria = toRanking(
    sumByKey(
      events,
      (row) => row.occupational.secretaria,
      (row) => row.event.daysAway,
    ),
  );

  const duracaoPorFaixa: Record<string, number> = {};
  events.forEach((event) => {
    const band = getDurationBand(event.event.daysAway, policy.durationBands);
    duracaoPorFaixa[band.label] = (duracaoPorFaixa[band.label] || 0) + 1;
  });

  const trendMap: Record<string, TrendPoint> = {};
  events.forEach((event) => {
    const key = event.temporal.competency;
    if (!trendMap[key]) {
      trendMap[key] = {
        competency: key,
        totalAfastamentos: 0,
        totalDiasPerdidos: 0,
        totalServidores: 0,
        recorrentesPrimaryWindow: 0,
      };
    }
    trendMap[key].totalAfastamentos += 1;
    trendMap[key].totalDiasPerdidos += event.event.daysAway;
    if (event.recurrence.isRecurrentPrimary) {
      trendMap[key].recorrentesPrimaryWindow += 1;
    }
  });

  Object.keys(trendMap).forEach((key) => {
    const serverCount = new Set(
      events
        .filter((event) => event.temporal.competency === key)
        .map((event) => event.event.servidorCpf),
    ).size;
    trendMap[key].totalServidores = serverCount;
  });

  const trend = Object.values(trendMap).sort((a, b) =>
    a.competency.localeCompare(b.competency),
  );

  return {
    magnitude: {
      totalAfastamentos,
      totalServidoresAfastados,
      totalDiasPerdidos,
      duracaoMedia,
      duracaoMediana,
    },
    persistence: {
      percentualRecorrenciaPrimaryWindow,
      totalEventosRecorrentesPrimaryWindow: recurringEvents.length,
      diasAcumuladosServidoresRecorrentes,
    },
    distribution: {
      concentracaoPorCapitulo,
      concentracaoPorCid,
      concentracaoPorSecretaria,
      concentracaoPorCargo,
      rankingImpactoDiasPorSecretaria,
    },
    trend,
    duracaoPorFaixa,
  };
}
