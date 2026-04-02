import {
  buildEpidemiologyEngine,
  type EpidemiologyCutItem,
  type EpidemiologyDataset,
  type EpidemiologyEngineOutput,
  type EpidemiologyPeriod,
  validateEpidemiologyOutput,
} from "@/lib/afastamentos-epidemiologia";

export type EpidemiologyCutDimension =
  | "sexo"
  | "faixa_etaria"
  | "faixa_tempo_servico"
  | "secretaria"
  | "cargo"
  | "local_trabalho"
  | "cid_capitulo";

// ---------------------------------------------------------------------------
// Tipos de tendência temporal
// ---------------------------------------------------------------------------

export interface EpidemiologyTrendPoint {
  month: string;
  label: string;
  startDate: string;
  endDate: string;
  diasPeriodo: number;
  totalLicencas: number;
  totalDiasPerdidos: number;
  populacaoMedia: number;
  dml: number;
  tad: number | null;
  ifl: number | null;
  ig: number | null;
  isValid: boolean;
}

export interface EpidemiologyTrend {
  hasSufficientData: boolean;
  minimumPointsRequired: number;
  points: EpidemiologyTrendPoint[];
}

export interface EpidemiologyRoundingPolicy {
  ratesScale: number;
  dmlScale: number;
  totalsScale: number;
  populationScale: number;
}

export interface EpidemiologyConsumptionPolicy {
  minPopulationForStableCut: number;
  rounding: EpidemiologyRoundingPolicy;
}

export interface EpidemiologyContractPeriod {
  startDate: string;
  endDate: string;
  diasPeriodo: number;
  competenciaInicio: number;
  competenciaFim: number;
}

export interface EpidemiologyContractAuditMetadata {
  competenciaPeriodo: EpidemiologyContractPeriod;
  numeradores: {
    totalLicencas: number;
    totalDiasPerdidos: number;
  };
  denominadores: {
    populacaoMedia: number;
    diasPeriodo: number;
  };
  validade: {
    hasDenominator: boolean;
    hasMinimumPopulation: boolean;
    isValid: boolean;
    flags: string[];
  };
  observacoes: string[];
}

export interface EpidemiologyContractMetrics {
  totalLicencas: number;
  totalDiasPerdidos: number;
  populacaoMedia: number;
  diasPeriodo: number;
  tad: number | null;
  ifl: number | null;
  dml: number;
  ig: number | null;
}

export interface EpidemiologyContractBlock {
  dimension: "overall" | EpidemiologyCutDimension;
  key: string;
  metrics: EpidemiologyContractMetrics;
  audit: EpidemiologyContractAuditMetadata;
}

export interface EpidemiologyConsumptionContract {
  contractVersion: string;
  generatedAt: string;
  period: EpidemiologyContractPeriod;
  policy: EpidemiologyConsumptionPolicy;
  overall: EpidemiologyContractBlock;
  cuts: {
    sexo: EpidemiologyContractBlock[];
    faixaEtaria: EpidemiologyContractBlock[];
    faixaTempoServico: EpidemiologyContractBlock[];
    secretaria: EpidemiologyContractBlock[];
    cargo: EpidemiologyContractBlock[];
    localTrabalho: EpidemiologyContractBlock[];
    cidCapitulo: EpidemiologyContractBlock[];
  };
  validation: {
    reconciliacao: ReturnType<
      typeof validateEpidemiologyOutput
    >["reconciliacao"];
    consistency: EpidemiologyConsumptionContractValidation;
  };
  trend: EpidemiologyTrend;
}

export interface EpidemiologyConsumptionContractValidation {
  isStructureStable: boolean;
  isOverallConsistent: boolean;
  isRoundingConsistent: boolean;
  isNoDenominatorBehaviorConsistent: boolean;
  hasBlockingIssues: boolean;
  issues: string[];
}

export interface EpidemiologyConsumptionContractOptions {
  minPopulationForStableCut?: number;
  generatedAt?: string;
}

