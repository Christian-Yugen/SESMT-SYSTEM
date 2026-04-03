import assert from "node:assert/strict";
import test from "node:test";

import {
  PsychosocialApplicationError,
  type PsychosocialDataset,
  type PsychosocialRepository,
} from "../afastamentos-psychosocial";
import { handlePsychosocialContractRequest } from "../afastamentos-psychosocial-endpoint";

function buildDataset(): PsychosocialDataset {
  return {
    factors: [
      {
        psychosocial_factor_id: 1,
        codigo: "PSY-01",
        nome: "Sobrecarga de trabalho",
        descricao: "Demandas elevadas e prazos continuos.",
        categoria: "ORGANIZACAO_DO_TRABALHO",
        fonte_normativa: "NR-1",
        is_active: true,
      },
      {
        psychosocial_factor_id: 2,
        codigo: "PSY-02",
        nome: "Assedio institucional",
        descricao: "Relatos de pressao hostil.",
        categoria: "RELACOES_SOCIOPROFISSIONAIS",
        fonte_normativa: "NR-1",
        is_active: true,
      },
    ],
    assessments: [
      {
        psychosocial_assessment_id: 10,
        servidor_id: 101,
        vinculo_id: 201,
        tempo_id: 301,
        psychosocial_factor_id: 1,
        instrumento: "LIPT-69",
        score: 8.8,
        nivel_risco: "ALTO",
        avaliador: "Equipe SESMT",
        observacoes:
          "evidencia=Entrevistas estruturadas;acao_recomendada=Revisar carga;status_acao=EM_PLANO",
      },
      {
        psychosocial_assessment_id: 11,
        servidor_id: 102,
        vinculo_id: 201,
        tempo_id: 302,
        psychosocial_factor_id: 2,
        instrumento: "NR-1",
        score: 92,
        nivel_risco: "CRITICO",
        avaliador: "Equipe SESMT",
        observacoes:
          "evidencia=Questionario e entrevista;acao_recomendada=Intervencao organizacional;status_acao=EM_EXECUCAO",
      },
      {
        psychosocial_assessment_id: 12,
        servidor_id: 103,
        vinculo_id: 202,
        tempo_id: 302,
        psychosocial_factor_id: 1,
        instrumento: "LIPT-69",
        score: 3.2,
        nivel_risco: "MEDIO",
        avaliador: "Equipe SESMT",
        observacoes: "evidencia=Checklist local;status_acao=PENDENTE",
      },
    ],
    signals: [],
    events: [
      {
        afastamento_id: 401,
        servidor_id: 101,
        vinculo_id: 201,
        data_inicio: "2026-01-10",
        dias_afastado: 14,
      },
      {
        afastamento_id: 402,
        servidor_id: 101,
        vinculo_id: 201,
        data_inicio: "2026-02-12",
        dias_afastado: 18,
      },
      {
        afastamento_id: 403,
        servidor_id: 102,
        vinculo_id: 201,
        data_inicio: "2026-03-16",
        dias_afastado: 26,
      },
      {
        afastamento_id: 404,
        servidor_id: 103,
        vinculo_id: 202,
        data_inicio: "2026-03-09",
        dias_afastado: 8,
      },
      {
        afastamento_id: 405,
        servidor_id: 102,
        vinculo_id: 201,
        data_inicio: "2026-03-25",
        dias_afastado: 16,
      },
    ],
    cids: [
      {
        afastamento_id: 401,
        cid_codigo: "F41.1",
        cid_capitulo: "TRANSTORNOS_MENTAIS",
        occurrence_weight: 1,
        allocated_days: 14,
      },
      {
        afastamento_id: 402,
        cid_codigo: "F32.1",
        cid_capitulo: "TRANSTORNOS_MENTAIS",
        occurrence_weight: 1,
        allocated_days: 18,
      },
      {
        afastamento_id: 403,
        cid_codigo: "Z56.3",
        cid_capitulo: "FATORES_QUE_INFLUENCIAM_O_ESTADO_DE_SAUDE",
        occurrence_weight: 1,
        allocated_days: 26,
      },
      {
        afastamento_id: 404,
        cid_codigo: "J11",
        cid_capitulo: "DOENCAS_RESPIRATORIAS",
        occurrence_weight: 1,
        allocated_days: 8,
      },
      {
        afastamento_id: 405,
        cid_codigo: "F43.1",
        cid_capitulo: "TRANSTORNOS_MENTAIS",
        occurrence_weight: 1,
        allocated_days: 16,
      },
    ],
    vinculos: [
      {
        vinculo_id: 201,
        unidade_orcamentaria: "UO_EDUCACAO",
        local_trabalho: "ESCOLA_CENTRAL",
        secretaria: "EDUCACAO",
        cargo: "PROFESSOR",
        natureza_cargo: "DOCENTE",
      },
      {
        vinculo_id: 202,
        unidade_orcamentaria: "UO_SAUDE",
        local_trabalho: "UBS_CENTRO",
        secretaria: "SAUDE",
        cargo: "ADMINISTRATIVO",
        natureza_cargo: "ADMINISTRATIVO",
      },
    ],
    tempos: [
      {
        tempo_id: 301,
        data_calendario: "2026-01-15",
        competencia_yyyymm: 202601,
      },
      {
        tempo_id: 302,
        data_calendario: "2026-03-15",
        competencia_yyyymm: 202603,
      },
    ],
  };
}

