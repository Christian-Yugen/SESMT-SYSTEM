import {
  integrateRiskProfile,
  type PsychosocialAnalysisOutput,
  type PsychosocialAnalyticalSignal,
  type PsychosocialCriticality,
  type PsychosocialPeriod,
  type PsychosocialRepository,
} from "@/lib/afastamentos-psychosocial";

export type PsychosocialConsumptionCutDimension =
  | "secretaria"
  | "cargo"
  | "local_trabalho"
  | "grupo_analitico"
  | "cid_capitulo"
  | "cid_compativel"
  | "criticidade";

export interface PsychosocialConsumptionRoundingPolicy {
  scoreScale: number;
  shareScale: number;
  totalsScale: number;
}

export interface PsychosocialConsumptionPolicy {
  minAssessmentsForStableCriticality: number;
  minSignalsForStableCriticality: number;
  rounding: PsychosocialConsumptionRoundingPolicy;
}

export interface PsychosocialContractPeriod {
  startDate: string;
  endDate: string;
  diasPeriodo: number;
  competenciaInicio: number;
  competenciaFim: number;
}

export interface PsychosocialContractCriticalityDistribution {
  baixa: number;
  moderada: number;
  alta: number;
  critica: number;
  semCriticidadeEstavel: number;
}

export interface PsychosocialContractAuditMetadata {
  period: PsychosocialContractPeriod;
  fatoresUsados: {
    totalAtivos: number;
    codigos: string[];
    principais: string[];
  };
  numeradores: {
    totalGruposAnalisados: number;
    totalSinaisIdentificados: number;
    totalAvaliacoes: number;
    totalSinaisCompativeis: number;
    totalPesoCidCompativel: number;
    totalPesoCidF: number;
  };
  validade: {
    hasAssessments: boolean;
    hasSignals: boolean;
    hasStableContext: boolean;
    isValid: boolean;
    flags: string[];
  };
  observacoes: string[];
}

export interface PsychosocialOverviewMetrics {
  totalGroupsAnalyzed: number;
  totalSignalsIdentified: number;
  criticalityDistribution: PsychosocialContractCriticalityDistribution;
  averageScore: number | null;
  medianScore: number | null;
  topActiveFactors: string[];
}

export interface PsychosocialOverviewBlock {
  metrics: PsychosocialOverviewMetrics;
  audit: PsychosocialContractAuditMetadata;
}

export interface PsychosocialContractCutMetrics {
  groupCount: number;
  signalCount: number;
  assessmentCount: number;
  averageScore: number | null;
  medianScore: number | null;
  maxScore: number | null;
  criticality: PsychosocialCriticality | null;
  stableContext: boolean;
  topFactors: string[];
}

export interface PsychosocialContractCutBlock {
  dimension: PsychosocialConsumptionCutDimension;
  key: string;
  metrics: PsychosocialContractCutMetrics;
  audit: {
    flags: string[];
    observacoes: string[];
    justification: string;
  };
}

export interface PsychosocialConsumptionContract {
  contractVersion: string;
  generatedAt: string;
  period: PsychosocialContractPeriod;
  policy: PsychosocialConsumptionPolicy;
  overview: PsychosocialOverviewBlock;
  cuts: {
    secretaria: PsychosocialContractCutBlock[];
    cargo: PsychosocialContractCutBlock[];
    localTrabalho: PsychosocialContractCutBlock[];
    grupoAnalitico: PsychosocialContractCutBlock[];
    cidCapitulo: PsychosocialContractCutBlock[];
    cidCompativel: PsychosocialContractCutBlock[];
    criticidade: PsychosocialContractCutBlock[];
  };
  validation: {
    consistency: PsychosocialConsumptionContractValidation;
  };
}

export interface PsychosocialConsumptionContractValidation {
  isStructureStable: boolean;
  isOverviewConsistent: boolean;
  isCutsConsistent: boolean;
  isRoundingConsistent: boolean;
  isEdgeCaseBehaviorConsistent: boolean;
  isNonCausalLanguageConsistent: boolean;
  hasBlockingIssues: boolean;
  issues: string[];
}

export interface PsychosocialConsumptionContractOptions {
  generatedAt?: string;
  minAssessmentsForStableCriticality?: number;
  minSignalsForStableCriticality?: number;
}

const DEFAULT_POLICY: PsychosocialConsumptionPolicy = {
  minAssessmentsForStableCriticality: 2,
  minSignalsForStableCriticality: 1,
  rounding: {
    scoreScale: 4,
    shareScale: 4,
    totalsScale: 4,
  },
};

