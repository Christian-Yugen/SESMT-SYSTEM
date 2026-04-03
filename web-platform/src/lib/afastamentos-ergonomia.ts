import type { SupabaseClient } from "@supabase/supabase-js";

const EMPTY_DIMENSION = "NAO_INFORMADO";
const SCORE_MAX = 100;
const MUSCULOSKELETAL_PREFIXES = ["M", "G56", "R29", "S", "T92"];
const SCORE_COMPONENTS = {
  exposure: 30,
  assessment: 25,
  actionBacklog: 20,
  musculoskeletalShare: 15,
  lostDays: 10,
} as const;

export interface ErgonomicFactorRow {
  ergonomic_factor_id: number;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  fonte_normativa: string | null;
  is_active: boolean;
}

export interface ErgonomicAssessmentRow {
  ergonomic_assessment_id: number;
  servidor_id: number | null;
  vinculo_id: number | null;
  tempo_id: number | null;
  ergonomic_factor_id: number | null;
  metodo_avaliacao: string | null;
  score: number | null;
  nivel_risco: string | null;
  avaliador: string | null;
  observacoes: string | null;
}

export interface ErgonomicExposureRow {
  ergonomic_exposure_id: number;
  servidor_id: number | null;
  vinculo_id: number | null;
  ergonomic_factor_id: number | null;
  local_trabalho: string | null;
  frequencia_exposicao: string | null;
  intensidade_exposicao: string | null;
  inicio_exposicao: string | null;
  fim_exposicao: string | null;
  observacoes: string | null;
}

export interface ErgonomicActionPlanRow {
  ergonomic_action_plan_id: number;
  ergonomic_assessment_id: number | null;
  servidor_id: number | null;
  vinculo_id: number | null;
  prioridade: string | null;
  acao_recomendada: string;
  responsavel: string | null;
  data_prevista: string | null;
  data_execucao: string | null;
  status_acao: string | null;
  observacoes: string | null;
}

export interface ErgonomicEventRow {
  afastamento_id: number;
  servidor_id: number | null;
  vinculo_id: number | null;
  data_inicio: string;
  dias_afastado: number | null;
}

export interface ErgonomicCidRow {
  afastamento_id: number;
  cid_codigo: string | null;
  cid_capitulo: string | null;
  occurrence_weight: number;
  allocated_days: number | null;
}

export interface ErgonomicVinculoRow {
  vinculo_id: number;
  unidade_orcamentaria: string | null;
  local_trabalho: string | null;
  secretaria: string | null;
  cargo: string | null;
  natureza_cargo: string | null;
  subdivisao: string | null;
}

export interface ErgonomicTempoRow {
  tempo_id: number;
  data_calendario: string;
  competencia_yyyymm: number;
}

export interface ErgonomicDataset {
  factors: ErgonomicFactorRow[];
  assessments: ErgonomicAssessmentRow[];
  exposures: ErgonomicExposureRow[];
  actionPlans: ErgonomicActionPlanRow[];
  events: ErgonomicEventRow[];
  cids: ErgonomicCidRow[];
  vinculos: ErgonomicVinculoRow[];
  tempos: ErgonomicTempoRow[];
}

export interface ErgonomicPeriod {
  startDate: string;
  endDate: string;
}

export interface ErgonomicFactorCatalogEntry {
  factorId: number;
  code: string;
  factor: string;
  description: string;
  categoryNR17: string;
  normativeReference: string;
  status: "ATIVO" | "INATIVO";
}

export interface ErgonomicAssessmentSummary {
  assessmentId: number;
  factorId: number | null;
  factorCode: string;
  factorName: string;
  categoryNR17: string;
  unidadeOrcamentaria: string;
  localTrabalho: string;
  setor: string;
  cargo: string;
  posto: string;
  tarefa: string;
  preliminaryStatus: string;
  aetStatus: string;
  evaluationDate: string | null;
  responsible: string;
  evaluationMethod: string;
  assessmentScore: number;
  riskLevel: string;
  analyticalGroup: string;
  musculoskeletalAnalyticalGroup: string;
  rawNotes: string;
}

export interface ErgonomicExposureSummary {
  exposureId: number;
  factorId: number | null;
  factorCode: string;
  factorName: string;
  categoryNR17: string;
  localTrabalho: string;
  cargo: string;
  posto: string;
  tarefa: string;
  exposureLevel: string;
  exposureScore: number;
  frequency: string;
  intensity: string;
  observation: string;
  musculoskeletalAnalyticalGroup: string;
}

