# ABSENTEISMO_INTELIGENTE - FASE 5.2

## Contrato de Consumo Psicossocial e Prontidao de Exposicao Interna

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: contrato de consumo backend da camada psicossocial NR-1, com DTO estavel, validacao e comportamento controlado para exposicao interna futura, sem frontend novo e sem alteracao do legado operacional

---

## A. Objetivo da microfase

Definir e implementar o contrato de consumo controlado da analise psicossocial NR-1 para uso futuro por servicos e endpoints internos, com payload estavel, auditavel, seguro e aderente a linguagem de cautela exigida para sinais psicossociais e CID F.

---

## B. Fontes da camada psicossocial usadas

Camada de base consumida:

- `src/lib/afastamentos-psychosocial.ts`

Estruturas do schema `abs_intel` utilizadas indiretamente via repositorio e engine:

- `abs_dim_psychosocial_factor`
- `abs_fact_psychosocial_assessment`
- `abs_fact_psychosocial_signal`
- `abs_fact_afastamento_evento`
- `abs_fact_afastamento_cid`
- `abs_dim_vinculo_servidor`
- `abs_dim_tempo`

Contrato implementado em:

- `src/lib/afastamentos-psychosocial-contrato.ts`

Teste de consumo:

- `src/lib/tests/afastamentos-psychosocial-consumo.test.ts`

---

## C. Contrato de saida por bloco

Raiz do contrato:

- `contractVersion`
- `generatedAt`
- `period`
- `policy`
- `overview`
- `cuts`
- `validation`

Bloco `overview`:

- total de grupos analisados
- total de sinais identificados
- distribuicao por criticidade
- media e mediana de score
- principais fatores ativos relacionados
- metadados de auditoria

Bloco `cuts`:

- `secretaria`
- `cargo`
- `localTrabalho`
- `grupoAnalitico`
- `cidCapitulo`
- `cidCompativel`
- `criticidade`

Cada item de recorte retorna:

- `dimension`
- `key`
- `metrics`
- `audit`

---

## D. Campos e tipos

Campos principais:

- `contractVersion: string`
- `generatedAt: string`
- `period: { startDate, endDate, diasPeriodo, competenciaInicio, competenciaFim }`
- `policy: { minAssessmentsForStableCriticality, minSignalsForStableCriticality, rounding }`

Campos de `overview.metrics`:

- `totalGroupsAnalyzed: number`
- `totalSignalsIdentified: number`
- `criticalityDistribution: { baixa, moderada, alta, critica, semCriticidadeEstavel }`
- `averageScore: number | null`
- `medianScore: number | null`
- `topActiveFactors: string[]`

Campos de `cuts[*].metrics`:

- `groupCount: number`
- `signalCount: number`
- `assessmentCount: number`
- `averageScore: number | null`
- `medianScore: number | null`
- `maxScore: number | null`
- `criticality: BAIXA | MODERADA | ALTA | CRITICA | null`
- `stableContext: boolean`
- `topFactors: string[]`

Campos de auditoria:

- `fatoresUsados`
- `numeradores`
- `validade`
- `observacoes`
- `flags`
- `justification`

---

## E. Regras de arredondamento

Politica padrao:

- `scoreScale = 4`
- `shareScale = 4`
- `totalsScale = 4`

Regras:

- scores medios, medianos e maximos respeitam `scoreScale`
- pesos agregados de CID respeitam `totalsScale`
- shares e proporcoes ficam limitados a `shareScale` quando agregados externamente
- quando nao houver dado suficiente, o contrato retorna `null`, nunca `NaN` ou string placeholder

---

## F. Regras de validacao

Validacoes implementadas:

1. estabilidade estrutural do payload
2. reconciliacao entre distribuicao por criticidade e visao geral
3. coerencia entre total de grupos e recortes de grupo/criticidade
4. conformidade com a politica de arredondamento
5. comportamento consistente em casos-limite
6. preservacao obrigatoria de linguagem nao causal

Saida de validacao:

- `isStructureStable`
- `isOverviewConsistent`
- `isCutsConsistent`
- `isRoundingConsistent`
- `isEdgeCaseBehaviorConsistent`
- `isNonCausalLanguageConsistent`
- `hasBlockingIssues`
- `issues[]`

---

## G. Comportamento em casos-limite

Sem avaliacoes:

- `hasAssessments = false`
- flag `sem_avaliacoes`
- criticidade estavel dos recortes fica `null`
- leitura continua permitida como sinal sentinela, sem reforco contextual

Sem sinais:

- `hasSignals = false`
- flag `sem_sinais`
- `averageScore` e `medianScore` ficam `null`
- recortes de grupo retornam vazios

Com contexto insuficiente:

- flag `contexto_insuficiente_para_criticidade_estavel`
- `criticality = null` no recorte afetado
- justificativa preserva leitura como hipotese de investigacao, nao conclusao

---

## H. Criterios de explicabilidade

O contrato preserva explicabilidade por meio de:

- score ainda derivado da engine explicavel da FASE 5.1
- top fatores por bloco
- flags de validade por bloco
- observacoes e justificativas auditaveis
- separacao explicita entre criticidade estavel e contexto insuficiente

---

## I. Linguagem de cautela e nao causalidade

Regras preservadas nesta microfase:

- CID F continua como sinal sentinela
- o contrato nao usa linguagem de culpa, prova causal ou nexo automatico
- justificativas de recorte e observacoes de overview reforcam uso interno, investigacao tecnica e hipotese ocupacional

---

## J. Exemplos de payload

Exemplo resumido:

```json
{
  "contractVersion": "5.2.0",
  "generatedAt": "2026-04-02T12:00:00.000Z",
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
      "totalSignalsIdentified": 1,
      "criticalityDistribution": {
        "baixa": 0,
        "moderada": 0,
        "alta": 0,
        "critica": 1,
        "semCriticidadeEstavel": 1
      },
      "averageScore": 56.375,
      "medianScore": 56.375,
      "topActiveFactors": ["Sobrecarga de trabalho", "Assedio institucional"]
    }
  }
}
```

---

## K. Proximo passo seguro

Proximo passo seguro recomendado:

- FASE 5.3 de validacao de prontidao para exposicao interna controlada por servico ou endpoint interno, somente com autorizacao explicita e sem abrir frontend automaticamente.

Regra de governanca:

- a FASE 5.3 NAO e aberta nesta entrega.