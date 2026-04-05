import type { SupabaseClient } from "@supabase/supabase-js";

const EMPTY_DIMENSION = "NAO_INFORMADO";
const SCORE_MAX = 100;
const SCORE_COMPONENTS = {
  cidFShare: 20,
  recurrence: 5,
  trend: 5,
  absoluteImpact: 50,
  exposure: 20,
} as const;
const COMPATIBLE_CID_PREFIXES = ["F", "R45", "T74", "Z56", "Z73"];

export interface PsychosocialFactorRow {
  psychosocial_factor_id: number;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  fonte_normativa: string | null;
  is_active: boolean;
}

export interface PsychosocialAssessmentRow {
  psychosocial_assessment_id: number;
  servidor_id: number | null;
  vinculo_id: number | null;
  tempo_id: number | null;
  psychosocial_factor_id: number | null;
  instrumento: string | null;
  score: number | null;
  nivel_risco: string | null;
  avaliador: string | null;
  observacoes: string | null;
  nivel_exposicao?: string | null;
  metodo_avaliacao?: string | null;
  evidencia?: string | null;
  acao_recomendada?: string | null;
  status_acao?: string | null;
  data_avaliacao?: string | null;
  responsavel?: string | null;
}

export interface PsychosocialSignalRow {
  psychosocial_signal_id: number;
  afastamento_id: number | null;
  servidor_id: number | null;
  vinculo_id: number | null;
  cid_codigo: string | null;
  signal_strength: number | null;
  status_investigacao: string | null;
  observacoes: string | null;
}

export interface PsychosocialEventRow {
  afastamento_id: number;
  servidor_id: number | null;
  vinculo_id: number | null;
  data_inicio: string;
  dias_afastado: number | null;
}

export interface PsychosocialCidRow {
  afastamento_id: number;
  cid_codigo: string | null;
  cid_capitulo: string | null;
  occurrence_weight: number;
  allocated_days: number | null;
}

export interface PsychosocialVinculoRow {
  vinculo_id: number;
  servidor_id: number | null;
  unidade_orcamentaria: string | null;
  local_trabalho: string | null;
  secretaria: string | null;
  cargo: string | null;
  natureza_cargo: string | null;
}

export interface PsychosocialTempoRow {
  tempo_id: number;
  data_calendario: string;
  competencia_yyyymm: number;
}

export interface PsychosocialDataset {
  factors: PsychosocialFactorRow[];
  assessments: PsychosocialAssessmentRow[];
  signals: PsychosocialSignalRow[];
  events: PsychosocialEventRow[];
  cids: PsychosocialCidRow[];
  vinculos: PsychosocialVinculoRow[];
  tempos: PsychosocialTempoRow[];
}

export interface PsychosocialPeriod {
  startDate: string;
  endDate: string;
}

export interface PsychosocialFactorCatalogEntry {
  factorId: number;
  code: string;
  domain: string;
  factor: string;
  description: string;
  normativeReference: string;
  status: "ATIVO" | "INATIVO";
  impactCount?: number;
}

export interface PsychosocialAssessmentSummary {
  assessmentId: number;
  factorId: number | null;
  factorCode: string;
  factorName: string;
  domain: string;
  unidadeOrcamentaria: string;
  localTrabalho: string;
  secretaria: string;
  cargo: string;
  analyticalGroup: string;
  servidorId: number | null;
  vinculoId: number | null;
  exposureLevel: string;
  evaluationMethod: string;
  evaluationDate: string | null;
  responsible: string;
  evidence: string;
  recommendedAction: string;
  actionStatus: string;
  assessmentScore: number;
  riskLevel: string;
  rawNotes: string;
}

export interface PsychosocialScoreBreakdown {
  cidFSharePoints: number;
  recurrencePoints: number;
  trendPoints: number;
  lostDaysPoints: number;
  exposurePoints: number;
}

export type PsychosocialCriticality = "BAIXA" | "MODERADA" | "ALTA" | "CRITICA";

export type PsychosocialCidZone =
  | "NAO_COMPATIVEL"
  | "SINAL_SENTINELA_SEM_CONTEXTO"
  | "AMBIGUO_EM_INVESTIGACAO"
  | "HIPOTESE_OCUPACIONAL_REFORCADA";

export interface PsychosocialAnalyticalSignal {
  analyticalGroup: string;
  secretaria: string;
  cargo: string;
  localTrabalho: string;
  unidadeOrcamentaria: string;
  totalAssessments: number;
  activeFactors: number;
  factorDomains: string[];
  factorNames: string[];
  compatibleCidChapterKeys: string[];
  cidCompatibleWeight: number;
  cidFWeight: number;
  cidFShare: number;
  recurrenceRate: number;
  trendRatio: number;
  lostDays: number;
  averageExposureScore: number;
  score: number;
  criticality: PsychosocialCriticality;
  cidZone: PsychosocialCidZone;
  justification: string;
  evidenceSummary: string[];
  scoreBreakdown: PsychosocialScoreBreakdown;
  impactedServerCount: number; // Campo unificado para contagem populacional
  associatedCids: string[]; // NOVIDADE: CIDs que compõem o risco
}

