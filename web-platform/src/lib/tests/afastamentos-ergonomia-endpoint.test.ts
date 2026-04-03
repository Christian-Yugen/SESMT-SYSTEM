import assert from "node:assert/strict";
import test from "node:test";

import {
  ErgonomicApplicationError,
  type ErgonomicDataset,
  type ErgonomicRepository,
} from "../afastamentos-ergonomia";
import { handleErgonomicContractRequest } from "../afastamentos-ergonomia-endpoint";

function buildDataset(): ErgonomicDataset {
  return {
    factors: [
      {
        ergonomic_factor_id: 1,
        codigo: "ERG-01",
        nome: "Movimentos repetitivos",
        descricao: "Alta repetitividade de membros superiores",
        categoria: "NR17_BIOMECANICA",
        fonte_normativa: "NR-17",
        is_active: true,
      },
      {
        ergonomic_factor_id: 2,
        codigo: "ERG-02",
        nome: "Postura estatica prolongada",
        descricao: "Manutencao de postura sem alternancia",
        categoria: "NR17_POSTURAL",
        fonte_normativa: "NR-17",
        is_active: true,
      },
    ],
    assessments: [
      {
        ergonomic_assessment_id: 11,
        servidor_id: 101,
        vinculo_id: 201,
        tempo_id: 301,
        ergonomic_factor_id: 1,
        metodo_avaliacao: "AET",
        score: 8.5,
        nivel_risco: "ALTO",
        avaliador: "Equipe Ergonomia",
        observacoes:
          "setor=ATENDIMENTO;posto=BALCAO_1;tarefa=DIGITACAO_CONTINUA;status_preliminar=CONCLUIDA;status_aet=EM_ANDAMENTO;responsavel=ERGO_SENIOR",
      },
      {
        ergonomic_assessment_id: 12,
        servidor_id: 102,
        vinculo_id: 201,
        tempo_id: 302,
        ergonomic_factor_id: 2,
        metodo_avaliacao: "CHECKLIST_NR17",
        score: 7.2,
        nivel_risco: "MODERADO",
        avaliador: "Equipe Ergonomia",
        observacoes:
          "setor=ATENDIMENTO;posto=BALCAO_1;tarefa=DIGITACAO_CONTINUA;status_preliminar=CONCLUIDA;status_aet=EM_ANDAMENTO",
      },
      {
        ergonomic_assessment_id: 13,
        servidor_id: 103,
        vinculo_id: 202,
        tempo_id: 302,
        ergonomic_factor_id: 1,
        metodo_avaliacao: "AET",
        score: 3.1,
        nivel_risco: "BAIXO",
        avaliador: "Equipe Ergonomia",
        observacoes:
          "setor=FARMACIA;posto=DISPENSACAO;tarefa=ATENDIMENTO_PONTUAL;status_preliminar=EM_ANALISE;status_aet=NAO_INICIADA",
      },
    ],
    exposures: [
      {
        ergonomic_exposure_id: 21,
        servidor_id: 101,
        vinculo_id: 201,
        ergonomic_factor_id: 1,
        local_trabalho: "UPA_CENTRO",
        frequencia_exposicao: "DIARIA",
        intensidade_exposicao: "ALTA",
        inicio_exposicao: "2026-01-01",
        fim_exposicao: null,
        observacoes:
          "posto=BALCAO_1;tarefa=DIGITACAO_CONTINUA;nivel_exposicao=ALTA",
      },
      {
        ergonomic_exposure_id: 22,
        servidor_id: 102,
        vinculo_id: 201,
        ergonomic_factor_id: 2,
        local_trabalho: "UPA_CENTRO",
        frequencia_exposicao: "DIARIA",
        intensidade_exposicao: "MODERADA",
        inicio_exposicao: "2026-01-01",
        fim_exposicao: null,
        observacoes:
          "posto=BALCAO_1;tarefa=DIGITACAO_CONTINUA;nivel_exposicao=MODERADA",
      },
      {
        ergonomic_exposure_id: 23,
        servidor_id: 103,
        vinculo_id: 202,
        ergonomic_factor_id: 1,
        local_trabalho: "UBS_SUL",
        frequencia_exposicao: "SEMANAL",
        intensidade_exposicao: "BAIXA",
        inicio_exposicao: "2026-01-01",
        fim_exposicao: null,
        observacoes:
          "posto=DISPENSACAO;tarefa=ATENDIMENTO_PONTUAL;nivel_exposicao=BAIXA",
      },
    ],
    actionPlans: [
      {
        ergonomic_action_plan_id: 31,
        ergonomic_assessment_id: 11,
        servidor_id: 101,
        vinculo_id: 201,
        prioridade: "ALTA",
        acao_recomendada: "Ajustar altura de bancada e pausas programadas",
        responsavel: "SESMT",
        data_prevista: "2026-05-10",
        data_execucao: null,
        status_acao: "EM_PLANO",
        observacoes:
          "tipo_medida=ENGENHARIA;posto=BALCAO_1;tarefa=DIGITACAO_CONTINUA",
      },
      {
        ergonomic_action_plan_id: 32,
        ergonomic_assessment_id: 12,
        servidor_id: 102,
        vinculo_id: 201,
        prioridade: "MODERADA",
        acao_recomendada: "Rodizio de atividade e orientacao postural",
        responsavel: "GESTOR_LOCAL",
        data_prevista: "2026-05-20",
        data_execucao: null,
        status_acao: "EM_EXECUCAO",
        observacoes:
          "tipo_medida=ORGANIZACIONAL;posto=BALCAO_1;tarefa=DIGITACAO_CONTINUA",
      },
    ],
    events: [
      {
        afastamento_id: 1001,
        servidor_id: 101,
        vinculo_id: 201,
        data_inicio: "2026-01-10",
        dias_afastado: 8,
      },
      {
        afastamento_id: 1002,
        servidor_id: 101,
        vinculo_id: 201,
        data_inicio: "2026-02-12",
        dias_afastado: 10,
      },
      {
        afastamento_id: 1003,
        servidor_id: 102,
        vinculo_id: 201,
        data_inicio: "2026-03-08",
        dias_afastado: 12,
      },
      {
        afastamento_id: 1004,
        servidor_id: 103,
        vinculo_id: 202,
        data_inicio: "2026-03-22",
        dias_afastado: 3,
      },
    ],
    cids: [
      {
        afastamento_id: 1001,
        cid_codigo: "M54.5",
        cid_capitulo: "MUSCULOESQUELETICO",
        occurrence_weight: 1,
        allocated_days: 8,
      },
      {
        afastamento_id: 1002,
        cid_codigo: "M79.1",
        cid_capitulo: "MUSCULOESQUELETICO",
        occurrence_weight: 1,
        allocated_days: 10,
      },
      {
        afastamento_id: 1003,
        cid_codigo: "G56.0",
        cid_capitulo: "SISTEMA_NERVOSO",
        occurrence_weight: 1,
        allocated_days: 12,
      },
      {
        afastamento_id: 1004,
        cid_codigo: "J11",
        cid_capitulo: "RESPIRATORIO",
        occurrence_weight: 1,
        allocated_days: 3,
      },
    ],
    vinculos: [
      {
        vinculo_id: 201,
        unidade_orcamentaria: "UO_SAUDE_URG",
        local_trabalho: "UPA_CENTRO",
        secretaria: "SAUDE",
        cargo: "TECNICO_ADMIN",
        natureza_cargo: "ADMINISTRATIVO",
        subdivisao: "ATENDIMENTO",
      },
      {
        vinculo_id: 202,
        unidade_orcamentaria: "UO_SAUDE_BASE",
        local_trabalho: "UBS_SUL",
        secretaria: "SAUDE",
        cargo: "AUXILIAR",
        natureza_cargo: "ASSISTENCIAL",
        subdivisao: "FARMACIA",
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

function createRepository(dataset: ErgonomicDataset): ErgonomicRepository {
  return {
    async loadDataset() {
      return dataset;
    },
  };
}

function createFailingRepository(error: Error): ErgonomicRepository {
  return {
    async loadDataset() {
      throw error;
    },
  };
}

test("resposta 200 em cenario valido e estrutura do payload", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
    repository: createRepository(buildDataset()),
    now: () => new Date("2026-04-02T19:00:00.000Z"),
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
      cargo: unknown[];
      localTrabalho: unknown[];
      posto: unknown[];
      tarefa: unknown[];
      fatorErgonomico: unknown[];
      categoriaNR17: unknown[];
      grupoAnaliticoMusculoesqueletico: unknown[];
      criticidade: unknown[];
    };
    validation: unknown;
  };

  assert.equal(body.contractVersion, "6.2.0");
  assert.equal(body.generatedAt, "2026-04-02T19:00:00.000Z");
  assert.ok(body.period);
  assert.ok(body.policy);
  assert.ok(body.overview);
  assert.ok(body.cuts);
  assert.ok(body.validation);
  assert.equal(body.overview.metrics.totalGroupsAnalyzed >= 1, true);
  assert.equal(body.overview.metrics.totalSignalsIdentified >= 1, true);
  assert.ok(Array.isArray(body.cuts.cargo));
  assert.ok(Array.isArray(body.cuts.localTrabalho));
  assert.ok(Array.isArray(body.cuts.posto));
  assert.ok(Array.isArray(body.cuts.tarefa));
  assert.ok(Array.isArray(body.cuts.fatorErgonomico));
  assert.ok(Array.isArray(body.cuts.categoriaNR17));
  assert.ok(Array.isArray(body.cuts.grupoAnaliticoMusculoesqueletico));
  assert.ok(Array.isArray(body.cuts.criticidade));
});

test("erro controlado em parametros invalidos", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-03-31&endDate=2026-01-01",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
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
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31",
    { method: "POST" },
  );

  const response = await handleErgonomicContractRequest(request, {
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
  const request = new Request("http://localhost/api/absenteismo/ergonomia", {
    method: "GET",
  });

  const response = await handleErgonomicContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INVALID_QUERY_PARAMS");
});

test("minExposuresForStableCriticality invalido retorna 400", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31&minExposuresForStableCriticality=abc",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INVALID_QUERY_PARAMS");
  assert.equal(typeof body.error?.message, "string");
});

