import assert from "node:assert/strict";
import test from "node:test";

import type {
  EpidemiologyConsumptionContract,
  EpidemiologyContractAuditMetadata,
  EpidemiologyContractBlock,
  EpidemiologyContractPeriod,
  EpidemiologyTrend,
} from "../afastamentos-epidemiologia-contrato";
import {
  buildEpidemiologyPageModel,
  buildLoadingPageModel,
  buildFetchError,
} from "../afastamentos-epidemiologia-page-utils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function buildPeriod(): EpidemiologyContractPeriod {
  return {
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    diasPeriodo: 30,
    competenciaInicio: 202601,
    competenciaFim: 202601,
  };
}

function buildAudit(valid = true): EpidemiologyContractAuditMetadata {
  return {
    competenciaPeriodo: buildPeriod(),
    numeradores: { totalLicencas: 10, totalDiasPerdidos: 40 },
    denominadores: { populacaoMedia: 100, diasPeriodo: 30 },
    validade: {
      hasDenominator: valid,
      hasMinimumPopulation: valid,
      isValid: valid,
      flags: valid ? [] : ["SEM_DENOMINADOR"],
    },
    observacoes: valid ? [] : ["Denominador insuficiente."],
  };
}

function buildOverallBlock(): EpidemiologyContractBlock {
  return {
    dimension: "overall",
    key: "overall",
    metrics: {
      totalLicencas: 10,
      totalDiasPerdidos: 40,
      populacaoMedia: 100,
      diasPeriodo: 30,
      tad: 14.6,
      ifl: 1.2,
      dml: 4.0,
      ig: 5.2,
    },
    audit: buildAudit(true),
  };
}

function buildCutBlock(
  key: string,
  dimension: EpidemiologyContractBlock["dimension"],
  valid = true,
): EpidemiologyContractBlock {
  return {
    dimension,
    key,
    metrics: {
      totalLicencas: 5,
      totalDiasPerdidos: 20,
      populacaoMedia: 50,
      diasPeriodo: 30,
      tad: valid ? 7.3 : null,
      ifl: valid ? 0.6 : null,
      dml: 4.0,
      ig: valid ? 2.6 : null,
    },
    audit: buildAudit(valid),
  };
}

function buildMinimalTrend(hasSufficient = true): EpidemiologyTrend {
  const base = {
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    diasPeriodo: 31,
    totalLicencas: 5,
    totalDiasPerdidos: 20,
    populacaoMedia: 100,
    dml: 4.0,
    tad: 6.5,
    ifl: 50.0,
    ig: 200.0,
    isValid: true,
  };

  const points = hasSufficient
    ? [
        { ...base, month: "2026-01", label: "Jan/26" },
        {
          ...base,
          month: "2026-02",
          label: "Fev/26",
          startDate: "2026-02-01",
          endDate: "2026-02-28",
          diasPeriodo: 28,
          totalLicencas: 8,
          totalDiasPerdidos: 32,
        },
      ]
    : [{ ...base, month: "2026-01", label: "Jan/26" }];

  return {
    hasSufficientData: hasSufficient,
    minimumPointsRequired: 2,
    points,
  };
}