export interface PsychosocialCutItem {
  key: string;
  groupCount: number;
  assessmentCount: number;
  activeFactors: number;
  compatibleCidWeight: number;
  cidFShare: number;
  recurrenceRate: number;
  trendRatio: number;
  lostDays: number;
  averageExposureScore: number;
  averageScore: number;
  maxScore: number;
  criticality: PsychosocialCriticality;
  justification: string;
}

export interface PsychosocialValidationOutput {
  factorsAssessmentsConsistent: boolean;
  signalsEpidemiologyConsistent: boolean;
  contextConsistency: boolean;
  explainabilityConsistent: boolean;
  hasBlockingIssues: boolean;
  issues: string[];
}

export interface PsychosocialAnalysisOutput {
  period: PsychosocialPeriod;
  activeFactors: PsychosocialFactorCatalogEntry[];
  assessmentSummaries: PsychosocialAssessmentSummary[];
  signalsByAnalyticalGroup: PsychosocialAnalyticalSignal[];
  cuts: {
    secretaria: PsychosocialCutItem[];
    cargo: PsychosocialCutItem[];
    localTrabalho: PsychosocialCutItem[];
    cidCapitulo: PsychosocialCutItem[];
    cidCompativel: PsychosocialCutItem[];
    grupoAnalitico: PsychosocialCutItem[];
  };
  validation: PsychosocialValidationOutput;
  totalImpactedServers: number;
  totalWorkforceBaseline: number;
}

export interface PsychosocialRepository {
  loadDataset(): Promise<PsychosocialDataset>;
}

export class PsychosocialApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PsychosocialApplicationError";
  }
}

function normalizeDimension(value: string | null | undefined): string {
  const normalized = (value || "").trim().toUpperCase();
  return normalized.length > 0 ? normalized : EMPTY_DIMENSION;
}

function round(value: number, precision = 4): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type PageQueryFn<T> = (
  from: number,
  to: number,
) => PromiseLike<{
  data: T[] | null;
  error: { message: string; code?: string; details?: string } | null;
}>;

const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  queryFn: PageQueryFn<T>,
  sourceName: string,
): Promise<T[]> {
  const results: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryFn(from, to);
    if (error) {
      const codeTag = error.code ? ` [${error.code}]` : "";
      throw new PsychosocialApplicationError(
        `Falha ao carregar ${sourceName}${codeTag}: ${error.message}`,
      );
    }
    const rows = data ?? [];
    results.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return results;
}

function buildAnalyticalGroupKey(
  vinculo: PsychosocialVinculoRow | undefined,
  fallbackId?: string | number | null
): string {
  if (!vinculo) {
    const idTag = fallbackId ? `ID:${fallbackId}` : "IDENTIDADE_OCULTA";
    return [
      "BASE_INTEGRADA",
      idTag,
      "DADOS_VILA_VINCULO"
    ].join(" | ");
  }
  return [
    normalizeDimension(vinculo.secretaria),
    normalizeDimension(vinculo.cargo),
    normalizeDimension(vinculo.local_trabalho),
  ].join(" | ");
}

