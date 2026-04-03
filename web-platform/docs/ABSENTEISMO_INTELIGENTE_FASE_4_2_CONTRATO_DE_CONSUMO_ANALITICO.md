# ABSENTEISMO_INTELIGENTE - FASE 4.2
## Contrato de Consumo Analitico e Exposicao Controlada

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Ref Supabase: wybzkkejyraadabznjqg (sa-east-1, PostgreSQL 17, ACTIVE_HEALTHY)  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: contrato de consumo analitico para exposicao controlada do motor epidemiologico, sem abertura de frontend

---

## A. Objetivo da microfase

Definir e implementar uma camada de consumo analitico estavel, auditavel e segura para o motor epidemiologico classico, permitindo uso futuro por servicos e telas sem religacao nesta microfase.

---

## B. Fontes do motor usadas

Fontes analiticas no dominio abs_intel:

- abs_fact_afastamento_evento
- abs_fact_afastamento_cid
- abs_fact_population_snapshot
- abs_dim_servidor
- abs_dim_vinculo_servidor

Implementacoes utilizadas:

- src/lib/afastamentos-epidemiologia.ts
- src/lib/afastamentos-epidemiologia-contrato.ts

---

## C. Contrato de saida por bloco

Raiz do contrato (EpidemiologyConsumptionContract):

- contractVersion
- generatedAt
- period
- policy
- overall
- cuts
- validation

Bloco overall:

- dimension = overall
- key = GERAL
- metrics
- audit

Bloco cuts:

- sexo
- faixaEtaria
- faixaTempoServico
- secretaria
- cargo
- localTrabalho
- cidCapitulo

Cada item de recorte retorna:

- dimension
- key
- metrics
- audit

Bloco validation:

- reconciliacao (global x recortes)
- consistency (estrutura, arredondamento, comportamento sem denominador)

---

## D. Campos e tipos

Campos numericos de metrics:

- totalLicencas: number
- totalDiasPerdidos: number
- populacaoMedia: number
- diasPeriodo: number
- tad: number | null
- ifl: number | null
- dml: number
- ig: number | null

Campos de auditoria (audit):

- competenciaPeriodo: { startDate, endDate, diasPeriodo, competenciaInicio, competenciaFim }
- numeradores: { totalLicencas, totalDiasPerdidos }
- denominadores: { populacaoMedia, diasPeriodo }
- validade: { hasDenominator, hasMinimumPopulation, isValid, flags[] }
- observacoes: string[]

---

## E. Regras de arredondamento

Politica padrao implementada:

- ratesScale: 6 casas (TAD, IFL, IG)
- dmlScale: 6 casas (DML/MDL)
- totalsScale: 4 casas (totalDiasPerdidos e totalLicencas)
- populationScale: 4 casas (populacaoMedia)

A validacao do contrato rejeita payload com casas decimais acima da politica.

---

## F. Regras de validacao

Validacoes implementadas na camada de contrato:

1. Estabilidade estrutural
- presenca obrigatoria de blocos raiz
- presenca obrigatoria dos recortes minimos

2. Consistencia global x recortes
- diffs zero para sexo, faixa etaria, faixa tempo de servico, secretaria, cargo e local
- tolerancia controlada para cid_capitulo (residual de arredondamento)

3. Coerencia de arredondamento
- validacao automatica da escala por campo

4. Comportamento sem denominador
- tad, ifl e ig obrigatoriamente null quando hasDenominator = false
- flag denominador_ausente obrigatoria neste caso

---

## G. Comportamento em casos-limite

1. Ausencia de denominador
- condicao: populacaoMedia <= 0
- retorno: tad = null, ifl = null, ig = null
- auditoria: validade.flags inclui denominador_ausente
- observacao: mensagem explicita no bloco audit.observacoes

2. Populacao insuficiente no recorte
- condicao: populacaoMedia < minPopulationForStableCut
- retorno: indicadores calculados (se houver denominador), com flag de cautela
- auditoria: validade.flags inclui populacao_insuficiente

3. Recorte por capitulo CID
- usa ocorrencia ponderada e dias alocados
- pode apresentar delta residual minimo por arredondamento na reconciliacao

---

## H. Exemplos de payload

Exemplo resumido de payload (estrutura):

{
  "contractVersion": "4.2.0",
  "period": {
    "startDate": "2025-09-26",
    "endDate": "2026-09-26",
    "diasPeriodo": 366,
    "competenciaInicio": 202509,
    "competenciaFim": 202609
  },
  "overall": {
    "dimension": "overall",
    "key": "GERAL",
    "metrics": {
      "totalLicencas": 257,
      "totalDiasPerdidos": 23929,
      "populacaoMedia": 5443,
      "diasPeriodo": 366,
      "tad": 1.201172,
      "ifl": 47.216608,
      "dml": 93.108949,
      "ig": 4396.288811
    },
    "audit": {
      "validade": {
        "hasDenominator": true,
        "hasMinimumPopulation": true,
        "isValid": true,
        "flags": ["valido_para_leitura"]
      }
    }
  },
  "cuts": {
    "sexo": [
      {
        "dimension": "sexo",
        "key": "F",
        "metrics": {
          "totalLicencas": 0,
          "totalDiasPerdidos": 0,
          "populacaoMedia": 0,
          "diasPeriodo": 366,
          "tad": null,
          "ifl": null,
          "dml": 0,
          "ig": null
        },
        "audit": {
          "validade": {
            "hasDenominator": false,
            "hasMinimumPopulation": false,
            "isValid": false,
            "flags": ["denominador_ausente"]
          }
        }
      }
    ]
  }
}

---

## I. Garantias de auditabilidade

A camada de consumo implementa:

- contrato versionado (contractVersion)
- metadados de periodo e competencia
- numeradores e denominadores por bloco
- flags de validade por bloco
- observacoes de limitacao por bloco
- validacao interna do contrato para estabilidade, consistencia e arredondamento

Resultado: rastreabilidade de leitura analitica sem alterar legado nem frontend.

---

## J. Proximo passo seguro

Proxima microfase recomendada:

- FASE 4.3 - integracao controlada do contrato em camada de aplicacao (servico interno e testes de consumo), ainda sem abertura de telas.

Regra de governanca:

- FASE 4.3 nao e aberta automaticamente nesta entrega.

---

Documento canonico da FASE 4.2 criado em 02/04/2026.
