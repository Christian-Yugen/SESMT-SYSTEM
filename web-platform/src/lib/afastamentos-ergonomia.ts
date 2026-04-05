import type { SupabaseClient } from "@supabase/supabase-js";

const EMPTY_DIMENSION = "NAO_INFORMADO";
const SCORE_MAX = 100;
const MUSCULOSKELETAL_PREFIXES = ["M"];
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
  servidor_id: number | null;
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
  musculoskeletalEvents: number;
  associatedCids?: string[];
  impactedServerCount?: number;
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
  totalImpactedServers: number;
  totalMonitoredPopulation: number;
  totalWorkforceBaseline: number;
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

export interface ErgonomicRepository {
  loadDataset(): Promise<ErgonomicDataset>;
}

export class ErgonomicApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErgonomicApplicationError";
  }
}

// ---------------------------------------------------------------------------
// Engine de Negócio
// ---------------------------------------------------------------------------

function normalizeDimension(value: string | null | undefined): string {
  if (!value) return EMPTY_DIMENSION;
  const trimmed = value.trim().toUpperCase();
  return trimmed || EMPTY_DIMENSION;
}

function round(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + (v || 0), 0);
  return sum / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isMusculoskeletalCid(cidCode: string | null, chapter: string | null): boolean {
  if (!cidCode && !chapter) return false;
  const code = (cidCode || "").toUpperCase();
  const chap = (chapter || "").toUpperCase();
  return (
    MUSCULOSKELETAL_PREFIXES.some((prefix) => code.startsWith(prefix)) ||
    chap.includes("XIII") ||
    chap.startsWith("M")
  );
}

function classifyCriticality(score: number): ErgonomicCriticality {
  if (score >= 80) return "CRITICA";
  if (score >= 60) return "ALTA";
  if (score >= 40) return "MODERADA";
  return "BAIXA";
}

function buildMusculoskeletalGroup(tokens: {
  cargo: string;
  localTrabalho: string;
  posto: string;
  tarefa: string;
}): string {
  return `${tokens.cargo} | ${tokens.localTrabalho} | ${tokens.posto} | ${tokens.tarefa}`;
}

export function getActiveErgonomicFactors(
  dataset: ErgonomicDataset,
): ErgonomicFactorCatalogEntry[] {
  return dataset.factors
    .filter((f) => f.is_active)
    .map((f) => ({
      factorId: f.ergonomic_factor_id,
      code: normalizeDimension(f.codigo),
      factor: f.nome,
      description: f.descricao || "",
      categoryNR17: normalizeDimension(f.categoria),
      normativeReference: f.fonte_normativa || "",
      status: "ATIVO",
    }));
}