function parseObservationTokens(
  observacoes: string | null,
): Record<string, string> {
  const tokens: Record<string, string> = {};
  (observacoes || "")
    .split(/[;\n]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .forEach((chunk) => {
      const separatorIndex = chunk.includes("=")
        ? chunk.indexOf("=")
        : chunk.indexOf(":");
      if (separatorIndex <= 0) {
        return;
      }
      const key = normalizeDimension(chunk.slice(0, separatorIndex)).replace(
        /[^A-Z0-9_]/g,
        "_",
      );
      const value = chunk.slice(separatorIndex + 1).trim();
      if (value) {
        tokens[key] = value;
      }
    });
  return tokens;
}

function normalizeAssessmentScore(
  score: number | null,
  riskLevel: string | null,
): number {
  if (score !== null) {
    if (score <= 1) return round(clamp(score * 100, 0, SCORE_MAX), 2);
    if (score <= 10) return round(clamp(score * 10, 0, SCORE_MAX), 2);
    return round(clamp(score, 0, SCORE_MAX), 2);
  }

  const normalizedRisk = normalizeDimension(riskLevel);
  if (normalizedRisk.includes("CRIT")) return 95;
  if (normalizedRisk.includes("ALTO")) return 80;
  if (normalizedRisk.includes("MED")) return 55;
  if (normalizedRisk.includes("BAIX")) return 25;
  return 0;
}

function inferRecommendedAction(riskLevel: string, factorName: string): string {
  if (riskLevel.includes("CRIT") || riskLevel.includes("ALTO")) {
    return `Priorizar investigacao tecnica do fator ${factorName} e registrar plano de acao organizacional.`;
  }
  if (riskLevel.includes("MED")) {
    return `Monitorar o fator ${factorName} e revisar contexto ocupacional com entrevistas estruturadas.`;
  }
  return `Manter monitoramento do fator ${factorName} com registro preventivo.`;
}

function cidCodePrefix(value: string | null): string {
  return normalizeDimension(value).replace(/[^A-Z0-9]/g, "");
}

function isCompatiblePsychosocialCid(
  cidCode: string | null,
  cidChapter: string | null,
): boolean {
  const prefix = cidCodePrefix(cidCode);
  if (
    COMPATIBLE_CID_PREFIXES.some((candidate) => prefix.startsWith(candidate))
  ) {
    return true;
  }

  const chapter = normalizeDimension(cidChapter);
  return (
    chapter.includes("MENTAL") ||
    chapter.includes("COMPORT") ||
    chapter.includes("F")
  );
}

export function labelZoneCID_F(signal: {
  cidFShare: number;
  totalAssessments: number;
  averageExposureScore: number;
  score: number;
}): PsychosocialCidZone {
  if (signal.cidFShare <= 0) {
    return "NAO_COMPATIVEL";
  }
  if (signal.totalAssessments === 0) {
    return "SINAL_SENTINELA_SEM_CONTEXTO";
  }
  if (
    signal.cidFShare >= 0.4 &&
    signal.averageExposureScore >= 60 &&
    signal.score >= 70
  ) {
    return "HIPOTESE_OCUPACIONAL_REFORCADA";
  }
  return "AMBIGUO_EM_INVESTIGACAO";
}

function buildMonthKey(dateText: string): string {
  return dateText.slice(0, 7);
}

function buildTrendRatio(monthlyCompatibleEvents: Map<string, number>): number {
  const values = Array.from(monthlyCompatibleEvents.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);

  if (values.length === 0) {
    return 0;
  }

  const splitIndex = Math.ceil(values.length / 2);
  const firstHalf = values.slice(0, splitIndex);
  const secondHalf = values.slice(splitIndex);
  const average = (numbers: number[]) =>
    numbers.length === 0
      ? 0
      : numbers.reduce((sum, value) => sum + value, 0) / numbers.length;

  const firstAvg = average(firstHalf);
  const secondAvg = average(secondHalf.length > 0 ? secondHalf : firstHalf);
  return round((secondAvg - firstAvg) / Math.max(firstAvg, 1), 4);
}

function criticalityFromScore(score: number): PsychosocialCriticality {
  if (score >= 75) return "CRITICA";
  if (score >= 50) return "ALTA";
  if (score >= 25) return "MODERADA";
  return "BAIXA";
}

function buildJustification(signal: {
  analyticalGroup: string;
  cidFShare: number;
  recurrenceRate: number;
  trendRatio: number;
  lostDays: number;
  averageExposureScore: number;
  factorDomains: string[];
  criticality: PsychosocialCriticality;
  cidZone: PsychosocialCidZone;
}): string {
  const parts = [
    `Sinal ${signal.criticality} no grupo ${signal.analyticalGroup}.`,
    `Concentracao CID F: ${round(signal.cidFShare * 100, 2)}%.`,
    `Recorrencia: ${round(signal.recurrenceRate * 100, 2)}% dos servidores com eventos repetidos.`,
    `Tendencia: ${round(signal.trendRatio * 100, 2)}% na comparacao entre a metade final e inicial do periodo.`,
    `Dias perdidos compativeis: ${round(signal.lostDays, 2)}.`,
    `Exposicao media estimada: ${round(signal.averageExposureScore, 2)}/100.`,
  ];

  if (signal.factorDomains.length > 0) {
    parts.push(
      `Contexto psicossocial observado em ${signal.factorDomains.join(", ")}.`,
    );
  }

  if (signal.cidZone === "HIPOTESE_OCUPACIONAL_REFORCADA") {
    parts.push(
      "Ha hipotese ocupacional reforcada, dependente de investigacao tecnica formal e sem causalidade automatica.",
    );
  } else if (signal.cidZone === "AMBIGUO_EM_INVESTIGACAO") {
    parts.push(
      "O resultado deve ser tratado como sinal sob investigacao, sem conclusao causal.",
    );
  } else if (signal.cidZone === "SINAL_SENTINELA_SEM_CONTEXTO") {
    parts.push(
      "Existe sinal sentinela CID F sem inventario psicossocial suficiente para reforcar o contexto.",
    );
  }

  return parts.join(" ");
}

function aggregateCutItems(
  signals: PsychosocialAnalyticalSignal[],
  keySelector: (signal: PsychosocialAnalyticalSignal) => string,
): PsychosocialCutItem[] {
  const groups = new Map<string, PsychosocialAnalyticalSignal[]>();
  signals.forEach((signal) => {
    const key = keySelector(signal);
    const current = groups.get(key) || [];
    current.push(signal);
    groups.set(key, current);
  });

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const groupCount = items.length;
      const assessmentCount = items.reduce(
        (sum, item) => sum + item.totalAssessments,
        0,
      );
      const activeFactors = new Set(items.flatMap((item) => item.factorNames))
        .size;
      const compatibleCidWeight = round(
        items.reduce((sum, item) => sum + item.cidCompatibleWeight, 0),
        4,
      );
      const cidFShare = round(
        items.reduce((sum, item) => sum + item.cidFShare, 0) /
          Math.max(groupCount, 1),
        4,
      );
      const recurrenceRate = round(
        items.reduce((sum, item) => sum + item.recurrenceRate, 0) /
          Math.max(groupCount, 1),
        4,
      );
      const trendRatio = round(
        items.reduce((sum, item) => sum + item.trendRatio, 0) /
          Math.max(groupCount, 1),
        4,
      );
      const lostDays = round(
        items.reduce((sum, item) => sum + item.lostDays, 0),
        4,
      );
      const averageExposureScore = round(
        items.reduce((sum, item) => sum + item.averageExposureScore, 0) /
          Math.max(groupCount, 1),
        4,
      );
      const averageScore = round(
        items.reduce((sum, item) => sum + item.score, 0) /
          Math.max(groupCount, 1),
        4,
      );
      const maxScore = round(Math.max(...items.map((item) => item.score)), 4);
      const criticality = criticalityFromScore(maxScore);
      const justification = `Recorte ${key}: ${groupCount} grupos, score medio ${averageScore}, score maximo ${maxScore}, CID F medio ${round(cidFShare * 100, 2)}%.`;

      return {
        key,
        groupCount,
        assessmentCount,
        activeFactors,
        compatibleCidWeight,
        cidFShare,
        recurrenceRate,
        trendRatio,
        lostDays,
        averageExposureScore,
        averageScore,
        maxScore,
        criticality,
        justification,
      };
    })
    .sort((left, right) => right.maxScore - left.maxScore);
}

