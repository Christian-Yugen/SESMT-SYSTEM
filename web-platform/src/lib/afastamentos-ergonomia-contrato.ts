import {
  integrateErgonomicRiskProfile,
  type ErgonomicAnalysisOutput,
  type ErgonomicAnalyticalSignal,
  type ErgonomicCriticality,
  type ErgonomicPeriod,
  type ErgonomicRepository,
} from "@/lib/afastamentos-ergonomia";

export type ErgonomicConsumptionCutDimension =
  | "cargo"
  | "local_trabalho"
  | "posto"
  | "tarefa"
  | "fator_ergonomico"
  | "categoria_nr17"
  | "grupo_analitico_musculoesqueletico"
  | "criticidade";

export interface ErgonomicConsumptionRoundingPolicy {
  scoreScale: number;
  shareScale: number;
  totalsScale: number;
}

export interface ErgonomicConsumptionPolicy {
  minAssessmentsForStableCriticality: number;
  minExposuresForStableCriticality: number;
  rounding: ErgonomicConsumptionRoundingPolicy;
}

export interface ErgonomicContractPeriod {
  startDate: string;
  endDate: string;
  diasPeriodo: number;
  competenciaInicio: number;
  competenciaFim: number;
}

export interface ErgonomicContractCriticalityDistribution {
  baixa: number;
  moderada: number;
  alta: number;
  critica: number;
  semCriticidadeEstavel: number;
}

export interface ErgonomicContractAuditMetadata {
  period: ErgonomicContractPeriod;
  fatoresUsados: {
    totalAtivos: number;
    codigos: string[];
    principais: string[];
  };
  numeradores: {
    totalGruposAnalisados: number;
    totalSinaisIdentificados: number;
    totalAvaliacoes: number;
    totalExposicoes: number;
    totalAcoesPlanejadas: number;
    totalAcoesAbertasRelevantes: number;
  };
  validade: {
    hasAssessments: boolean;
    hasExposures: boolean;
    hasActionPlans: boolean;
    hasStableContext: boolean;
    isValid: boolean;
    flags: string[];
  };
  observacoes: string[];
}

export interface ErgonomicOverviewMetrics {
  totalGroupsAnalyzed: number;
  totalSignalsIdentified: number;
  criticalityDistribution: ErgonomicContractCriticalityDistribution;
  averageScore: number | null;
  medianScore: number | null;
  topActiveFactors: string[];
  openActionBacklog: number;
}

export interface ErgonomicOverviewBlock {
  metrics: ErgonomicOverviewMetrics;
  audit: ErgonomicContractAuditMetadata;
}

export interface ErgonomicContractCutMetrics {
  groupCount: number;
  signalCount: number;
  assessmentCount: number;
  exposureCount: number;
  actionCount: number;
  openRelevantActions: number;
  averageScore: number | null;
  medianScore: number | null;
  maxScore: number | null;
  criticality: ErgonomicCriticality | null;
  stableContext: boolean;
  topFactors: string[];
}

export interface ErgonomicContractCutBlock {
  dimension: ErgonomicConsumptionCutDimension;
  key: string;
  metrics: ErgonomicContractCutMetrics;
  audit: {
    flags: string[];
    observacoes: string[];
    justification: string;
  };
}

export interface ErgonomicConsumptionContract {
  contractVersion: string;
  generatedAt: string;
  period: ErgonomicContractPeriod;
  policy: ErgonomicConsumptionPolicy;
  overview: ErgonomicOverviewBlock;
  cuts: {
    cargo: ErgonomicContractCutBlock[];
    localTrabalho: ErgonomicContractCutBlock[];
    posto: ErgonomicContractCutBlock[];
    tarefa: ErgonomicContractCutBlock[];
    fatorErgonomico: ErgonomicContractCutBlock[];
    categoriaNR17: ErgonomicContractCutBlock[];
    grupoAnaliticoMusculoesqueletico: ErgonomicContractCutBlock[];
    criticidade: ErgonomicContractCutBlock[];
  };
  validation: {
    consistency: ErgonomicConsumptionContractValidation;
  };
}

