# ABSENTEISMO INTELIGENTE - FASE 3V

## APLICACAO CONTROLADA DAS MIGRATIONS NO ISOLAMENTO INTERNO

Status: CONCLUIDA (migrations aplicadas com validacao estrutural)
Data: 2026-04-02
Hora da aplicacao: 2026-04-02 01:03:12 -04:00
Natureza: execucao controlada de schema isolado, sem ETL e sem alteracao de legado.

---

## A) Objetivo da microfase

Aplicar controladamente as migrations `007`, `008` e `009` para criar apenas o dominio isolado `abs_intel` no projeto atual `SESMT-System`, sem impacto no legado operacional.

---

## B) Migrations aplicadas

- `database/migrations/007_create_abs_intel_dimensions.sql`
- `database/migrations/008_create_abs_intel_facts_and_staging.sql`
- `database/migrations/009_create_abs_intel_psychosocial_ergonomic.sql`

Resultado da execucao:
- aplicadas com sucesso via `supabase db query --linked -f`.
- sem erro de execucao reportado pelo CLI.

---

## C) Data/hora da aplicacao

- Data de execucao: 2026-04-02.
- Hora de referencia da sessao: 2026-04-02 01:03:12 -04:00.

---

## D) Ambiente/projeto de aplicacao

- Projeto Supabase alvo: `SESMT-System`.
- Project ref: `wybzkkejyraadabznjqg`.
- Contexto: projeto atual da plataforma, com isolamento interno por schema dedicado.

---

## E) Validacoes pre-aplicacao

Validado antes da execucao:
- schema `abs_intel` inexistente (`schema_abs_intel_exists = false`).
- baseline legado `public` capturado:
  - `public_table_count = 21`
  - `public_trigger_count = 2`
- verificacao de colisao no `public` para nomes do dominio de absenteismo:
  - nenhuma tabela alvo encontrada no `public` para os nomes auditados.

---

## F) Validacoes pos-aplicacao

Validado apos a execucao:
- schema `abs_intel` criado (`schema_abs_intel_exists = true`).
- tabelas no schema `abs_intel`: `15`.
- rotina auxiliar no schema `abs_intel`: `1` (`fn_abs_set_updated_at`).
- triggers no schema `abs_intel`: `15`.
- indices no schema `abs_intel`: `57`.
- constraints no schema `abs_intel`: `144`.

---

## G) Evidencia de que so o dominio isolado foi afetado

Objetos criados no `abs_intel` confirmados:
- `abs_dim_servidor`
- `abs_dim_vinculo_servidor`
- `abs_dim_tempo`
- `abs_fact_afastamento_evento`
- `abs_fact_afastamento_cid`
- `abs_fact_population_snapshot`
- `abs_dim_psychosocial_factor`
- `abs_fact_psychosocial_assessment`
- `abs_fact_psychosocial_signal`
- `abs_dim_ergonomic_factor`
- `abs_fact_ergonomic_assessment`
- `abs_fact_ergonomic_exposure`
- `abs_fact_ergonomic_action_plan`
- `stg_abs_evento`
- `stg_abs_evento_cid`

---

## H) Evidencia de legado intocado

Comparacao de baseline do `public` antes/depois:
- `public_table_count`: 21 -> 21
- `public_trigger_count`: 2 -> 2

Confirmacoes adicionais:
- nenhuma alteracao em policies legadas.
- nenhuma alteracao em triggers legadas.
- nenhuma alteracao em contratos frontend atuais.
- nenhum toque em `/afastamentos/cid-analytics`.

---

## I) Rollback previsto

Rollback controlado (somente se aprovado em gate):
- remover objetos exclusivamente do schema `abs_intel` por ordem reversa (009 -> 008 -> 007) ou, em contingencia controlada, `DROP SCHEMA abs_intel CASCADE`.

Regra de seguranca:
- rollback deve atuar somente no dominio isolado, sem tocar objetos legados do `public`.

---

## J) Bloqueios ainda mantidos

- ETL real continua bloqueado.
- carga de dados continua bloqueada.
- FASE 4 continua bloqueada.
- legado operacional permanece protegido por nao interferencia.

---

## K) Proximo passo seguro

Proxima microfase:
- 3W - ETL controlado no isolamento interno.

Observacao obrigatoria:
- qualquer execucao de ETL deve ocorrer somente no dominio `abs_intel` com gate formal de nao interferencia ativo.
