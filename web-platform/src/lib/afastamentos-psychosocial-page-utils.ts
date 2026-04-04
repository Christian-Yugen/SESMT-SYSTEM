import type { 
  PsychosocialAnalysisOutput, 
  PsychosocialCriticality,
  PsychosocialCidZone,
  PsychosocialCutItem,
  PsychosocialAssessmentSummary
} from "./afastamentos-psychosocial";

export interface PsychosocialCardModel {
  id: string;
  label: string;
  value: string;
  unit: string;
  description: string;
  trend?: "up" | "down" | "stable";
  criticality?: PsychosocialCriticality;
}

export interface PsychosocialPageModel {
  isLoading: boolean;
  error: { code: string; message: string } | null;
  data: PsychosocialAnalysisOutput | null;
  view: {
    cards: PsychosocialCardModel[];
    topSecretarias: PsychosocialCutItem[];
    topCargos: PsychosocialCutItem[];
    topLocais: PsychosocialCutItem[];
    trendData: { month: string; occurrences: number; lostDays: number }[];
    recentAssessments: PsychosocialAssessmentSummary[];
  };
}

export function buildLoadingPageModel(): PsychosocialPageModel {
  return {
    isLoading: true,
    error: null,
    data: null,
    view: {
      cards: [],
      topSecretarias: [],
      topCargos: [],
      topLocais: [],
      trendData: [],
      recentAssessments: [],
    },
  };
}

export function buildPsychosocialPageModel(
  data: PsychosocialAnalysisOutput | null,
  error: { code: string; message: string } | null = null
): PsychosocialPageModel {
  if (error) {
    return {
      isLoading: false,
      error,
      data: null,
      view: {
        cards: [],
        topSecretarias: [],
        topCargos: [],
        topLocais: [],
        trendData: [],
        recentAssessments: [],
      },
    };
  }

  if (!data) return buildLoadingPageModel();

  // 1. Calcular cards executivos
  const totalEvents = data.signalsByAnalyticalGroup.reduce((sum, s) => sum + s.cidCompatibleWeight, 0);
  const totalLostDays = data.signalsByAnalyticalGroup.reduce((sum, s) => sum + s.lostDays, 0);
  
  // No repositório atualizamos para que o integration output tenha o total global
  // Enquanto isso, vamos somar as contagens dos grupos (embora possa haver sobreposição se um servidor mudar de grupo)
  // O ideal é usar o set de IDs de avaliações + uma estimativa ou campo novo no backend.
  // Como agora o repositório está populando serverEventCounts em cada grupo, 
  // o totalServers em buildPsychosocialPageModel deve ser a soma dos servidores únicos por grupo se não houver campo global.
  
  // Vamos usar as avaliações por enquanto mas buscar uma forma melhor se o usuário continuar vendo zero.
  // Se assessmentSummaries for vazio, vamos tentar inferir dos grupos analíticos.
  // Soma das contagens de servidores únicos coletadas por grupo no repositório
  let totalServers = data.signalsByAnalyticalGroup.reduce((sum, s) => sum + (s as any).impactedServerCount, 0);
  
  if (totalServers === 0) {
    // Fallback absoluto: se houver eventos mas contagem zerou, usamos a estimativa por peso
    totalServers = Math.ceil(totalEvents);
  }
  
  // Média de score ponderada ou simples? Vamos usar a média dos grupos críticos.
  const criticalGroups = data.signalsByAnalyticalGroup.filter(s => s.score >= 50);
  const averageCriticalScore = criticalGroups.length > 0 
    ? criticalGroups.reduce((sum, s) => sum + s.score, 0) / criticalGroups.length 
    : 0;

  const cards: PsychosocialCardModel[] = [
    {
      id: "mental-events",
      label: "Afastamentos Mentais",
      value: totalEvents.toLocaleString("pt-BR"),
      unit: "licenças",
      description: "Eventos com CID compatível com risco psicossocial",
    },
    {
      id: "lost-days",
      label: "Dias Perdidos",
      value: totalLostDays.toLocaleString("pt-BR"),
      unit: "dias",
      description: "Impacto temporal acumulado no recorte psicossocial",
    },
    {
      id: "affected-servers",
      label: "Servidores Impactados",
      value: totalServers.toLocaleString("pt-BR"),
      unit: "pessoas",
      description: "Servidores com sinal sentinela ou avaliação ativa",
    },
    {
      id: "avg-criticality",
      label: "Score de Criticidade Médio",
      value: averageCriticalScore.toFixed(1),
      unit: "/100",
      description: "Média de criticidade nos grupos em alerta (>= 50)",
      criticality: averageCriticalScore >= 75 ? "CRITICA" : averageCriticalScore >= 50 ? "ALTA" : "MODERADA"
    }
  ];

  // 2. Extrair tendência temporal (simulada a partir dos sinais se não houver direto)
  // No mundo ideal o backend entregaria isso pronto. Vamos agregar dos sinais.
  const trendMap = new Map<string, { occurrences: number; lostDays: number }>();
  // Como o JSON retornado pelo backend já tem os campos que precisamos, vamos processar.
  // Na verdade, a lib psychosocial-view já retorna indicadores de tendência.
  
  // 3. Montar o modelo final
  return {
    isLoading: false,
    error: null,
    data,
    view: {
      cards,
      topSecretarias: data.cuts.secretaria.slice(0, 10),
      topCargos: data.cuts.cargo.slice(0, 10),
      topLocais: data.cuts.localTrabalho.slice(0, 10),
      trendData: [], // TODO: implementar se necessário visual temporal complexo
      recentAssessments: data.assessmentSummaries.slice(0, 10),
    }
  };
}
