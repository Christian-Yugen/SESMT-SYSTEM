# ABSENTEISMO INTELIGENTE - FASE 2

## MODELO RELACIONAL E PACKAGE DE MIGRATIONS

Status: Concluida (modelagem + DDL versionada, sem execucao)
Data: 2026-03-31
Escopo: Contrato relacional definitivo, package de migrations e decisoes de schema.

## A) Objetivo da fase

Transformar o diagnostico da FASE 1 em modelo relacional alvo e pacote de migrations versionadas, prontas para revisao humana, sem execucao no banco ativo e sem inicio de ETL/telas/motor epidemiologico.

## B) Relacao explicita com decisoes congeladas da FASE 1

Decisoes refletidas no desenho:
1. Chave operacional de vinculo: CPF + matricula + contrato.
2. Enriquecimento de contrato em evento: obrigatorio (campo bruto e flag de pendencia no evento para resolucao posterior).
3. Anti-duplicidade de evento: hash tecnico unico (`source_event_hash`).
4. Multiplos CIDs por evento: tabela filha `fact_afastamento_cid` (1:N).
5. Snapshot populacional de denominadores: `fact_population_snapshot` criada estruturalmente.

## C) Modelo entidade-relacionamento textual

Nucleo cadastral e temporal:
- `dim_servidor (1) -> (N) dim_vinculo_servidor`
- `dim_tempo` para recortes de competencia e historico

Nucleo de afastamentos:
- `dim_servidor (1) -> (N) fact_afastamento_evento`
- `dim_vinculo_servidor (1) -> (N) fact_afastamento_evento`
- `fact_afastamento_evento (1) -> (N) fact_afastamento_cid`

Denominadores:
- `dim_tempo (1) -> (N) fact_population_snapshot`

Estruturas preparatorias psicossociais:
- `dim_psychosocial_factor (1) -> (N) fact_psychosocial_assessment`
- `dim_servidor / dim_vinculo_servidor / dim_tempo` referenciadas em `fact_psychosocial_assessment`
- `fact_psychosocial_signal` relacionavel com `fact_afastamento_evento`

Estruturas preparatorias ergonomicas:
- `dim_ergonomic_factor (1) -> (N) fact_ergonomic_assessment`
- `fact_ergonomic_exposure` e `fact_ergonomic_action_plan` conectadas a servidor/vinculo e fatores ergonomicos

## D) Justificativa da separacao estrutural

- Servidor: identidade da pessoa, atributos pessoais estaveis.
- Vinculo: contexto funcional e organizacional com variacao historica.
- Evento de afastamento: episodio temporal unico, independente de CID.
- Ocorrencia CID: granularidade diagnostica por evento, com suporte a multiplos codigos.
- Snapshot populacional: base de denominadores por competencia e recortes.

Essa separacao evita drift de atributos, melhora auditabilidade e habilita taxas futuras sem inflacao ou dupla contagem.

## E) Regras de unicidade

- `dim_servidor`: unicidade de CPF quando presente/valido (indice unico parcial).
- `dim_vinculo_servidor`: `UNIQUE (servidor_id, matricula, contrato)`.
- `fact_afastamento_evento`: `UNIQUE (source_event_hash)` para anti-duplicidade.
- `fact_afastamento_cid`: `UNIQUE (afastamento_id, cid_ordem)` quando ordem informada.
- `fact_population_snapshot`: indice unico dimensional por competencia e recortes.

## F) Regras de PK e FK

PKs (surrogate) em todas as tabelas (`BIGSERIAL`).

FKs principais:
- `dim_vinculo_servidor.servidor_id -> dim_servidor.servidor_id`
- `fact_afastamento_evento.servidor_id -> dim_servidor.servidor_id`
- `fact_afastamento_evento.vinculo_id -> dim_vinculo_servidor.vinculo_id`
- `fact_afastamento_cid.afastamento_id -> fact_afastamento_evento.afastamento_id`
- `fact_population_snapshot.tempo_id -> dim_tempo.tempo_id`
- FKs equivalentes nas estruturas psicossociais e ergonomicas para servidor/vinculo/tempo/fatores.

## G) Regras de integridade