function buildMinimalContract(): EpidemiologyConsumptionContract {
  return {
    contractVersion: "4.2.0",
    generatedAt: "2026-04-02T10:00:00.000Z",
    period: buildPeriod(),
    policy: {
      minPopulationForStableCut: 30,
      rounding: {
        ratesScale: 6,
        dmlScale: 6,
        totalsScale: 4,
        populationScale: 4,
      },
    },
    eligibility: { excludedMaternityCount: 0 },
    overall: buildOverallBlock(),
    cuts: {
      sexo: [
        buildCutBlock("MASCULINO", "sexo", true),
        buildCutBlock("FEMININO", "sexo", true),
      ],
      faixaEtaria: [buildCutBlock("30_39", "faixa_etaria", true)],
      faixaTempoServico: [
        buildCutBlock("1_5_ANOS", "faixa_tempo_servico", true),
      ],
      secretaria: [buildCutBlock("SEC_SAUDE", "secretaria", true)],
      cargo: [buildCutBlock("MEDICO", "cargo", true)],
      localTrabalho: [
        buildCutBlock("HOSPITAL_CENTRAL", "local_trabalho", true),
      ],
      cidCapitulo: [buildCutBlock("CAP_A", "cid_capitulo", true)],
    },
    validation: {
      reconciliacao: {
        sexoLicencasDiff: 0,
        sexoDiasDiff: 0,
        faixaEtariaLicencasDiff: 0,
        faixaEtariaDiasDiff: 0,
        faixaTempoLicencasDiff: 0,
        faixaTempoDiasDiff: 0,
        secretariaLicencasDiff: 0,
        secretariaDiasDiff: 0,
        cargoLicencasDiff: 0,
        cargoDiasDiff: 0,
        localLicencasDiff: 0,
        localDiasDiff: 0,
        cidCapituloLicencasDiff: 0,
        cidCapituloDiasDiff: 0,
      },
      consistency: {
        isStructureStable: true,
        isOverallConsistent: true,
        isRoundingConsistent: true,
        isNoDenominatorBehaviorConsistent: true,
        hasBlockingIssues: false,
        issues: [],
      },
    },
    trend: buildMinimalTrend(),
  };
}

// ---------------------------------------------------------------------------
// Testes — estado de carregamento (loading)
// ---------------------------------------------------------------------------

test("buildLoadingPageModel: estado de loading retorna modelo placeholder valido", () => {
  const model = buildLoadingPageModel();

  // Deve ter exatamente 4 cards
  assert.equal(model.cards.length, 4);

  // Todos os cards devem ter valor placeholder "—"
  for (const card of model.cards) {
    assert.equal(card.value, "—");
    assert.equal(card.available, false);
    assert.equal(card.unit, "");
  }

  // Summary deve estar vazio
  assert.equal(model.summary.totalLicencas, 0);
  assert.equal(model.summary.totalDiasPerdidos, 0);
  assert.equal(model.summary.periodLabel, "");
  assert.equal(model.summary.isValid, false);

  // Todos os recortes devem estar vazios
  assert.equal(model.cuts.sexo.length, 0);
  assert.equal(model.cuts.faixaEtaria.length, 0);
  assert.equal(model.cuts.faixaTempoServico.length, 0);
  assert.equal(model.cuts.secretaria.length, 0);
  assert.equal(model.cuts.cargo.length, 0);
  assert.equal(model.cuts.localTrabalho.length, 0);
});

// ---------------------------------------------------------------------------
// Testes — estado de erro
// ---------------------------------------------------------------------------

test("buildFetchError: estado de erro controlado retorna objeto correto", () => {
  const error = buildFetchError(
    "INVALID_QUERY_PARAMS",
    "startDate e endDate sao obrigatorios.",
  );
  assert.equal(error.code, "INVALID_QUERY_PARAMS");
  assert.equal(error.message, "startDate e endDate sao obrigatorios.");
});

test("buildFetchError: estado de erro de rede retorna objeto correto", () => {
  const error = buildFetchError("NETWORK_ERROR", "Falha de rede.");
  assert.equal(error.code, "NETWORK_ERROR");
  assert.ok(error.message.length > 0);
});

// ---------------------------------------------------------------------------
// Testes — renderização básica dos cards principais
// ---------------------------------------------------------------------------

test("buildEpidemiologyPageModel: renderizacao basica produz 4 cards corretos", () => {
  const contract = buildMinimalContract();
  const model = buildEpidemiologyPageModel(contract);

  assert.equal(model.cards.length, 4);

  const cardIds = model.cards.map((c) => c.id);
  assert.deepEqual(cardIds, ["tad", "ifl", "dml", "ig"]);
});

test("buildEpidemiologyPageModel: card TAD tem valor correto e disponivel", () => {
  const contract = buildMinimalContract();
  const model = buildEpidemiologyPageModel(contract);

  const tad = model.cards.find((c) => c.id === "tad");
  assert.ok(tad !== undefined);
  assert.equal(tad.available, true);
  assert.equal(tad.value, "14.6000");
  assert.equal(tad.accent, "primary");
  assert.ok(tad.helperText.length > 0);
});

