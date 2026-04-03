# ABSENTEISMO INTELIGENTE FASE 6.2 - CONTRATO DE CONSUMO ERGONOMICO

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: contrato backend de consumo controlado da analise ergonomica NR-17 para uso interno futuro por servicos e endpoints, sem frontend novo e sem alteracao do legado operacional

---

## A. Objetivo da microfase

Definir e implementar o contrato de consumo ergonomico NR-17 com payload estavel, auditavel e seguro, cobrindo visao geral, recortes minimos, metadados de auditoria e validacoes de consistencia para exposicao interna futura.

---

## B. Fontes da camada ergonomica usadas

Camada de base consumida:

- src/lib/afastamentos-ergonomia.ts

Estruturas do schema abs_intel utilizadas indiretamente via repositorio e engine:

- abs_dim_ergonomic_factor
- abs_fact_ergonomic_assessment
- abs_fact_ergonomic_exposure
- abs_fact_ergonomic_action_plan
- abs_fact_afastamento_evento
- abs_fact_afastamento_cid
- abs_dim_vinculo_servidor
- abs_dim_tempo

Contrato implementado em:

- src/lib/afastamentos-ergonomia-contrato.ts

Teste de consumo:

- src/lib/tests/afastamentos-ergonomia-consumo.test.ts

---

## C. Contrato de saida por bloco

Raiz do contrato:

- contractVersion
- generatedAt
- period
- policy
- overview
- cuts
- validation

Bloco overview:

- periodo consolidado
- total de grupos analisados
- total de sinais ergonomicos identificados
- distribuicao por criticidade
- media e mediana de score
- principais fatores ergonomicos
- backlog de acoes abertas relevantes
- metadados de auditoria e observacoes

Bloco cuts:

- cargo
- localTrabalho
- posto
- tarefa
- fatorErgonomico
- categoriaNR17
- grupoAnaliticoMusculoesqueletico
- criticidade

Cada item de recorte retorna:

- dimension
- key
- metrics
- audit

---

## D. Campos e tipos

Campos principais:

- contractVersion: string
- generatedAt: string
- period: { startDate, endDate, diasPeriodo, competenciaInicio, competenciaFim }
- policy: { minAssessmentsForStableCriticality, minExposuresForStableCriticality, rounding }

Campos de overview.metrics:

- totalGroupsAnalyzed: number
- totalSignalsIdentified: number
- criticalityDistribution: { baixa, moderada, alta, critica, semCriticidadeEstavel }
- averageScore: number | null
- medianScore: number | null
- topActiveFactors: string[]
- openActionBacklog: number

Campos de cuts[*].metrics:

- groupCount: number
- signalCount: number
- assessmentCount: number
- exposureCount: number
- actionCount: number
- openRelevantActions: number
- averageScore: number | null
- medianScore: number | null
- maxScore: number | null
- criticality: BAIXA | MODERADA | ALTA | CRITICA | null
- stableContext: boolean
- topFactors: string[]

Campos de auditoria:

- fatoresUsados
- numeradores
- validade
- observacoes
- flags
- justification

---

## E. Regras de arredondamento

Politica padrao:

- scoreScale = 4
- shareScale = 4
- totalsScale = 4

Regras aplicadas:

- medias/medianas/maximos respeitam scoreScale
- contagens permanecem numericas e estaveis
- quando nao houver dado suficiente, o contrato retorna null para metricas derivadas, nunca NaN

---

## F. Regras de validacao

Validacoes implementadas:

1. estabilidade estrutural do payload
2. reconciliacao da distribuicao por criticidade com a visao geral
3. coerencia entre total de grupos e recortes agregados
4. conformidade de arredondamento
5. comportamento consistente em casos-limite
6. preservacao de linguagem nao causal e nao deterministica

Saida de validacao:

- isStructureStable
- isOverviewConsistent
- isCutsConsistent
- isRoundingConsistent
- isEdgeCaseBehaviorConsistent
- isNonCausalLanguageConsistent
- hasBlockingIssues
- issues[]

---

## G. Comportamento em casos-limite

Sem avaliacoes:

- hasAssessments = false
- flag sem_avaliacoes
- criticidade estavel pode ficar indisponivel conforme politica

Sem exposicoes:

- hasExposures = false
- flag sem_exposicoes
- criticidade estavel fica nula nos recortes do grupo

Sem acoes planejadas:

- hasActionPlans = false
- flag sem_acoes_planejadas
- openActionBacklog = 0

Contexto insuficiente para criticidade estavel:

- flag contexto_insuficiente_para_criticidade_estavel
- criticidade em recorte pode ficar null
- leitura permanece como risco ocupacional e monitoramento

---

## H. Criterios de explicabilidade

O contrato preserva explicabilidade por:

- score com decomposicao em componentes
- justificativas auditaveis por recorte
- top fatores por bloco
- flags de validade em overview e recortes
- coerencia entre criticidade e contexto minimo estavel

---

## I. Linguagem de cautela e nao determinismo causal

Regras preservadas:

- proibicao de linguagem causal automatica
- proibicao de linguagem deterministica de nexo
- uso de linguagem de risco, hipotese e monitoramento
- validacao textual de justificativas e observacoes

---

## J. Exemplos de payload

Exemplo resumido:

{
  "contractVersion": "6.2.0",
  "generatedAt": "2026-04-02T18:00:00.000Z",
  "period": {
    "startDate": "2026-01-01",
    "endDate": "2026-03-31",
    "diasPeriodo": 90,
    "competenciaInicio": 202601,
    "competenciaFim": 202603
  },
  "overview": {
    "metrics": {
      "totalGroupsAnalyzed": 2,
      "totalSignalsIdentified": 2,
      "criticalityDistribution": {
        "baixa": 0,
        "moderada": 1,
        "alta": 1,
        "critica": 0,
        "semCriticidadeEstavel": 0
      },
      "averageScore": 58.25,
      "medianScore": 58.25,
      "openActionBacklog": 1
    }
  }
}

---

## K. Proximo passo seguro

Proximo passo seguro recomendado:

- FASE 6.3 de prontidao para exposicao interna controlada da camada ergonomica, somente com autorizacao explicita.

Regra de governanca:

- a FASE 6.3 NAO e aberta automaticamente nesta entrega.