Checks implementados:
- CPF com 11 digitos (quando informado).
- Sexo em dominio controlado (`F`, `M`, `NAO_INFORMADO`).
- Matricula e contrato nao vazios em vinculo.
- Periodo de afastamento valido (`data_fim >= data_inicio`).
- Dias afastados nao negativos.
- Regra de pendencia de resolucao de vinculo no evento.
- Pesos e dias alocados de CID nao negativos.
- Quantidade populacao snapshot nao negativa.

## H) Estrategia para multiplos vinculos

- Varios vinculos por servidor sao modelados em `dim_vinculo_servidor`.
- A chave operacional congelada e refletida no desenho com unicidade de vinculo.
- Eventos que chegam sem contrato podem ser persistidos como pendentes de resolucao (`pendente_resolucao_vinculo = true`) com campos brutos de chave para conciliacao na FASE 3.

## I) Estrategia para multiplos CIDs

- `fact_afastamento_evento` nao depende de CID para existir.
- `fact_afastamento_cid` armazena N ocorrencias CID por evento.
- Campos `occurrence_weight` e `allocated_days` preparam a regra dual-layer para evitar inflacao de dias.
- `cid_ordem` permite rastreabilidade de ordem de entrada.

## J) Estrategia anti-duplicidade de evento

- Chave tecnica `source_event_hash` obrigatoria e unica em `fact_afastamento_evento`.
- Hash deve ser gerado na FASE 3 a partir de natural key normalizada (exemplo recomendado: CPF + matricula + contrato + tipo_licenca + data_inicio + data_fim).
- O uso de hash evita duplicacao por variacoes textuais de campos de snapshot.

## K) Estrategia de derivacao futura (idade, tempo de servico, competencia)

- `idade_atual` e `faixa_etaria`: derivadas a partir de `dim_servidor.data_nascimento` e data de referencia.
- `tempo_servico_dias` e faixa: derivadas a partir de `dim_vinculo_servidor.data_admissao`.
- `competencia`: suportada por `dim_tempo.competencia_yyyymm` e por referencia temporal nos fatos.

Essas derivacoes ficam para FASE 3/4 (ETL e validacao), nao nesta fase.

## L) Estrategia de denominadores populacionais

- `fact_population_snapshot` criada para armazenar populacao ativa por competencia e recortes (secretaria, local, categoria, natureza, sexo, faixas).
- Essa estrutura e pre-condicao para TAD/IFL/DML/IG nas fases futuras.
- Sem carga nesta fase; apenas contrato estrutural.

## Compatibilidade com o cid-analytics atual

- O modulo atual de `/afastamentos/cid-analytics` permanece preservado e intocado.
- A estrutura proposta e compativel com a logica dual-layer ja consolidada.
- `fact_afastamento_evento` e `fact_afastamento_cid` formalizam a separacao conceitual ja utilizada pelo analytics.

## Impactos esperados na FASE 3

- Implementacao de ETL de conciliacao servidor-vinculo-evento.
- Enriquecimento de contrato obrigatorio em eventos.
- Geracao e persistencia do `source_event_hash`.
- Parse estruturado de CID multiplo com alocacao de dias.
- Primeiros snapshots populacionais por competencia.

## Riscos de migracao e cautelas

1. Incerteza residual de constraints reais no banco ativo:
   - Nao houve leitura de `information_schema`/`pg_catalog` via REST na FASE 1.
   - Cautela: revisar manualmente DDL em ambiente controlado antes de aplicar.

2. Risco de conflito de nomes/objetos preexistentes:
   - Mitigado com `IF NOT EXISTS` e estilo idempotente.

3. Risco de vinculo incompleto em eventos:
   - Mitigado com campos de chave bruta e flag de pendencia.

4. Risco de inflacao de dias em CID multiplo:
   - Mitigado pela estrutura de `occurrence_weight` e `allocated_days`.

## Package de migrations criado

- `database/migrations/004_create_absenteeism_intelligence_dimensions.sql`
- `database/migrations/005_create_absenteeism_intelligence_facts.sql`
- `database/migrations/006_create_absenteeism_risk_structures.sql`

## Confirmacao de escopo da FASE 2

- Nenhuma migration executada no banco ativo.
- Nenhum ETL iniciado.
- Nenhuma tela alterada.
- Nenhuma logica do cid-analytics alterada.
- Entrega restrita a modelagem relacional, DDL versionada e documentacao.
