import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPsychosocialConsumptionContract,
  buildPsychosocialConsumptionContractFromRepository,
} from "../afastamentos-psychosocial-contrato";
import {
  integrateRiskProfile,
  type PsychosocialDataset,
} from "../afastamentos-psychosocial";

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

test("estrutura do payload e campos obrigatorios", async () => {
  const repository = {
    async loadDataset() {
      return buildDataset();
    },
  };
  const contract = await buildPsychosocialConsumptionContractFromRepository(
    repository,
    {
      period: { startDate: "2026-01-01", endDate: "2026-03-31" },
      options: { generatedAt: "2026-04-02T12:00:00.000Z" },
    },
  );

  assert.equal(contract.contractVersion, "5.2.0");
  assert.equal(contract.generatedAt, "2026-04-02T12:00:00.000Z");
  assert.ok(contract.overview.metrics);
  assert.ok(Array.isArray(contract.cuts.secretaria));
  assert.ok(Array.isArray(contract.cuts.criticidade));
  assert.ok(Array.isArray(contract.overview.audit.observacoes));
});

test("tipos esperados e distribuicao por criticidade", () => {
  const analysis = integrateRiskProfile(buildDataset(), {
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  });
  const contract = buildPsychosocialConsumptionContract(analysis);

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
    contract.overview.metrics.criticalityDistribution.critica >= 1,
    true,
  );
  assert.equal(
    contract.cuts.criticidade.some((item) => item.key === "CRITICA"),
    true,
  );
});

test("comportamento sem avaliacoes", () => {
  const dataset = buildDataset();
  dataset.assessments = [];

  const contract = buildPsychosocialConsumptionContract(
    integrateRiskProfile(dataset, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    }),
  );

  assert.equal(contract.overview.audit.validade.hasAssessments, false);
  assert.equal(
    contract.overview.audit.validade.flags.includes("sem_avaliacoes"),
    true,
  );
  assert.equal(
    contract.cuts.grupoAnalitico.every(
      (item) => item.metrics.criticality === null,
    ),
    true,
  );
});

test("comportamento sem sinais", () => {
  const dataset = buildDataset();
  dataset.cids = [];

  const contract = buildPsychosocialConsumptionContract(
    integrateRiskProfile(dataset, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    }),
  );

  assert.equal(contract.overview.audit.validade.hasSignals, false);
  assert.equal(contract.overview.metrics.averageScore, null);
  assert.equal(contract.overview.metrics.medianScore, null);
  assert.equal(contract.cuts.grupoAnalitico.length, 0);
});

test("comportamento com contexto insuficiente para criticidade estavel", () => {
  const dataset = buildDataset();
  dataset.assessments = dataset.assessments.slice(0, 1);

  const contract = buildPsychosocialConsumptionContract(
    integrateRiskProfile(dataset, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    }),
  );

  assert.equal(
    contract.cuts.grupoAnalitico.some((item) =>
      item.audit.flags.includes(
        "contexto_insuficiente_para_criticidade_estavel",
      ),
    ),
    true,
  );
});

test("preserva justificativa auditavel e linguagem nao causal", () => {
  const contract = buildPsychosocialConsumptionContract(
    integrateRiskProfile(buildDataset(), {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    }),
  );

  const topGroup = contract.cuts.grupoAnalitico[0];
  assert.ok(topGroup.audit.justification.includes("linguagem nao causal"));
  assert.equal(
    /causad|culpa|provou que/i.test(topGroup.audit.justification),
    false,
  );
  assert.equal(contract.validation.consistency.hasBlockingIssues, false);
  assert.equal(
    contract.validation.consistency.isNonCausalLanguageConsistent,
    true,
  );
});