const DEFAULT_POLICY: EpidemiologyConsumptionPolicy = {
  minPopulationForStableCut: 30,
  rounding: {
    ratesScale: 6,
    dmlScale: 6,
    totalsScale: 4,
    populationScale: 4,
  },
};

const TOLERANCE = 0.000001;

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function toCompetencia(dateText: string): number {
  return Number(dateText.slice(0, 4)) * 100 + Number(dateText.slice(5, 7));
}

function buildPeriod(
  period: EpidemiologyPeriod,
  diasPeriodo: number,
): EpidemiologyContractPeriod {
  return {
    startDate: period.startDate,
    endDate: period.endDate,
    diasPeriodo,
    competenciaInicio: toCompetencia(period.startDate),
    competenciaFim: toCompetencia(period.endDate),
  };
}

function metricValueOrNull(
  hasDenominator: boolean,
  value: number,
  scale: number,
): number | null {
  if (!hasDenominator) return null;
  return round(value, scale);
}

function countDecimals(value: number): number {
  const text = value.toString();
  const parts = text.split(".");
  return parts.length > 1 ? parts[1].length : 0;
}

function buildFlags(
  hasDenominator: boolean,
  hasMinimumPopulation: boolean,
): string[] {
  const flags: string[] = [];
  if (!hasDenominator) flags.push("denominador_ausente");
  if (hasDenominator && !hasMinimumPopulation)
    flags.push("populacao_insuficiente");
  if (hasDenominator && hasMinimumPopulation) flags.push("valido_para_leitura");
  return flags;
}

function buildObservacoes(
  dimension: EpidemiologyContractBlock["dimension"],
  hasDenominator: boolean,
  hasMinimumPopulation: boolean,
): string[] {
  const notes: string[] = [];
  if (!hasDenominator) {
    notes.push(
      "Sem denominador valido: TAD, IFL e IG sao retornados como null para evitar interpretacao indevida.",
    );
  }
  if (hasDenominator && !hasMinimumPopulation) {
    notes.push(
      "Populacao media abaixo do minimo configurado: usar com cautela para comparacoes entre recortes.",
    );
  }
  if (dimension === "cid_capitulo") {
    notes.push(
      "Recorte por capitulo CID usa ocorrencia ponderada e dias alocados, podendo gerar residuo minimo de arredondamento.",
    );
  }
  return notes;
}

function mapBlock(
  dimension: EpidemiologyContractBlock["dimension"],
  key: string,
  source: EpidemiologyCutItem,
  policy: EpidemiologyConsumptionPolicy,
  competenciaPeriodo: EpidemiologyContractPeriod,
): EpidemiologyContractBlock {
  const hasDenominator = source.populacaoMedia > 0;
  const hasMinimumPopulation =
    source.populacaoMedia >= policy.minPopulationForStableCut;
  const flags = buildFlags(hasDenominator, hasMinimumPopulation);

  return {
    dimension,
    key,
    metrics: {
      totalLicencas: round(source.totalLicencas, policy.rounding.totalsScale),
      totalDiasPerdidos: round(
        source.totalDiasPerdidos,
        policy.rounding.totalsScale,
      ),
      populacaoMedia: round(
        source.populacaoMedia,
        policy.rounding.populationScale,
      ),
      diasPeriodo: source.diasPeriodo,
      tad: metricValueOrNull(
        hasDenominator,
        source.tad,
        policy.rounding.ratesScale,
      ),
      ifl: metricValueOrNull(
        hasDenominator,
        source.ifl,
        policy.rounding.ratesScale,
      ),
      dml: round(source.dml, policy.rounding.dmlScale),
      ig: metricValueOrNull(
        hasDenominator,
        source.ig,
        policy.rounding.ratesScale,
      ),
    },
    audit: {
      competenciaPeriodo,
      numeradores: {
        totalLicencas: round(source.totalLicencas, policy.rounding.totalsScale),
        totalDiasPerdidos: round(
          source.totalDiasPerdidos,
          policy.rounding.totalsScale,
        ),
      },
      denominadores: {
        populacaoMedia: round(
          source.populacaoMedia,
          policy.rounding.populationScale,
        ),
        diasPeriodo: source.diasPeriodo,
      },
      validade: {
        hasDenominator,
        hasMinimumPopulation,
        isValid: hasDenominator,
        flags,
      },
      observacoes: buildObservacoes(
        dimension,
        hasDenominator,
        hasMinimumPopulation,
      ),
    },
  };
}