function createRepository(
  dataset: PsychosocialDataset,
): PsychosocialRepository {
  return {
    async loadDataset() {
      return dataset;
    },
  };
}

function createFailingRepository(error: Error): PsychosocialRepository {
  return {
    async loadDataset() {
      throw error;
    },
  };
}

test("resposta 200 em cenario valido e estrutura do payload", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(buildDataset()),
    now: () => new Date("2026-04-02T15:00:00.000Z"),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-request-id") !== null, true);

  const body = (await response.json()) as {
    contractVersion: string;
    generatedAt: string;
    period: unknown;
    policy: unknown;
    overview: {
      metrics: { totalGroupsAnalyzed: number; totalSignalsIdentified: number };
      audit: {
        validade: { flags: string[] };
        observacoes: string[];
      };
    };
    cuts: {
      secretaria: unknown[];
      cargo: unknown[];
      localTrabalho: unknown[];
      grupoAnalitico: unknown[];
      cidCapitulo: unknown[];
      cidCompativel: unknown[];
      criticidade: unknown[];
    };
    validation: unknown;
  };

  assert.equal(body.contractVersion, "5.2.0");
  assert.equal(body.generatedAt, "2026-04-02T15:00:00.000Z");
  assert.ok(body.period);
  assert.ok(body.policy);
  assert.ok(body.overview);
  assert.ok(body.cuts);
  assert.ok(body.validation);
  assert.equal(body.overview.metrics.totalGroupsAnalyzed >= 1, true);
  assert.equal(body.overview.metrics.totalSignalsIdentified >= 1, true);
  assert.ok(Array.isArray(body.cuts.secretaria));
  assert.ok(Array.isArray(body.cuts.cargo));
  assert.ok(Array.isArray(body.cuts.localTrabalho));
  assert.ok(Array.isArray(body.cuts.grupoAnalitico));
  assert.ok(Array.isArray(body.cuts.cidCapitulo));
  assert.ok(Array.isArray(body.cuts.cidCompativel));
  assert.ok(Array.isArray(body.cuts.criticidade));
});

test("erro controlado em parametros invalidos", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-03-31&endDate=2026-01-01",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INVALID_QUERY_PARAMS");
  assert.equal(typeof body.error?.message, "string");
});

test("metodo nao permitido retorna 405 controlado", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31",
    { method: "POST" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 405);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "UNSUPPORTED_METHOD");
  assert.equal(typeof body.error?.message, "string");
});

test("ausencia de parametros obrigatorios retorna 400", async () => {
  const request = new Request("http://localhost/api/absenteismo/psicossocial", {
    method: "GET",
  });

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INVALID_QUERY_PARAMS");
});

test("minAssessmentsForStableCriticality invalido retorna 400", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31&minAssessmentsForStableCriticality=-1",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INVALID_QUERY_PARAMS");
  assert.equal(typeof body.error?.message, "string");
});

test("minSignalsForStableCriticality invalido retorna 400", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31&minSignalsForStableCriticality=abc",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INVALID_QUERY_PARAMS");
  assert.equal(typeof body.error?.message, "string");
});

test("parametro nao suportado retorna 400 previsivel", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31&debug=true",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INVALID_QUERY_PARAMS");
});

test("comportamento sem avaliacoes", async () => {
  const dataset = buildDataset();
  dataset.assessments = [];

  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(dataset),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    overview: {
      audit: { validade: { hasAssessments: boolean; flags: string[] } };
    };
    cuts: {
      grupoAnalitico: Array<{ metrics: { criticality: string | null } }>;
    };
  };
  assert.equal(body.overview.audit.validade.hasAssessments, false);
  assert.equal(
    body.overview.audit.validade.flags.includes("sem_avaliacoes"),
    true,
  );
  assert.equal(
    body.cuts.grupoAnalitico.every((item) => item.metrics.criticality === null),
    true,
  );
});