export function getActivePsychosocialFactors(
  dataset: PsychosocialDataset,
): PsychosocialFactorCatalogEntry[] {
  return dataset.factors
    // Forcanco exibicao de todos para diagnostico
    .map((factor) => ({
      factorId: (factor as any).psychosocial_factor_id || (factor as any).fator_id || 0,
      code: normalizeDimension(factor.codigo || (factor as any).cod_fator),
      domain: normalizeDimension(factor.categoria || (factor as any).dominio || (factor as any).grupo),
      factor: (factor.nome || (factor as any).fator || (factor as any).nome_fator || "Fator Desconhecido").trim(),
      description: (factor.descricao || (factor as any).desc_fator || "Descricao nao informada.").trim(),
      normativeReference: normalizeDimension(factor.fonte_normativa || (factor as any).referencia),
      status: (factor.is_active ? "ATIVO" : "INATIVO") as "ATIVO" | "INATIVO",
    }))
    .sort((left, right) => left.factor.localeCompare(right.factor));
}

export function groupPsychosocialAssessments(
  dataset: PsychosocialDataset,
): PsychosocialAssessmentSummary[] {
  const activeFactors = new Map(
    getActivePsychosocialFactors(dataset).map((factor) => [
      factor.factorId,
      factor,
    ]),
  );
  const vinculoById = new Map(
    dataset.vinculos.map((vinculo) => [vinculo.vinculo_id, vinculo]),
  );
  const tempoById = new Map(
    dataset.tempos.map((tempo) => [tempo.tempo_id, tempo]),
  );

  return dataset.assessments
    .map((assessment) => {
      const factor = assessment.psychosocial_factor_id
        ? activeFactors.get(assessment.psychosocial_factor_id)
        : undefined;
      const vinculo = assessment.vinculo_id
        ? vinculoById.get(assessment.vinculo_id)
        : undefined;
      const tempo = assessment.tempo_id
        ? tempoById.get(assessment.tempo_id)
        : undefined;
      const tokens = parseObservationTokens(assessment.observacoes);
      const riskLevel = normalizeDimension(
        assessment.nivel_exposicao || assessment.nivel_risco,
      );
      const factorName = factor?.factor || "FATOR_NAO_MAPEADO";

      return {
        assessmentId: assessment.psychosocial_assessment_id,
        factorId: assessment.psychosocial_factor_id,
        factorCode: factor?.code || EMPTY_DIMENSION,
        factorName,
        domain: factor?.domain || EMPTY_DIMENSION,
        unidadeOrcamentaria: normalizeDimension(vinculo?.unidade_orcamentaria),
        localTrabalho: normalizeDimension(vinculo?.local_trabalho),
        secretaria: normalizeDimension(vinculo?.secretaria),
        cargo: normalizeDimension(vinculo?.cargo),
        naturezaCargo: normalizeDimension(vinculo?.natureza_cargo),
        analyticalGroup: buildAnalyticalGroupKey(vinculo, assessment.vinculo_id),
        servidorId: assessment.servidor_id,
        vinculoId: assessment.vinculo_id,
        exposureLevel: riskLevel,
        evaluationMethod: (
          assessment.metodo_avaliacao ||
          assessment.instrumento ||
          "METODO_NAO_INFORMADO"
        ).trim(),
        evaluationDate:
          assessment.data_avaliacao || tempo?.data_calendario || null,
        responsible: (
          assessment.responsavel ||
          assessment.avaliador ||
          "RESPONSAVEL_NAO_INFORMADO"
        ).trim(),
        evidence: (
          assessment.evidencia ||
          tokens.EVIDENCIA ||
          assessment.observacoes ||
          "EVIDENCIA_NAO_INFORMADA"
        ).trim(),
        recommendedAction: (
          assessment.acao_recomendada ||
          tokens.ACAO_RECOMENDADA ||
          inferRecommendedAction(riskLevel, factorName)
        ).trim(),
        actionStatus: (
          assessment.status_acao ||
          tokens.STATUS_ACAO ||
          "PENDENTE_AVALIACAO"
        ).trim(),
        assessmentScore: normalizeAssessmentScore(
          assessment.score,
          assessment.nivel_risco,
        ),
        riskLevel,
        rawNotes: (assessment.observacoes || "").trim(),
      };
    })
    .sort((left, right) => right.assessmentScore - left.assessmentScore);
}

