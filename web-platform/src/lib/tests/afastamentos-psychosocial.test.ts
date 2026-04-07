import assert from "node:assert/strict";
import test from "node:test";

import {
  getActivePsychosocialFactors,
  groupPsychosocialAssessments,
  integrateRiskProfile,
  labelZoneCID_F,
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
      {
        psychosocial_factor_id: 3,
        codigo: "PSY-03",
        nome: "Fator inativo",
        descricao: null,
        categoria: "LEGADO",
        fonte_normativa: "NR-1",
        is_active: false,
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
          "evidencia=Entrevistas estruturadas e relatos convergentes;acao_recomendada=Revisar distribuicao de carga;status_acao=EM_PLANO",
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
          "evidencia=Questionario e entrevista com pares;acao_recomendada=Formalizar protocolo de intervencao;status_acao=EM_EXECUCAO",
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
        servidor_id: 101,
        unidade_orcamentaria: "UO_EDUCACAO",
        local_trabalho: "ESCOLA_CENTRAL",
        secretaria: "EDUCACAO",
        cargo: "PROFESSOR",
        natureza_cargo: "DOCENTE",
      },
      {
        vinculo_id: 202,
        servidor_id: 103,
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

test("le leitura de fatores psicossociais ativos", () => {
  const factors = getActivePsychosocialFactors(buildDataset());

  assert.equal(factors.length, 2);
  assert.equal(factors[0].status, "ATIVO");
  assert.equal(
    factors.some((factor) => factor.factor === "Fator inativo"),
    false,
  );
});

test("agrupa avaliacoes com contexto ocupacional e evidencia", () => {
  const grouped = groupPsychosocialAssessments(buildDataset());
  const educationAssessment = grouped.find(
    (assessment) =>
      assessment.secretaria === "EDUCACAO" &&
      assessment.evaluationMethod === "LIPT-69",
  );

  assert.ok(educationAssessment);
  assert.equal(educationAssessment?.cargo, "DOCENTE");
  assert.equal(educationAssessment?.evaluationMethod, "LIPT-69");
  assert.equal(
    educationAssessment?.recommendedAction.includes(
      "Revisar distribuicao de carga",
    ),
    true,
  );
  assert.equal(educationAssessment?.actionStatus, "EM_PLANO");
});

test("constroi sinal psicossocial explicavel por grupo analitico", () => {
  const analysis = integrateRiskProfile(buildDataset(), {
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  });
  const topSignal = analysis.signalsByAnalyticalGroup[0];

  assert.ok(topSignal);
  assert.equal(topSignal.secretaria, "EDUCACAO");
  assert.equal(topSignal.criticality, "CRITICA");
  assert.equal(topSignal.score >= 75, true);
  assert.equal(topSignal.cidZone, "HIPOTESE_OCUPACIONAL_REFORCADA");
  assert.equal(
    topSignal.justification.includes("sem causalidade automatica"),
    true,
  );
  assert.equal(topSignal.factorNames.length >= 2, true);
});

test("gera recortes minimos por secretaria, cargo, local e CID", () => {
  const analysis = integrateRiskProfile(buildDataset(), {
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  });

  assert.equal(
    analysis.cuts.secretaria.some((item) => item.key === "EDUCACAO"),
    true,
  );
  assert.equal(
    analysis.cuts.cargo.some((item) => item.key === "DOCENTE"),
    true,
  );
  assert.equal(
    analysis.cuts.localTrabalho.some((item) => item.key === "ESCOLA_CENTRAL"),
    true,
  );
  assert.equal(
    analysis.cuts.cidCapitulo.some(
      (item) => item.key === "TRANSTORNOS_MENTAIS",
    ),
    true,
  );
  assert.equal(
    analysis.cuts.cidCompativel.some((item) => item.key === "CID_COMPATIVEL"),
    true,
  );
});

test("valida coerencia metodologica e rotulagem CID F", () => {
  const analysis = integrateRiskProfile(buildDataset(), {
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  });

  assert.equal(analysis.validation.factorsAssessmentsConsistent, true);
  assert.equal(analysis.validation.signalsEpidemiologyConsistent, true);
  assert.equal(analysis.validation.contextConsistency, true);
  assert.equal(analysis.validation.explainabilityConsistent, true);
  assert.equal(analysis.validation.hasBlockingIssues, false);

  assert.equal(
    labelZoneCID_F({
      cidFShare: 0.45,
      totalAssessments: 2,
      averageExposureScore: 78,
      score: 80,
    }),
    "HIPOTESE_OCUPACIONAL_REFORCADA",
  );
});
