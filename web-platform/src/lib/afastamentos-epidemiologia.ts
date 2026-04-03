export interface EpidemiologyEventRow {
  afastamento_id: number;
  servidor_id: number | null;
  vinculo_id: number | null;
  data_inicio: string;
  data_fim: string | null;
  dias_afastado: number | null;
  tipo_licenca: string | null;
}

export interface EpidemiologyCidRow {
  afastamento_id: number;
  cid_capitulo: string | null;
  occurrence_weight: number;
  allocated_days: number | null;
}

export interface EpidemiologyServidorRow {
  servidor_id: number;
  sexo: string | null;
  data_nascimento: string | null;
}

export interface EpidemiologyVinculoRow {
  vinculo_id: number;
  secretaria: string | null;
  cargo: string | null;
  natureza_cargo: string | null;
  local_trabalho: string | null;
  data_admissao: string | null;
}

export interface EpidemiologySnapshotRow {
  competencia_yyyymm: number;
  secretaria: string | null;
  local_trabalho: string | null;
  natureza_cargo: string | null;
  sexo: string | null;
  faixa_etaria: string | null;
  faixa_tempo_servico: string | null;
  qtd_populacao_ativa: number;
}

export interface EpidemiologyDataset {
  events: EpidemiologyEventRow[];
  cids: EpidemiologyCidRow[];
  servidores: EpidemiologyServidorRow[];
  vinculos: EpidemiologyVinculoRow[];
  snapshots: EpidemiologySnapshotRow[];
}

export interface EpidemiologyPeriod {
  startDate: string;
  endDate: string;
}

export interface EpidemiologyIndicatorSet {
  tad: number;
  ifl: number;
  dml: number;
  ig: number;
  totalLicencas: number;
  totalDiasPerdidos: number;
  populacaoMedia: number;
  diasPeriodo: number;
}

export interface EpidemiologyCutItem extends EpidemiologyIndicatorSet {
  key: string;
}

export interface EpidemiologyEngineOutput {
  period: EpidemiologyPeriod;
  overall: EpidemiologyIndicatorSet;
  bySexo: EpidemiologyCutItem[];
  byFaixaEtaria: EpidemiologyCutItem[];
  byFaixaTempoServico: EpidemiologyCutItem[];
  bySecretaria: EpidemiologyCutItem[];
  byCargo: EpidemiologyCutItem[];
  byLocalTrabalho: EpidemiologyCutItem[];
  byCidCapitulo: EpidemiologyCutItem[];
}

