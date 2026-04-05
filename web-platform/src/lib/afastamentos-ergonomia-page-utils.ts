import type { 
  ErgonomicAnalysisOutput, 
  ErgonomicCriticality,
  ErgonomicAnalyticalSignal,
  ErgonomicCutItem,
  ErgonomicAssessmentSummary
} from "./afastamentos-ergonomia";

export interface ErgonomicCardModel {
  id: string;
  label: string;
  value: string;
  unit: string;
  description: string;
  trend?: "up" | "down" | "stable";
  criticality?: ErgonomicCriticality;
}

export interface ErgonomicPageModel {
  isLoading: boolean;
  error: { code: string; message: string } | null;
  data: ErgonomicAnalysisOutput | null;
  view: {
    cards: ErgonomicCardModel[];
    topCargos: ErgonomicCutItem[];
    topLocais: ErgonomicCutItem[];
    trendData: { month: string; occurrences: number; lostDays: number }[];
    recentAssessments: ErgonomicAssessmentSummary[];
  };
}

export function buildLoadingPageModel(): ErgonomicPageModel {
  return {
    isLoading: true,
    error: null,
    data: null,
    view: {
      cards: [],
      topCargos: [],
      topLocais: [],
      trendData: [],
      recentAssessments: [],
    },
  };
}

export function buildErgonomicPageModel(
  data: ErgonomicAnalysisOutput | null,
  error: { code: string; message: string } | null = null
): ErgonomicPageModel {
  if (error) {
    return {
      isLoading: false,
      error,
      data: null,
      view: {
        cards: [],
        topCargos: [],
        topLocais: [],
        trendData: [],
        recentAssessments: [],
      },
    };
  }

  if (!data) {
    // Se não há dados nem erro, consideramos carregado mas vazio para evitar loop infinito
    return {
      isLoading: false,
      error: null,
      data: null,
      view: {
        cards: [],
        topCargos: [],
        topLocais: [],
        trendData: [],
        recentAssessments: [],
      },
    };
  }

  // 1. Calcular cards executivos (Bloco A)
  const totalCidMEvents = data.signalsByAnalyticalGroup.reduce((sum, s) => sum + s.musculoskeletalEvents, 0);
  const totalLostDays = data.signalsByAnalyticalGroup.reduce((sum, s) => sum + s.lostDays, 0);
  const totalOpenActions = data.signalsByAnalyticalGroup.reduce((sum, s) => sum + s.openCriticalActions, 0);
  
  // Média de score ponderada
  const avgScore = data.signalsByAnalyticalGroup.length > 0
    ? data.signalsByAnalyticalGroup.reduce((sum, s) => sum + s.score, 0) / data.signalsByAnalyticalGroup.length
    : 0;

  const workforceBase = data.totalWorkforceBaseline || 1;
  const impactPct = (data.totalImpactedServers / workforceBase) * 100;

  const cards: ErgonomicCardModel[] = [
    {
      id: "affected-servers",
      label: "Servidores Impactados",
      value: data.totalImpactedServers.toLocaleString("pt-BR"),
      unit: "pessoas",
      description: `Impacto de ${impactPct.toFixed(2)}% do efetivo total (casos >15 dias)`,
      accent: "info"
    },
    {
      id: "ergo-events",
      label: "Afastamentos CID M",
      value: totalCidMEvents.toLocaleString("pt-BR"),
      unit: "licenças",
      description: "Licenças epidemiológicas (eventos distintos) do Cap. XIII",
    },
    {
      id: "lost-days",
      label: "Dias Perdidos",
      value: totalLostDays.toLocaleString("pt-BR"),
      unit: "dias",
      description: "Impacto temporal acumulado no recorte musculoesquelético",
    },
    {
      id: "critical-actions",
      label: "Ações Críticas",
      value: totalOpenActions.toString(),
      unit: "pendentes",
      description: "Medidas preventivas/corretivas (AET) em atraso ou abertas",
      criticality: totalOpenActions > 10 ? "CRITICA" : totalOpenActions > 5 ? "ALTA" : "MODERADA"
    },
    {
      id: "avg-ergo-score",
      label: "Score Ergonômico Médio",
      value: avgScore.toFixed(1),
      unit: "/100",
      description: "Média de criticidade nos grupos monitorados",
      criticality: avgScore >= 75 ? "CRITICA" : avgScore >= 50 ? "ALTA" : "MODERADA"
    }
  ];

  return {
    isLoading: false,
    error: null,
    data,
    view: {
      cards,
      topCargos: data.cuts.cargo.slice(0, 10),
      topLocais: data.cuts.localTrabalho.slice(0, 10),
      trendData: [], // TODO: Mapear se o motor prover série histórica
      recentAssessments: data.assessmentSummaries.slice(0, 5),
    }
  };
}
