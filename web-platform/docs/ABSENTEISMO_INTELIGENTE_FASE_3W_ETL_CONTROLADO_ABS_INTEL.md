# ABSENTEISMO INTELIGENTE - FASE 3W

## ETL CONTROLADO NO ISOLAMENTO INTERNO ABS_INTEL

Status: CONCLUIDA (ETL executado no dominio isolado)
Data: 2026-04-02
Hora de referencia: 2026-04-02 01:13:35 -04:00
Natureza: carga controlada exclusivamente em `abs_intel`, sem toque no legado.

---

## A) Objetivo da microfase

Executar ETL controlado no schema `abs_intel`, populando dimensoes/fatos centrais do dominio de absenteismo sem alterar legado operacional, sem religar telas e sem abrir FASE 4.

---

## B) Fontes usadas

Fontes de leitura (somente leitura):
- `public.afastamentos`
- `public.afastamento_cids`
- `public.servidores`

Artefato de execucao:
- `database/etl/001_abs_intel_controlled_etl.sql`

---

## C) Validacoes pre-ETL

- Projeto ativo e linkado confirmado: `SESMT-System` (`wybzkkejyraadabznjqg`).
- Schema `abs_intel` existente e pronto para carga.
- Estruturas do dominio isolado existentes (15 tabelas antes da carga).
- Staging do dominio disponivel (`stg_abs_evento`, `stg_abs_evento_cid`).
- Frontend atual sem referencia a `abs_intel` no codigo da plataforma.
- Baseline legado `public` preservado para comparacao:
  - `public_table_count = 21`
  - `public_trigger_count = 2`

---

## D) Estrategia ETL aplicada

- Carga full-controlada no dominio isolado com reinicializacao de tabelas `abs_intel` no inicio.
- Dedupe de servidor por CPF normalizado.
- Chave operacional de vinculo aplicada: CPF + matricula + contrato.
- Dedupe de evento por hash tecnico (`source_event_hash`) com colapso de duplicados.
- Suporte a multiplos CIDs por evento.
- `occurrence_weight` calculado como `1 / quantidade_de_cids_do_evento`.
- `allocated_days` calculado como `dias_afastado / quantidade_de_cids_do_evento`.
- Geracao de competencia no `abs_dim_tempo`.
- Derivacao de faixa etaria e faixa de tempo de servico em `abs_fact_population_snapshot`.
- Staging restrito ao schema `abs_intel`.

---

## E) Tabelas populadas

Dimensoes:
- `abs_intel.abs_dim_servidor`
- `abs_intel.abs_dim_vinculo_servidor`
- `abs_intel.abs_dim_tempo`

Fatos centrais:
- `abs_intel.abs_fact_afastamento_evento`
- `abs_intel.abs_fact_afastamento_cid`
- `abs_intel.abs_fact_population_snapshot`

Staging:
- `abs_intel.stg_abs_evento`
- `abs_intel.stg_abs_evento_cid`

---

## F) Cobertura da carga

Contagens de entrada:
- eventos brutos com data inicio: `258`
- eventos deduplicados por hash: `257`
- colapso por hash: `1`

Contagens de saida:
- `abs_dim_servidor`: `5037`
- `abs_dim_vinculo_servidor`: `5443`
- `abs_dim_tempo`: `366`
- `abs_fact_afastamento_evento`: `257`
- `abs_fact_afastamento_cid`: `378`
- `abs_fact_population_snapshot`: `9386`

---

## G) Residuos e pendencias

- pendencias de resolucao de vinculo: `0`
- eventos sem servidor resolvido: `0`
- eventos sem allocated_days: `0`

Consistencia tecnica auditada:
- eventos com multiplos CIDs: `77`
- minimo de CIDs por evento: `1`
- maximo de CIDs por evento: `8`
- eventos com inconsistencia entre `dias_afastado` e soma de `allocated_days`: `0`
- eventos com inconsistencia na soma de `occurrence_weight`: `0`
- media de soma de `occurrence_weight` por evento: `1.000000`

---

## H) Evidencias de nao interferencia no legado

Comparacao de baseline do `public` antes/depois da carga:
- `public_table_count`: `21 -> 21`
- `public_trigger_count`: `2 -> 2`

Garantias observadas na execucao:
- nenhuma escrita em tabelas legadas do `public`.
- nenhuma alteracao em policies legadas.
- nenhuma alteracao em triggers legadas.
- nenhuma alteracao em auth/shared/frontend.
- nenhum toque em `/afastamentos/cid-analytics`.

---

## I) Bloqueios ainda mantidos

- ETL epidemiologico (TAD/IFL/DML/IG) permanece bloqueado nesta fase.
- FASE 4 permanece bloqueada.
- nenhuma religacao de telas ao novo dominio foi realizada.

---

## J) Proximo passo seguro

Proxima microfase:
- 3X - validacao da carga (cobertura, residuos e qualidade estrutural final).

Observacao obrigatoria:
- qualquer avanco funcional para telas continua proibido ate aprovacao formal posterior.
