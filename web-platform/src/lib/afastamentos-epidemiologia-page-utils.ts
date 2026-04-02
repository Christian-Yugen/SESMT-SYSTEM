import type {
  EpidemiologyConsumptionContract,
  EpidemiologyContractBlock,
  EpidemiologyTrend,
} from "@/lib/afastamentos-epidemiologia-contrato";

// ---------------------------------------------------------------------------
// Tipos do modelo de página
// ---------------------------------------------------------------------------

export type EpidemiologyCardId = "tad" | "ifl" | "dml" | "ig";

export type EpidemiologyCardAccent = "primary" | "info" | "warning" | "danger";

export interface EpidemiologyCardModel {
  id: EpidemiologyCardId;
  label: string;
  value: string;
  unit: string;
  available: boolean;
  helperText: string;
  accent: EpidemiologyCardAccent;
}

export interface EpidemiologySummaryModel {
  periodLabel: string;
  startDate: string;
  endDate: string;
  diasPeriodo: number;
  totalLicencas: number;
  totalDiasPerdidos: number;
  populacaoMedia: string;
  observacoes: string[];
  isValid: boolean;
  flags: string[];
}

export interface EpidemiologyCutRow {
  key: string;
  totalLicencas: number;
  tad: string;
  ifl: string;
  dml: string;
  ig: string;
  available: boolean;
}

export interface EpidemiologyPageCuts {
  sexo: EpidemiologyCutRow[];
  faixaEtaria: EpidemiologyCutRow[];
  faixaTempoServico: EpidemiologyCutRow[];
  secretaria: EpidemiologyCutRow[];
  cargo: EpidemiologyCutRow[];
  localTrabalho: EpidemiologyCutRow[];
}

export interface EpidemiologyPageModel {
  cards: EpidemiologyCardModel[];
  summary: EpidemiologySummaryModel;
  cuts: EpidemiologyPageCuts;
  trend: EpidemiologyTrendModel;
}

export interface EpidemiologyFetchError {
  code: string;
  message: string;
}

export interface EpidemiologyTrendPointModel {
  month: string;
  label: string;
  totalLicencas: number;
  totalDiasPerdidos: string;
  dml: string;
  tad: string;
  ifl: string;
  ig: string;
  isValid: boolean;
  relLicencas: number;
  relDias: number;
}

export interface EpidemiologyTrendModel {
  hasSufficientData: boolean;
  minimumPointsRequired: number;
  points: EpidemiologyTrendPointModel[];
}

// ---------------------------------------------------------------------------
// Constantes internas
// ---------------------------------------------------------------------------

const NOT_AVAILABLE = "N/D";

// ---------------------------------------------------------------------------
// Formatadores internos
// ---------------------------------------------------------------------------

