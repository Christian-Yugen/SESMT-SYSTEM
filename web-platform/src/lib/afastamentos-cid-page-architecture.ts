export type CidAnalyticsRoute = "/afastamentos/cid-analytics";

export type CidAnalyticsPageMode = "tabbed" | "single-page" | "hybrid";

export type CidAnalyticsLayer =
  | "event-facts"
  | "cid-occurrence-facts"
  | "derived-metrics"
  | "mixed";

export interface CidAnalyticsGlobalFilterSpec {
  key:
    | "period"
    | "secretaria"
    | "cargo"
    | "natureza"
    | "cidChapter"
    | "cidCode"
    | "status"
    | "durationBand"
    | "recurrence"
    | "isAcidenteTrabalho";
  label: string;
  requiredInV1: boolean;
  notes?: string;
}

export interface CidAnalyticsBlockSpec {
  id:
    | "header-analitico"
    | "cards-executivos"
    | "panorama-epidemiologico"
    | "tendencia-temporal"
    | "visao-ocupacional"
    | "casos-recorrencia";
  title: string;
  objective: string;
  primaryUsers: string[];
  layer: CidAnalyticsLayer;
  metrics: string[];
  dimensions: string[];
  visualTypes: Array<
    | "cards"
    | "ranking-table"
    | "bar-chart"
    | "line-area-series"
    | "matrix-heatmap"
    | "detailed-table"
    | "investigative-list"
  >;
}

export interface CidAnalyticsTabSpec {
  id:
    | "visao-geral"
    | "cid-capitulos"
    | "visao-ocupacional"
    | "casos-recorrencia";
  title: string;
  objective: string;
  blockIds: CidAnalyticsBlockSpec["id"][];
}

export interface CidAnalyticsPageArchitecture {
  moduleName: string;
  route: CidAnalyticsRoute;
  architectureMode: CidAnalyticsPageMode;
  rationale: string;
  readingOrder: CidAnalyticsBlockSpec["id"][];
  tabs: CidAnalyticsTabSpec[];
  blocks: CidAnalyticsBlockSpec[];
  globalFilters: CidAnalyticsGlobalFilterSpec[];
  reusedComponents: string[];
  newComponents: string[];
  implementationOrder: string[];
  operationalAnalyticsBoundary: {
    staysInAfastamentosAnalytics: string[];
    exclusiveToCidAnalytics: string[];
  };
}