function buildCutBlocks(
  dimension: EpidemiologyCutDimension,
  items: EpidemiologyCutItem[],
  policy: EpidemiologyConsumptionPolicy,
  competenciaPeriodo: EpidemiologyContractPeriod,
): EpidemiologyContractBlock[] {
  return items.map((item) =>
    mapBlock(dimension, item.key, item, policy, competenciaPeriodo),
  );
}

function validateRounding(
  contract: EpidemiologyConsumptionContract,
  policy: EpidemiologyConsumptionPolicy,
): string[] {
  const issues: string[] = [];
  const blocks: EpidemiologyContractBlock[] = [
    contract.overall,
    ...contract.cuts.sexo,
    ...contract.cuts.faixaEtaria,
    ...contract.cuts.faixaTempoServico,
    ...contract.cuts.secretaria,
    ...contract.cuts.cargo,
    ...contract.cuts.localTrabalho,
    ...contract.cuts.cidCapitulo,
  ];

  blocks.forEach((block) => {
    if (
      countDecimals(block.metrics.totalDiasPerdidos) >
      policy.rounding.totalsScale
    ) {
      issues.push(
        `Arredondamento invalido em totalDiasPerdidos para ${block.dimension}:${block.key}.`,
      );
    }

    if (
      countDecimals(block.metrics.populacaoMedia) >
      policy.rounding.populationScale
    ) {
      issues.push(
        `Arredondamento invalido em populacaoMedia para ${block.dimension}:${block.key}.`,
      );
    }

    if (countDecimals(block.metrics.dml) > policy.rounding.dmlScale) {
      issues.push(
        `Arredondamento invalido em DML para ${block.dimension}:${block.key}.`,
      );
    }

    const rateFields: Array<"tad" | "ifl" | "ig"> = ["tad", "ifl", "ig"];
    rateFields.forEach((field) => {
      const value = block.metrics[field];
      if (value !== null && countDecimals(value) > policy.rounding.ratesScale) {
        issues.push(
          `Arredondamento invalido em ${field.toUpperCase()} para ${block.dimension}:${block.key}.`,
        );
      }
    });
  });

  return issues;
}

function validateNoDenominatorBehavior(
  contract: EpidemiologyConsumptionContract,
): string[] {
  const issues: string[] = [];
  const blocks: EpidemiologyContractBlock[] = [
    contract.overall,
    ...contract.cuts.sexo,
    ...contract.cuts.faixaEtaria,
    ...contract.cuts.faixaTempoServico,
    ...contract.cuts.secretaria,
    ...contract.cuts.cargo,
    ...contract.cuts.localTrabalho,
    ...contract.cuts.cidCapitulo,
  ];

  blocks.forEach((block) => {
    if (!block.audit.validade.hasDenominator) {
      const hasMissingNull =
        block.metrics.tad !== null ||
        block.metrics.ifl !== null ||
        block.metrics.ig !== null;

      if (hasMissingNull) {
        issues.push(
          `Comportamento invalido sem denominador em ${block.dimension}:${block.key}.`,
        );
      }

      if (!block.audit.validade.flags.includes("denominador_ausente")) {
        issues.push(
          `Flag denominador_ausente nao registrada em ${block.dimension}:${block.key}.`,
        );
      }
    }
  });

  return issues;
}