test("minAssessmentsForStableCriticality invalido retorna 400", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31&minAssessmentsForStableCriticality=-1",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(body.error?.code, "INVALID_QUERY_PARAMS");
  assert.equal(typeof body.error?.message, "string");
});

test("parametros de estabilidade acima do limite retornam 400", async () => {
  const requestAssessments = new Request(
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31&minAssessmentsForStableCriticality=366",
    { method: "GET" },
  );

  const responseAssessments = await handleErgonomicContractRequest(
    requestAssessments,
    {
      repository: createRepository(buildDataset()),
    },
  );

  assert.equal(responseAssessments.status, 400);
  const bodyAssessments = (await responseAssessments.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(bodyAssessments.error?.code, "INVALID_QUERY_PARAMS");
  assert.equal(typeof bodyAssessments.error?.message, "string");

  const requestExposures = new Request(
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31&minExposuresForStableCriticality=366",
    { method: "GET" },
  );

  const responseExposures = await handleErgonomicContractRequest(
    requestExposures,
    {
      repository: createRepository(buildDataset()),
    },
  );

  assert.equal(responseExposures.status, 400);
  const bodyExposures = (await responseExposures.json()) as {
    error?: { code?: string; message?: string };
  };
  assert.equal(bodyExposures.error?.code, "INVALID_QUERY_PARAMS");
  assert.equal(typeof bodyExposures.error?.message, "string");
});

test("parametro nao suportado retorna 400 previsivel", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31&debug=true",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
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
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
    repository: createRepository(dataset),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    overview: {
      audit: { validade: { hasAssessments: boolean; flags: string[] } };
    };
  };
  assert.equal(body.overview.audit.validade.hasAssessments, false);
  assert.equal(
    body.overview.audit.validade.flags.includes("sem_avaliacoes"),
    true,
  );
});

