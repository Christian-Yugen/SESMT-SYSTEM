# ABSENTEISMO INTELIGENTE FASE 6.1 - CAMADA ERGONOMICA NR-17

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: implementacao da camada analitica ergonomica NR-17 no dominio `abs_intel`, sem frontend novo, sem religacao ao sistema atual e sem alteracao do legado operacional

---

## A. Objetivo da microfase

Implementar a camada ergonomica NR-17 para leitura de fatores ergonomicos, avaliacoes, exposicoes e plano de acao ergonomico, com criticidade explicavel e auditavel, integrada ao contexto de agravos musculoesqueleticos no dominio analitico.

---

## B. Tabelas/fontes usadas

Fontes consumidas no schema `abs_intel`:

- `abs_dim_ergonomic_factor`
- `abs_fact_ergonomic_assessment`
- `abs_fact_ergonomic_exposure`
- `abs_fact_ergonomic_action_plan`
- `abs_fact_afastamento_evento`
- `abs_fact_afastamento_cid`
- `abs_dim_vinculo_servidor`
- `abs_dim_tempo`

Arquivo principal da camada:

- `src/lib/afastamentos-ergonomia.ts`

Validacao automatizada da microfase:

- `src/lib/tests/afastamentos-ergonomia.test.ts`

---

## C. Fatores modelados

Catalogo ergonomico ativo modelado com:

- fator
- descricao
- categoria NR-17
- referencia normativa
- status/atividade

Regra aplicada:

- somente fatores ativos entram no catalogo de analise e nos agrupamentos de criticidade.

---

## D. Logica de construcao da criticidade ergonomica

A criticidade ergonomica e consolidada por grupo analitico musculoesqueletico:

- cargo
- local de trabalho
- posto
- tarefa

A composicao da criticidade utiliza:

- media de score de exposicao ergonomica
- media de score de avaliacao ergonomica
- backlog de acoes ergonomicas prioritarias nao concluidas
- participacao de CID musculoesqueletico no contexto do grupo
- dias perdidos associados a agravos musculoesqueleticos

Faixas de criticidade:

- `BAIXA`: < 25
- `MODERADA`: 25 a 49,9999
- `ALTA`: 50 a 74,9999
- `CRITICA`: >= 75

---

## E. Variaveis usadas no score

Componentes do score composto (0 a 100):

- exposicao ergonomica: ate 30 pontos
- avaliacao ergonomica: ate 25 pontos
- backlog de acao ergonomica: ate 20 pontos
- share musculoesqueletico no contexto epidemiologico: ate 15 pontos
- dias perdidos musculoesqueleticos: ate 10 pontos

Cada sinal inclui `scoreBreakdown` para auditoria dos componentes.

---

## F. Criterios de explicabilidade

A camada entrega explicabilidade por meio de:

- score numerico
- criticidade derivada do score
- decomposicao de score por componente
- justificativa textual auditavel por grupo
- validacao automatica contra linguagem causal proibida

A linguagem permanece orientada a risco e contexto ocupacional, sem causalidade automatica.

---

## G. Limitacoes conhecidas

1. Parte de campos operacionais de posto/tarefa/setor e tipo de medida depende de parse estruturado de `observacoes` quando nao houver coluna dedicada.
2. Correlacao epidemiologica musculoesqueletica por posto/tarefa usa aproximacao por cargo e local quando o evento nao traz granularidade ergonomica direta.
3. Esta microfase implementa camada analitica backend; nao abre consumo visual.

---

## H. Exemplos de leitura

Exemplo de grupo com criticidade elevada:

- grupo: `ADMINISTRATIVO | UPA_CENTRO | BALCAO_1 | DIGITACAO_CONTINUA`
- exposicao: diaria/moderada-alta
- avaliacao: risco moderado-alto
- plano de acao: medidas abertas com prioridade alta
- contexto CID: concentracao musculoesqueletica relevante
- resultado: criticidade ALTA/CRITICA conforme score composto

Exemplo de recortes gerados:

- cargo
- local de trabalho
- posto
- tarefa
- fator ergonomico
- categoria NR-17
- grupo analitico musculoesqueletico

---

## I. Proximo passo seguro

Proximo passo seguro recomendado:

- FASE 6.2 para consolidacao de contrato de consumo ergonomico e prontidao de exposicao interna controlada da camada NR-17, somente com autorizacao explicita.

Regra de governanca:

- a FASE 6.2 NAO e aberta automaticamente nesta entrega.