export interface ErgonomicConsumptionContractValidation {
  isStructureStable: boolean;
  isOverviewConsistent: boolean;
  isCutsConsistent: boolean;
  isRoundingConsistent: boolean;
  isEdgeCaseBehaviorConsistent: boolean;
  isNonCausalLanguageConsistent: boolean;
  hasBlockingIssues: boolean;
  issues: string[];
}

export interface ErgonomicConsumptionContractOptions {
  generatedAt?: string;
  minAssessmentsForStableCriticality?: number;
  minExposuresForStableCriticality?: number;
}

const DEFAULT_POLICY: ErgonomicConsumptionPolicy = {
  minAssessmentsForStableCriticality: 2,
  minExposuresForStableCriticality: 1,
  rounding: {
    scoreScale: 4,
    shareScale: 4,
    totalsScale: 4,
  },
};

const CRITICALITY_ORDER: Record<ErgonomicCriticality, number> = {
  BAIXA: 1,
  MODERADA: 2,
  ALTA: 3,
  CRITICA: 4,
};

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function countDecimals(value: number): number {
  const text = value.toString();
  const parts = text.split(".");
  return parts.length > 1 ? parts[1].length : 0;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function daysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(diff + 1, 1);
}

function toCompetencia(dateText: string): number {
  return Number(dateText.slice(0, 4)) * 100 + Number(dateText.slice(5, 7));
}

function buildPeriod(period: ErgonomicPeriod): ErgonomicContractPeriod {
  return {
    startDate: period.startDate,
    endDate: period.endDate,
    diasPeriodo: daysInclusive(period.startDate, period.endDate),
    competenciaInicio: toCompetencia(period.startDate),
    competenciaFim: toCompetencia(period.endDate),
  };
}

function isSignalContextStable(
  signal: ErgonomicAnalyticalSignal,
  policy: ErgonomicConsumptionPolicy,
): boolean {
  return (
    signal.totalAssessments >= policy.minAssessmentsForStableCriticality &&
    signal.totalExposures >= policy.minExposuresForStableCriticality
  );
}

function filterActionableSignals(
  signals: ErgonomicAnalyticalSignal[],
): ErgonomicAnalyticalSignal[] {
  return signals.filter(
    (signal) => signal.totalAssessments > 0 || signal.totalExposures > 0,
  );
}

function buildFlags(params: {
  hasAssessments: boolean;
  hasExposures: boolean;
  hasActionPlans: boolean;
  hasSignals: boolean;
  hasStableContext: boolean;
}): string[] {
  const flags: string[] = [];
  if (!params.hasAssessments) flags.push("sem_avaliacoes");
  if (!params.hasExposures) flags.push("sem_exposicoes");
  if (!params.hasActionPlans) flags.push("sem_acoes_planejadas");
  if (params.hasSignals && !params.hasStableContext) {
    flags.push("contexto_insuficiente_para_criticidade_estavel");
  }
  if (!params.hasSignals) {
    flags.push("sem_sinais_ergonomicos");
  }
  if (params.hasSignals) {
    flags.push("linguagem_nao_causal_obrigatoria");
  }
  if (params.hasAssessments || params.hasExposures || params.hasActionPlans) {
    flags.push("valido_para_consumo_interno");
  }
  return flags;
}

