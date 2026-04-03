import assert from "node:assert/strict";
import test from "node:test";

import {
  EpidemiologyApplicationError,
  type EpidemiologyApplicationRepository,
} from "../afastamentos-epidemiologia-application";
import { handleEpidemiologyContractRequest } from "../afastamentos-epidemiologia-endpoint";
import type { EpidemiologyDataset } from "../afastamentos-epidemiologia";

function buildBaseDataset(): EpidemiologyDataset {
  return {
    events: [
      {
        afastamento_id: 1,
        servidor_id: 11,
        vinculo_id: 21,
        data_inicio: "2026-01-05",
        data_fim: "2026-01-06",
        dias_afastado: 2,
        tipo_licenca: null,
      },
    ],
    cids: [
      {
        afastamento_id: 1,
        cid_capitulo: "CAP_A",
        occurrence_weight: 1,
        allocated_days: 2,
      },
    ],
    servidores: [
      {
        servidor_id: 11,
        sexo: "F",
        data_nascimento: "1990-01-01",
      },
    ],
    vinculos: [
      {
        vinculo_id: 21,
        secretaria: "SEC",
        cargo: "CARGO",
        natureza_cargo: "NAT",
        local_trabalho: "LOC",
        data_admissao: "2020-01-01",
      },
    ],
    snapshots: [
      {
        competencia_yyyymm: 202601,
        secretaria: "SEC",
        local_trabalho: "LOC",
        natureza_cargo: "NAT",
        sexo: "F",
        faixa_etaria: "30_39",
        faixa_tempo_servico: "1_5_ANOS",
        qtd_populacao_ativa: 50,
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

function createFailingRepository(
  error: Error,
): EpidemiologyApplicationRepository {
  return {
    async loadDataset() {
      throw error;
    },
  };
}

test("resposta 200 e estrutura de payload valida", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/epidemiologia?startDate=2026-01-01&endDate=2026-01-31",
    { method: "GET" },
  );

  const response = await handleEpidemiologyContractRequest(request, {
    repository: createRepository(buildBaseDataset()),
    now: () => new Date("2026-04-02T10:00:00.000Z"),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-request-id") !== null, true);

  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.contractVersion, "4.3.0");
  assert.equal(body.generatedAt, "2026-04-02T10:00:00.000Z");
  assert.ok(typeof body.period === "object");
  assert.ok(typeof body.policy === "object");
  assert.ok(typeof body.overall === "object");
  assert.ok(typeof body.cuts === "object");
  assert.ok(typeof body.validation === "object");
});

test("metodo nao permitido retorna 405 controlado", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/epidemiologia?startDate=2026-01-01&endDate=2026-01-31",
    { method: "POST" },
  );

  const response = await handleEpidemiologyContractRequest(request, {
    repository: createRepository(buildBaseDataset()),
  });

  assert.equal(response.status, 405);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "UNSUPPORTED_METHOD");
  assert.equal(typeof body.error?.message, "string");
});

test("ausencia de parametros obrigatorios retorna 400", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/epidemiologia",
    {
      method: "GET",
    },
  );

  const response = await handleEpidemiologyContractRequest(request, {
    repository: createRepository(buildBaseDataset()),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INVALID_QUERY_PARAMS");
});

test("intervalo invalido de datas retorna 400", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/epidemiologia?startDate=2026-02-01&endDate=2026-01-31",
    { method: "GET" },
  );

  const response = await handleEpidemiologyContractRequest(request, {
    repository: createRepository(buildBaseDataset()),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INVALID_QUERY_PARAMS");
});

test("minPopulationForStableCut invalido retorna 400", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/epidemiologia?startDate=2026-01-01&endDate=2026-01-31&minPopulationForStableCut=-1",
    { method: "GET" },
  );

  const response = await handleEpidemiologyContractRequest(request, {
    repository: createRepository(buildBaseDataset()),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INVALID_QUERY_PARAMS");
  assert.equal(typeof body.error?.message, "string");
});

