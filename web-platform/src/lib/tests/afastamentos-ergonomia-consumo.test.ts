import assert from "node:assert/strict";
import test from "node:test";

import {
  buildErgonomicConsumptionContract,
  buildErgonomicConsumptionContractFromRepository,
} from "../afastamentos-ergonomia-contrato";
import {
  integrateErgonomicRiskProfile,
  type ErgonomicDataset,
} from "../afastamentos-ergonomia";

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
        servidor_id: 101,
        unidade_orcamentaria: "UO_SAUDE_URG",
        local_trabalho: "UPA_CENTRO",
        secretaria: "SAUDE",
        cargo: "TECNICO_ADMIN",
        natureza_cargo: "ADMINISTRATIVO",
        subdivisao: "ATENDIMENTO",
      },
      {
        vinculo_id: 202,
        servidor_id: 103,
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

test("estrutura do payload e campos obrigatorios", async () => {
  const repository = {
    async loadDataset() {
      return buildDataset();
    },
  };

  const contract = await buildErgonomicConsumptionContractFromRepository(
    repository,
    {
      period: { startDate: "2026-01-01", endDate: "2026-03-31" },
      options: { generatedAt: "2026-04-02T18:00:00.000Z" },
    },
  );

  assert.equal(contract.contractVersion, "6.2.0");
  assert.equal(contract.generatedAt, "2026-04-02T18:00:00.000Z");
  assert.ok(contract.overview.metrics);
  assert.ok(Array.isArray(contract.cuts.cargo));
  assert.ok(Array.isArray(contract.cuts.criticidade));
  assert.ok(Array.isArray(contract.overview.audit.observacoes));
});

test("tipos esperados e distribuicao por criticidade", () => {
  const analysis = integrateErgonomicRiskProfile(buildDataset(), {
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  });
  const contract = buildErgonomicConsumptionContract(analysis);

  assert.equal(typeof contract.overview.metrics.totalGroupsAnalyzed, "number");
  assert.equal(
    typeof contract.overview.metrics.totalSignalsIdentified,
    "number",
  );
  assert.equal(
    typeof contract.overview.metrics.criticalityDistribution.critica,
    "number",
  );
  assert.equal(
    contract.cuts.criticidade.some(
      (item) => item.key === "ALTA" || item.key === "CRITICA",
    ),
    true,
  );
});

test("comportamento sem avaliacoes", () => {
  const dataset = buildDataset();
  dataset.assessments = [];

  const contract = buildErgonomicConsumptionContract(
    integrateErgonomicRiskProfile(dataset, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    }),
  );

  assert.equal(contract.overview.audit.validade.hasAssessments, false);
  assert.equal(
    contract.overview.audit.validade.flags.includes("sem_avaliacoes"),
    true,
  );
});

test("comportamento sem exposicoes", () => {
  const dataset = buildDataset();
  dataset.exposures = [];

  const contract = buildErgonomicConsumptionContract(
    integrateErgonomicRiskProfile(dataset, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    }),
  );

  assert.equal(contract.overview.audit.validade.hasExposures, false);
  assert.equal(
    contract.overview.audit.validade.flags.includes("sem_exposicoes"),
    true,
  );
  assert.equal(
    contract.cuts.grupoAnaliticoMusculoesqueletico.every(
      (item) => item.metrics.criticality === null,
    ),
    true,
  );
});

test("comportamento sem acoes planejadas", () => {
  const dataset = buildDataset();
  dataset.actionPlans = [];

  const contract = buildErgonomicConsumptionContract(
    integrateErgonomicRiskProfile(dataset, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    }),
  );

  assert.equal(contract.overview.audit.validade.hasActionPlans, false);
  assert.equal(
    contract.overview.audit.validade.flags.includes("sem_acoes_planejadas"),
    true,
  );
  assert.equal(contract.overview.metrics.openActionBacklog, 0);
});

test("comportamento com contexto insuficiente para criticidade estavel", () => {
  const dataset = buildDataset();
  dataset.assessments = dataset.assessments.slice(0, 1);

  const contract = buildErgonomicConsumptionContract(
    integrateErgonomicRiskProfile(dataset, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    }),
    {
      minAssessmentsForStableCriticality: 2,
      minExposuresForStableCriticality: 1,
    },
  );

  assert.equal(contract.overview.audit.validade.hasStableContext, false);
  assert.equal(
    contract.overview.audit.validade.flags.includes(
      "contexto_insuficiente_para_criticidade_estavel",
    ),
    true,
  );
  assert.equal(
    contract.cuts.criticidade.some(
      (item) => item.key === "SEM_CRITICIDADE_ESTAVEL",
    ),
    true,
  );
});

test("preserva justificativa auditavel e ausencia de linguagem causal", () => {
  const contract = buildErgonomicConsumptionContract(
    integrateErgonomicRiskProfile(buildDataset(), {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    }),
  );

  const text = [
    ...contract.overview.audit.observacoes,
    ...contract.cuts.cargo.map((item) => item.audit.justification),
  ].join(" ");

  assert.equal(/explicavel|nao deterministica|nao causal/i.test(text), true);
  assert.equal(/causad|culpa|provou que|deterministico/i.test(text), false);
});

test("consistencia global entre visao geral e recortes", () => {
  const contract = buildErgonomicConsumptionContract(
    integrateErgonomicRiskProfile(buildDataset(), {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    }),
  );

  assert.equal(contract.validation.consistency.isStructureStable, true);
  assert.equal(contract.validation.consistency.isOverviewConsistent, true);
  assert.equal(contract.validation.consistency.isCutsConsistent, true);
  assert.equal(contract.validation.consistency.isRoundingConsistent, true);
  assert.equal(
    contract.validation.consistency.isEdgeCaseBehaviorConsistent,
    true,
  );
  assert.equal(
    contract.validation.consistency.isNonCausalLanguageConsistent,
    true,
  );
  assert.equal(contract.validation.consistency.hasBlockingIssues, false);
});