function buildScoreBreakdown(params: {
  cidFShare: number;
  recurrenceRate: number;
  trendRatio: number;
  lostDays: number;
  averageExposureScore: number;
  impactedServerCount: number;
  maxLostDays: number;
  maxImpactedServers: number;
}): PsychosocialScoreBreakdown {
  const cidFSharePoints = round(
    clamp(params.cidFShare / 1.0, 0, 1) * SCORE_COMPONENTS.cidFShare,
    4,
  );
  const recurrencePoints = round(
    clamp(params.recurrenceRate / 1.0, 0, 1) * SCORE_COMPONENTS.recurrence,
    4,
  );
  const trendPoints = round(
    clamp(params.trendRatio / 2.0, 0, 1) * SCORE_COMPONENTS.trend,
    4,
  );
  
  // EFICIENCIA RELATIVA DO PROBLEMA (DEA-STYLE)
  // O grupo com o maior numero de dias ou servidores tera 100% desses pontos.
  const daysEfficiency = params.maxLostDays > 0 ? clamp(params.lostDays / params.maxLostDays, 0, 1) : 0;
  const servantsEfficiency = params.maxImpactedServers > 0 ? clamp(params.impactedServerCount / params.maxImpactedServers, 0, 1) : 0;
  
  const absoluteImpactPoints = round(
    ((daysEfficiency * 0.7) + (servantsEfficiency * 0.3)) * SCORE_COMPONENTS.absoluteImpact,
    4,
  );

  const exposurePoints = round(
    clamp(params.averageExposureScore / 100, 0, 1) * SCORE_COMPONENTS.exposure,
    4,
  );

  return {
    cidFSharePoints,
    recurrencePoints,
    trendPoints,
    lostDaysPoints: absoluteImpactPoints, // REAPROVEITANDO AO INTERFACE PARA EVITAR QUEBRA
    exposurePoints,
  };
}