export interface ErgonomicActionPlanSummary {
  actionPlanId: number;
  assessmentId: number | null;
  cargo: string;
  localTrabalho: string;
  posto: string;
  tarefa: string;
  priority: string;
  measure: string;
  measureType: string;
  dueDate: string | null;
  responsible: string;
  status: string;
  observation: string;
  musculoskeletalAnalyticalGroup: string;
}

export type ErgonomicCriticality = "BAIXA" | "MODERADA" | "ALTA" | "CRITICA";

export interface ErgonomicScoreBreakdown {
  exposurePoints: number;
  assessmentPoints: number;
  actionBacklogPoints: number;
  musculoskeletalSharePoints: number;
  lostDaysPoints: number;
}

export interface ErgonomicAnalyticalSignal {
  musculoskeletalAnalyticalGroup: string;
  secretaria: string;
  cargo: string;
  localTrabalho: string;
  setor: string;
  posto: string;
  tarefa: string;
  totalAssessments: number;
  totalExposures: number;
  totalActionPlans: number;
  openCriticalActions: number;
  activeFactors: number;
  factorNames: string[];
  categoryNR17Keys: string[];
  averageAssessmentScore: number;
  averageExposureScore: number;
  musculoskeletalShare: number;
  lostDays: number;
  score: number;
  criticality: ErgonomicCriticality;
  justification: string;
  scoreBreakdown: ErgonomicScoreBreakdown;
}

export interface ErgonomicCutItem {
  key: string;
  groupCount: number;
  assessmentCount: number;
  exposureCount: number;
  actionCount: number;
  averageScore: number;
  maxScore: number;
  criticality: ErgonomicCriticality;
  justification: string;
}

export interface ErgonomicValidationOutput {
  factorsAssessmentsConsistent: boolean;
  exposuresAssessmentsConsistent: boolean;
  actionsAssessmentsConsistent: boolean;
  contextConsistency: boolean;
  criticalityConsistency: boolean;
  explainabilityConsistent: boolean;
  hasBlockingIssues: boolean;
  issues: string[];
}

export interface ErgonomicAnalysisOutput {
  period: ErgonomicPeriod;
  activeFactors: ErgonomicFactorCatalogEntry[];
  assessmentSummaries: ErgonomicAssessmentSummary[];
  exposureSummaries: ErgonomicExposureSummary[];
  actionPlanSummaries: ErgonomicActionPlanSummary[];
  signalsByAnalyticalGroup: ErgonomicAnalyticalSignal[];
  cuts: {
    cargo: ErgonomicCutItem[];
    localTrabalho: ErgonomicCutItem[];
    posto: ErgonomicCutItem[];
    tarefa: ErgonomicCutItem[];
    fatorErgonomico: ErgonomicCutItem[];
    categoriaNR17: ErgonomicCutItem[];
    grupoAnaliticoMusculoesqueletico: ErgonomicCutItem[];
  };
  validation: ErgonomicValidationOutput;
}

export interface ErgonomicRepository {
  loadDataset(): Promise<ErgonomicDataset>;
}

export class ErgonomicApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErgonomicApplicationError";
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

function fetchRows<T>(
  queryResult: {
    data: T[] | null;
    error: { message: string } | null;
  },
  sourceName: string,
): T[] {
  const { data, error } = queryResult;
  if (error) {
    throw new ErgonomicApplicationError(
      `Falha ao carregar ${sourceName}: ${error.message}`,
    );
  }
  return data || [];
}

function inferExposureScore(
  frequency: string | null,
  intensity: string | null,
): number {
  const freq = normalizeDimension(frequency);
  const inten = normalizeDimension(intensity);

  let score = 20;
  if (freq.includes("CONTIN")) score += 40;
  else if (freq.includes("DIAR")) score += 30;
  else if (freq.includes("SEMAN")) score += 20;
  else if (freq.includes("MENS")) score += 10;

  if (inten.includes("ALTA") || inten.includes("ELEV")) score += 40;
  else if (inten.includes("MOD")) score += 25;
  else if (inten.includes("BAIX")) score += 10;

  return round(clamp(score, 0, SCORE_MAX), 2);
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
  if (normalizedRisk.includes("MOD")) return 55;
  if (normalizedRisk.includes("BAIX")) return 25;
  return 0;
}

function isMusculoskeletalCid(
  cidCode: string | null,
  cidChapter: string | null,
): boolean {
  const prefix = normalizeDimension(cidCode).replace(/[^A-Z0-9]/g, "");
  if (
    MUSCULOSKELETAL_PREFIXES.some((candidate) => prefix.startsWith(candidate))
  ) {
    return true;
  }

  const chapter = normalizeDimension(cidChapter);
  return (
    chapter.includes("MUSC") ||
    chapter.includes("OSTEO") ||
    chapter.includes("TECIDO_CONJUNTIVO")
  );
}

