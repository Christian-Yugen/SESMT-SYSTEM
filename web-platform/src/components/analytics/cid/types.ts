export type CidPanelSortMode = "frequency" | "impact";

export interface ChapterRankingItem {
  chapter: string;
  occurrences: number;
  afastamentos: number;
  daysLost: number;
  participationPct: number;
}

export interface CidRankingItem {
  cidCode: string;
  cidDesc: string;
  cidChapter: string;
  occurrences: number;
  afastamentos: number;
  daysLost: number;
  participationPct: number;
}

export interface CidTrendPoint {
  competency: string;
  occurrences: number;
  daysLost: number;
}

export interface OccupationalRankingItem {
  label: string;
  afastamentos: number;
  daysLost: number;
  avgDays: number;
  participationPct: number;
  dominantChapter: string;
  dominantCid: string;
}

export interface NaturezaImpactItem {
  natureza: string;
  afastamentos: number;
  daysLost: number;
  avgDays: number;
  participationPct: number;
}

export interface OccupationalCrossMatrixRow {
  chapter: string;
  values: Array<{
    group: string;
    occurrences: number;
    daysLost: number;
  }>;
}

export type ManagerialPriorityLevel =
  | "atencao-moderada"
  | "atencao-alta"
  | "prioridade-critica";

export interface ManagerialAlertItem {
  id: string;
  title: string;
  summary: string;
  evidence: string;
  level: ManagerialPriorityLevel;
}

export interface PriorityRankingItem {
  label: string;
  score: number;
  level: ManagerialPriorityLevel;
  volume: number;
  daysLost: number;
  avgDays: number;
  recurrencePct: number;
  trendDeltaPct: number | null;
  daysSharePct: number;
}
