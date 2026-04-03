# ABSENTEISMO_INTELIGENTE - FASE 5.1

## Implementacao da Camada Psicossocial NR-1

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: camada analitica psicossocial NR-1 no dominio `abs_intel`, sem frontend novo, sem religacao ao sistema atual e sem alteracao do legado operacional

---

## A. Objetivo da microfase

Implementar a camada psicossocial NR-1 no dominio analitico para leitura de fatores psicossociais ativos, agrupamento de avaliacoes psicossociais e construcao de sinais epidemiologicos compativeis com risco psicossocial, com score explicavel, justificativa auditavel e recortes minimos por contexto ocupacional.

---

## B. Tabelas/fontes usadas

Fontes do schema `abs_intel` consumidas pela lib:

- `abs_dim_psychosocial_factor`
- `abs_fact_psychosocial_assessment`
- `abs_fact_psychosocial_signal`
- `abs_fact_afastamento_evento`
- `abs_fact_afastamento_cid`
- `abs_dim_vinculo_servidor`
- `abs_dim_tempo`

Arquivo principal implementado:

- `src/lib/afastamentos-psychosocial.ts`

Arquivo de validacao automatizada:

- `src/lib/tests/afastamentos-psychosocial.test.ts`

---

## C. Fatores modelados

Catalogo psicossocial ativo modelado com os campos:

- dominio: derivado de `categoria`
- fator: `nome`
- descricao: `descricao`
- referencia normativa: `fonte_normativa`
- status/atividade: `is_active`

Leitura implementada:

- somente fatores ativos entram no catalogo de leitura
- fatores inativos nao participam do score
- fatores sao reconciliados com as avaliacoes por `psychosocial_factor_id`

---

## D. Logica de construcao do sinal psicossocial

O sinal psicossocial e construido por grupo analitico:

- secretaria
- cargo
- local de trabalho

Composicao do grupo:

- contexto ocupacional do vinculo
- inventario psicossocial do grupo
- CIDs compativeis com risco psicossocial
- concentracao de CID F
- recorrencia de eventos por servidor
- tendencia temporal de eventos compativeis
- dias perdidos associados ao grupo

Regras principais:

1. CID F continua tratado como sinal sentinela, nunca como causalidade automatica.
2. CIDs compativeis incluem, no minimo, prefixos `F`, `R45`, `T74`, `Z56` e `Z73`, alem de capitulos textualmente compativeis com saude mental/comportamental.
3. O grupo recebe `cidZone` com quatro estados:
   - `NAO_COMPATIVEL`
   - `SINAL_SENTINELA_SEM_CONTEXTO`
   - `AMBIGUO_EM_INVESTIGACAO`
   - `HIPOTESE_OCUPACIONAL_REFORCADA`
4. Mesmo no nivel mais alto, a saida fala em hipotese reforcada e investigacao tecnica, nunca em nexo causal automatico.

---

## E. Variaveis usadas no score/criticidade

Componentes do score composto (0 a 100):

- concentracao de CID F: ate 30 pontos
- recorrencia por servidor: ate 20 pontos
- tendencia temporal crescente: ate 15 pontos
- dias perdidos compativeis: ate 15 pontos
- exposicao media psicossocial das avaliacoes: ate 20 pontos

Faixas de criticidade:

- `BAIXA`: < 25
- `MODERADA`: 25 a 49,9999
- `ALTA`: 50 a 74,9999
- `CRITICA`: >= 75

Observacao metodologica:

- o score e propositalmente explicavel e aditivo; nao ha modelo opaco nem inferencia estatistica nao auditavel nesta microfase.

---

## F. Criterios de explicabilidade

Cada sinal traz:

- score numerico
- criticidade derivada do score
- `scoreBreakdown` por componente
- `cidZone` com linguagem de hipotese, nao de causalidade
- justificativa textual com CID F, recorrencia, tendencia, dias perdidos e exposicao media
- resumo de evidencias das avaliacoes disponiveis

Validacoes de explicabilidade implementadas:

- sinal sem justificativa e considerado inconsistente
- linguagem causal proibida invalida a validacao
- avaliacoes sem evidencia estruturada sao registradas como limitacao residual

---

## G. Limitacoes conhecidas

1. O schema atual de avaliacoes psicossociais nao possui campos dedicados para `evidencia`, `acao_recomendada` e `status_acao`; nesta fase a lib aceita esses campos quando existirem e, na ausencia, faz parsing de `observacoes` ou usa fallback controlado.
2. `unidade_orcamentaria`, `secretaria`, `cargo` e `local_trabalho` sao lidos via `abs_dim_vinculo_servidor`, nao diretamente da tabela de avaliacao.
3. A camada usa score explicavel baseado em regras e thresholds; nao tenta inferir causalidade nem substituir investigacao tecnica NR-1.
4. A presenca de `CID F` sem inventario psicossocial suficiente cai em `SINAL_SENTINELA_SEM_CONTEXTO`, exatamente para evitar sobre-interpretacao.

---

## H. Exemplos de leitura

Exemplo de leitura por grupo analitico:

- grupo: `EDUCACAO | DOCENTE | ESCOLA_CENTRAL`
- CID F share: 66,67%
- recorrencia: 50%
- tendencia: crescente no periodo
- exposicao media: alta
- resultado: `CRITICA`
- zona CID F: `HIPOTESE_OCUPACIONAL_REFORCADA`
- justificativa: sinal alto com necessidade de investigacao tecnica formal, sem conclusao causal automatica

Exemplo de leitura por recorte:

- secretaria: ranking por score maximo e score medio
- cargo: ranking por concentracao e criticidade
- local: ranking por score e dias perdidos
- capitulo CID: consolidacao dos grupos com capitulos compativeis
- CID compativel: separacao entre sinais compativeis e nao compativeis

---

## I. Proximo passo seguro

Proximo passo seguro recomendado:

- FASE 5.2 de consolidacao de contrato de consumo psicossocial e validacao de exposicao controlada interna, somente com autorizacao explicita e sem abrir frontend automaticamente.

Regra de governanca:

- a FASE 5.2 NAO e aberta nesta entrega.