function classifyCriticality(score: number): ErgonomicCriticality {
  if (score >= 75) return "CRITICA";
  if (score >= 50) return "ALTA";
  if (score >= 25) return "MODERADA";
  return "BAIXA";
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildMusculoskeletalGroup(params: {
  cargo: string;
  localTrabalho: string;
  posto: string;
  tarefa: string;
}): string {
  return [params.cargo, params.localTrabalho, params.posto, params.tarefa].join(
    " | ",
  );
}

export function getActiveErgonomicFactors(
  dataset: ErgonomicDataset,
): ErgonomicFactorCatalogEntry[] {
  return dataset.factors
    .filter((factor) => factor.is_active)
    .map((factor) => ({
      factorId: factor.ergonomic_factor_id,
      code: normalizeDimension(factor.codigo),
      factor: normalizeDimension(factor.nome),
      description: normalizeDimension(factor.descricao),
      categoryNR17: normalizeDimension(factor.categoria),
      normativeReference: normalizeDimension(factor.fonte_normativa || "NR-17"),
      status: "ATIVO" as const,
    }))
    .sort((left, right) => left.factor.localeCompare(right.factor));
}

export function groupErgonomicAssessments(
  dataset: ErgonomicDataset,
): ErgonomicAssessmentSummary[] {
  const factorById = new Map(
    dataset.factors.map((factor) => [factor.ergonomic_factor_id, factor]),
  );
  const vinculoById = new Map(
    dataset.vinculos.map((vinculo) => [vinculo.vinculo_id, vinculo]),
  );
  const tempoById = new Map(
    dataset.tempos.map((tempo) => [tempo.tempo_id, tempo]),
  );

  return dataset.assessments.map((assessment) => {
    const factor = assessment.ergonomic_factor_id
      ? factorById.get(assessment.ergonomic_factor_id)
      : undefined;
    const vinculo = assessment.vinculo_id
      ? vinculoById.get(assessment.vinculo_id)
      : undefined;
    const tempo = assessment.tempo_id
      ? tempoById.get(assessment.tempo_id)
      : undefined;
    const tokens = parseObservationTokens(assessment.observacoes);

    const cargo = normalizeDimension(vinculo?.natureza_cargo || vinculo?.cargo);
    const localTrabalho = normalizeDimension(vinculo?.local_trabalho);
    const setor = normalizeDimension(tokens.SETOR || vinculo?.subdivisao);
    const posto = normalizeDimension(tokens.POSTO || tokens.POSTO_TRABALHO);
    const tarefa = normalizeDimension(tokens.TAREFA || tokens.ATIVIDADE);

    return {
      assessmentId: assessment.ergonomic_assessment_id,
      factorId: assessment.ergonomic_factor_id,
      factorCode: normalizeDimension(factor?.codigo),
      factorName: normalizeDimension(factor?.nome),
      categoryNR17: normalizeDimension(factor?.categoria),
      unidadeOrcamentaria: normalizeDimension(vinculo?.unidade_orcamentaria),
      localTrabalho,
      setor,
      cargo,
      posto,
      tarefa,
      preliminaryStatus: normalizeDimension(
        tokens.STATUS_PRELIMINAR || tokens.PRELIMINAR,
      ),
      aetStatus: normalizeDimension(tokens.STATUS_AET || tokens.AET),
      evaluationDate: tempo?.data_calendario || tokens.DATA_AVALIACAO || null,
      responsible: normalizeDimension(
        tokens.RESPONSAVEL || assessment.avaliador,
      ),
      evaluationMethod: normalizeDimension(
        assessment.metodo_avaliacao || "AET",
      ),
      assessmentScore: normalizeAssessmentScore(
        assessment.score,
        assessment.nivel_risco,
      ),
      riskLevel: normalizeDimension(assessment.nivel_risco),
      analyticalGroup: [
        normalizeDimension(vinculo?.secretaria),
        cargo,
        localTrabalho,
      ].join(" | "),
      musculoskeletalAnalyticalGroup: buildMusculoskeletalGroup({
        cargo,
        localTrabalho,
        posto,
        tarefa,
      }),
      rawNotes: assessment.observacoes || "",
    };
  });
}

export function groupErgonomicExposures(
  dataset: ErgonomicDataset,
): ErgonomicExposureSummary[] {
  const factorById = new Map(
    dataset.factors.map((factor) => [factor.ergonomic_factor_id, factor]),
  );
  const vinculoById = new Map(
    dataset.vinculos.map((vinculo) => [vinculo.vinculo_id, vinculo]),
  );

  return dataset.exposures.map((exposure) => {
    const factor = exposure.ergonomic_factor_id
      ? factorById.get(exposure.ergonomic_factor_id)
      : undefined;
    const vinculo = exposure.vinculo_id
      ? vinculoById.get(exposure.vinculo_id)
      : undefined;
    const tokens = parseObservationTokens(exposure.observacoes);

    const cargo = normalizeDimension(vinculo?.natureza_cargo || vinculo?.cargo);
    const localTrabalho = normalizeDimension(
      exposure.local_trabalho || vinculo?.local_trabalho,
    );
    const posto = normalizeDimension(tokens.POSTO || tokens.POSTO_TRABALHO);
    const tarefa = normalizeDimension(tokens.TAREFA || tokens.ATIVIDADE);
    const exposureLevel = normalizeDimension(
      tokens.NIVEL_EXPOSICAO || exposure.intensidade_exposicao,
    );

    return {
      exposureId: exposure.ergonomic_exposure_id,
      factorId: exposure.ergonomic_factor_id,
      factorCode: normalizeDimension(factor?.codigo),
      factorName: normalizeDimension(factor?.nome),
      categoryNR17: normalizeDimension(factor?.categoria),
      localTrabalho,
      cargo,
      posto,
      tarefa,
      exposureLevel,
      exposureScore: inferExposureScore(
        exposure.frequencia_exposicao,
        exposure.intensidade_exposicao,
      ),
      frequency: normalizeDimension(exposure.frequencia_exposicao),
      intensity: normalizeDimension(exposure.intensidade_exposicao),
      observation: exposure.observacoes || "",
      musculoskeletalAnalyticalGroup: buildMusculoskeletalGroup({
        cargo,
        localTrabalho,
        posto,
        tarefa,
      }),
    };
  });
}

export function groupErgonomicActionPlans(
  dataset: ErgonomicDataset,
): ErgonomicActionPlanSummary[] {
  const vinculoById = new Map(
    dataset.vinculos.map((vinculo) => [vinculo.vinculo_id, vinculo]),
  );

  return dataset.actionPlans.map((plan) => {
    const vinculo = plan.vinculo_id
      ? vinculoById.get(plan.vinculo_id)
      : undefined;
    const tokens = parseObservationTokens(plan.observacoes);

    const cargo = normalizeDimension(vinculo?.natureza_cargo || vinculo?.cargo);
    const localTrabalho = normalizeDimension(vinculo?.local_trabalho);
    const posto = normalizeDimension(tokens.POSTO || tokens.POSTO_TRABALHO);
    const tarefa = normalizeDimension(tokens.TAREFA || tokens.ATIVIDADE);

    return {
      actionPlanId: plan.ergonomic_action_plan_id,
      assessmentId: plan.ergonomic_assessment_id,
      cargo,
      localTrabalho,
      posto,
      tarefa,
      priority: normalizeDimension(plan.prioridade),
      measure: normalizeDimension(plan.acao_recomendada),
      measureType: normalizeDimension(tokens.TIPO_MEDIDA || tokens.TIPO),
      dueDate: plan.data_prevista,
      responsible: normalizeDimension(plan.responsavel),
      status: normalizeDimension(plan.status_acao),
      observation: plan.observacoes || "",
      musculoskeletalAnalyticalGroup: buildMusculoskeletalGroup({
        cargo,
        localTrabalho,
        posto,
        tarefa,
      }),
    };
  });
}

function buildCuts(
  groups: Map<string, ErgonomicAnalyticalSignal[]>,
): ErgonomicCutItem[] {
  return Array.from(groups.entries())
    .map(([key, signals]) => {
      const scores = signals.map((signal) => signal.score);
      const averageScore = round(average(scores), 4);
      const maxScore = round(Math.max(...scores), 4);
      return {
        key,
        groupCount: signals.length,
        assessmentCount: signals.reduce(
          (sum, signal) => sum + signal.totalAssessments,
          0,
        ),
        exposureCount: signals.reduce(
          (sum, signal) => sum + signal.totalExposures,
          0,
        ),
        actionCount: signals.reduce(
          (sum, signal) => sum + signal.totalActionPlans,
          0,
        ),
        averageScore,
        maxScore,
        criticality: classifyCriticality(maxScore),
        justification: `Recorte ${key} consolidado com criticidade ergonomica explicavel e auditavel, sem inferencia causal automatica.`,
      };
    })
    .sort((left, right) => right.maxScore - left.maxScore);
}

function groupSignalsBy(
  signals: ErgonomicAnalyticalSignal[],
  keySelector: (signal: ErgonomicAnalyticalSignal) => string,
): Map<string, ErgonomicAnalyticalSignal[]> {
  return signals.reduce((groups, signal) => {
    const key = keySelector(signal);
    const current = groups.get(key) || [];
    current.push(signal);
    groups.set(key, current);
    return groups;
  }, new Map<string, ErgonomicAnalyticalSignal[]>());
}

function groupSignalsByMany(
  signals: ErgonomicAnalyticalSignal[],
  keysSelector: (signal: ErgonomicAnalyticalSignal) => string[],
): Map<string, ErgonomicAnalyticalSignal[]> {
  return signals.reduce((groups, signal) => {
    const keys = keysSelector(signal);
    keys.forEach((key) => {
      const normalizedKey = key || EMPTY_DIMENSION;
      const current = groups.get(normalizedKey) || [];
      current.push(signal);
      groups.set(normalizedKey, current);
    });
    return groups;
  }, new Map<string, ErgonomicAnalyticalSignal[]>());
}

export function integrateErgonomicRiskProfile(
  dataset: ErgonomicDataset,
  period: ErgonomicPeriod,
): ErgonomicAnalysisOutput {
  const activeFactors = getActiveErgonomicFactors(dataset);
  const assessmentSummaries = groupErgonomicAssessments(dataset);
  const exposureSummaries = groupErgonomicExposures(dataset);
  const actionPlanSummaries = groupErgonomicActionPlans(dataset);

  const assessmentsByGroup = assessmentSummaries.reduce((map, item) => {
    const list = map.get(item.musculoskeletalAnalyticalGroup) || [];
    list.push(item);
    map.set(item.musculoskeletalAnalyticalGroup, list);
    return map;
  }, new Map<string, ErgonomicAssessmentSummary[]>());

  const exposuresByGroup = exposureSummaries.reduce((map, item) => {
    const list = map.get(item.musculoskeletalAnalyticalGroup) || [];
    list.push(item);
    map.set(item.musculoskeletalAnalyticalGroup, list);
    return map;
  }, new Map<string, ErgonomicExposureSummary[]>());

  const actionsByGroup = actionPlanSummaries.reduce((map, item) => {
    const list = map.get(item.musculoskeletalAnalyticalGroup) || [];
    list.push(item);
    map.set(item.musculoskeletalAnalyticalGroup, list);
    return map;
  }, new Map<string, ErgonomicActionPlanSummary[]>());

  const eventByAfastamento = new Map(
    dataset.events.map((event) => [event.afastamento_id, event]),
  );
  const musculoskeletalByGroup = new Map<
    string,
    { total: number; musc: number; lostDays: number }
  >();

  dataset.cids.forEach((cid) => {
    const event = eventByAfastamento.get(cid.afastamento_id);
    if (!event || !event.vinculo_id) {
      return;
    }
    const vinculo = dataset.vinculos.find(
      (item) => item.vinculo_id === event.vinculo_id,
    );
    if (!vinculo) {
      return;
    }

    const key = buildMusculoskeletalGroup({
      cargo: normalizeDimension(vinculo.natureza_cargo || vinculo.cargo),
      localTrabalho: normalizeDimension(vinculo.local_trabalho),
      posto: EMPTY_DIMENSION,
      tarefa: EMPTY_DIMENSION,
    });
    const current = musculoskeletalByGroup.get(key) || {
      total: 0,
      musc: 0,
      lostDays: 0,
    };
    const weight = cid.occurrence_weight || 0;
    current.total += weight;
    if (isMusculoskeletalCid(cid.cid_codigo, cid.cid_capitulo)) {
      current.musc += weight;
      current.lostDays += cid.allocated_days || event.dias_afastado || 0;
    }
    musculoskeletalByGroup.set(key, current);
  });

  const allGroupKeys = new Set<string>([
    ...assessmentsByGroup.keys(),
    ...exposuresByGroup.keys(),
    ...actionsByGroup.keys(),
  ]);

  const signalsByAnalyticalGroup = Array.from(allGroupKeys)
    .map((groupKey) => {
      const assessments = assessmentsByGroup.get(groupKey) || [];
      const exposures = exposuresByGroup.get(groupKey) || [];
      const actions = actionsByGroup.get(groupKey) || [];

      const baseAssessment = assessments[0];
      const cargo =
        baseAssessment?.cargo ||
        exposures[0]?.cargo ||
        actions[0]?.cargo ||
        EMPTY_DIMENSION;
      const localTrabalho =
        baseAssessment?.localTrabalho ||
        exposures[0]?.localTrabalho ||
        actions[0]?.localTrabalho ||
        EMPTY_DIMENSION;
      const posto =
        baseAssessment?.posto ||
        exposures[0]?.posto ||
        actions[0]?.posto ||
        EMPTY_DIMENSION;
      const tarefa =
        baseAssessment?.tarefa ||
        exposures[0]?.tarefa ||
        actions[0]?.tarefa ||
        EMPTY_DIMENSION;

      const musculoskeletalContext = musculoskeletalByGroup.get(
        buildMusculoskeletalGroup({
          cargo,
          localTrabalho,
          posto: EMPTY_DIMENSION,
          tarefa: EMPTY_DIMENSION,
        }),
      ) || { total: 0, musc: 0, lostDays: 0 };

      const averageAssessmentScore = round(
        average(assessments.map((item) => item.assessmentScore)),
        4,
      );
      const averageExposureScore = round(
        average(exposures.map((item) => item.exposureScore)),
        4,
      );
      const openCriticalActions = actions.filter(
        (item) =>
          (item.priority.includes("ALTA") || item.priority.includes("CRIT")) &&
          !item.status.includes("CONCLUID"),
      ).length;
      const actionBacklogRatio =
        actions.length === 0 ? 0 : openCriticalActions / actions.length;
      const musculoskeletalShare =
        musculoskeletalContext.total === 0
          ? 0
          : round(
              musculoskeletalContext.musc / musculoskeletalContext.total,
              4,
            );

      const scoreBreakdown: ErgonomicScoreBreakdown = {
        exposurePoints: round(
          (averageExposureScore / SCORE_MAX) * SCORE_COMPONENTS.exposure,
          4,
        ),
        assessmentPoints: round(
          (averageAssessmentScore / SCORE_MAX) * SCORE_COMPONENTS.assessment,
          4,
        ),
        actionBacklogPoints: round(
          actionBacklogRatio * SCORE_COMPONENTS.actionBacklog,
          4,
        ),
        musculoskeletalSharePoints: round(
          musculoskeletalShare * SCORE_COMPONENTS.musculoskeletalShare,
          4,
        ),
        lostDaysPoints: round(
          clamp(musculoskeletalContext.lostDays / 30, 0, 1) *
            SCORE_COMPONENTS.lostDays,
          4,
        ),
      };

      const score = round(
        clamp(
          scoreBreakdown.exposurePoints +
            scoreBreakdown.assessmentPoints +
            scoreBreakdown.actionBacklogPoints +
            scoreBreakdown.musculoskeletalSharePoints +
            scoreBreakdown.lostDaysPoints,
          0,
          SCORE_MAX,
        ),
        4,
      );

      const factorNames = Array.from(
        new Set([
          ...assessments.map((item) => item.factorName),
          ...exposures.map((item) => item.factorName),
        ]),
      ).filter((item) => item !== EMPTY_DIMENSION);

      const categoryNR17Keys = Array.from(
        new Set([
          ...assessments.map((item) => item.categoryNR17),
          ...exposures.map((item) => item.categoryNR17),
        ]),
      ).filter((item) => item !== EMPTY_DIMENSION);

      const criticality = classifyCriticality(score);

      return {
        musculoskeletalAnalyticalGroup: groupKey,
        secretaria:
          baseAssessment?.analyticalGroup.split(" | ")[0] || EMPTY_DIMENSION,
        cargo,
        localTrabalho,
        setor: baseAssessment?.setor || EMPTY_DIMENSION,
        posto,
        tarefa,
        totalAssessments: assessments.length,
        totalExposures: exposures.length,
        totalActionPlans: actions.length,
        openCriticalActions,
        activeFactors: factorNames.length,
        factorNames,
        categoryNR17Keys,
        averageAssessmentScore,
        averageExposureScore,
        musculoskeletalShare,
        lostDays: round(musculoskeletalContext.lostDays, 4),
        score,
        criticality,
        justification:
          `Criticidade ergonomica ${criticality} para ${groupKey} com base em exposicao media ${averageExposureScore}, ` +
          `avaliacao media ${averageAssessmentScore}, backlog de acoes ${openCriticalActions} e contexto musculoesqueletico ` +
          `${round(musculoskeletalShare * 100, 2)}%, sem inferencia causal automatica.`,
        scoreBreakdown,
      } satisfies ErgonomicAnalyticalSignal;
    })
    .sort((left, right) => right.score - left.score);

  const byCargo = groupSignalsBy(
    signalsByAnalyticalGroup,
    (signal) => signal.cargo,
  );
  const byLocal = groupSignalsBy(
    signalsByAnalyticalGroup,
    (signal) => signal.localTrabalho,
  );
  const byPosto = groupSignalsBy(
    signalsByAnalyticalGroup,
    (signal) => signal.posto,
  );
  const byTarefa = groupSignalsBy(
    signalsByAnalyticalGroup,
    (signal) => signal.tarefa,
  );
  const byFactor = groupSignalsByMany(signalsByAnalyticalGroup, (signal) =>
    signal.factorNames.length > 0 ? signal.factorNames : [EMPTY_DIMENSION],
  );
  const byCategory = groupSignalsByMany(signalsByAnalyticalGroup, (signal) =>
    signal.categoryNR17Keys.length > 0
      ? signal.categoryNR17Keys
      : [EMPTY_DIMENSION],
  );
  const byGroup = groupSignalsBy(
    signalsByAnalyticalGroup,
    (signal) => signal.musculoskeletalAnalyticalGroup,
  );

  const analysis: ErgonomicAnalysisOutput = {
    period,
    activeFactors,
    assessmentSummaries,
    exposureSummaries,
    actionPlanSummaries,
    signalsByAnalyticalGroup,
    cuts: {
      cargo: buildCuts(byCargo),
      localTrabalho: buildCuts(byLocal),
      posto: buildCuts(byPosto),
      tarefa: buildCuts(byTarefa),
      fatorErgonomico: buildCuts(byFactor),
      categoriaNR17: buildCuts(byCategory),
      grupoAnaliticoMusculoesqueletico: buildCuts(byGroup),
    },
    validation: {
      factorsAssessmentsConsistent: true,
      exposuresAssessmentsConsistent: true,
      actionsAssessmentsConsistent: true,
      contextConsistency: true,
      criticalityConsistency: true,
      explainabilityConsistent: true,
      hasBlockingIssues: false,
      issues: [],
    },
  };

  analysis.validation = validateErgonomicAnalysis(analysis);
  return analysis;
}

export function validateErgonomicAnalysis(
  analysis: ErgonomicAnalysisOutput,
): ErgonomicValidationOutput {
  const issues: string[] = [];

  const activeFactorIds = new Set(
    analysis.activeFactors.map((factor) => factor.factorId),
  );
  const unknownFactors = analysis.assessmentSummaries.filter(
    (assessment) =>
      assessment.factorId !== null && !activeFactorIds.has(assessment.factorId),
  );
  const factorsAssessmentsConsistent = unknownFactors.length === 0;
  if (!factorsAssessmentsConsistent) {
    issues.push(
      "Existem avaliacoes ergonomicas com fator nao ativo no catalogo.",
    );
  }

  const groupsFromAssessments = new Set(
    analysis.assessmentSummaries.map(
      (item) => item.musculoskeletalAnalyticalGroup,
    ),
  );
  const groupsFromExposures = new Set(
    analysis.exposureSummaries.map(
      (item) => item.musculoskeletalAnalyticalGroup,
    ),
  );
  const groupsFromActions = new Set(
    analysis.actionPlanSummaries.map(
      (item) => item.musculoskeletalAnalyticalGroup,
    ),
  );

  const exposuresAssessmentsConsistent = Array.from(groupsFromExposures).every(
    (group) => groupsFromAssessments.has(group),
  );
  if (
    !exposuresAssessmentsConsistent &&
    analysis.exposureSummaries.length > 0
  ) {
    issues.push(
      "Ha exposicoes ergonomicas sem avaliacao ergonomica correlata por grupo.",
    );
  }

  const actionsAssessmentsConsistent = Array.from(groupsFromActions).every(
    (group) =>
      groupsFromAssessments.has(group) || groupsFromExposures.has(group),
  );
  if (
    !actionsAssessmentsConsistent &&
    analysis.actionPlanSummaries.length > 0
  ) {
    issues.push(
      "Ha planos de acao ergonomica sem base de avaliacao/exposicao no mesmo grupo.",
    );
  }

  const contextConsistency = analysis.signalsByAnalyticalGroup.every(
    (signal) =>
      signal.cargo !== EMPTY_DIMENSION &&
      signal.localTrabalho !== EMPTY_DIMENSION,
  );
  if (!contextConsistency && analysis.signalsByAnalyticalGroup.length > 0) {
    issues.push(
      "Foram identificados sinais ergonomicos sem contexto ocupacional minimo.",
    );
  }

  const criticalityConsistency = analysis.signalsByAnalyticalGroup.every(
    (signal) => {
      const expected = classifyCriticality(signal.score);
      return expected === signal.criticality;
    },
  );
  if (!criticalityConsistency) {
    issues.push("Criticidade ergonomica nao reconciliada com score calculado.");
  }

  const textToAudit = analysis.signalsByAnalyticalGroup
    .map((signal) => signal.justification)
    .join(" ");
  const explainabilityConsistent =
    !/causad|culpa|provou que/i.test(textToAudit) &&
    analysis.signalsByAnalyticalGroup.every(
      (signal) => signal.justification.trim().length > 0,
    );
  if (!explainabilityConsistent) {
    issues.push(
      "Justificativa ergonomica ausente ou com linguagem causal proibida.",
    );
  }

  const hasBlockingIssues =
    !factorsAssessmentsConsistent ||
    !contextConsistency ||
    !criticalityConsistency;

  return {
    factorsAssessmentsConsistent,
    exposuresAssessmentsConsistent,
    actionsAssessmentsConsistent,
    contextConsistency,
    criticalityConsistency,
    explainabilityConsistent,
    hasBlockingIssues,
    issues,
  };
}

export function createSupabaseErgonomicRepository(
  client: SupabaseClient,
): ErgonomicRepository {
  return {
    async loadDataset(): Promise<ErgonomicDataset> {
      const factors = fetchRows<ErgonomicFactorRow>(
        await client
          .schema("abs_intel")
          .from("abs_dim_ergonomic_factor")
          .select(
            "ergonomic_factor_id, codigo, nome, descricao, categoria, fonte_normativa, is_active",
          ),
        "catalogo de fatores ergonomicos",
      );

      const assessments = fetchRows<ErgonomicAssessmentRow>(
        await client
          .schema("abs_intel")
          .from("abs_fact_ergonomic_assessment")
          .select(
            "ergonomic_assessment_id, servidor_id, vinculo_id, tempo_id, ergonomic_factor_id, metodo_avaliacao, score, nivel_risco, avaliador, observacoes",
          ),
        "avaliacoes ergonomicas",
      );

      const exposures = fetchRows<ErgonomicExposureRow>(
        await client
          .schema("abs_intel")
          .from("abs_fact_ergonomic_exposure")
          .select(
            "ergonomic_exposure_id, servidor_id, vinculo_id, ergonomic_factor_id, local_trabalho, frequencia_exposicao, intensidade_exposicao, inicio_exposicao, fim_exposicao, observacoes",
          ),
        "exposicoes ergonomicas",
      );

      const actionPlans = fetchRows<ErgonomicActionPlanRow>(
        await client
          .schema("abs_intel")
          .from("abs_fact_ergonomic_action_plan")
          .select(
            "ergonomic_action_plan_id, ergonomic_assessment_id, servidor_id, vinculo_id, prioridade, acao_recomendada, responsavel, data_prevista, data_execucao, status_acao, observacoes",
          ),
        "plano de acao ergonomico",
      );

      const events = fetchRows<ErgonomicEventRow>(
        await client
          .schema("abs_intel")
          .from("abs_fact_afastamento_evento")
          .select(
            "afastamento_id, servidor_id, vinculo_id, data_inicio, dias_afastado",
          ),
        "eventos epidemiologicos",
      );

      const cids = fetchRows<ErgonomicCidRow>(
        await client
          .schema("abs_intel")
          .from("abs_fact_afastamento_cid")
          .select(
            "afastamento_id, cid_codigo, cid_capitulo, occurrence_weight, allocated_days",
          ),
        "cids de afastamento",
      );

      const vinculos = fetchRows<ErgonomicVinculoRow>(
        await client
          .schema("abs_intel")
          .from("abs_dim_vinculo_servidor")
          .select(
            "vinculo_id, unidade_orcamentaria, local_trabalho, secretaria, cargo, natureza_cargo, subdivisao",
          ),
        "contexto ocupacional",
      );

      const tempos = fetchRows<ErgonomicTempoRow>(
        await client
          .schema("abs_intel")
          .from("abs_dim_tempo")
          .select("tempo_id, data_calendario, competencia_yyyymm"),
        "dimensao tempo",
      );

      return {
        factors,
        assessments,
        exposures,
        actionPlans,
        events,
        cids,
        vinculos,
        tempos,
      };
    },
  };
}
