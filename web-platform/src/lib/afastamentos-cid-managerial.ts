import type {
  AfastamentoEventFact,
  CidOccurrenceFact,
} from "@/types/afastamentos-cid-analytics";
import type {
  ManagerialAlertItem,
  ManagerialPriorityLevel,
  PriorityRankingItem,
} from "@/components/analytics/cid/types";

interface ManagerialAggregateInput {
  label: string;
  volume: number;
  daysLost: number;
  avgDays: number;
  recurrencePct: number;
  trendDeltaPct: number | null;
  daysSharePct: number;
}

export interface CidManagerialIntelligence {
  alerts: ManagerialAlertItem[];
  secretariaRanking: PriorityRankingItem[];
  cargoRanking: PriorityRankingItem[];
  chapterRanking: PriorityRankingItem[];
  cidRanking: PriorityRankingItem[];
  scoreFormulaLabel: string;
  trendWindowLabel: string | null;
}

const SCORE_WEIGHTS = {
  volume: 0.35,
  daysLost: 0.35,
  recurrence: 0.2,
  trend: 0.1,
};

export const CID_MANAGERIAL_SCORE_FORMULA_LABEL =
  "35% volume relativo + 35% dias perdidos relativos + 20% recorrencia relativa + 10% tendencia positiva recente";

