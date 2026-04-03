import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEpidemiologyContractFromRepository,
  type EpidemiologyApplicationRepository,
} from "../afastamentos-epidemiologia-application";
import type {
  EpidemiologyDataset,
  EpidemiologyPeriod,
} from "../afastamentos-epidemiologia";

function decimalPlaces(value: number): number {
  const text = value.toString();
  const chunks = text.split(".");
  return chunks.length > 1 ? chunks[1].length : 0;
}

function buildBaseDataset(): EpidemiologyDataset {
  return {
    events: [
      {
        afastamento_id: 1,
        servidor_id: 101,
        vinculo_id: 201,
        data_inicio: "2026-01-05",
        data_fim: "2026-01-14",
        dias_afastado: 10,
        tipo_licenca: null,
      },
      {
        afastamento_id: 2,
        servidor_id: 102,
        vinculo_id: 202,
        data_inicio: "2026-01-10",
        data_fim: "2026-01-29",
        dias_afastado: 20,
        tipo_licenca: null,
      },
    ],
    cids: [
      {
        afastamento_id: 1,
        cid_capitulo: "CAP_A",
        occurrence_weight: 1,
        allocated_days: 10,
      },
      {
        afastamento_id: 2,
        cid_capitulo: "CAP_B",
        occurrence_weight: 0.333333,
        allocated_days: 6.6667,
      },
      {
        afastamento_id: 2,
        cid_capitulo: "CAP_B",
        occurrence_weight: 0.333333,
        allocated_days: 6.6667,
      },
      {
        afastamento_id: 2,
        cid_capitulo: "CAP_C",
        occurrence_weight: 0.333333,
        allocated_days: 6.6667,
      },
    ],
    servidores: [
      {
        servidor_id: 101,
        sexo: "F",
        data_nascimento: "1990-01-01",
      },
      {
        servidor_id: 102,
        sexo: "M",
        data_nascimento: "1970-01-01",
      },
    ],
    vinculos: [
      {
        vinculo_id: 201,
        secretaria: "SEC_A",
        cargo: "CARGO_A",
        natureza_cargo: "NAT_A",
        local_trabalho: "LOC_A",
        data_admissao: "2022-01-01",
      },
      {
        vinculo_id: 202,
        secretaria: "SEC_B",
        cargo: "CARGO_B",
        natureza_cargo: "NAT_B",
        local_trabalho: "LOC_B",
        data_admissao: "2010-01-01",
      },
    ],
    snapshots: [
      {
        competencia_yyyymm: 202601,
        secretaria: "SEC_A",
        local_trabalho: "LOC_A",
        natureza_cargo: "NAT_A",
        sexo: "F",
        faixa_etaria: "30_39",
        faixa_tempo_servico: "1_5_ANOS",
        qtd_populacao_ativa: 10,
      },
      {
        competencia_yyyymm: 202601,
        secretaria: "SEC_B",
        local_trabalho: "LOC_B",
        natureza_cargo: "NAT_B",
        sexo: "M",
        faixa_etaria: "50_59",
        faixa_tempo_servico: "11_OU_MAIS",
        qtd_populacao_ativa: 5,
      },
    ],
  };
}

function createRepository(
  dataset: EpidemiologyDataset,
): EpidemiologyApplicationRepository {
  return {
    async loadDataset() {
      return dataset;
    },
  };
}

const PERIOD: EpidemiologyPeriod = {
  startDate: "2026-01-01",
  endDate: "2026-01-31",
};

test("estrutura do payload e campos obrigatorios", async () => {
  const repository = createRepository(buildBaseDataset());
  const contract = await buildEpidemiologyContractFromRepository(repository, {
    period: PERIOD,
    options: {
      generatedAt: "2026-04-02T10:00:00.000Z",
    },
  });

  assert.equal(contract.contractVersion, "4.3.0");
  assert.equal(contract.generatedAt, "2026-04-02T10:00:00.000Z");
  assert.equal(contract.period.startDate, PERIOD.startDate);
  assert.equal(contract.period.endDate, PERIOD.endDate);
  assert.ok(Array.isArray(contract.cuts.sexo));
  assert.ok(Array.isArray(contract.cuts.faixaEtaria));
  assert.ok(Array.isArray(contract.cuts.faixaTempoServico));
  assert.ok(Array.isArray(contract.cuts.secretaria));
  assert.ok(Array.isArray(contract.cuts.cargo));
  assert.ok(Array.isArray(contract.cuts.localTrabalho));
  assert.ok(Array.isArray(contract.cuts.cidCapitulo));
});