export function integrateRiskProfile(
  dataset: PsychosocialDataset,
  period: PsychosocialPeriod,
): PsychosocialAnalysisOutput {
  const factorCatalog = getActivePsychosocialFactors(dataset);
  const assessments = groupPsychosocialAssessments(dataset);
  const eventById = new Map(
    dataset.events.map((event) => [event.afastamento_id, event]),
  );
  const vinculoById = new Map(
    dataset.vinculos.map((vinculo) => [vinculo.vinculo_id, vinculo]),
  );
  const signalsByGroupAccumulator = new Map<
    string,
    {
      secretaria: string;
      cargo: string;
      localTrabalho: string;
      unidadeOrcamentaria: string;
      assessments: PsychosocialAssessmentSummary[];
      compatibleCidWeight: number;
      cidFWeight: number;
      lostDays: number;
      cidChapterKeys: Set<string>;
      factorDomains: Set<string>;
      factorNames: Set<string>;
      associatedCids: Set<string>;
      serverEventCounts: Map<number, number>;
      monthlyCompatibleEvents: Map<string, number>;
    }
  >();

  const impactedServersGlobal = new Set<number>();
  dataset.events.forEach(event => {
    const hasCompatibleCid = dataset.cids.some(c => 
      c.afastamento_id === event.afastamento_id && 
      isCompatiblePsychosocialCid(c.cid_codigo, c.cid_capitulo)
    );
    if (hasCompatibleCid && event.servidor_id) {
      impactedServersGlobal.add(event.servidor_id);
    }
  });

  assessments.forEach((assessment) => {
    const current = signalsByGroupAccumulator.get(
      assessment.analyticalGroup,
    ) || {
      secretaria: assessment.secretaria,
      cargo: assessment.cargo,
      localTrabalho: assessment.localTrabalho,
      unidadeOrcamentaria: assessment.unidadeOrcamentaria,
      assessments: [],
      compatibleCidWeight: 0,
      cidFWeight: 0,
      lostDays: 0,
      cidChapterKeys: new Set<string>(),
      factorDomains: new Set<string>(),
      factorNames: new Set<string>(),
      associatedCids: new Set<string>(),
      serverEventCounts: new Map<number, number>(),
      monthlyCompatibleEvents: new Map<string, number>(),
    };

    current.assessments.push(assessment);
    if (assessment.domain !== EMPTY_DIMENSION)
      current.factorDomains.add(assessment.domain);
    if (assessment.factorName !== "FATOR_NAO_MAPEADO")
      current.factorNames.add(assessment.factorName);
    
    // NOVIDADE: Adicionar servidor da avaliacao ao contador de impacto
    if (assessment.servidorId) {
      current.serverEventCounts.set(
        assessment.servidorId,
        (current.serverEventCounts.get(assessment.servidorId) || 0) + 1,
      );
    }
    
    signalsByGroupAccumulator.set(assessment.analyticalGroup, current);
  });

  dataset.cids.forEach((cid) => {
    const event = eventById.get(cid.afastamento_id);
    if (!event) return;
    const eventDate = event.data_inicio.slice(0, 10);
    if (eventDate < period.startDate || eventDate > period.endDate) return;
    if (!event.vinculo_id) return;

    const vinculo = vinculoById.get(event.vinculo_id);
    const analyticalGroup = buildAnalyticalGroupKey(vinculo, event.vinculo_id);
    const current = signalsByGroupAccumulator.get(analyticalGroup) || {
      secretaria: normalizeDimension(vinculo?.secretaria),
      cargo: normalizeDimension(vinculo?.cargo),
      localTrabalho: normalizeDimension(vinculo?.local_trabalho),
      unidadeOrcamentaria: normalizeDimension(vinculo?.unidade_orcamentaria),
      assessments: [],
      compatibleCidWeight: 0,
      cidFWeight: 0,
      lostDays: 0,
      cidChapterKeys: new Set<string>(),
      factorDomains: new Set<string>(),
      factorNames: new Set<string>(),
      associatedCids: new Set<string>(),
      serverEventCounts: new Map<number, number>(),
      monthlyCompatibleEvents: new Map<string, number>(),
    };

    const weight = cid.occurrence_weight || 0;
    const compatible = isCompatiblePsychosocialCid(
      cid.cid_codigo,
      cid.cid_capitulo,
    );
    const cidPrefix = cidCodePrefix(cid.cid_codigo);
    if (compatible) {
      current.compatibleCidWeight += weight;
      current.lostDays += cid.allocated_days || event.dias_afastado || 0;
      current.cidChapterKeys.add(normalizeDimension(cid.cid_capitulo));
      if (cid.cid_codigo) current.associatedCids.add(normalizeDimension(cid.cid_codigo));
      const monthKey = buildMonthKey(eventDate);
      current.monthlyCompatibleEvents.set(
        monthKey,
        (current.monthlyCompatibleEvents.get(monthKey) || 0) + 1,
      );
      if (event.servidor_id) {
        current.serverEventCounts.set(
          event.servidor_id,
          (current.serverEventCounts.get(event.servidor_id) || 0) + 1,
        );
      }
    }
    if (cidPrefix.startsWith("F")) {
      current.cidFWeight += weight;
    }

    signalsByGroupAccumulator.set(analyticalGroup, current);
  });

  // FRONTEIRA LOCAL (DEA-inspired): Identifica os Benchmarks de Risco no Dataset Atual
  let globalMaxLostDays = 0;
  let globalMaxImpactedServers = 0;
  
  Array.from(signalsByGroupAccumulator.values()).forEach(acc => {
    if (acc.lostDays > globalMaxLostDays) globalMaxLostDays = acc.lostDays;
    const servCount = acc.serverEventCounts.size;
    if (servCount > globalMaxImpactedServers) globalMaxImpactedServers = servCount;
  });

  const signalsByAnalyticalGroup = Array.from(
    signalsByGroupAccumulator.entries(),
  )
    .map(([analyticalGroup, accumulator]) => {
      const totalAssessments = accumulator.assessments.length;
      const averageExposureScore =
        totalAssessments === 0
          ? 0
          : accumulator.assessments.reduce(
              (sum, item) => sum + item.assessmentScore,
              0,
            ) / totalAssessments;
      const recurringServers = Array.from(
        accumulator.serverEventCounts.values(),
      ).filter((count) => count > 1).length;
      const totalServers = Math.max(accumulator.serverEventCounts.size, 1);
      const recurrenceRate = round(recurringServers / totalServers, 4);
      const cidFShare = round(
        accumulator.cidFWeight / Math.max(accumulator.compatibleCidWeight, 1),
        4,
      );
      const trendRatio = buildTrendRatio(accumulator.monthlyCompatibleEvents);
      
      const scoreBreakdown = buildScoreBreakdown({
        cidFShare,
        recurrenceRate,
        trendRatio,
        lostDays: accumulator.lostDays,
        averageExposureScore,
        impactedServerCount: accumulator.serverEventCounts.size,
        maxLostDays: globalMaxLostDays,
        maxImpactedServers: globalMaxImpactedServers,
      });
      const score = round(
        scoreBreakdown.cidFSharePoints +
          scoreBreakdown.recurrencePoints +
          scoreBreakdown.trendPoints +
          scoreBreakdown.lostDaysPoints +
          scoreBreakdown.exposurePoints,
        4,
      );
      const criticality = criticalityFromScore(score);
      const cidZone = labelZoneCID_F({
        cidFShare,
        totalAssessments,
        averageExposureScore,
        score,
      });

      return {
        analyticalGroup,
        secretaria: accumulator.secretaria,
        cargo: accumulator.cargo,
        localTrabalho: accumulator.localTrabalho,
        unidadeOrcamentaria: accumulator.unidadeOrcamentaria,
        totalAssessments,
        activeFactors: accumulator.factorNames.size,
        factorDomains: Array.from(accumulator.factorDomains).sort(),
        factorNames: Array.from(accumulator.factorNames).sort(),
        compatibleCidChapterKeys: Array.from(accumulator.cidChapterKeys).sort(),
        cidCompatibleWeight: round(accumulator.compatibleCidWeight, 4),
        cidFWeight: round(accumulator.cidFWeight, 4),
        cidFShare,
        recurrenceRate,
        trendRatio,
        lostDays: round(accumulator.lostDays, 4),
        averageExposureScore: round(averageExposureScore, 4),
        score,
        criticality,
        cidZone,
        justification: buildJustification({
          analyticalGroup,
          cidFShare,
          recurrenceRate,
          trendRatio,
          lostDays: accumulator.lostDays,
          averageExposureScore,
          factorDomains: Array.from(accumulator.factorDomains),
          criticality,
          cidZone,
        }),
        impactedServerCount: accumulator.serverEventCounts.size, // Garantir contagem por grupo
        associatedCids: Array.from(accumulator.associatedCids).sort(),
        evidenceSummary: accumulator.assessments
          .slice(0, 3)
          .map((item) => item.evidence),
        scoreBreakdown,
      } satisfies PsychosocialAnalyticalSignal;
    })
    .filter(
      (signal) => signal.totalAssessments > 0 || signal.cidCompatibleWeight > 0,
    )
    .sort((left, right) => {
      // 1. Prioriza o agrupamento por Secretaria (Alfabetico)
      const secCompare = left.secretaria.localeCompare(right.secretaria);
      if (secCompare !== 0) return secCompare;
      
      // 2. Dentro da secretaria, ordena pela criticidade (Maior Score para o Menor)
      return right.score - left.score;
    });

  const finalSignals = signalsByAnalyticalGroup;
  const factorImpactMap = new Map<number, number>();
  finalSignals.forEach(sig => {
    sig.factorNames.forEach(fName => {
      const factor = factorCatalog.find(f => f.factor === fName);
      if (factor) {
        factorImpactMap.set(factor.factorId, (factorImpactMap.get(factor.factorId) || 0) + 1);
      }
    });
  });

  const updatedFactorCatalog = factorCatalog.map(f => ({
    ...f,
    impactCount: factorImpactMap.get(f.factorId) || 0
  }));

  const cuts = {
    secretaria: aggregateCutItems(
      signalsByAnalyticalGroup,
      (signal) => signal.secretaria,
    ),
    cargo: aggregateCutItems(
      signalsByAnalyticalGroup,
      (signal) => signal.cargo,
    ),
    localTrabalho: aggregateCutItems(
      signalsByAnalyticalGroup,
      (signal) => signal.localTrabalho,
    ),
    cidCapitulo: aggregateCutItems(
      signalsByAnalyticalGroup.flatMap((signal) =>
        signal.compatibleCidChapterKeys.length === 0
          ? [
              {
                ...signal,
                analyticalGroup: signal.analyticalGroup,
                localTrabalho: signal.localTrabalho,
              },
            ]
          : signal.compatibleCidChapterKeys.map((chapter) => ({
              ...signal,
              analyticalGroup: chapter,
            })),
      ),
      (signal) => signal.analyticalGroup,
    ),
    cidCompativel: aggregateCutItems(signalsByAnalyticalGroup, (signal) =>
      signal.cidZone === "NAO_COMPATIVEL" ? "NAO_COMPATIVEL" : "CID_COMPATIVEL",
    ),
    grupoAnalitico: aggregateCutItems(
      signalsByAnalyticalGroup,
      (signal) => signal.analyticalGroup,
    ),
  };

  const analysis: PsychosocialAnalysisOutput = {
    period,
    activeFactors: factorCatalog,
    assessmentSummaries: assessments,
    signalsByAnalyticalGroup,
    cuts,
    validation: {
      factorsAssessmentsConsistent: true,
      signalsEpidemiologyConsistent: true,
      contextConsistency: true,
      explainabilityConsistent: true,
      hasBlockingIssues: false,
      issues: [],
    },
    totalImpactedServers: impactedServersGlobal.size,
    totalWorkforceBaseline: new Set(dataset.vinculos.map(v => v.servidor_id)).size || dataset.vinculos.length,
  };

  analysis.validation = validatePsychosocialAnalysis(analysis);
  return analysis;
}