function topFactorsFromSignals(signals: ErgonomicAnalyticalSignal[]): string[] {
  const counts = new Map<string, number>();
  signals.forEach((signal) => {
    signal.factorNames.forEach((factorName) => {
      counts.set(factorName, (counts.get(factorName) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 5)
    .map(([factor]) => factor);
}

function maxCriticality(
  signals: ErgonomicAnalyticalSignal[],
  policy: ErgonomicConsumptionPolicy,
): ErgonomicCriticality | null {
  const stableSignals = signals.filter((signal) =>
    isSignalContextStable(signal, policy),
  );
  if (stableSignals.length === 0) {
    return null;
  }

  return stableSignals.reduce((highest, signal) => {
    if (!highest) return signal.criticality;
    return CRITICALITY_ORDER[signal.criticality] > CRITICALITY_ORDER[highest]
      ? signal.criticality
      : highest;
  }, stableSignals[0]?.criticality ?? null);
}

function buildCriticalityDistribution(
  signals: ErgonomicAnalyticalSignal[],
  policy: ErgonomicConsumptionPolicy,
): ErgonomicContractCriticalityDistribution {
  return signals.reduce(
    (distribution, signal) => {
      if (!isSignalContextStable(signal, policy)) {
        distribution.semCriticidadeEstavel += 1;
        return distribution;
      }

      switch (signal.criticality) {
        case "BAIXA":
          distribution.baixa += 1;
          break;
        case "MODERADA":
          distribution.moderada += 1;
          break;
        case "ALTA":
          distribution.alta += 1;
          break;
        case "CRITICA":
          distribution.critica += 1;
          break;
      }
      return distribution;
    },
    {
      baixa: 0,
      moderada: 0,
      alta: 0,
      critica: 0,
      semCriticidadeEstavel: 0,
    } satisfies ErgonomicContractCriticalityDistribution,
  );
}

function buildOverviewAudit(
  analysis: ErgonomicAnalysisOutput,
  period: ErgonomicContractPeriod,
  policy: ErgonomicConsumptionPolicy,
): ErgonomicContractAuditMetadata {
  const signals = filterActionableSignals(analysis.signalsByAnalyticalGroup);
  const hasAssessments = analysis.assessmentSummaries.length > 0;
  const hasExposures = analysis.exposureSummaries.length > 0;
  const hasActionPlans = analysis.actionPlanSummaries.length > 0;
  const hasSignals = signals.length > 0;
  const hasStableContext = signals.some((signal) =>
    isSignalContextStable(signal, policy),
  );
  const flags = buildFlags({
    hasAssessments,
    hasExposures,
    hasActionPlans,
    hasSignals,
    hasStableContext,
  });

  const observacoes = [
    "Contrato ergonomico NR-17 orientado a consumo interno controlado e leitura nao deterministica de risco.",
    ...analysis.validation.issues,
  ];

  if (!hasAssessments) {
    observacoes.push(
      "Sem avaliacoes ergonomicas no periodo: criticidade estavel fica parcialmente indisponivel.",
    );
  }
  if (!hasExposures) {
    observacoes.push(
      "Sem exposicoes ergonomicas no periodo: manter interpretacao de risco com cautela e contexto ocupacional.",
    );
  }
  if (!hasActionPlans) {
    observacoes.push(
      "Sem plano de acao ergonomico no periodo: backlog aberto relevante e considerado nulo.",
    );
  }

  return {
    period,
    fatoresUsados: {
      totalAtivos: analysis.activeFactors.length,
      codigos: analysis.activeFactors.map((factor) => factor.code),
      principais: topFactorsFromSignals(
        hasSignals ? signals : analysis.signalsByAnalyticalGroup,
      ),
    },
    numeradores: {
      totalGruposAnalisados: signals.length,
      totalSinaisIdentificados: signals.length,
      totalAvaliacoes: analysis.assessmentSummaries.length,
      totalExposicoes: analysis.exposureSummaries.length,
      totalAcoesPlanejadas: analysis.actionPlanSummaries.length,
      totalAcoesAbertasRelevantes: signals.reduce(
        (sum, signal) => sum + signal.openCriticalActions,
        0,
      ),
    },
    validade: {
      hasAssessments,
      hasExposures,
      hasActionPlans,
      hasStableContext,
      isValid: hasAssessments || hasExposures || hasActionPlans,
      flags,
    },
    observacoes,
  };
}

function buildOverview(
  analysis: ErgonomicAnalysisOutput,
  period: ErgonomicContractPeriod,
  policy: ErgonomicConsumptionPolicy,
): ErgonomicOverviewBlock {
  const signals = filterActionableSignals(analysis.signalsByAnalyticalGroup);
  const scores = signals.map((signal) => signal.score);
  const averageScore =
    scores.length === 0
      ? null
      : round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length,
          policy.rounding.scoreScale,
        );
  const medianScore =
    scores.length === 0
      ? null
      : round(median(scores) || 0, policy.rounding.scoreScale);

  return {
    metrics: {
      totalGroupsAnalyzed: signals.length,
      totalSignalsIdentified: signals.length,
      criticalityDistribution: buildCriticalityDistribution(signals, policy),
      averageScore,
      medianScore,
      topActiveFactors: topFactorsFromSignals(
        signals.length > 0 ? signals : analysis.signalsByAnalyticalGroup,
      ),
      openActionBacklog: signals.reduce(
        (sum, signal) => sum + signal.openCriticalActions,
        0,
      ),
    },
    audit: buildOverviewAudit(analysis, period, policy),
  };
}

function buildCutBlock(
  dimension: ErgonomicConsumptionCutDimension,
  key: string,
  signals: ErgonomicAnalyticalSignal[],
  policy: ErgonomicConsumptionPolicy,
): ErgonomicContractCutBlock {
  const scores = signals.map((signal) => signal.score);
  const stableContext = signals.some((signal) =>
    isSignalContextStable(signal, policy),
  );
  const criticality = maxCriticality(signals, policy);

  const hasAssessments = signals.some((signal) => signal.totalAssessments > 0);
  const hasExposures = signals.some((signal) => signal.totalExposures > 0);
  const hasActionPlans = signals.some((signal) => signal.totalActionPlans > 0);

  const flags = buildFlags({
    hasAssessments,
    hasExposures,
    hasActionPlans,
    hasSignals: signals.length > 0,
    hasStableContext: stableContext,
  });

  const averageScore =
    scores.length === 0
      ? null
      : round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length,
          policy.rounding.scoreScale,
        );
  const medianScore =
    scores.length === 0
      ? null
      : round(median(scores) || 0, policy.rounding.scoreScale);
  const maxScore =
    scores.length === 0
      ? null
      : round(Math.max(...scores), policy.rounding.scoreScale);

  const topFactors = topFactorsFromSignals(signals);
  const observacoes = [
    stableContext
      ? "Criticidade do recorte calculada com contexto ergonomico minimamente estavel (avaliacao e exposicao)."
      : "Recorte com contexto ergonomico insuficiente para criticidade estavel; manter leitura como risco ocupacional e monitoramento.",
  ];

  return {
    dimension,
    key,
    metrics: {
      groupCount: signals.length,
      signalCount: signals.length,
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
      openRelevantActions: signals.reduce(
        (sum, signal) => sum + signal.openCriticalActions,
        0,
      ),
      averageScore,
      medianScore,
      maxScore,
      criticality,
      stableContext,
      topFactors,
    },
    audit: {
      flags,
      observacoes,
      justification: `Recorte ${key} consolidado para ${dimension} com criticidade ergonomica explicavel e leitura nao deterministica do risco.`,
    },
  };
}

function buildCutBlocks(
  dimension: ErgonomicConsumptionCutDimension,
  groups: Map<string, ErgonomicAnalyticalSignal[]>,
  policy: ErgonomicConsumptionPolicy,
): ErgonomicContractCutBlock[] {
  return Array.from(groups.entries())
    .map(([key, signals]) => buildCutBlock(dimension, key, signals, policy))
    .sort((left, right) => {
      const rightMax = right.metrics.maxScore ?? -1;
      const leftMax = left.metrics.maxScore ?? -1;
      return rightMax - leftMax;
    });
}

function groupSignals(
  signals: ErgonomicAnalyticalSignal[],
  keySelector: (signal: ErgonomicAnalyticalSignal) => string[],
): Map<string, ErgonomicAnalyticalSignal[]> {
  const groups = new Map<string, ErgonomicAnalyticalSignal[]>();
  signals.forEach((signal) => {
    keySelector(signal).forEach((key = "NAO_INFORMADO") => {
      const current = groups.get(key) || [];
      current.push(signal);
      groups.set(key, current);
    });
  });
  return groups;
}

export function buildErgonomicConsumptionContract(
  analysis: ErgonomicAnalysisOutput,
  options: ErgonomicConsumptionContractOptions = {},
): ErgonomicConsumptionContract {
  const policy: ErgonomicConsumptionPolicy = {
    minAssessmentsForStableCriticality:
      options.minAssessmentsForStableCriticality ??
      DEFAULT_POLICY.minAssessmentsForStableCriticality,
    minExposuresForStableCriticality:
      options.minExposuresForStableCriticality ??
      DEFAULT_POLICY.minExposuresForStableCriticality,
    rounding: DEFAULT_POLICY.rounding,
  };

  const period = buildPeriod(analysis.period);
  const signals = filterActionableSignals(analysis.signalsByAnalyticalGroup);

  const contract: ErgonomicConsumptionContract = {
    contractVersion: "6.2.0",
    generatedAt: options.generatedAt || new Date().toISOString(),
    period,
    policy,
    overview: buildOverview(analysis, period, policy),
    cuts: {
      cargo: buildCutBlocks(
        "cargo",
        groupSignals(signals, (signal) => [signal.cargo]),
        policy,
      ),
      localTrabalho: buildCutBlocks(
        "local_trabalho",
        groupSignals(signals, (signal) => [signal.localTrabalho]),
        policy,
      ),
      posto: buildCutBlocks(
        "posto",
        groupSignals(signals, (signal) => [signal.posto]),
        policy,
      ),
      tarefa: buildCutBlocks(
        "tarefa",
        groupSignals(signals, (signal) => [signal.tarefa]),
        policy,
      ),
      fatorErgonomico: buildCutBlocks(
        "fator_ergonomico",
        groupSignals(signals, (signal) =>
          signal.factorNames.length > 0
            ? signal.factorNames
            : ["SEM_FATOR_ERGONOMICO"],
        ),
        policy,
      ),
      categoriaNR17: buildCutBlocks(
        "categoria_nr17",
        groupSignals(signals, (signal) =>
          signal.categoryNR17Keys.length > 0
            ? signal.categoryNR17Keys
            : ["SEM_CATEGORIA_NR17"],
        ),
        policy,
      ),
      grupoAnaliticoMusculoesqueletico: buildCutBlocks(
        "grupo_analitico_musculoesqueletico",
        groupSignals(signals, (signal) => [
          signal.musculoskeletalAnalyticalGroup,
        ]),
        policy,
      ),
      criticidade: buildCutBlocks(
        "criticidade",
        groupSignals(signals, (signal) => [
          isSignalContextStable(signal, policy)
            ? signal.criticality
            : "SEM_CRITICIDADE_ESTAVEL",
        ]),
        policy,
      ),
    },
    validation: {
      consistency: {
        isStructureStable: true,
        isOverviewConsistent: true,
        isCutsConsistent: true,
        isRoundingConsistent: true,
        isEdgeCaseBehaviorConsistent: true,
        isNonCausalLanguageConsistent: true,
        hasBlockingIssues: false,
        issues: [],
      },
    },
  };

  contract.validation.consistency =
    validateErgonomicConsumptionContract(contract);

  return contract;
}

export async function buildErgonomicConsumptionContractFromRepository(
  repository: ErgonomicRepository,
  input: {
    period: ErgonomicPeriod;
    options?: ErgonomicConsumptionContractOptions;
  },
): Promise<ErgonomicConsumptionContract> {
  const dataset = await repository.loadDataset();
  const analysis = integrateErgonomicRiskProfile(dataset, input.period);
  return buildErgonomicConsumptionContract(analysis, input.options);
}

export function validateErgonomicConsumptionContract(
  contract: ErgonomicConsumptionContract,
): ErgonomicConsumptionContractValidation {
  const issues: string[] = [];

  const isStructureStable =
    contract.contractVersion.length > 0 &&
    Boolean(contract.overview?.metrics) &&
    Array.isArray(contract.cuts.cargo) &&
    Array.isArray(contract.cuts.localTrabalho) &&
    Array.isArray(contract.cuts.posto) &&
    Array.isArray(contract.cuts.tarefa) &&
    Array.isArray(contract.cuts.fatorErgonomico) &&
    Array.isArray(contract.cuts.categoriaNR17) &&
    Array.isArray(contract.cuts.grupoAnaliticoMusculoesqueletico) &&
    Array.isArray(contract.cuts.criticidade);
  if (!isStructureStable) {
    issues.push(
      "Estrutura base do contrato ergonomico invalida ou incompleta.",
    );
  }

  const totalSignalsFromDistribution =
    contract.overview.metrics.criticalityDistribution.baixa +
    contract.overview.metrics.criticalityDistribution.moderada +
    contract.overview.metrics.criticalityDistribution.alta +
    contract.overview.metrics.criticalityDistribution.critica +
    contract.overview.metrics.criticalityDistribution.semCriticidadeEstavel;
  const totalSignalsFromOverview =
    contract.overview.metrics.totalGroupsAnalyzed;
  const isOverviewConsistent =
    totalSignalsFromDistribution === totalSignalsFromOverview;
  if (!isOverviewConsistent) {
    issues.push(
      "Distribuicao por criticidade nao reconcilia com a visao geral ergonomica.",
    );
  }

  const groupCount = contract.cuts.grupoAnaliticoMusculoesqueletico.reduce(
    (sum, item) => sum + item.metrics.groupCount,
    0,
  );
  const criticalityGroupCount = contract.cuts.criticidade.reduce(
    (sum, item) => sum + item.metrics.groupCount,
    0,
  );
  const isCutsConsistent =
    groupCount === contract.overview.metrics.totalGroupsAnalyzed &&
    criticalityGroupCount === contract.overview.metrics.totalGroupsAnalyzed;
  if (!isCutsConsistent) {
    issues.push(
      "Recortes ergonomicos nao reconciliam com o total de grupos analisados.",
    );
  }

  const allBlocks = [
    ...contract.cuts.cargo,
    ...contract.cuts.localTrabalho,
    ...contract.cuts.posto,
    ...contract.cuts.tarefa,
    ...contract.cuts.fatorErgonomico,
    ...contract.cuts.categoriaNR17,
    ...contract.cuts.grupoAnaliticoMusculoesqueletico,
    ...contract.cuts.criticidade,
  ];
  const isRoundingConsistent =
    allBlocks.every((block) => {
      const values = [
        block.metrics.averageScore,
        block.metrics.medianScore,
        block.metrics.maxScore,
      ].filter((value): value is number => value !== null);
      return values.every(
        (value) => countDecimals(value) <= contract.policy.rounding.scoreScale,
      );
    }) &&
    (contract.overview.metrics.averageScore === null ||
      countDecimals(contract.overview.metrics.averageScore) <=
        contract.policy.rounding.scoreScale) &&
    (contract.overview.metrics.medianScore === null ||
      countDecimals(contract.overview.metrics.medianScore) <=
        contract.policy.rounding.scoreScale);
  if (!isRoundingConsistent) {
    issues.push(
      "Contrato ergonomico com arredondamento fora da politica definida.",
    );
  }

  const validityFlags = contract.overview.audit.validade.flags;
  const edgeCasesRespected =
    (contract.overview.audit.validade.hasAssessments ||
      validityFlags.includes("sem_avaliacoes")) &&
    (contract.overview.audit.validade.hasExposures ||
      validityFlags.includes("sem_exposicoes")) &&
    (contract.overview.audit.validade.hasActionPlans ||
      validityFlags.includes("sem_acoes_planejadas")) &&
    ((contract.overview.audit.validade.hasStableContext &&
      !validityFlags.includes(
        "contexto_insuficiente_para_criticidade_estavel",
      )) ||
      (!contract.overview.audit.validade.hasStableContext &&
        validityFlags.includes(
          "contexto_insuficiente_para_criticidade_estavel",
        )) ||
      !contract.overview.audit.validade.hasAssessments ||
      !contract.overview.audit.validade.hasExposures);
  if (!edgeCasesRespected) {
    issues.push(
      "Comportamento de casos-limite do contrato ergonomico nao esta consistente.",
    );
  }

  const allTexts = [
    ...contract.overview.audit.observacoes,
    ...allBlocks.map((block) => block.audit.justification),
  ].join(" ");
  const sanitizedTexts = allTexts.replaceAll(
    /nao deterministica|não determinística/gi,
    "",
  );
  const isNonCausalLanguageConsistent =
    !/causad|culpa|provou que|determinou|determinist/i.test(sanitizedTexts);
  if (!isNonCausalLanguageConsistent) {
    issues.push(
      "Contrato ergonomico contem linguagem causal ou deterministica proibida.",
    );
  }

  return {
    isStructureStable,
    isOverviewConsistent,
    isCutsConsistent,
    isRoundingConsistent,
    isEdgeCaseBehaviorConsistent: edgeCasesRespected,
    isNonCausalLanguageConsistent,
    hasBlockingIssues: issues.length > 0,
    issues,
  };
}