test("comportamento sem exposicoes", async () => {
  const dataset = buildDataset();
  dataset.exposures = [];

  const request = new Request(
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
    repository: createRepository(dataset),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    overview: {
      audit: { validade: { hasExposures: boolean; flags: string[] } };
    };
    cuts: {
      grupoAnaliticoMusculoesqueletico: Array<{
        metrics: { criticality: string | null };
      }>;
    };
  };
  assert.equal(body.overview.audit.validade.hasExposures, false);
  assert.equal(
    body.overview.audit.validade.flags.includes("sem_exposicoes"),
    true,
  );
  assert.equal(
    body.cuts.grupoAnaliticoMusculoesqueletico.every(
      (item) => item.metrics.criticality === null,
    ),
    true,
  );
});

test("comportamento sem acoes planejadas", async () => {
  const dataset = buildDataset();
  dataset.actionPlans = [];

  const request = new Request(
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
    repository: createRepository(dataset),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    overview: {
      metrics: { openActionBacklog: number };
      audit: { validade: { hasActionPlans: boolean; flags: string[] } };
    };
  };
  assert.equal(body.overview.audit.validade.hasActionPlans, false);
  assert.equal(
    body.overview.audit.validade.flags.includes("sem_acoes_planejadas"),
    true,
  );
  assert.equal(body.overview.metrics.openActionBacklog, 0);
});

test("comportamento com contexto insuficiente", async () => {
  const dataset = buildDataset();
  dataset.assessments = dataset.assessments.slice(0, 1);

  const request = new Request(
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
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
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
    repository: createRepository(buildDataset()),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    overview: { audit: { observacoes: string[] } };
    cuts: {
      cargo: Array<{ audit: { justification: string } }>;
    };
  };
  const text = [
    ...body.overview.audit.observacoes,
    ...body.cuts.cargo.map((item) => item.audit.justification),
  ].join(" ");
  const sanitizedText = text.replaceAll(
    /nao deterministica|não determinística/gi,
    "",
  );

  assert.equal(/nao deterministica|nao causal/i.test(text), true);
  assert.equal(
    /causad|culpa|provou que|determinist/i.test(sanitizedText),
    false,
  );
});

test("ausencia de regressao do contrato e metadados de auditoria", async () => {
  const request = new Request(
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31&minAssessmentsForStableCriticality=2&minExposuresForStableCriticality=1",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
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

  assert.equal(body.contractVersion, "6.2.0");
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
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31",
    {
      method: "GET",
      headers: {
        "x-internal-api-key": "wrong-key",
      },
    },
  );

  const response = await handleErgonomicContractRequest(request, {
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
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
    repository: createFailingRepository(
      new ErgonomicApplicationError("Simulated controlled failure"),
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
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
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
    "http://localhost/api/absenteismo/ergonomia?startDate=2026-01-01&endDate=2026-03-31",
    { method: "GET" },
  );

  const response = await handleErgonomicContractRequest(request, {
    repository: createFailingRepository(
      new ErgonomicApplicationError("Controlled failure"),
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