test("buildEpidemiologyPageModel: card DML sempre disponivel mesmo sem denominador", () => {
  const contract = buildMinimalContract();
  // Forçar DML independente de validade
  contract.overall.metrics.tad = null;
  contract.overall.metrics.ifl = null;
  contract.overall.metrics.ig = null;
  contract.overall.audit.validade.isValid = false;

  const model = buildEpidemiologyPageModel(contract);

  const dml = model.cards.find((c) => c.id === "dml");
  assert.ok(dml !== undefined);
  assert.equal(dml.available, true);
  assert.notEqual(dml.value, "N/D");
});

test("buildEpidemiologyPageModel: cards com metricas nulas renderizam N/D", () => {
  const contract = buildMinimalContract();
  contract.overall.metrics.tad = null;
  contract.overall.metrics.ifl = null;
  contract.overall.metrics.ig = null;

  const model = buildEpidemiologyPageModel(contract);

  const tad = model.cards.find((c) => c.id === "tad");
  const ifl = model.cards.find((c) => c.id === "ifl");
  const ig = model.cards.find((c) => c.id === "ig");

  assert.equal(tad?.value, "N/D");
  assert.equal(tad?.available, false);
  assert.equal(ifl?.value, "N/D");
  assert.equal(ig?.value, "N/D");
});

// ---------------------------------------------------------------------------
// Testes — resumo do período
// ---------------------------------------------------------------------------

test("buildEpidemiologyPageModel: summary.periodLabel formata datas no padrao pt-BR DD/MM/AAAA", () => {
  const contract = buildMinimalContract();
  // period: startDate "2026-01-01", endDate "2026-01-31"
  const model = buildEpidemiologyPageModel(contract);
  assert.equal(model.summary.periodLabel, "01/01/2026 a 31/01/2026");
});

test("buildEpidemiologyPageModel: summary reflete corretamente o contrato", () => {
  const contract = buildMinimalContract();
  const model = buildEpidemiologyPageModel(contract);

  assert.equal(model.summary.startDate, "2026-01-01");
  assert.equal(model.summary.endDate, "2026-01-31");
  assert.ok(model.summary.periodLabel.length > 0);
  assert.equal(model.summary.totalLicencas, 10);
  assert.equal(model.summary.totalDiasPerdidos, 40);
  assert.ok(model.summary.populacaoMedia.length > 0);
  assert.equal(model.summary.isValid, true);
});

test("buildEpidemiologyPageModel: summary preserva observacoes de auditabilidade", () => {
  const contract = buildMinimalContract();
  contract.overall.audit.observacoes = ["Contexto insuficiente observado."];

  const model = buildEpidemiologyPageModel(contract);
  assert.equal(model.summary.observacoes.length, 1);
  assert.ok(model.summary.observacoes[0].includes("insuficiente"));
});

// ---------------------------------------------------------------------------
// Testes — consumo do payload completo (recortes)
// ---------------------------------------------------------------------------

test("buildEpidemiologyPageModel: recortes por sexo populados corretamente", () => {
  const contract = buildMinimalContract();
  const model = buildEpidemiologyPageModel(contract);

  assert.equal(model.cuts.sexo.length, 2);
  const masculino = model.cuts.sexo.find((r) => r.key === "MASCULINO");
  assert.ok(masculino !== undefined);
  assert.equal(masculino.available, true);
  assert.notEqual(masculino.tad, "N/D");
  assert.notEqual(masculino.dml, "N/D");
});

test("buildEpidemiologyPageModel: recorte invalido marca available=false", () => {
  const contract = buildMinimalContract();
  // Tornar um recorte inválido (sem denominador)
  contract.cuts.sexo = [buildCutBlock("MASCULINO", "sexo", false)];

  const model = buildEpidemiologyPageModel(contract);

  const masculino = model.cuts.sexo[0];
  assert.equal(masculino.available, false);
  assert.equal(masculino.tad, "N/D");
  assert.equal(masculino.ifl, "N/D");
  assert.equal(masculino.ig, "N/D");
  // DML ainda tem valor mesmo sem denominador
  assert.notEqual(masculino.dml, "N/D");
});