test("comportamento sem sinais", async () => {
  const dataset = buildDataset();
  dataset.cids = [];

  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(dataset),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    overview: {
      metrics: { averageScore: number | null; medianScore: number | null };
      audit: { validade: { hasSignals: boolean; flags: string[] } };
    };
    cuts: { grupoAnalitico: unknown[] };
  };

  assert.equal(body.overview.audit.validade.hasSignals, false);
  assert.equal(body.overview.metrics.averageScore, null);
  assert.equal(body.overview.metrics.medianScore, null);
  assert.equal(body.overview.audit.validade.flags.includes("sem_sinais"), true);
  assert.equal(body.cuts.grupoAnalitico.length, 0);
});

test("comportamento com contexto insuficiente", async () => {
  const dataset = buildDataset();
  dataset.assessments = dataset.assessments.slice(0, 1);

  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(dataset),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    overview: {
      audit: { validade: { hasStableContext: boolean; flags: string[] } };
    };
    cuts: { criticidade: Array<{ key: string }> };
  };

  assert.equal(body.overview.audit.validade.hasStableContext, false);
  assert.equal(
    body.overview.audit.validade.flags.includes(
      "contexto_insuficiente_para_criticidade_estavel",
    ),
    true,
  );
  assert.equal(
    body.cuts.criticidade.some(
      (item) => item.key === "SEM_CRITICIDADE_ESTAVEL",
    ),
    true,
  );
});

test("preserva justificativa auditavel e linguagem nao causal", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    overview: { audit: { observacoes: string[] } };
    cuts: { secretaria: Array<{ audit: { justification: string } }> };
  };
  const text = [
    ...body.overview.audit.observacoes,
    ...body.cuts.secretaria.map((item) => item.audit.justification),
  ].join(" ");

  assert.equal(/nao causal/i.test(text), true);
  assert.equal(/causad|culpa|provou que/i.test(text), false);
});

test("ausencia de regressao do contrato e metadados de auditoria", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31&minAssessmentsForStableCriticality=2&minSignalsForStableCriticality=1",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    contractVersion: string;
    overview: {
      audit: {
        period: unknown;
        validade: { isValid: boolean; flags: string[] };
      };
    };
    validation: {
      consistency: {
        isStructureStable: boolean;
        isOverviewConsistent: boolean;
        isCutsConsistent: boolean;
        isNonCausalLanguageConsistent: boolean;
      };
    };
  };

  assert.equal(body.contractVersion, "5.2.0");
  assert.ok(body.overview.audit.period);
  assert.equal(body.overview.audit.validade.isValid, true);
  assert.equal(
    body.overview.audit.validade.flags.includes("valido_para_consumo_interno"),
    true,
  );
  assert.equal(body.validation.consistency.isStructureStable, true);
  assert.equal(body.validation.consistency.isOverviewConsistent, true);
  assert.equal(body.validation.consistency.isCutsConsistent, true);
  assert.equal(body.validation.consistency.isNonCausalLanguageConsistent, true);
});

test("acesso interno invalido retorna 401", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31",
    {
      method: "GET",
      headers: {
        "x-internal-api-key": "wrong-key",
      },
    },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createRepository(buildDataset()),
    requiredAccessToken: "expected-key",
  });

  assert.equal(response.status, 401);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "UNAUTHORIZED");
});

test("falha controlada da camada de aplicacao retorna erro interno consistente", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createFailingRepository(
      new PsychosocialApplicationError("Simulated controlled failure"),
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

test("resposta consistente em erro interno inesperado", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createFailingRepository(new Error("Unexpected failure")),
  });

  assert.equal(response.status, 500);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.deepEqual(Object.keys(body), ["error"]);
  assert.equal(body.error?.code, "INTERNAL_ERROR");
  assert.equal(typeof body.error?.message, "string");
  assert.equal(
    /causad|culpa|provou que/i.test(body.error?.message || ""),
    false,
  );
});

test("preserva linguagem nao causal em cenario degradado", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/psicossocial?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handlePsychosocialContractRequest(request, {
    repository: createFailingRepository(
      new PsychosocialApplicationError("Controlled failure"),
    ),
  });

  assert.equal(response.status, 500);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  const degradedText = `${body.error?.code || ""} ${body.error?.message || ""}`;
  assert.equal(body.error?.code, "INTERNAL_ERROR");
  assert.equal(/hipotese|sinal|investigacao|falha/i.test(degradedText), true);
  assert.equal(/causad|culpa|provou que/i.test(degradedText), false);
});