export interface EpidemiologyValidationOutput {
  global: {
    totalLicencas: number;
    totalDiasPerdidos: number;
    populacaoMedia: number;
  };
  reconciliacao: {
    sexoLicencasDiff: number;
    sexoDiasDiff: number;
    faixaEtariaLicencasDiff: number;
    faixaEtariaDiasDiff: number;
    faixaTempoLicencasDiff: number;
    faixaTempoDiasDiff: number;
    secretariaLicencasDiff: number;
    secretariaDiasDiff: number;
    cargoLicencasDiff: number;
    cargoDiasDiff: number;
    localLicencasDiff: number;
    localDiasDiff: number;
    cidCapituloLicencasDiff: number;
    cidCapituloDiasDiff: number;
  };
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const POP_SCALE = 1000;
const RATE_PERCENT_SCALE = 100;
const EMPTY_DIMENSION = "NAO_INFORMADO";

function safeDate(dateText: string): Date {
  return new Date(`${dateText.slice(0, 10)}T00:00:00`);
}

function normalizeDimension(value: string | null | undefined): string {
  const normalized = (value || "").trim().toUpperCase();
  return normalized.length > 0 ? normalized : EMPTY_DIMENSION;
}

function daysInclusive(startDate: string, endDate: string): number {
  const start = safeDate(startDate);
  const end = safeDate(endDate);
  const diff = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
  return Math.max(diff + 1, 1);
}

function round(value: number, precision = 6): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function classifyFaixaEtaria(
  eventDate: string,
  dataNascimento: string | null,
): string {
  if (!dataNascimento) return EMPTY_DIMENSION;
  const ref = safeDate(eventDate);
  const birth = safeDate(dataNascimento);
  if (Number.isNaN(ref.getTime()) || Number.isNaN(birth.getTime())) {
    return EMPTY_DIMENSION;
  }

  let years = ref.getUTCFullYear() - birth.getUTCFullYear();
  const refMonth = ref.getUTCMonth();
  const birthMonth = birth.getUTCMonth();
  if (
    refMonth < birthMonth ||
    (refMonth === birthMonth && ref.getUTCDate() < birth.getUTCDate())
  ) {
    years -= 1;
  }

  if (years < 30) return "ATE_29";
  if (years <= 39) return "30_39";
  if (years <= 49) return "40_49";
  if (years <= 59) return "50_59";
  return "60_OU_MAIS";
}

function classifyFaixaTempoServico(
  eventDate: string,
  dataAdmissao: string | null,
): string {
  if (!dataAdmissao) return EMPTY_DIMENSION;
  const ref = safeDate(eventDate);
  const admission = safeDate(dataAdmissao);
  if (Number.isNaN(ref.getTime()) || Number.isNaN(admission.getTime())) {
    return EMPTY_DIMENSION;
  }

  let years = ref.getUTCFullYear() - admission.getUTCFullYear();
  const refMonth = ref.getUTCMonth();
  const admMonth = admission.getUTCMonth();
  if (
    refMonth < admMonth ||
    (refMonth === admMonth && ref.getUTCDate() < admission.getUTCDate())
  ) {
    years -= 1;
  }

  if (years < 1) return "ATE_1_ANO";
  if (years <= 5) return "1_5_ANOS";
  if (years <= 10) return "6_10_ANOS";
  return "11_OU_MAIS";
}

function populationAverage(
  snapshots: EpidemiologySnapshotRow[],
  period: EpidemiologyPeriod,
  groupBy?: (row: EpidemiologySnapshotRow) => string,
): Map<string, number> {
  const startComp =
    Number(period.startDate.slice(0, 4)) * 100 +
    Number(period.startDate.slice(5, 7));
  const endComp =
    Number(period.endDate.slice(0, 4)) * 100 +
    Number(period.endDate.slice(5, 7));

  const byCompetenciaGroup = new Map<string, number>();
  snapshots.forEach((row) => {
    if (
      row.competencia_yyyymm < startComp ||
      row.competencia_yyyymm > endComp
    ) {
      return;
    }
    const group = groupBy ? groupBy(row) : "GLOBAL";
    const key = `${row.competencia_yyyymm}::${group}`;
    byCompetenciaGroup.set(
      key,
      (byCompetenciaGroup.get(key) || 0) + row.qtd_populacao_ativa,
    );
  });

  const acc = new Map<string, { sum: number; count: number }>();
  byCompetenciaGroup.forEach((value, key) => {
    const group = key.split("::")[1] || "GLOBAL";
    const current = acc.get(group) || { sum: 0, count: 0 };
    current.sum += value;
    current.count += 1;
    acc.set(group, current);
  });

  const avg = new Map<string, number>();
  acc.forEach((value, key) => {
    avg.set(key, value.count > 0 ? value.sum / value.count : 0);
  });

  return avg;
}

function computeIndicatorSet(
  totalLicencas: number,
  totalDiasPerdidos: number,
  populacaoMedia: number,
  diasPeriodo: number,
): EpidemiologyIndicatorSet {
  const safePopulation = Math.max(populacaoMedia, 0);
  const tad =
    safePopulation > 0
      ? (totalDiasPerdidos / (safePopulation * diasPeriodo)) *
        RATE_PERCENT_SCALE
      : 0;
  const ifl =
    safePopulation > 0 ? (totalLicencas / safePopulation) * POP_SCALE : 0;
  const dml = totalLicencas > 0 ? totalDiasPerdidos / totalLicencas : 0;
  const ig =
    safePopulation > 0 ? (totalDiasPerdidos / safePopulation) * POP_SCALE : 0;

  return {
    tad: round(tad, 6),
    ifl: round(ifl, 6),
    dml: round(dml, 6),
    ig: round(ig, 6),
    totalLicencas,
    totalDiasPerdidos: round(totalDiasPerdidos, 4),
    populacaoMedia: round(populacaoMedia, 4),
    diasPeriodo,
  };
}

function aggregateCuts(
  groups: Map<string, { licencas: number; dias: number }>,
  populationByGroup: Map<string, number>,
  diasPeriodo: number,
): EpidemiologyCutItem[] {
  return Array.from(groups.entries())
    .map(([key, value]) => {
      const indicators = computeIndicatorSet(
        value.licencas,
        value.dias,
        populationByGroup.get(key) || 0,
        diasPeriodo,
      );
      return { key, ...indicators };
    })
    .sort((a, b) => b.totalDiasPerdidos - a.totalDiasPerdidos);
}

export function buildEpidemiologyEngine(
  dataset: EpidemiologyDataset,
  period: EpidemiologyPeriod,
): EpidemiologyEngineOutput {
  const diasPeriodo = daysInclusive(period.startDate, period.endDate);

  const servidorById = new Map<number, EpidemiologyServidorRow>();
  dataset.servidores.forEach((s) => servidorById.set(s.servidor_id, s));

  const vinculoById = new Map<number, EpidemiologyVinculoRow>();
  dataset.vinculos.forEach((v) => vinculoById.set(v.vinculo_id, v));

  const eventById = new Map<number, EpidemiologyEventRow>();
  dataset.events.forEach((event) => eventById.set(event.afastamento_id, event));

  const eventsInPeriod = dataset.events.filter((event) => {
    const start = event.data_inicio.slice(0, 10);
    return start >= period.startDate && start <= period.endDate;
  });

  const globalLicencas = eventsInPeriod.length;
  const globalDias = eventsInPeriod.reduce(
    (sum, event) => sum + Math.max(event.dias_afastado || 0, 0),
    0,
  );

  const popGlobal =
    populationAverage(dataset.snapshots, period).get("GLOBAL") || 0;

  const bySexo = new Map<string, { licencas: number; dias: number }>();
  const byFaixaEtaria = new Map<string, { licencas: number; dias: number }>();
  const byFaixaTempo = new Map<string, { licencas: number; dias: number }>();
  const bySecretaria = new Map<string, { licencas: number; dias: number }>();
  const byCargo = new Map<string, { licencas: number; dias: number }>();
  const byLocal = new Map<string, { licencas: number; dias: number }>();

  eventsInPeriod.forEach((event) => {
    const dias = Math.max(event.dias_afastado || 0, 0);
    const servidor = event.servidor_id
      ? servidorById.get(event.servidor_id)
      : undefined;
    const vinculo = event.vinculo_id
      ? vinculoById.get(event.vinculo_id)
      : undefined;

    const sexo = normalizeDimension(servidor?.sexo);
    const faixaEtaria = classifyFaixaEtaria(
      event.data_inicio,
      servidor?.data_nascimento || null,
    );
    const faixaTempo = classifyFaixaTempoServico(
      event.data_inicio,
      vinculo?.data_admissao || null,
    );
    const secretaria = normalizeDimension(vinculo?.secretaria);
    const cargo = normalizeDimension(vinculo?.natureza_cargo || vinculo?.cargo);
    const local = normalizeDimension(vinculo?.local_trabalho);

    const inc = (
      map: Map<string, { licencas: number; dias: number }>,
      key: string,
    ) => {
      const current = map.get(key) || { licencas: 0, dias: 0 };
      current.licencas += 1;
      current.dias += dias;
      map.set(key, current);
    };

    inc(bySexo, sexo);
    inc(byFaixaEtaria, faixaEtaria);
    inc(byFaixaTempo, faixaTempo);
    inc(bySecretaria, secretaria);
    inc(byCargo, cargo);
    inc(byLocal, local);
  });

  const byCidCapitulo = new Map<string, { licencas: number; dias: number }>();
  dataset.cids.forEach((cid) => {
    const event = eventById.get(cid.afastamento_id);
    if (!event) return;
    const eventStart = event.data_inicio.slice(0, 10);
    if (eventStart < period.startDate || eventStart > period.endDate) return;

    const chapter = normalizeDimension(cid.cid_capitulo);
    const current = byCidCapitulo.get(chapter) || { licencas: 0, dias: 0 };
    current.licencas += cid.occurrence_weight;
    current.dias += cid.allocated_days || 0;
    byCidCapitulo.set(chapter, current);
  });

  const popSexo = populationAverage(dataset.snapshots, period, (row) =>
    normalizeDimension(row.sexo),
  );
  const popFaixaEtaria = populationAverage(dataset.snapshots, period, (row) =>
    normalizeDimension(row.faixa_etaria),
  );
  const popFaixaTempo = populationAverage(dataset.snapshots, period, (row) =>
    normalizeDimension(row.faixa_tempo_servico),
  );
  const popSecretaria = populationAverage(dataset.snapshots, period, (row) =>
    normalizeDimension(row.secretaria),
  );
  const popCargo = populationAverage(dataset.snapshots, period, (row) =>
    normalizeDimension(row.natureza_cargo),
  );
  const popLocal = populationAverage(dataset.snapshots, period, (row) =>
    normalizeDimension(row.local_trabalho),
  );
  const popCidCapitulo = new Map<string, number>();
  byCidCapitulo.forEach((_, chapter) => {
    popCidCapitulo.set(chapter, popGlobal);
  });

  return {
    period,
    overall: computeIndicatorSet(
      globalLicencas,
      globalDias,
      popGlobal,
      diasPeriodo,
    ),
    bySexo: aggregateCuts(bySexo, popSexo, diasPeriodo),
    byFaixaEtaria: aggregateCuts(byFaixaEtaria, popFaixaEtaria, diasPeriodo),
    byFaixaTempoServico: aggregateCuts(
      byFaixaTempo,
      popFaixaTempo,
      diasPeriodo,
    ),
    bySecretaria: aggregateCuts(bySecretaria, popSecretaria, diasPeriodo),
    byCargo: aggregateCuts(byCargo, popCargo, diasPeriodo),
    byLocalTrabalho: aggregateCuts(byLocal, popLocal, diasPeriodo),
    byCidCapitulo: aggregateCuts(byCidCapitulo, popCidCapitulo, diasPeriodo),
  };
}

function sumField(
  items: EpidemiologyCutItem[],
  field: "totalLicencas" | "totalDiasPerdidos",
) {
  return items.reduce((sum, item) => sum + item[field], 0);
}

export function validateEpidemiologyOutput(
  output: EpidemiologyEngineOutput,
): EpidemiologyValidationOutput {
  const globalLicencas = output.overall.totalLicencas;
  const globalDias = output.overall.totalDiasPerdidos;

  return {
    global: {
      totalLicencas: globalLicencas,
      totalDiasPerdidos: globalDias,
      populacaoMedia: output.overall.populacaoMedia,
    },
    reconciliacao: {
      sexoLicencasDiff: round(
        sumField(output.bySexo, "totalLicencas") - globalLicencas,
        6,
      ),
      sexoDiasDiff: round(
        sumField(output.bySexo, "totalDiasPerdidos") - globalDias,
        6,
      ),
      faixaEtariaLicencasDiff: round(
        sumField(output.byFaixaEtaria, "totalLicencas") - globalLicencas,
        6,
      ),
      faixaEtariaDiasDiff: round(
        sumField(output.byFaixaEtaria, "totalDiasPerdidos") - globalDias,
        6,
      ),
      faixaTempoLicencasDiff: round(
        sumField(output.byFaixaTempoServico, "totalLicencas") - globalLicencas,
        6,
      ),
      faixaTempoDiasDiff: round(
        sumField(output.byFaixaTempoServico, "totalDiasPerdidos") - globalDias,
        6,
      ),
      secretariaLicencasDiff: round(
        sumField(output.bySecretaria, "totalLicencas") - globalLicencas,
        6,
      ),
      secretariaDiasDiff: round(
        sumField(output.bySecretaria, "totalDiasPerdidos") - globalDias,
        6,
      ),
      cargoLicencasDiff: round(
        sumField(output.byCargo, "totalLicencas") - globalLicencas,
        6,
      ),
      cargoDiasDiff: round(
        sumField(output.byCargo, "totalDiasPerdidos") - globalDias,
        6,
      ),
      localLicencasDiff: round(
        sumField(output.byLocalTrabalho, "totalLicencas") - globalLicencas,
        6,
      ),
      localDiasDiff: round(
        sumField(output.byLocalTrabalho, "totalDiasPerdidos") - globalDias,
        6,
      ),
      cidCapituloLicencasDiff: round(
        sumField(output.byCidCapitulo, "totalLicencas") - globalLicencas,
        6,
      ),
      cidCapituloDiasDiff: round(
        sumField(output.byCidCapitulo, "totalDiasPerdidos") - globalDias,
        6,
      ),
    },
  };
}

export interface EpidemiologyFormulaReference {
  tad: string;
  ifl: string;
  dml: string;
  ig: string;
}

export const EPIDEMIOLOGY_FORMULAS: EpidemiologyFormulaReference = {
  tad: "(dias_perdidos / (populacao_media * dias_do_periodo)) * 100",
  ifl: "(numero_de_licencas / populacao_media) * 1000",
  dml: "dias_perdidos / numero_de_licencas",
  ig: "(dias_perdidos / populacao_media) * 1000",
};