test("buildEpidemiologyPageModel: todos os eixos de recorte sao populados", () => {
  const contract = buildMinimalContract();
  const model = buildEpidemiologyPageModel(contract);

  assert.ok(model.cuts.sexo.length >= 1);
  assert.ok(model.cuts.faixaEtaria.length >= 1);
  assert.ok(model.cuts.faixaTempoServico.length >= 1);
  assert.ok(model.cuts.secretaria.length >= 1);
  assert.ok(model.cuts.cargo.length >= 1);
  assert.ok(model.cuts.localTrabalho.length >= 1);
});

test("buildEpidemiologyPageModel: recortes sem dados resultam em array vazio", () => {
  const contract = buildMinimalContract();
  contract.cuts.faixaTempoServico = [];
  contract.cuts.cargo = [];

  const model = buildEpidemiologyPageModel(contract);
  assert.equal(model.cuts.faixaTempoServico.length, 0);
  assert.equal(model.cuts.cargo.length, 0);
});

// ---------------------------------------------------------------------------
// Teste — ausência de regressão (modelo de loading não interfere no completo)
// ---------------------------------------------------------------------------

test("ausencia de regressao: buildLoadingPageModel e buildEpidemiologyPageModel sao independentes", () => {
  const loading = buildLoadingPageModel();
  const contract = buildMinimalContract();
  const full = buildEpidemiologyPageModel(contract);

  // Modificar loading nao afeta full
  loading.cards[0].value = "MUTADO";
  assert.notEqual(full.cards[0].value, "MUTADO");

  // Modificar full nao afeta loading
  full.cards[0].value = "MUTADO_FULL";
  const loading2 = buildLoadingPageModel();
  assert.equal(loading2.cards[0].value, "—");
});
// ---------------------------------------------------------------------------
// Testes — bloco de tendência
// ---------------------------------------------------------------------------

test("buildLoadingPageModel: trend vazio com hasSufficientData=false", () => {
  const model = buildLoadingPageModel();
  assert.equal(model.trend.hasSufficientData, false);
  assert.equal(model.trend.points.length, 0);
});

test("buildEpidemiologyPageModel: trend com dados suficientes retorna hasSufficientData=true", () => {
  const contract = buildMinimalContract();
  const model = buildEpidemiologyPageModel(contract);
  assert.equal(model.trend.hasSufficientData, true);
  assert.equal(model.trend.points.length, 2);
});

test("buildEpidemiologyPageModel: trend points mapeiam label corretamente", () => {
  const contract = buildMinimalContract();
  const model = buildEpidemiologyPageModel(contract);
  assert.equal(model.trend.points[0].label, "Jan/26");
  assert.equal(model.trend.points[1].label, "Fev/26");
});

test("buildEpidemiologyPageModel: trend sem dados suficientes retorna hasSufficientData=false", () => {
  const contract = buildMinimalContract();
  contract.trend = buildMinimalTrend(false);
  const model = buildEpidemiologyPageModel(contract);
  assert.equal(model.trend.hasSufficientData, false);
  assert.equal(model.trend.points.length, 1);
});

test("buildEpidemiologyPageModel: relLicencas do ponto maximo e 100", () => {
  const contract = buildMinimalContract();
  const model = buildEpidemiologyPageModel(contract);
  // segundo ponto tem totalLicencas=8 (maior) -> relLicencas=100
  const maxPoint = model.trend.points.reduce((a, b) =>
    a.totalLicencas >= b.totalLicencas ? a : b,
  );
  assert.equal(maxPoint.relLicencas, 100);
});

test("buildEpidemiologyPageModel: trend point isValid=false resulta em tad=N/D", () => {
  const contract = buildMinimalContract();
  contract.trend.points[0].isValid = false;
  contract.trend.points[0].tad = null;
  contract.trend.points[0].ifl = null;
  contract.trend.points[0].ig = null;
  const model = buildEpidemiologyPageModel(contract);
  assert.equal(model.trend.points[0].tad, "N/D");
  assert.equal(model.trend.points[0].ifl, "N/D");
  assert.equal(model.trend.points[0].ig, "N/D");
  // DML ainda presente
  assert.notEqual(model.trend.points[0].dml, "N/D");
});
