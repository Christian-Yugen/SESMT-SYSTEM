export type RecurrenceWindowDays = 90 | 180 | 365;

export interface DurationBand {
  key: string;
  label: string;
  minDays: number;
  maxDays: number | null;
}

export interface CidAnalyticsPolicy {
  recurrencePrimaryWindowDays: RecurrenceWindowDays;
  recurrenceAvailableWindows: RecurrenceWindowDays[];
  durationBands: DurationBand[];
  multiCidMode: "dual-layer";
  // shared-days means each CID occurrence receives a proportional fraction of days.
  daysAllocationMode: "shared-days" | "full-days";
}

export interface TemporalDimension {
  year: number;
  month: number;
  quarter: 1 | 2 | 3 | 4;
  competency: string; // YYYY-MM
  week: number;
}

export interface OccupationalDimension {
  secretaria: string;
  cargo: string;
  naturezaCargo: string;
  contrato: string;
  matricula: string;
}

export interface ClinicalDimension {
  tipoAfastamento: string;
  isAcidenteTrabalho: boolean;
  cidCode: string;
  cidDesc: string;
  cidChapter: string;
}

export interface EventDimension {
  afastamentoId: number;
  servidorCpf: string;
  eventKey: string;
  startDate: string;
  endDate: string | null;
  daysAway: number;
  situacao: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurrenceDimension {
  episodeNumber: number;
  isRecurrent90: boolean;
  isRecurrent180: boolean;
  isRecurrent365: boolean;
  isRecurrentPrimary: boolean;
  daysSincePreviousEpisode: number | null;
  cumulativeDaysByServidor: number;
}

export interface AfastamentoEventFact {
  event: EventDimension;
  clinical: ClinicalDimension;
  occupational: OccupationalDimension;
  temporal: TemporalDimension;
  recurrence: RecurrenceDimension;
  cidCountInEvent: number;
}

export interface CidOccurrenceFact {
  eventId: number;
  servidorCpf: string;
  cidCode: string;
  cidDesc: string;
  cidChapter: string;
  occurrenceWeight: number;
  allocatedDays: number;
  startDate: string;
  endDate: string | null;
  daysAway: number;
  secretaria: string;
  cargo: string;
  naturezaCargo: string;
  tipoAfastamento: string;
  isAcidenteTrabalho: boolean;
  competency: string;
}

export interface MagnitudeMetrics {
  totalAfastamentos: number;
  totalServidoresAfastados: number;
  totalDiasPerdidos: number;
  duracaoMedia: number;
  duracaoMediana: number;
}

export interface PersistenceMetrics {
  percentualRecorrenciaPrimaryWindow: number;
  totalEventosRecorrentesPrimaryWindow: number;
  diasAcumuladosServidoresRecorrentes: number;
}

export interface DistributionMetrics {
  concentracaoPorCapitulo: Record<string, number>;
  concentracaoPorCid: Record<string, number>;
  concentracaoPorSecretaria: Record<string, number>;
  concentracaoPorCargo: Record<string, number>;
  rankingImpactoDiasPorSecretaria: Array<{ key: string; value: number }>;
}

export interface TrendPoint {
  competency: string;
  totalAfastamentos: number;
  totalDiasPerdidos: number;
  totalServidores: number;
  recorrentesPrimaryWindow: number;
}

export interface CidAnalyticsMetrics {
  magnitude: MagnitudeMetrics;
  persistence: PersistenceMetrics;
  distribution: DistributionMetrics;
  trend: TrendPoint[];
  duracaoPorFaixa: Record<string, number>;
}

export interface CidAnalyticsDataset {
  policy: CidAnalyticsPolicy;
  events: AfastamentoEventFact[];
  cidOccurrences: CidOccurrenceFact[];
  metrics: CidAnalyticsMetrics;
}