function formatMetric(value: number | null, decimals = 2): string {
  if (value === null) return NOT_AVAILABLE;
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDateBR(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ---------------------------------------------------------------------------
// Construtores internos
// ---------------------------------------------------------------------------

function buildCardModels(
  block: EpidemiologyContractBlock,
): EpidemiologyCardModel[] {
  const { tad, ifl, dml, ig } = block.metrics;
  return [
    {
      id: "tad",
      label: "Absenteísmo",
      value: formatMetric(tad, 4),
      unit: tad !== null ? "dias/func/ano" : "",
      available: tad !== null,
      helperText: "TAD — Taxa de Absenteísmo por Doença",
      accent: "primary",
    },
    {
      id: "ifl",
      label: "Freq. Licenças",
      value: formatMetric(ifl, 4),
      unit: ifl !== null ? "lic/func/ano" : "",
      available: ifl !== null,
      helperText: "IFL — Índice de Frequência de Licenças",
      accent: "info",
    },
    {
      id: "dml",
      label: "Dur. Média",
      value: formatMetric(dml, 2),
      unit: "dias/licença",
      available: true,
      helperText: "DML — Duração Média da Licença",
      accent: "warning",
    },
    {
      id: "ig",
      label: "Gravidade",
      value: formatMetric(ig, 4),
      unit: ig !== null ? "dias/func/ano" : "",
      available: ig !== null,
      helperText: "IG — Índice de Gravidade",
      accent: "danger",
    },
  ];
}

function buildSummaryModel(
  contract: EpidemiologyConsumptionContract,
): EpidemiologySummaryModel {
  const { period, overall } = contract;
  return {
    periodLabel: `${formatDateBR(period.startDate)} a ${formatDateBR(period.endDate)}`,
    startDate: period.startDate,
    endDate: period.endDate,
    diasPeriodo: period.diasPeriodo,
    totalLicencas: overall.metrics.totalLicencas,
    totalDiasPerdidos: overall.metrics.totalDiasPerdidos,
    populacaoMedia: formatMetric(overall.metrics.populacaoMedia, 0),
    observacoes: overall.audit.observacoes,
    isValid: overall.audit.validade.isValid,
    flags: overall.audit.validade.flags,
  };
}

function buildCutRow(block: EpidemiologyContractBlock): EpidemiologyCutRow {
  const { tad, ifl, dml, ig, totalLicencas } = block.metrics;
  return {
    key: block.key,
    totalLicencas,
    tad: formatMetric(tad, 4),
    ifl: formatMetric(ifl, 4),
    dml: formatMetric(dml, 2),
    ig: formatMetric(ig, 4),
    available: block.audit.validade.isValid,
  };
}

function buildTrendModel(trend: EpidemiologyTrend): EpidemiologyTrendModel {
  const maxLicencas = Math.max(...trend.points.map((p) => p.totalLicencas), 1);
  const maxDias = Math.max(...trend.points.map((p) => p.totalDiasPerdidos), 1);

  const points: EpidemiologyTrendPointModel[] = trend.points.map((p) => ({
    month: p.month,
    label: p.label,
    totalLicencas: p.totalLicencas,
    totalDiasPerdidos: formatMetric(p.totalDiasPerdidos, 0),
    dml: formatMetric(p.dml, 1),
    tad: p.tad !== null ? formatMetric(p.tad, 4) : NOT_AVAILABLE,
    ifl: p.ifl !== null ? formatMetric(p.ifl, 4) : NOT_AVAILABLE,
    ig: p.ig !== null ? formatMetric(p.ig, 4) : NOT_AVAILABLE,
    isValid: p.isValid,
    relLicencas:
      maxLicencas > 0 ? Math.round((p.totalLicencas / maxLicencas) * 100) : 0,
    relDias:
      maxDias > 0 ? Math.round((p.totalDiasPerdidos / maxDias) * 100) : 0,
  }));

  return {
    hasSufficientData: trend.hasSufficientData,
    minimumPointsRequired: trend.minimumPointsRequired,
    points,
  };
}

// ---------------------------------------------------------------------------
// Ordenadores de recorte
// ---------------------------------------------------------------------------

const NAO_INFORMADO_KEY = "NAO_INFORMADO";

/**
 * Ordena blocos por uma lista de chaves fixas (ordem natural/semântica).
 * Chaves desconhecidas ficam no final, antes de NAO_INFORMADO.
 */
function sortByFixedOrder(
  order: string[],
): (a: EpidemiologyContractBlock, b: EpidemiologyContractBlock) => number {
  return (a, b) => {
    const rank = (key: string) => {
      if (key === NAO_INFORMADO_KEY) return order.length + 1;
      const i = order.indexOf(key);
      return i === -1 ? order.length : i;
    };
    return rank(a.key) - rank(b.key);
  };
}

/**
 * Ordena blocos por totalLicencas decrescente.
 * NAO_INFORMADO é sempre posicionado no final.
 */
function sortByLicencasDesc(
  a: EpidemiologyContractBlock,
  b: EpidemiologyContractBlock,
): number {
  if (a.key === NAO_INFORMADO_KEY) return 1;
  if (b.key === NAO_INFORMADO_KEY) return -1;
  return b.metrics.totalLicencas - a.metrics.totalLicencas;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Transforma um EpidemiologyConsumptionContract no modelo de apresentação.
 * Não lança exceções — retorna modelo completo ou parcial dependendo do contrato.
 */
export function buildEpidemiologyPageModel(
  contract: EpidemiologyConsumptionContract,
): EpidemiologyPageModel {
  return {
    cards: buildCardModels(contract.overall),
    summary: buildSummaryModel(contract),
    cuts: {
      sexo: [...contract.cuts.sexo]
        .sort(sortByFixedOrder(["F", "M"]))
        .map(buildCutRow),
      faixaEtaria: [...contract.cuts.faixaEtaria]
        .sort(
          sortByFixedOrder(["ATE_29", "30_39", "40_49", "50_59", "60_OU_MAIS"]),
        )
        .map(buildCutRow),
      faixaTempoServico: [...contract.cuts.faixaTempoServico]
        .sort(
          sortByFixedOrder([
            "ATE_1_ANO",
            "1_5_ANOS",
            "6_10_ANOS",
            "11_OU_MAIS",
          ]),
        )
        .map(buildCutRow),
      secretaria: [...contract.cuts.secretaria]
        .sort(sortByLicencasDesc)
        .map(buildCutRow),
      cargo: [...contract.cuts.cargo].sort(sortByLicencasDesc).map(buildCutRow),
      localTrabalho: [...contract.cuts.localTrabalho]
        .sort(sortByLicencasDesc)
        .map(buildCutRow),
    },
    trend: buildTrendModel(contract.trend),
  };
}

/**
 * Modelo de carregamento (estado inicial antes de qualquer consulta).
 * Todos os valores são placeholder seguro "—".
 */
export function buildLoadingPageModel(): EpidemiologyPageModel {
  function emptyCard(
    id: EpidemiologyCardId,
    label: string,
    helperText: string,
    accent: EpidemiologyCardAccent,
  ): EpidemiologyCardModel {
    return {
      id,
      label,
      value: "—",
      unit: "",
      available: false,
      helperText,
      accent,
    };
  }

  const emptyCuts: EpidemiologyPageCuts = {
    sexo: [],
    faixaEtaria: [],
    faixaTempoServico: [],
    secretaria: [],
    cargo: [],
    localTrabalho: [],
  };

  return {
    cards: [
      emptyCard("tad", "TAD", "Taxa de Absenteísmo por Doença", "primary"),
      emptyCard("ifl", "IFL", "Índice de Frequência de Licenças", "info"),
      emptyCard("dml", "DML", "Duração Média da Licença", "warning"),
      emptyCard("ig", "IG", "Índice de Gravidade", "danger"),
    ],
    summary: {
      periodLabel: "",
      startDate: "",
      endDate: "",
      diasPeriodo: 0,
      totalLicencas: 0,
      totalDiasPerdidos: 0,
      populacaoMedia: "0",
      observacoes: [],
      isValid: false,
      flags: [],
    },
    cuts: emptyCuts,
    trend: {
      hasSufficientData: false,
      minimumPointsRequired: 2,
      points: [],
    },
  };
}

/**
 * Constrói um objeto de erro padronizado para feedback ao usuário.
 */
export function buildFetchError(
  code: string,
  message: string,
): EpidemiologyFetchError {
  return { code, message };
}