test("acesso interno invalido retorna 401", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/epidemiologia?startDate=2026-01-01&endDate=2026-01-31",
    {
      method: "GET",
      headers: {
        "x-internal-api-key": "wrong-key",
      },
    },
  );

  const response = await handleEpidemiologyContractRequest(request, {
    repository: createRepository(buildBaseDataset()),
    requiredAccessToken: "expected-key",
  });

  assert.equal(response.status, 401);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "UNAUTHORIZED");
});

test("falha simulada da camada de aplicacao retorna erro interno consistente", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/epidemiologia?startDate=2026-01-01&endDate=2026-01-31",
    { method: "GET" },
  );

  const response = await handleEpidemiologyContractRequest(request, {
    repository: createFailingRepository(
      new EpidemiologyApplicationError("Simulated controlled failure"),
    ),
  });

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("x-request-id") !== null, true);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INTERNAL_ERROR");
  assert.equal(typeof body.error?.message, "string");
});

test("resposta em erro interno preserva formato estavel", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/epidemiologia?startDate=2026-01-01&endDate=2026-01-31",
    { method: "GET" },
  );

  const response = await handleEpidemiologyContractRequest(request, {
    repository: createFailingRepository(new Error("Unexpected failure")),
  });

  assert.equal(response.status, 500);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.deepEqual(Object.keys(body), ["error"]);
  assert.equal(typeof body.error?.code, "string");
  assert.equal(typeof body.error?.message, "string");
});

test("comportamento em ausencia de denominador", async () => {
  const dataset = buildBaseDataset();
  dataset.snapshots = [];

  const request = new Request(
    "http://localhost/api/absenteismo/epidemiologia?startDate=2026-01-01&endDate=2026-01-31",
    { method: "GET" },
  );

  const response = await handleEpidemiologyContractRequest(request, {
    repository: createRepository(dataset),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    overall: {
      metrics: { tad: number | null; ifl: number | null; ig: number | null };
      audit: { validade: { flags: string[] } };
    };
  };

  assert.equal(body.overall.metrics.tad, null);
  assert.equal(body.overall.metrics.ifl, null);
  assert.equal(body.overall.metrics.ig, null);
  assert.equal(
    body.overall.audit.validade.flags.includes("denominador_ausente"),
    true,
  );
});

test("preserva campos obrigatorios e sem regressao do contrato", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/epidemiologia?startDate=2026-01-01&endDate=2026-01-31",
    { method: "GET" },
  );

  const response = await handleEpidemiologyContractRequest(request, {
    repository: createRepository(buildBaseDataset()),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    contractVersion: string;
    generatedAt: string;
    period: unknown;
    policy: unknown;
    overall: unknown;
    cuts: {
      sexo: unknown[];
      faixaEtaria: unknown[];
      faixaTempoServico: unknown[];
      secretaria: unknown[];
      cargo: unknown[];
      localTrabalho: unknown[];
      cidCapitulo: unknown[];
    };
    validation: {
      consistency: {
        isStructureStable: boolean;
        isOverallConsistent: boolean;
      };
    };
  };

  assert.equal(body.contractVersion, "4.3.0");
  assert.equal(typeof body.generatedAt, "string");
  assert.ok(body.period);
  assert.ok(body.policy);
  assert.ok(body.overall);
  assert.ok(body.cuts);
  assert.ok(body.validation);

  assert.ok(Array.isArray(body.cuts.sexo));
  assert.ok(Array.isArray(body.cuts.faixaEtaria));
  assert.ok(Array.isArray(body.cuts.faixaTempoServico));
  assert.ok(Array.isArray(body.cuts.secretaria));
  assert.ok(Array.isArray(body.cuts.cargo));
  assert.ok(Array.isArray(body.cuts.localTrabalho));
  assert.ok(Array.isArray(body.cuts.cidCapitulo));

  assert.equal(body.validation.consistency.isStructureStable, true);
  assert.equal(body.validation.consistency.isOverallConsistent, true);
});
