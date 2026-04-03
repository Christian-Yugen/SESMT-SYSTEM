import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveErgonomicFactors,
  groupErgonomicActionPlans,
  groupErgonomicAssessments,
  groupErgonomicExposures,
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
      {
        ergonomic_factor_id: 3,
        codigo: "ERG-03",
        nome: "Iluminacao inadequada",
        descricao: "Conforto visual comprometido",
        categoria: "NR17_AMBIENTAL",
        fonte_normativa: "NR-17",
        is_active: false,
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
      {
        ergonomic_action_plan_id: 33,
        ergonomic_assessment_id: 13,
        servidor_id: 103,
        vinculo_id: 202,
        prioridade: "BAIXA",
        acao_recomendada: "Acompanhamento educativo",
        responsavel: "SESMT",
        data_prevista: "2026-06-01",
        data_execucao: null,
        status_acao: "PENDENTE",
        observacoes:
          "tipo_medida=EDUCACIONAL;posto=DISPENSACAO;tarefa=ATENDIMENTO_PONTUAL",
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

test("le fatores ergonomicos ativos e categorias NR-17", () => {
  const factors = getActiveErgonomicFactors(buildDataset());
  assert.equal(factors.length, 2);
  assert.equal(
    factors.every((item) => item.status === "ATIVO"),
    true,
  );
  assert.equal(
    factors.some((item) => item.categoryNR17 === "NR17_BIOMECANICA"),
    true,
  );
});

test("agrupa avaliacoes ergonomicas por contexto ocupacional", () => {
  const assessments = groupErgonomicAssessments(buildDataset());
  const target = assessments.find((item) => item.assessmentId === 11);

  assert.ok(target);
  assert.equal(target?.cargo, "ADMINISTRATIVO");
  assert.equal(target?.localTrabalho, "UPA_CENTRO");
  assert.equal(target?.setor, "ATENDIMENTO");
  assert.equal(target?.posto, "BALCAO_1");
  assert.equal(target?.tarefa, "DIGITACAO_CONTINUA");
  assert.equal(target?.preliminaryStatus, "CONCLUIDA");
  assert.equal(target?.aetStatus, "EM_ANDAMENTO");
  assert.equal(target?.responsible, "ERGO_SENIOR");
});

test("agrupa exposicoes ergonomicas por posto, tarefa, cargo e local", () => {
  const exposures = groupErgonomicExposures(buildDataset());
  const target = exposures.find((item) => item.exposureId === 21);

  assert.ok(target);
  assert.equal(target?.factorName, "MOVIMENTOS REPETITIVOS");
  assert.equal(target?.exposureLevel, "ALTA");
  assert.equal(target?.cargo, "ADMINISTRATIVO");
  assert.equal(target?.localTrabalho, "UPA_CENTRO");
  assert.equal(target?.posto, "BALCAO_1");
  assert.equal(target?.tarefa, "DIGITACAO_CONTINUA");
  assert.equal((target?.exposureScore || 0) > 0, true);
});

test("agrupa plano de acao ergonomico com medida, tipo, prioridade e status", () => {
  const plans = groupErgonomicActionPlans(buildDataset());
  const target = plans.find((item) => item.actionPlanId === 31);

  assert.ok(target);
  assert.equal(target?.priority, "ALTA");
  assert.equal(target?.measureType, "ENGENHARIA");
  assert.equal(target?.status, "EM_PLANO");
  assert.equal(target?.responsible, "SESMT");
  assert.equal(target?.dueDate, "2026-05-10");
});

test("integra risco ergonomico com score e criticidade explicavel", () => {
  const analysis = integrateErgonomicRiskProfile(buildDataset(), {
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  });

  assert.equal(analysis.signalsByAnalyticalGroup.length >= 2, true);
  const topSignal = analysis.signalsByAnalyticalGroup[0];

  assert.equal(topSignal.score > 0, true);
  assert.equal(
    ["BAIXA", "MODERADA", "ALTA", "CRITICA"].includes(topSignal.criticality),
    true,
  );
  assert.equal(topSignal.justification.length > 20, true);
  assert.equal(/causad|culpa|provou que/i.test(topSignal.justification), false);
  assert.equal(topSignal.scoreBreakdown.exposurePoints >= 0, true);
  assert.equal(topSignal.scoreBreakdown.assessmentPoints >= 0, true);
});

test("gera recortes minimos por cargo, local, posto, tarefa, fator, categoria e grupo musculoesqueletico", () => {
  const analysis = integrateErgonomicRiskProfile(buildDataset(), {
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  });

  assert.equal(analysis.cuts.cargo.length > 0, true);
  assert.equal(analysis.cuts.localTrabalho.length > 0, true);
  assert.equal(analysis.cuts.posto.length > 0, true);
  assert.equal(analysis.cuts.tarefa.length > 0, true);
  assert.equal(analysis.cuts.fatorErgonomico.length > 0, true);
  assert.equal(analysis.cuts.categoriaNR17.length > 0, true);
  assert.equal(analysis.cuts.grupoAnaliticoMusculoesqueletico.length > 0, true);

  assert.equal(
    analysis.cuts.fatorErgonomico.some(
      (item) => item.key === "MOVIMENTOS REPETITIVOS",
    ),
    true,
  );
  assert.equal(
    analysis.cuts.categoriaNR17.some((item) => item.key === "NR17_POSTURAL"),
    true,
  );
});

test("valida coerencia entre fatores, avaliacoes, exposicoes, acoes e criticidade", () => {
  const analysis = integrateErgonomicRiskProfile(buildDataset(), {
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  });

  assert.equal(analysis.validation.factorsAssessmentsConsistent, true);
  assert.equal(analysis.validation.exposuresAssessmentsConsistent, true);
  assert.equal(analysis.validation.actionsAssessmentsConsistent, true);
  assert.equal(analysis.validation.contextConsistency, true);
  assert.equal(analysis.validation.criticalityConsistency, true);
  assert.equal(analysis.validation.explainabilityConsistent, true);
  assert.equal(analysis.validation.hasBlockingIssues, false);
});