const CRITICALITY_ORDER: Record<PsychosocialCriticality, number> = {
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

function buildPeriod(period: PsychosocialPeriod): PsychosocialContractPeriod {
  return {
    startDate: period.startDate,
    endDate: period.endDate,
    diasPeriodo: daysInclusive(period.startDate, period.endDate),
    competenciaInicio: toCompetencia(period.startDate),
    competenciaFim: toCompetencia(period.endDate),
  };
}

function buildFlags(params: {
  hasAssessments: boolean;
  hasSignals: boolean;
  hasStableContext: boolean;
}): string[] {
  const flags: string[] = [];
  if (!params.hasAssessments) flags.push("sem_avaliacoes");
  if (!params.hasSignals) flags.push("sem_sinais");
  if (params.hasSignals && !params.hasStableContext) {
    flags.push("contexto_insuficiente_para_criticidade_estavel");
  }
  if (params.hasSignals) {
    flags.push("linguagem_nao_causal_obrigatoria");
  }
  if (params.hasAssessments || params.hasSignals) {
    flags.push("valido_para_consumo_interno");
  }
  return flags;
}

function topFactorsFromSignals(
  signals: PsychosocialAnalyticalSignal[],
): string[] {
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

function filterCompatibleSignals(
  signals: PsychosocialAnalyticalSignal[],
): PsychosocialAnalyticalSignal[] {
  return signals.filter((signal) => signal.cidCompatibleWeight > 0);
}

function isStableSignalContext(
  signal: PsychosocialAnalyticalSignal,
  policy: PsychosocialConsumptionPolicy,
): boolean {
  return (
    signal.totalAssessments >= policy.minAssessmentsForStableCriticality &&
    signal.cidCompatibleWeight >= policy.minSignalsForStableCriticality
  );
}

function maxCriticality(
  signals: PsychosocialAnalyticalSignal[],
  policy: PsychosocialConsumptionPolicy,
): PsychosocialCriticality | null {
  const stableSignals = signals.filter((signal) =>
    isStableSignalContext(signal, policy),
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
  signals: PsychosocialAnalyticalSignal[],
  policy: PsychosocialConsumptionPolicy,
): PsychosocialContractCriticalityDistribution {
  return signals.reduce(
    (distribution, signal) => {
      if (!isStableSignalContext(signal, policy)) {
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
    } satisfies PsychosocialContractCriticalityDistribution,
  );
}

function buildOverviewAudit(
  analysis: PsychosocialAnalysisOutput,
  period: PsychosocialContractPeriod,
  policy: PsychosocialConsumptionPolicy,
): PsychosocialContractAuditMetadata {
  const compatibleSignals = filterCompatibleSignals(
    analysis.signalsByAnalyticalGroup,
  );
  const hasAssessments = analysis.assessmentSummaries.length > 0;
  const hasSignals = compatibleSignals.length > 0;
  const hasStableContext = compatibleSignals.some((signal) =>
    isStableSignalContext(signal, policy),
  );
  const flags = buildFlags({
    hasAssessments,
    hasSignals,
    hasStableContext,
  });

  const observacoes = [
    "Contrato psicossocial orientado a consumo interno controlado e linguagem nao causal.",
    ...analysis.validation.issues,
  ];
  if (!hasAssessments) {
    observacoes.push(
      "Sem avaliacoes psicossociais no periodo: criticidade estavel fica indisponivel para reforco contextual.",
    );
  }
  if (!hasSignals) {
    observacoes.push(
      "Sem sinais psicossociais no periodo: blocos de recorte retornam vazios e scores ficam nulos na visao geral.",
    );
  }

  return {
    period,
    fatoresUsados: {
      totalAtivos: analysis.activeFactors.length,
      codigos: analysis.activeFactors.map((factor) => factor.code),
      principais: topFactorsFromSignals(
        hasSignals ? compatibleSignals : analysis.signalsByAnalyticalGroup,
      ),
    },
    numeradores: {
      totalGruposAnalisados: compatibleSignals.length,
      totalSinaisIdentificados: compatibleSignals.length,
      totalAvaliacoes: analysis.assessmentSummaries.length,
      totalSinaisCompativeis: compatibleSignals.length,
      totalPesoCidCompativel: round(
        compatibleSignals.reduce(
          (sum, signal) => sum + signal.cidCompatibleWeight,
          0,
        ),
        policy.rounding.totalsScale,
      ),
      totalPesoCidF: round(
        compatibleSignals.reduce((sum, signal) => sum + signal.cidFWeight, 0),
        policy.rounding.totalsScale,
      ),
    },
    validade: {
      hasAssessments,
      hasSignals,
      hasStableContext,
      isValid: hasAssessments || hasSignals,
      flags,
    },
    observacoes,
  };
}

function buildOverview(
  analysis: PsychosocialAnalysisOutput,
  period: PsychosocialContractPeriod,
  policy: PsychosocialConsumptionPolicy,
): PsychosocialOverviewBlock {
  const compatibleSignals = filterCompatibleSignals(
    analysis.signalsByAnalyticalGroup,
  );
  const scores = compatibleSignals.map((signal) => signal.score);
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
      totalGroupsAnalyzed: compatibleSignals.length,
      totalSignalsIdentified: compatibleSignals.length,
      criticalityDistribution: buildCriticalityDistribution(
        compatibleSignals,
        policy,
      ),
      averageScore,
      medianScore,
      topActiveFactors: topFactorsFromSignals(
        compatibleSignals.length > 0
          ? compatibleSignals
          : analysis.signalsByAnalyticalGroup,
      ),
    },
    audit: buildOverviewAudit(analysis, period, policy),
  };
}

function buildCutBlock(
  dimension: PsychosocialConsumptionCutDimension,
  key: string,
  signals: PsychosocialAnalyticalSignal[],
  policy: PsychosocialConsumptionPolicy,
): PsychosocialContractCutBlock {
  const scores = signals.map((signal) => signal.score);
  const stableContext = signals.some((signal) =>
    isStableSignalContext(signal, policy),
  );
  const criticality = maxCriticality(signals, policy);
  const flags = buildFlags({
    hasAssessments: signals.some((signal) => signal.totalAssessments > 0),
    hasSignals: signals.some((signal) => signal.cidCompatibleWeight > 0),
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
  const observations = [
    stableContext
      ? "Criticidade do recorte calculada apenas com sinais que possuem contexto psicossocial minimamente estavel."
      : "Recorte sem contexto suficiente para criticidade estavel; manter leitura como sinal e hipotese de investigacao.",
  ];

  return {
    dimension,
    key,
    metrics: {
      groupCount: signals.length,
      signalCount: signals.filter((signal) => signal.cidCompatibleWeight > 0)
        .length,
      assessmentCount: signals.reduce(
        (sum, signal) => sum + signal.totalAssessments,
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
      observacoes: observations,
      justification: `Recorte ${key} consolidado para ${dimension} com linguagem nao causal e base auditavel em score, fatores ativos e sinais compativeis.`,
    },
  };
}

function buildCutBlocks(
  dimension: PsychosocialConsumptionCutDimension,
  groups: Map<string, PsychosocialAnalyticalSignal[]>,
  policy: PsychosocialConsumptionPolicy,
): PsychosocialContractCutBlock[] {
  return Array.from(groups.entries())
    .map(([key, signals]) => buildCutBlock(dimension, key, signals, policy))
    .sort((left, right) => {
      const rightMax = right.metrics.maxScore ?? -1;
      const leftMax = left.metrics.maxScore ?? -1;
      return rightMax - leftMax;
    });
}

function groupSignals(
  signals: PsychosocialAnalyticalSignal[],
  keySelector: (signal: PsychosocialAnalyticalSignal) => string[],
): Map<string, PsychosocialAnalyticalSignal[]> {
  const groups = new Map<string, PsychosocialAnalyticalSignal[]>();
  signals.forEach((signal) => {
    keySelector(signal).forEach((key) => {
      const current = groups.get(key) || [];
      current.push(signal);
      groups.set(key, current);
    });
  });
  return groups;
}

export function buildPsychosocialConsumptionContract(
  analysis: PsychosocialAnalysisOutput,
  options: PsychosocialConsumptionContractOptions = {},
): PsychosocialConsumptionContract {
  const policy: PsychosocialConsumptionPolicy = {
    minAssessmentsForStableCriticality:
      options.minAssessmentsForStableCriticality ??
      DEFAULT_POLICY.minAssessmentsForStableCriticality,
    minSignalsForStableCriticality:
      options.minSignalsForStableCriticality ??
      DEFAULT_POLICY.minSignalsForStableCriticality,
    rounding: DEFAULT_POLICY.rounding,
  };

  const period = buildPeriod(analysis.period);
  const signals = filterCompatibleSignals(analysis.signalsByAnalyticalGroup);
  const contract: PsychosocialConsumptionContract = {
    contractVersion: "5.2.0",
    generatedAt: options.generatedAt || new Date().toISOString(),
    period,
    policy,
    overview: buildOverview(analysis, period, policy),
    cuts: {
      secretaria: buildCutBlocks(
        "secretaria",
        groupSignals(signals, (signal) => [signal.secretaria]),
        policy,
      ),
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
      grupoAnalitico: buildCutBlocks(
        "grupo_analitico",
        groupSignals(signals, (signal) => [signal.analyticalGroup]),
        policy,
      ),
      cidCapitulo: buildCutBlocks(
        "cid_capitulo",
        groupSignals(signals, (signal) =>
          signal.compatibleCidChapterKeys.length > 0
            ? signal.compatibleCidChapterKeys
            : ["SEM_CAPITULO_COMPATIVEL"],
        ),
        policy,
      ),
      cidCompativel: buildCutBlocks(
        "cid_compativel",
        groupSignals(signals, (signal) => [
          signal.cidCompatibleWeight > 0 ? "CID_COMPATIVEL" : "NAO_COMPATIVEL",
        ]),
        policy,
      ),
      criticidade: buildCutBlocks(
        "criticidade",
        groupSignals(signals, (signal) => [
          isStableSignalContext(signal, policy)
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
    validatePsychosocialConsumptionContract(contract);

  return contract;
}

export async function buildPsychosocialConsumptionContractFromRepository(
  repository: PsychosocialRepository,
  input: {
    period: PsychosocialPeriod;
    options?: PsychosocialConsumptionContractOptions;
  },
): Promise<PsychosocialConsumptionContract> {
  const dataset = await repository.loadDataset();
  const analysis = integrateRiskProfile(dataset, input.period);
  return buildPsychosocialConsumptionContract(analysis, input.options);
}

export function validatePsychosocialConsumptionContract(
  contract: PsychosocialConsumptionContract,
): PsychosocialConsumptionContractValidation {
  const issues: string[] = [];

  const isStructureStable =
    contract.contractVersion.length > 0 &&
    Boolean(contract.overview?.metrics) &&
    Array.isArray(contract.cuts.secretaria) &&
    Array.isArray(contract.cuts.cargo) &&
    Array.isArray(contract.cuts.localTrabalho) &&
    Array.isArray(contract.cuts.grupoAnalitico) &&
    Array.isArray(contract.cuts.cidCapitulo) &&
    Array.isArray(contract.cuts.cidCompativel) &&
    Array.isArray(contract.cuts.criticidade);
  if (!isStructureStable) {
    issues.push(
      "Estrutura base do contrato psicossocial invalida ou incompleta.",
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
      "Distribuicao por criticidade nao reconcilia com a visao geral psicossocial.",
    );
  }

  const grupoCount = contract.cuts.grupoAnalitico.reduce(
    (sum, item) => sum + item.metrics.groupCount,
    0,
  );
  const criticalitySignalCount = contract.cuts.criticidade.reduce(
    (sum, item) => sum + item.metrics.groupCount,
    0,
  );
  const isCutsConsistent =
    contract.cuts.grupoAnalitico.length ===
      contract.overview.metrics.totalGroupsAnalyzed &&
    grupoCount === contract.overview.metrics.totalGroupsAnalyzed &&
    criticalitySignalCount === contract.overview.metrics.totalGroupsAnalyzed;
  if (!isCutsConsistent) {
    issues.push(
      "Os recortes psicossociais nao reconciliam com o total de grupos analisados.",
    );
  }

  const allBlocks = [
    ...contract.cuts.secretaria,
    ...contract.cuts.cargo,
    ...contract.cuts.localTrabalho,
    ...contract.cuts.grupoAnalitico,
    ...contract.cuts.cidCapitulo,
    ...contract.cuts.cidCompativel,
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
      "Contrato psicossocial com arredondamento fora da politica definida.",
    );
  }

  const noAssessments = !contract.overview.audit.validade.hasAssessments;
  const noSignals = !contract.overview.audit.validade.hasSignals;
  const edgeCasesRespected =
    (!noAssessments ||
      contract.overview.audit.validade.flags.includes("sem_avaliacoes")) &&
    (!noSignals ||
      contract.overview.audit.validade.flags.includes("sem_sinais")) &&
    ((noSignals &&
      contract.overview.metrics.averageScore === null &&
      contract.overview.metrics.medianScore === null &&
      contract.cuts.grupoAnalitico.length === 0) ||
      !noSignals);
  if (!edgeCasesRespected) {
    issues.push(
      "Comportamento de casos-limite do contrato psicossocial nao esta consistente.",
    );
  }

  const allTexts = [
    ...contract.overview.audit.observacoes,
    ...allBlocks.map((block) => block.audit.justification),
  ].join(" ");
  const isNonCausalLanguageConsistent = !/causad|culpa|provou que/i.test(
    allTexts,
  );
  if (!isNonCausalLanguageConsistent) {
    issues.push("Contrato psicossocial contem linguagem causal proibida.");
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