function normalizeToPct(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return (value / maxValue) * 100;
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function classifyPriority(score: number): ManagerialPriorityLevel {
  if (score >= 75) return "prioridade-critica";
  if (score >= 55) return "atencao-alta";
  return "atencao-moderada";
}

function computeTrendDeltaPct(
  currentValue: number,
  previousValue: number,
): number | null {
  if (currentValue <= 0 && previousValue <= 0) return null;
  if (previousValue <= 0) return 100;
  return ((currentValue - previousValue) / previousValue) * 100;
}

function formatPct(value: number | null): string {
  if (value === null) return "sem base comparativa";
  return `${value >= 0 ? "+" : ""}${round1(value)}%`;
}

function buildPriorityRanking(
  items: ManagerialAggregateInput[],
): PriorityRankingItem[] {
  const maxVolume = Math.max(...items.map((item) => item.volume), 0);
  const maxDaysLost = Math.max(...items.map((item) => item.daysLost), 0);
  const maxRecurrence = Math.max(...items.map((item) => item.recurrencePct), 0);
  const maxPositiveTrend = Math.max(
    ...items.map((item) => Math.max(item.trendDeltaPct || 0, 0)),
    0,
  );

  return items
    .map((item) => {
      const volumeScore = normalizeToPct(item.volume, maxVolume);
      const daysLostScore = normalizeToPct(item.daysLost, maxDaysLost);
      const recurrenceScore = normalizeToPct(item.recurrencePct, maxRecurrence);
      const trendScore = normalizeToPct(
        Math.max(item.trendDeltaPct || 0, 0),
        maxPositiveTrend,
      );

      const score = round1(
        volumeScore * SCORE_WEIGHTS.volume +
          daysLostScore * SCORE_WEIGHTS.daysLost +
          recurrenceScore * SCORE_WEIGHTS.recurrence +
          trendScore * SCORE_WEIGHTS.trend,
      );

      return {
        ...item,
        score,
        level: classifyPriority(score),
      } satisfies PriorityRankingItem;
    })
    .sort(
      (a, b) =>
        b.score - a.score || b.daysLost - a.daysLost || b.volume - a.volume,
    );
}

function buildEventRanking(
  events: AfastamentoEventFact[],
  pickLabel: (event: AfastamentoEventFact) => string,
): PriorityRankingItem[] {
  const totalDaysLost = events.reduce(
    (acc, event) => acc + event.event.daysAway,
    0,
  );
  const competencies = Array.from(
    new Set(events.map((event) => event.temporal.competency)),
  ).sort((a, b) => a.localeCompare(b));
  const currentCompetency = competencies.at(-1) || null;
  const previousCompetency =
    competencies.length > 1 ? competencies.at(-2) || null : null;

  const grouped = new Map<
    string,
    {
      volume: number;
      daysLost: number;
      recurrentCount: number;
      currentVolume: number;
      previousVolume: number;
    }
  >();

  events.forEach((event) => {
    const label = pickLabel(event);
    const current = grouped.get(label) || {
      volume: 0,
      daysLost: 0,
      recurrentCount: 0,
      currentVolume: 0,
      previousVolume: 0,
    };

    current.volume += 1;
    current.daysLost += event.event.daysAway;
    if (event.recurrence.isRecurrentPrimary) {
      current.recurrentCount += 1;
    }
    if (currentCompetency && event.temporal.competency === currentCompetency) {
      current.currentVolume += 1;
    }
    if (
      previousCompetency &&
      event.temporal.competency === previousCompetency
    ) {
      current.previousVolume += 1;
    }

    grouped.set(label, current);
  });

  return buildPriorityRanking(
    Array.from(grouped.entries()).map(([label, value]) => ({
      label,
      volume: value.volume,
      daysLost: value.daysLost,
      avgDays: value.volume > 0 ? value.daysLost / value.volume : 0,
      recurrencePct:
        value.volume > 0 ? (value.recurrentCount / value.volume) * 100 : 0,
      trendDeltaPct: computeTrendDeltaPct(
        value.currentVolume,
        value.previousVolume,
      ),
      daysSharePct:
        totalDaysLost > 0 ? (value.daysLost / totalDaysLost) * 100 : 0,
    })),
  );
}

function buildOccurrenceRanking(
  events: AfastamentoEventFact[],
  occurrences: CidOccurrenceFact[],
  pickLabel: (occ: CidOccurrenceFact) => string,
): PriorityRankingItem[] {
  const recurrenceMap = new Map(
    events.map((event) => [
      event.event.afastamentoId,
      event.recurrence.isRecurrentPrimary,
    ]),
  );
  const totalDaysLost = occurrences.reduce(
    (acc, occ) => acc + occ.allocatedDays,
    0,
  );
  const competencies = Array.from(
    new Set(occurrences.map((occ) => occ.competency)),
  ).sort((a, b) => a.localeCompare(b));
  const currentCompetency = competencies.at(-1) || null;
  const previousCompetency =
    competencies.length > 1 ? competencies.at(-2) || null : null;

  const grouped = new Map<
    string,
    {
      volume: number;
      daysLost: number;
      currentVolume: number;
      previousVolume: number;
      eventIds: Set<number>;
      recurrentEventIds: Set<number>;
    }
  >();

  occurrences.forEach((occ) => {
    const label = pickLabel(occ);
    const current = grouped.get(label) || {
      volume: 0,
      daysLost: 0,
      currentVolume: 0,
      previousVolume: 0,
      eventIds: new Set<number>(),
      recurrentEventIds: new Set<number>(),
    };

    current.volume += 1;
    current.daysLost += occ.allocatedDays;
    current.eventIds.add(occ.eventId);
    if (recurrenceMap.get(occ.eventId)) {
      current.recurrentEventIds.add(occ.eventId);
    }
    if (currentCompetency && occ.competency === currentCompetency) {
      current.currentVolume += 1;
    }
    if (previousCompetency && occ.competency === previousCompetency) {
      current.previousVolume += 1;
    }

    grouped.set(label, current);
  });

  return buildPriorityRanking(
    Array.from(grouped.entries()).map(([label, value]) => ({
      label,
      volume: value.volume,
      daysLost: value.daysLost,
      avgDays:
        value.eventIds.size > 0 ? value.daysLost / value.eventIds.size : 0,
      recurrencePct:
        value.eventIds.size > 0
          ? (value.recurrentEventIds.size / value.eventIds.size) * 100
          : 0,
      trendDeltaPct: computeTrendDeltaPct(
        value.currentVolume,
        value.previousVolume,
      ),
      daysSharePct:
        totalDaysLost > 0 ? (value.daysLost / totalDaysLost) * 100 : 0,
    })),
  );
}

function pushAlert(
  alerts: ManagerialAlertItem[],
  alert: ManagerialAlertItem | null,
) {
  if (!alert) return;
  const exists = alerts.some((item) => item.id === alert.id);
  if (!exists) {
    alerts.push(alert);
  }
}

function buildChapterTrendAlert(
  chapterRanking: PriorityRankingItem[],
  trendWindowLabel: string | null,
): ManagerialAlertItem | null {
  const topChapterTrend = chapterRanking.find(
    (item) => (item.trendDeltaPct || 0) >= 25 && item.volume >= 3,
  );
  if (!topChapterTrend) return null;

  const trendWindowSuffix = trendWindowLabel ? ` (${trendWindowLabel})` : "";
  return {
    id: `chapter-trend-${topChapterTrend.label}`,
    title: "Crescimento recente por capítulo",
    summary: `${topChapterTrend.label} acelerou ${formatPct(topChapterTrend.trendDeltaPct)} no recorte recente${trendWindowSuffix}.`,
    evidence: `${topChapterTrend.volume} ocorrencias, ${Math.round(topChapterTrend.daysLost)} dias perdidos e score ${topChapterTrend.score}.`,
    level: topChapterTrend.score >= 75 ? "prioridade-critica" : "atencao-alta",
  };
}

function buildCidTrendAlert(
  cidRanking: PriorityRankingItem[],
): ManagerialAlertItem | null {
  const topCidTrend = cidRanking.find(
    (item) => (item.trendDeltaPct || 0) >= 25 && item.volume >= 2,
  );
  if (!topCidTrend) return null;

  return {
    id: `cid-trend-${topCidTrend.label}`,
    title: "CID com aumento recente",
    summary: `${topCidTrend.label} aumentou ${formatPct(topCidTrend.trendDeltaPct)} no período mais recente.`,
    evidence: `${topCidTrend.volume} ocorrencias, ${Math.round(topCidTrend.daysLost)} dias perdidos e recorrencia de ${round1(topCidTrend.recurrencePct)}%.`,
    level: topCidTrend.score >= 75 ? "prioridade-critica" : "atencao-alta",
  };
}

function buildTopGroupAlert(
  ranking: PriorityRankingItem[],
  title: string,
  summaryBuilder: (item: PriorityRankingItem) => string,
  evidenceBuilder: (item: PriorityRankingItem) => string,
  idPrefix: string,
): ManagerialAlertItem | null {
  const topItem = ranking[0];
  if (!topItem || topItem.score < 55) return null;

  return {
    id: `${idPrefix}-${topItem.label}`,
    title,
    summary: summaryBuilder(topItem),
    evidence: evidenceBuilder(topItem),
    level: topItem.level,
  };
}

function buildRecurrenceAlert(
  cargoRanking: PriorityRankingItem[],
  chapterRanking: PriorityRankingItem[],
): ManagerialAlertItem | null {
  const recurrenceCandidate = [...cargoRanking, ...chapterRanking].find(
    (item) => item.recurrencePct >= 35 && item.volume >= 3,
  );
  if (!recurrenceCandidate) return null;

  return {
    id: `recurrence-${recurrenceCandidate.label}`,
    title: "Recorrencia concentrada",
    summary: `${recurrenceCandidate.label} apresenta concentracao elevada de recorrencia no recorte atual.`,
    evidence: `${round1(recurrenceCandidate.recurrencePct)}% de recorrencia, ${Math.round(recurrenceCandidate.daysLost)} dias e score ${recurrenceCandidate.score}.`,
    level:
      recurrenceCandidate.recurrencePct >= 50
        ? "prioridade-critica"
        : "atencao-alta",
  };
}

function buildDaysConcentrationAlert(
  chapterRanking: PriorityRankingItem[],
): ManagerialAlertItem | null {
  const candidate = chapterRanking.find((item) => item.daysSharePct >= 30);
  if (!candidate) return null;

  return {
    id: `days-concentration-${candidate.label}`,
    title: "Concentracao de dias perdidos",
    summary: `${candidate.label} concentra ${round1(candidate.daysSharePct)}% dos dias perdidos do recorte.`,
    evidence: `${Math.round(candidate.daysLost)} dias perdidos e ${candidate.volume} ocorrencias no grupo.`,
    level: candidate.daysSharePct >= 40 ? "prioridade-critica" : "atencao-alta",
  };
}

function buildCombinedBurdenAlert(
  cargoRanking: PriorityRankingItem[],
  overallAvgDays: number,
): ManagerialAlertItem | null {
  const candidate = cargoRanking.find(
    (item) =>
      item.volume >= 3 &&
      item.avgDays >= overallAvgDays * 1.35 &&
      item.recurrencePct >= 20,
  );
  if (!candidate) return null;

  return {
    id: `combined-burden-${candidate.label}`,
    title: "Combinacao critica de frequencia e duracao",
    summary: `${candidate.label} reune volume relevante e duracao media acima do padrao do recorte.`,
    evidence: `Media de ${round1(candidate.avgDays)} dias frente a ${round1(overallAvgDays)} dias do recorte, com recorrencia de ${round1(candidate.recurrencePct)}%.`,
    level: candidate.level,
  };
}

function buildAlerts(params: {
  secretariaRanking: PriorityRankingItem[];
  cargoRanking: PriorityRankingItem[];
  chapterRanking: PriorityRankingItem[];
  cidRanking: PriorityRankingItem[];
  overallAvgDays: number;
  trendWindowLabel: string | null;
}): ManagerialAlertItem[] {
  const {
    secretariaRanking,
    cargoRanking,
    chapterRanking,
    cidRanking,
    overallAvgDays,
    trendWindowLabel,
  } = params;
  const alerts: ManagerialAlertItem[] = [];
  pushAlert(alerts, buildChapterTrendAlert(chapterRanking, trendWindowLabel));
  pushAlert(alerts, buildCidTrendAlert(cidRanking));
  pushAlert(
    alerts,
    buildTopGroupAlert(
      secretariaRanking,
      "Secretaria com maior carga combinada",
      (item) =>
        `${item.label} lidera a criticidade gerencial no recorte atual.`,
      (item) =>
        `${item.volume} afastamentos, ${Math.round(item.daysLost)} dias perdidos, recorrencia de ${round1(item.recurrencePct)}% e score ${item.score}.`,
      "secretaria-priority",
    ),
  );
  pushAlert(
    alerts,
    buildTopGroupAlert(
      cargoRanking,
      "Cargo com maior carga combinada",
      (item) =>
        `${item.label} combina volume, impacto e persistencia acima do restante do recorte.`,
      (item) =>
        `${item.volume} afastamentos, media de ${round1(item.avgDays)} dias e recorrencia de ${round1(item.recurrencePct)}%.`,
      "cargo-priority",
    ),
  );
  pushAlert(alerts, buildRecurrenceAlert(cargoRanking, chapterRanking));
  pushAlert(alerts, buildDaysConcentrationAlert(chapterRanking));
  pushAlert(alerts, buildCombinedBurdenAlert(cargoRanking, overallAvgDays));

  const severityOrder: Record<ManagerialPriorityLevel, number> = {
    "prioridade-critica": 3,
    "atencao-alta": 2,
    "atencao-moderada": 1,
  };

  const sortedAlerts = [...alerts].sort(
    (a, b) => severityOrder[b.level] - severityOrder[a.level],
  );

  return sortedAlerts.slice(0, 6);
}

export function buildCidManagerialIntelligence(
  events: AfastamentoEventFact[],
  occurrences: CidOccurrenceFact[],
): CidManagerialIntelligence {
  const secretariaRanking = buildEventRanking(
    events,
    (event) => event.occupational.secretaria,
  );
  const cargoRanking = buildEventRanking(
    events,
    (event) => event.occupational.cargo,
  );
  const chapterRanking = buildOccurrenceRanking(
    events,
    occurrences,
    (occ) => occ.cidChapter,
  );
  const cidRanking = buildOccurrenceRanking(
    events,
    occurrences,
    (occ) => `${occ.cidCode} - ${occ.cidDesc}`,
  );

  const competencies = Array.from(
    new Set(events.map((event) => event.temporal.competency)),
  ).sort((a, b) => a.localeCompare(b));
  const trendWindowLabel =
    competencies.length > 1
      ? `${competencies.at(-2)} vs ${competencies.at(-1)}`
      : null;

  const overallAvgDays =
    events.length > 0
      ? events.reduce((acc, event) => acc + event.event.daysAway, 0) /
        events.length
      : 0;

  return {
    alerts: buildAlerts({
      secretariaRanking,
      cargoRanking,
      chapterRanking,
      cidRanking,
      overallAvgDays,
      trendWindowLabel,
    }),
    secretariaRanking,
    cargoRanking,
    chapterRanking,
    cidRanking,
    scoreFormulaLabel: CID_MANAGERIAL_SCORE_FORMULA_LABEL,
    trendWindowLabel,
  };
}