export function reportPsychoRiskSignals(
  dataset: PsychosocialDataset,
  period: PsychosocialPeriod,
): PsychosocialAnalysisOutput {
  return integrateRiskProfile(dataset, period);
}

export function validatePsychosocialAnalysis(
  analysis: PsychosocialAnalysisOutput,
): PsychosocialValidationOutput {
  const issues: string[] = [];
  const activeFactorIds = new Set(
    analysis.activeFactors.map((factor) => factor.factorId),
  );
  const missingFactors = analysis.assessmentSummaries.filter(
    (assessment) =>
      assessment.factorId !== null && !activeFactorIds.has(assessment.factorId),
  );
  if (missingFactors.length > 0) {
    issues.push(
      "Existem avaliacoes apontando para fatores inativos ou nao carregados.",
    );
  }

  const invalidSignals = analysis.signalsByAnalyticalGroup.filter(
    (signal) =>
      signal.cidCompatibleWeight === 0 && signal.totalAssessments === 0,
  );
  if (invalidSignals.length > 0) {
    issues.push(
      "Ha sinais sem base epidemiologica nem inventario psicossocial.",
    );
  }

  const totalGroups = analysis.signalsByAnalyticalGroup.length;
  const secretaryGroupCount = analysis.cuts.secretaria.reduce(
    (sum, item) => sum + item.groupCount,
    0,
  );
  const cargoGroupCount = analysis.cuts.cargo.reduce(
    (sum, item) => sum + item.groupCount,
    0,
  );
  const localGroupCount = analysis.cuts.localTrabalho.reduce(
    (sum, item) => sum + item.groupCount,
    0,
  );
  if (
    secretaryGroupCount !== totalGroups ||
    cargoGroupCount !== totalGroups ||
    localGroupCount !== totalGroups
  ) {
    issues.push(
      "Os recortes por secretaria, cargo ou local nao reconciliam com os grupos analiticos.",
    );
  }

  const invalidJustification = analysis.signalsByAnalyticalGroup.filter(
    (signal) =>
      signal.justification.trim().length === 0 ||
      /causad|culpa/i.test(signal.justification),
  );
  if (invalidJustification.length > 0) {
    issues.push(
      "Existe sinal sem justificativa adequada ou com linguagem causal proibida.",
    );
  }

  const missingEvidence = analysis.assessmentSummaries.filter(
    (assessment) => assessment.evidence === "EVIDENCIA_NAO_INFORMADA",
  );
  if (missingEvidence.length > 0) {
    issues.push(
      "Ha avaliacoes sem evidencia estruturada; registrar como limitacao residual.",
    );
  }

  return {
    factorsAssessmentsConsistent: missingFactors.length === 0,
    signalsEpidemiologyConsistent: invalidSignals.length === 0,
    contextConsistency:
      secretaryGroupCount === totalGroups &&
      cargoGroupCount === totalGroups &&
      localGroupCount === totalGroups,
    explainabilityConsistent: invalidJustification.length === 0,
    hasBlockingIssues: missingFactors.length > 0 || invalidSignals.length > 0,
    issues,
  };
}