export function groupErgonomicAssessments(
  dataset: ErgonomicDataset,
): ErgonomicAssessmentSummary[] {
  const factorsMap = new Map(
    dataset.factors.map((f) => [f.ergonomic_factor_id, f]),
  );
  const vinculosMap = new Map(
    dataset.vinculos.map((v) => [v.vinculo_id, v]),
  );
  const temposMap = new Map(
    dataset.tempos.map((t) => [t.tempo_id, t]),
  );

  return dataset.assessments.map((assessment) => {
    const factor = assessment.ergonomic_factor_id
      ? factorsMap.get(assessment.ergonomic_factor_id)
      : null;
    const vinculo = assessment.vinculo_id
      ? vinculosMap.get(assessment.vinculo_id)
      : null;
    const tempo = assessment.tempo_id ? temposMap.get(assessment.tempo_id) : null;

    const tokens = (assessment.observacoes || "").split("|").reduce((acc: any, part) => {
      const [key, val] = part.split(":").map(s => s.trim());
      if (key && val) acc[key.toUpperCase()] = val;
      return acc;
    }, {});

    const cargo = normalizeDimension(vinculo?.cargo || vinculo?.natureza_cargo || tokens.CARGO);
    const localTrabalho = normalizeDimension(vinculo?.local_trabalho || tokens.LOCAL);
    const posto = normalizeDimension(tokens.POSTO || tokens.POSTO_TRABALHO);
    const tarefa = normalizeDimension(tokens.TAREFA || tokens.ATIVIDADE);

    return {
      assessmentId: assessment.ergonomic_assessment_id,
      factorId: assessment.ergonomic_factor_id,
      factorCode: normalizeDimension(factor?.codigo),
      factorName: factor?.nome || EMPTY_DIMENSION,
      categoryNR17: normalizeDimension(factor?.categoria),
      unidadeOrcamentaria: normalizeDimension(vinculo?.unidade_orcamentaria),
      localTrabalho,
      setor: normalizeDimension(tokens.SETOR),
      cargo,
      posto,
      tarefa,
      preliminaryStatus: normalizeDimension(tokens.STATUS_PRELIMINAR),
      aetStatus: normalizeDimension(tokens.STATUS_AET),
      evaluationDate: tempo?.data_calendario || null,
      responsible: assessment.avaliador || EMPTY_DIMENSION,
      evaluationMethod: assessment.metodo_avaliacao || EMPTY_DIMENSION,
      assessmentScore: assessment.score || 0,
      riskLevel: assessment.nivel_risco || EMPTY_DIMENSION,
      analyticalGroup: `${normalizeDimension(vinculo?.secretaria)} | ${cargo} | ${localTrabalho}`,
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
  const factorsMap = new Map(
    dataset.factors.map((f) => [f.ergonomic_factor_id, f]),
  );
  const vinculosMap = new Map(
    dataset.vinculos.map((v) => [v.vinculo_id, v]),
  );

  return dataset.exposures.map((exposure) => {
    const factor = exposure.ergonomic_factor_id
      ? factorsMap.get(exposure.ergonomic_factor_id)
      : null;
    const vinculo = exposure.vinculo_id
      ? vinculosMap.get(exposure.vinculo_id)
      : null;

    const tokens = (exposure.observacoes || "").split("|").reduce((acc: any, part) => {
      const [key, val] = part.split(":").map(s => s.trim());
      if (key && val) acc[key.toUpperCase()] = val;
      return acc;
    }, {});

    const cargo = normalizeDimension(vinculo?.cargo || vinculo?.natureza_cargo || tokens.CARGO);
    const localTrabalho = normalizeDimension(exposure.local_trabalho || vinculo?.local_trabalho || tokens.LOCAL);
    const posto = normalizeDimension(tokens.POSTO || tokens.POSTO_TRABALHO);
    const tarefa = normalizeDimension(tokens.TAREFA || tokens.ATIVIDADE);

    const frequency = normalizeDimension(exposure.frequencia_exposicao);
    const intensity = normalizeDimension(exposure.intensidade_exposicao);

    let exposureScore = 0;
    if (intensity.includes("ALTA") || intensity.includes("FORTE")) exposureScore = 80;
    else if (intensity.includes("MODERADA")) exposureScore = 50;
    else exposureScore = 20;

    return {
      exposureId: exposure.ergonomic_exposure_id,
      factorId: exposure.ergonomic_factor_id,
      factorCode: normalizeDimension(factor?.codigo),
      factorName: factor?.nome || EMPTY_DIMENSION,
      categoryNR17: normalizeDimension(factor?.categoria),
      localTrabalho,
      cargo,
      posto,
      tarefa,
      exposureLevel: intensity,
      exposureScore,
      frequency,
      intensity,
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
  const vinculosMap = new Map(
    dataset.vinculos.map((v) => [v.vinculo_id, v]),
  );

  return dataset.actionPlans.map((plan) => {
    const vinculo = plan.vinculo_id ? vinculosMap.get(plan.vinculo_id) : null;
    const tokens = (plan.observacoes || "").split("|").reduce((acc: any, part) => {
      const [key, val] = part.split(":").map(s => s.trim());
      if (key && val) acc[key.toUpperCase()] = val;
      return acc;
    }, {});

    const cargo = normalizeDimension(vinculo?.cargo || vinculo?.natureza_cargo || tokens.CARGO);
    const localTrabalho = normalizeDimension(vinculo?.local_trabalho || tokens.LOCAL);
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

  const impactedServersGlobal = new Set<number>();
  const vinculoById = new Map(
    dataset.vinculos.map((vinculo) => [vinculo.vinculo_id, vinculo]),
  );

  const musculoskeletalByGroup = new Map<
    string,
    { 
      total: number; 
      musc: number; 
      lostDays: number; 
      secretaria: string; 
      cargo: string; 
      localTrabalho: string;
      cids: Set<string>;
      servers: Set<number>;
    }
  >();

  const cidsByEvent = new Map<number, ErgonomicCidRow[]>();
  dataset.cids.forEach((cid) => {
    const list = cidsByEvent.get(cid.afastamento_id) || [];
    list.push(cid);
    cidsByEvent.set(cid.afastamento_id, list);
  });

  dataset.events.forEach((event) => {
    if (!event.vinculo_id || !event.servidor_id) return;
    const eventDate = event.data_inicio.slice(0, 10);
    if (eventDate < period.startDate || eventDate > period.endDate) return;

    const eventCids = cidsByEvent.get(event.afastamento_id) || [];
    if (eventCids.length === 0) return;

    const vinculo = vinculoById.get(event.vinculo_id);
    if (!vinculo) return;

    const key = buildMusculoskeletalGroup({
      cargo: normalizeDimension(vinculo.cargo || vinculo.natureza_cargo),
      localTrabalho: normalizeDimension(vinculo.local_trabalho),
      posto: EMPTY_DIMENSION,
      tarefa: EMPTY_DIMENSION,
    });

    const isMusculoskeletalEvent = eventCids.some(cid => isMusculoskeletalCid(cid.cid_codigo, cid.cid_capitulo));
    const current = musculoskeletalByGroup.get(key) || {
      total: 0,
      musc: 0,
      lostDays: 0,
      secretaria: normalizeDimension(vinculo.secretaria),
      cargo: normalizeDimension(vinculo.cargo || vinculo.natureza_cargo),
      localTrabalho: normalizeDimension(vinculo.local_trabalho),
      cids: new Set<string>(),
      servers: new Set<number>(),
    };

    current.total += 1;
    if (isMusculoskeletalEvent) {
      current.musc += 1;
      current.lostDays += event.dias_afastado || 0;
      eventCids.forEach(cid => {
        if (cid.cid_codigo) current.cids.add(cid.cid_codigo);
      });
      current.servers.add(event.servidor_id);
      impactedServersGlobal.add(event.servidor_id);
    }
    musculoskeletalByGroup.set(key, current);
  });

  const allGroupKeys = new Set<string>([
    ...assessmentsByGroup.keys(),
    ...exposuresByGroup.keys(),
    ...actionsByGroup.keys(),
    ...musculoskeletalByGroup.keys(),
  ]);

  const signalsByAnalyticalGroup = Array.from(allGroupKeys)
    .map((groupKey) => {
      const assessments = assessmentsByGroup.get(groupKey) || [];
      const exposures = exposuresByGroup.get(groupKey) || [];
      const actions = actionsByGroup.get(groupKey) || [];

      const musculoskeletalContext = musculoskeletalByGroup.get(
        buildMusculoskeletalGroup({
          cargo: assessments[0]?.cargo || exposures[0]?.cargo || actions[0]?.cargo || EMPTY_DIMENSION,
          localTrabalho: assessments[0]?.localTrabalho || exposures[0]?.localTrabalho || actions[0]?.localTrabalho || EMPTY_DIMENSION,
          posto: EMPTY_DIMENSION,
          tarefa: EMPTY_DIMENSION,
        }),
      ) || musculoskeletalByGroup.get(groupKey) || { 
        total: 0, 
        musc: 0, 
        lostDays: 0, 
        secretaria: EMPTY_DIMENSION, 
        cargo: EMPTY_DIMENSION, 
        localTrabalho: EMPTY_DIMENSION 
      };

      const cargo =
        assessments[0]?.cargo ||
        exposures[0]?.cargo ||
        actions[0]?.cargo ||
        musculoskeletalContext.cargo ||
        EMPTY_DIMENSION;

      const localTrabalho =
        assessments[0]?.localTrabalho ||
        exposures[0]?.localTrabalho ||
        actions[0]?.localTrabalho ||
        musculoskeletalContext.localTrabalho ||
        EMPTY_DIMENSION;

      const posto =
        assessments[0]?.posto ||
        exposures[0]?.posto ||
        actions[0]?.posto ||
        EMPTY_DIMENSION;

      const tarefa =
        assessments[0]?.tarefa ||
        exposures[0]?.tarefa ||
        actions[0]?.tarefa ||
        EMPTY_DIMENSION;

      const finalSecretaria = assessments[0]?.analyticalGroup?.split(" | ")[0] || musculoskeletalContext.secretaria || EMPTY_DIMENSION;

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
        secretaria: finalSecretaria,
        cargo,
        localTrabalho,
        setor: assessments[0]?.setor || EMPTY_DIMENSION,
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
        musculoskeletalEvents: musculoskeletalContext.musc,
        associatedCids: Array.from(musculoskeletalContext.cids || []),
        impactedServerCount: musculoskeletalContext.servers?.size || 0,
        score,
        criticality,
        justification:
          `Criticidade ergonomica ${criticality} para ${groupKey} com base em exposicao media ${averageExposureScore}, ` +
          `avaliacao media ${averageAssessmentScore}, backlog de acoes ${openCriticalActions} e contexto musculoesqueletico ` +
          `${round(musculoskeletalShare * 100, 2)}%, sem inferencia causal automatica.`,
        scoreBreakdown,
      };
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
    totalImpactedServers: impactedServersGlobal.size,
    totalMonitoredPopulation: impactedServersGlobal.size,
    totalWorkforceBaseline: new Set(dataset.vinculos.map(v => v.servidor_id)).size || dataset.vinculos.length,
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

export async function fetchAllPages<T>(
  queryFn: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>,
  sourceName: string
): Promise<T[]> {
  const results: T[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryFn(from, to);
    if (error) {
      throw new ErgonomicApplicationError(`Falha ao carregar ${sourceName}: ${error.message} (Code: ${error.code})`);
    }
    const rows = data ?? [];
    results.push(...rows);
    if (rows.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      from += PAGE_SIZE;
    }
  }
  return results;
}

export function createSupabaseErgonomicRepository(
  client: SupabaseClient,
): ErgonomicRepository {
  return {
    async loadDataset(): Promise<ErgonomicDataset> {      const [factors, assessments, exposures, actionPlans, events, cids, vinculos, tempos] = await Promise.all([
        fetchAllPages<ErgonomicFactorRow>(
          (from, to) => 
            client
              .schema("abs_intel")
              .from("abs_dim_ergonomic_factor")
              .select("ergonomic_factor_id, codigo, nome, descricao, categoria, fonte_normativa, is_active")
              .order("ergonomic_factor_id")
              .range(from, to),
          "catalogo de fatores ergonomicos"
        ),
        fetchAllPages<ErgonomicAssessmentRow>(
          (from, to) =>
            client
              .schema("abs_intel")
              .from("abs_fact_ergonomic_assessment")
              .select("ergonomic_assessment_id, servidor_id, vinculo_id, tempo_id, ergonomic_factor_id, metodo_avaliacao, score, nivel_risco, avaliador, observacoes")
              .order("ergonomic_assessment_id")
              .range(from, to),
          "avaliacoes ergonomicas"
        ),
        fetchAllPages<ErgonomicExposureRow>(
          (from, to) =>
            client
              .schema("abs_intel")
              .from("abs_fact_ergonomic_exposure")
              .select("ergonomic_exposure_id, servidor_id, vinculo_id, ergonomic_factor_id, local_trabalho, frequencia_exposicao, intensidade_exposicao, inicio_exposicao, fim_exposicao, observacoes")
              .order("ergonomic_exposure_id")
              .range(from, to),
          "exposicoes ergonomicas"
        ),
        fetchAllPages<ErgonomicActionPlanRow>(
          (from, to) =>
            client
              .schema("abs_intel")
              .from("abs_fact_ergonomic_action_plan")
              .select("ergonomic_action_plan_id, ergonomic_assessment_id, servidor_id, vinculo_id, prioridade, acao_recomendada, responsavel, data_prevista, data_execucao, status_acao, observacoes")
              .order("ergonomic_action_plan_id")
              .range(from, to),
          "plano de acao ergonomico"
        ),
        fetchAllPages<ErgonomicEventRow>(
          (from, to) =>
            client
              .schema("abs_intel")
              .from("abs_fact_afastamento_evento")
              .select("afastamento_id, servidor_id, vinculo_id, data_inicio, dias_afastado")
              .order("afastamento_id")
              .range(from, to),
          "eventos epidemiologicos"
        ),
        fetchAllPages<ErgonomicCidRow>(
          (from, to) =>
            client
              .schema("abs_intel")
              .from("abs_fact_afastamento_cid")
              .select("afastamento_id, cid_codigo, cid_capitulo, occurrence_weight, allocated_days")
              .order("afastamento_id")
              .range(from, to),
          "cids de afastamento"
        ),
        fetchAllPages<ErgonomicVinculoRow>(
          (from, to) =>
            client
              .schema("abs_intel")
              .from("abs_dim_vinculo_servidor")
              .select("vinculo_id, servidor_id, unidade_orcamentaria, local_trabalho, secretaria, cargo, natureza_cargo, subdivisao")
              .order("vinculo_id")
              .range(from, to),
          "contexto ocupacional"
        ),
        fetchAllPages<ErgonomicTempoRow>(
          (from, to) =>
            client
              .schema("abs_intel")
              .from("abs_dim_tempo")
              .select("tempo_id, data_calendario, competencia_yyyymm")
              .order("tempo_id")
              .range(from, to),
          "dimensao tempo"
        )
      ]);


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