export function validateEpidemiologyConsumptionContract(
  contract: EpidemiologyConsumptionContract,
): EpidemiologyConsumptionContractValidation {
  const issues: string[] = [];

  const isStructureStable =
    contract.contractVersion.length > 0 &&
    Boolean(contract.overall?.metrics) &&
    Array.isArray(contract.cuts.sexo) &&
    Array.isArray(contract.cuts.faixaEtaria) &&
    Array.isArray(contract.cuts.faixaTempoServico) &&
    Array.isArray(contract.cuts.secretaria) &&
    Array.isArray(contract.cuts.cargo) &&
    Array.isArray(contract.cuts.localTrabalho) &&
    Array.isArray(contract.cuts.cidCapitulo);

  if (!isStructureStable) {
    issues.push("Estrutura base do contrato invalida ou incompleta.");
  }

  const recon = contract.validation.reconciliacao;
  const noDiffIssues = [
    recon.sexoLicencasDiff,
    recon.sexoDiasDiff,
    recon.faixaEtariaLicencasDiff,
    recon.faixaEtariaDiasDiff,
    recon.faixaTempoLicencasDiff,
    recon.faixaTempoDiasDiff,
    recon.secretariaLicencasDiff,
    recon.secretariaDiasDiff,
    recon.cargoLicencasDiff,
    recon.cargoDiasDiff,
    recon.localLicencasDiff,
    recon.localDiasDiff,
  ].every((value) => Math.abs(value) <= TOLERANCE);

  const cidDiffWithinTolerance =
    Math.abs(recon.cidCapituloLicencasDiff) <= 0.001 &&
    Math.abs(recon.cidCapituloDiasDiff) <= 0.001;

  const isOverallConsistent = noDiffIssues && cidDiffWithinTolerance;
  if (!isOverallConsistent) {
    issues.push("Reconciliacao global x recortes fora da tolerancia esperada.");
  }

  const roundingIssues = validateRounding(contract, contract.policy);
  issues.push(...roundingIssues);
  const isRoundingConsistent = roundingIssues.length === 0;

  const noDenominatorIssues = validateNoDenominatorBehavior(contract);
  issues.push(...noDenominatorIssues);
  const isNoDenominatorBehaviorConsistent = noDenominatorIssues.length === 0;

  return {
    isStructureStable,
    isOverallConsistent,
    isRoundingConsistent,
    isNoDenominatorBehaviorConsistent,
    hasBlockingIssues: issues.length > 0,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Builders de tendência temporal
// ---------------------------------------------------------------------------

const MINIMUM_TREND_POINTS = 2;

const MONTH_LABELS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

function generateMonthlyWindows(
  startDate: string,
  endDate: string,
): Array<{ startDate: string; endDate: string; month: string; label: string }> {
  const windows: Array<{
    startDate: string;
    endDate: string;
    month: string;
    label: string;
  }> = [];
  const startD = new Date(`${startDate}T00:00:00Z`);
  const endD = new Date(`${endDate}T00:00:00Z`);

  let year = startD.getUTCFullYear();
  let month = startD.getUTCMonth();

  while (true) {
    const windowStart = new Date(Date.UTC(year, month, 1));
    if (windowStart > endD) break;

    const windowEnd = new Date(Date.UTC(year, month + 1, 0));
    const actualEnd = windowEnd < endD ? windowEnd : endD;

    const mm = String(month + 1).padStart(2, "0");
    const shortYear = String(year).slice(2);
    windows.push({
      startDate: windowStart.toISOString().slice(0, 10),
      endDate: actualEnd.toISOString().slice(0, 10),
      month: `${year}-${mm}`,
      label: `${MONTH_LABELS_PT[month]}/${shortYear}`,
    });

    month++;
    if (month === 12) {
      month = 0;
      year++;
    }
  }

  return windows;
}

function buildTrendPoint(
  window: { startDate: string; endDate: string; month: string; label: string },
  dataset: EpidemiologyDataset,
  policy: EpidemiologyConsumptionPolicy,
): EpidemiologyTrendPoint {
  const output = buildEpidemiologyEngine(dataset, {
    startDate: window.startDate,
    endDate: window.endDate,
  });
  const overall = output.overall;
  const hasDenominator = overall.populacaoMedia > 0;
  const { ratesScale, dmlScale } = policy.rounding;

  return {
    month: window.month,
    label: window.label,
    startDate: window.startDate,
    endDate: window.endDate,
    diasPeriodo: overall.diasPeriodo,
    totalLicencas: overall.totalLicencas,
    totalDiasPerdidos: round(overall.totalDiasPerdidos, 2),
    populacaoMedia: round(overall.populacaoMedia, 2),
    dml: round(overall.dml, dmlScale),
    tad: hasDenominator ? round(overall.tad, ratesScale) : null,
    ifl: hasDenominator ? round(overall.ifl, ratesScale) : null,
    ig: hasDenominator ? round(overall.ig, ratesScale) : null,
    isValid: hasDenominator,
  };
}

function buildTrend(
  dataset: EpidemiologyDataset,
  periodStart: string,
  periodEnd: string,
  policy: EpidemiologyConsumptionPolicy,
): EpidemiologyTrend {
  const windows = generateMonthlyWindows(periodStart, periodEnd);
  const points = windows.map((w) => buildTrendPoint(w, dataset, policy));
  return {
    hasSufficientData: points.length >= MINIMUM_TREND_POINTS,
    minimumPointsRequired: MINIMUM_TREND_POINTS,
    points,
  };
}

export function buildEpidemiologyConsumptionContract(
  dataset: EpidemiologyDataset,
  period: EpidemiologyPeriod,
  options: EpidemiologyConsumptionContractOptions = {},
): EpidemiologyConsumptionContract {
  const policy: EpidemiologyConsumptionPolicy = {
    minPopulationForStableCut:
      options.minPopulationForStableCut ??
      DEFAULT_POLICY.minPopulationForStableCut,
    rounding: DEFAULT_POLICY.rounding,
  };

  const output: EpidemiologyEngineOutput = buildEpidemiologyEngine(
    dataset,
    period,
  );
  const reconciliacao = validateEpidemiologyOutput(output).reconciliacao;
  const competenciaPeriodo = buildPeriod(period, output.overall.diasPeriodo);

  const overall = mapBlock(
    "overall",
    "GERAL",
    { key: "GERAL", ...output.overall },
    policy,
    competenciaPeriodo,
  );

  const trend = buildTrend(dataset, period.startDate, period.endDate, policy);

  const contract: EpidemiologyConsumptionContract = {
    contractVersion: "4.3.0",
    generatedAt: options.generatedAt || new Date().toISOString(),
    period: competenciaPeriodo,
    policy,
    overall,
    cuts: {
      sexo: buildCutBlocks("sexo", output.bySexo, policy, competenciaPeriodo),
      faixaEtaria: buildCutBlocks(
        "faixa_etaria",
        output.byFaixaEtaria,
        policy,
        competenciaPeriodo,
      ),
      faixaTempoServico: buildCutBlocks(
        "faixa_tempo_servico",
        output.byFaixaTempoServico,
        policy,
        competenciaPeriodo,
      ),
      secretaria: buildCutBlocks(
        "secretaria",
        output.bySecretaria,
        policy,
        competenciaPeriodo,
      ),
      cargo: buildCutBlocks(
        "cargo",
        output.byCargo,
        policy,
        competenciaPeriodo,
      ),
      localTrabalho: buildCutBlocks(
        "local_trabalho",
        output.byLocalTrabalho,
        policy,
        competenciaPeriodo,
      ),
      cidCapitulo: buildCutBlocks(
        "cid_capitulo",
        output.byCidCapitulo,
        policy,
        competenciaPeriodo,
      ),
    },
    validation: {
      reconciliacao,
      consistency: {
        isStructureStable: true,
        isOverallConsistent: true,
        isRoundingConsistent: true,
        isNoDenominatorBehaviorConsistent: true,
        hasBlockingIssues: false,
        issues: [],
      },
    },
    trend,
  };

  contract.validation.consistency =
    validateEpidemiologyConsumptionContract(contract);
  return contract;
}