export function createSupabasePsychosocialRepository(
  client: SupabaseClient,
): PsychosocialRepository {
  return {
    async loadDataset(): Promise<PsychosocialDataset> {
      console.log("[psy-repo] Loading collective dataset via pagination...");
      
      const [factors, assessments, signals, events, cids, vinculos, tempos] = await Promise.all([
        fetchAllPages<PsychosocialFactorRow>(
          (from, to) => client.schema("abs_intel").from("abs_dim_psychosocial_factor").select("*").range(from, to),
          "fatores"
        ),
        fetchAllPages<PsychosocialAssessmentRow>(
          (from, to) => client.schema("abs_intel").from("abs_fact_psychosocial_assessment").select("*").range(from, to),
          "avaliacoes"
        ),
        fetchAllPages<PsychosocialSignalRow>(
          (from, to) => client.schema("abs_intel").from("abs_fact_psychosocial_signal").select("*").range(from, to),
          "sinais"
        ),
        fetchAllPages<PsychosocialEventRow>(
          (from, to) => client.schema("abs_intel").from("abs_fact_afastamento_evento").select("afastamento_id, servidor_id, vinculo_id, data_inicio, dias_afastado").range(from, to),
          "eventos"
        ),
        fetchAllPages<PsychosocialCidRow>(
          (from, to) => client.schema("abs_intel").from("abs_fact_afastamento_cid").select("afastamento_id, cid_codigo, cid_capitulo, occurrence_weight, allocated_days").range(from, to),
          "cids"
        ),
        fetchAllPages<PsychosocialVinculoRow>(
          (from, to) => client.schema("abs_intel").from("abs_dim_vinculo_servidor").select("vinculo_id, servidor_id, unidade_orcamentaria, local_trabalho, secretaria, cargo, natureza_cargo").range(from, to),
          "vinculos"
        ),
        fetchAllPages<PsychosocialTempoRow>(
          (from, to) => client.schema("abs_intel").from("abs_dim_tempo").select("tempo_id, data_calendario, competencia_yyyymm").range(from, to),
          "tempos"
        )
      ]);

      return { factors, assessments, signals, events, cids, vinculos, tempos };
    },
  };
}