export const CID_ANALYTICS_PAGE_ARCHITECTURE: CidAnalyticsPageArchitecture = {
  moduleName: "Gestao Analitica de Afastamentos por CID",
  route: "/afastamentos/cid-analytics",
  architectureMode: "tabbed",
  rationale:
    "Arquitetura em abas reduz densidade, preserva leitura macro-intermediaria-detalhada e evita scroll excessivo com alta carga analitica.",
  readingOrder: [
    "header-analitico",
    "cards-executivos",
    "panorama-epidemiologico",
    "tendencia-temporal",
    "visao-ocupacional",
    "casos-recorrencia",
  ],
  tabs: [
    {
      id: "visao-geral",
      title: "Visao Geral",
      objective:
        "Leitura executiva de magnitude, impacto e tendencia consolidada.",
      blockIds: ["cards-executivos", "tendencia-temporal"],
    },
    {
      id: "cid-capitulos",
      title: "CID e Capitulos",
      objective:
        "Nucleo epidemiologico com concentracao, impacto e distribuicao clinica.",
      blockIds: ["panorama-epidemiologico", "tendencia-temporal"],
    },
    {
      id: "visao-ocupacional",
      title: "Visao Ocupacional",
      objective:
        "Cruzar agravos com secretaria, cargo e natureza para acao preventiva.",
      blockIds: ["visao-ocupacional"],
    },
    {
      id: "casos-recorrencia",
      title: "Casos e Recorrencia",
      objective:
        "Leitura investigativa por episodio e persistencia de afastamentos.",
      blockIds: ["casos-recorrencia"],
    },
  ],
  blocks: [
    {
      id: "header-analitico",
      title: "Header analitico",
      objective: "Contextualizar a analise e controlar filtros globais.",
      primaryUsers: ["Gestao", "SESMT tecnico", "Medicina", "Enfermagem"],
      layer: "mixed",
      metrics: [],
      dimensions: [
        "periodo",
        "secretaria",
        "cargo",
        "natureza",
        "capitulo CID",
        "CID",
        "status",
        "faixa de duracao",
        "recorrencia",
      ],
      visualTypes: ["cards"],
    },
    {
      id: "cards-executivos",
      title: "Cards executivos",
      objective:
        "Mostrar os principais indicadores de magnitude e persistencia.",
      primaryUsers: ["Gestao executiva", "Coordenacao SESMT"],
      layer: "derived-metrics",
      metrics: [
        "totalAfastamentos",
        "totalServidoresAfastados",
        "totalDiasPerdidos",
        "duracaoMedia",
        "duracaoMediana",
        "percentualRecorrenciaPrimaryWindow",
      ],
      dimensions: ["periodo", "status"],
      visualTypes: ["cards"],
    },
    {
      id: "panorama-epidemiologico",
      title: "Panorama epidemiologico",
      objective: "Priorizar capitulos e CIDs por concentracao e impacto.",
      primaryUsers: ["SESMT tecnico", "Medicina", "Seguranca"],
      layer: "cid-occurrence-facts",
      metrics: [
        "concentracaoPorCapitulo",
        "concentracaoPorCid",
        "totalDiasPerdidos (por CID)",
      ],
      dimensions: ["cidChapter", "cidCode", "cidDesc", "tipoAfastamento"],
      visualTypes: ["ranking-table", "bar-chart"],
    },
    {
      id: "tendencia-temporal",
      title: "Tendencia temporal",
      objective:
        "Exibir evolucao de volume, impacto e recorrencia ao longo da competencia.",
      primaryUsers: ["Gestao", "SESMT tecnico", "Analise de dados"],
      layer: "derived-metrics",
      metrics: [
        "trend.totalAfastamentos",
        "trend.totalDiasPerdidos",
        "trend.recorrentesPrimaryWindow",
      ],
      dimensions: ["competency", "year", "month", "quarter"],
      visualTypes: ["line-area-series"],
    },
    {
      id: "visao-ocupacional",
      title: "Visao ocupacional",
      objective:
        "Relacionar carga de afastamento com estrutura administrativa e ocupacional.",
      primaryUsers: ["Gestao", "SESMT tecnico", "Seguranca"],
      layer: "mixed",
      metrics: [
        "concentracaoPorSecretaria",
        "concentracaoPorCargo",
        "rankingImpactoDiasPorSecretaria",
      ],
      dimensions: ["secretaria", "cargo", "naturezaCargo", "contrato"],
      visualTypes: ["bar-chart", "matrix-heatmap", "ranking-table"],
    },
    {
      id: "casos-recorrencia",
      title: "Casos e recorrencia",
      objective:
        "Investigar episodios por servidor, persistencia e acumulado de dias.",
      primaryUsers: ["Medicina", "Enfermagem", "SESMT tecnico"],
      layer: "event-facts",
      metrics: [
        "episodeNumber",
        "daysSincePreviousEpisode",
        "cumulativeDaysByServidor",
        "isRecurrentPrimary",
      ],
      dimensions: [
        "servidorCpf",
        "matricula",
        "cidChapter",
        "cidCode",
        "competency",
      ],
      visualTypes: ["detailed-table", "investigative-list"],
    },
  ],
  globalFilters: [
    {
      key: "period",
      label: "Periodo",
      requiredInV1: true,
      notes: "Filtro principal de contexto temporal.",
    },
    {
      key: "secretaria",
      label: "Secretaria",
      requiredInV1: true,
    },
    {
      key: "cargo",
      label: "Cargo",
      requiredInV1: true,
    },
    {
      key: "natureza",
      label: "Natureza do cargo",
      requiredInV1: true,
    },
    {
      key: "cidChapter",
      label: "Capitulo CID",
      requiredInV1: true,
    },
    {
      key: "cidCode",
      label: "CID",
      requiredInV1: true,
      notes: "Autocomplete e busca por codigo/descricao.",
    },
    {
      key: "status",
      label: "Status",
      requiredInV1: true,
    },
    {
      key: "durationBand",
      label: "Faixa de duracao",
      requiredInV1: true,
    },
    {
      key: "recurrence",
      label: "Recorrencia",
      requiredInV1: true,
    },
    {
      key: "isAcidenteTrabalho",
      label: "Acidente de trabalho",
      requiredInV1: false,
      notes:
        "Mantido como filtro de evolucao posterior para controle de densidade no header.",
    },
  ],
  reusedComponents: [
    "src/components/layout/Sidebar.tsx",
    "src/components/filters/CompactFilterBar.tsx",
    "src/components/filters/ActionIconButton.tsx",
    "src/components/filters/FilterChips.tsx",
    "src/components/filters/SortAlphaToggle.tsx",
    "src/components/statistics/StatisticCard.tsx",
    "src/components/statistics/StatisticCardRow.tsx",
  ],
  newComponents: [
    "CidChapterRankingPanel",
    "CidCodeRankingPanel",
    "CidTemporalTrendPanel",
    "CidOccupationalMatrixPanel",
    "CidRecurrenceInvestigativeTable",
    "CidAnalyticsTabs",
  ],
  implementationOrder: [
    "Fase 4: Header analitico + filtros globais + cards executivos",
    "Fase 5: Panorama epidemiologico por capitulo/CID",
    "Fase 6: Visao ocupacional e cruzamentos",
    "Fase 7: Casos e recorrencia (drill-down)",
    "Fase 8: Alertas, rankings e inteligencia gerencial",
    "Fase 9: Responsividade e consolidacao final",
  ],
  operationalAnalyticsBoundary: {
    staysInAfastamentosAnalytics: [
      "Visao operacional geral de status e volume administrativo",
      "Acompanhamento operacional de rotina da tela de afastamentos",
      "Indicadores genericos de execucao",
    ],
    exclusiveToCidAnalytics: [
      "Nucleo epidemiologico por capitulo CID e CID",
      "Modelo dual-layer evento + ocorrencia CID",
      "Analise de recorrencia por janela (90/180/365)",
      "Leitura investigativa orientada a persistencia e prevencao",
    ],
  },
};