test("tipos esperados e arredondamento padrao", async () => {
  const repository = createRepository(buildBaseDataset());
  const contract = await buildEpidemiologyContractFromRepository(repository, {
    period: PERIOD,
  });

  assert.equal(typeof contract.overall.metrics.totalLicencas, "number");
  assert.equal(typeof contract.overall.metrics.totalDiasPerdidos, "number");
  assert.equal(typeof contract.overall.metrics.populacaoMedia, "number");
  assert.equal(typeof contract.overall.metrics.diasPeriodo, "number");
  assert.equal(typeof contract.overall.metrics.dml, "number");

  assert.ok(decimalPlaces(contract.overall.metrics.totalDiasPerdidos) <= 4);
  assert.ok(decimalPlaces(contract.overall.metrics.populacaoMedia) <= 4);
  assert.ok(decimalPlaces(contract.overall.metrics.dml) <= 6);
  assert.ok(
    contract.overall.metrics.tad === null ||
      decimalPlaces(contract.overall.metrics.tad) <= 6,
  );
  assert.ok(
    contract.overall.metrics.ifl === null ||
      decimalPlaces(contract.overall.metrics.ifl) <= 6,
  );
  assert.ok(
    contract.overall.metrics.ig === null ||
      decimalPlaces(contract.overall.metrics.ig) <= 6,
  );
});

test("comportamento sem denominador", async () => {
  const dataset = buildBaseDataset();
  dataset.snapshots = [];

  const repository = createRepository(dataset);
  const contract = await buildEpidemiologyContractFromRepository(repository, {
    period: PERIOD,
  });

  assert.equal(contract.overall.metrics.tad, null);
  assert.equal(contract.overall.metrics.ifl, null);
  assert.equal(contract.overall.metrics.ig, null);
  assert.equal(
    contract.overall.audit.validade.flags.includes("denominador_ausente"),
    true,
  );
});

test("comportamento com populacao insuficiente", async () => {
  const repository = createRepository(buildBaseDataset());
  const contract = await buildEpidemiologyContractFromRepository(repository, {
    period: PERIOD,
    options: {
      minPopulationForStableCut: 20,
    },
  });

  assert.equal(contract.overall.audit.validade.hasDenominator, true);
  assert.equal(contract.overall.audit.validade.hasMinimumPopulation, false);
  assert.equal(
    contract.overall.audit.validade.flags.includes("populacao_insuficiente"),
    true,
  );
});

test("coerencia global vs recortes e residual minimo em CID", async () => {
  const repository = createRepository(buildBaseDataset());
  const contract = await buildEpidemiologyContractFromRepository(repository, {
    period: PERIOD,
  });

  const recon = contract.validation.reconciliacao;

  assert.equal(recon.sexoLicencasDiff, 0);
  assert.equal(recon.sexoDiasDiff, 0);
  assert.equal(recon.faixaEtariaLicencasDiff, 0);
  assert.equal(recon.faixaEtariaDiasDiff, 0);
  assert.equal(recon.faixaTempoLicencasDiff, 0);
  assert.equal(recon.faixaTempoDiasDiff, 0);
  assert.equal(recon.secretariaLicencasDiff, 0);
  assert.equal(recon.secretariaDiasDiff, 0);
  assert.equal(recon.cargoLicencasDiff, 0);
  assert.equal(recon.cargoDiasDiff, 0);
  assert.equal(recon.localLicencasDiff, 0);
  assert.equal(recon.localDiasDiff, 0);

  assert.ok(Math.abs(recon.cidCapituloLicencasDiff) <= 0.001);
  assert.ok(Math.abs(recon.cidCapituloDiasDiff) <= 0.001);
  assert.notEqual(recon.cidCapituloDiasDiff, 0);

  assert.equal(contract.validation.consistency.isOverallConsistent, true);
});
