# ABSENTEISMO INTELIGENTE - FASE 3U

## PACKAGE DE MIGRATIONS ADDITIVE-ONLY PARA ISOLAMENTO INTERNO

Status: CONCLUIDA (package gerado e documentado, sem aplicacao)
Data: 2026-04-02
Natureza: estrutural e documental, sem escrita em banco nesta microfase.

---

## A) Objetivo da microfase

Produzir package de migrations additive-only para o novo dominio de absenteismo dentro do projeto atual `SESMT-System`, com isolamento interno rigido e sem toque em objetos legados ja usados pela plataforma atual.

---

## B) Premissas obrigatorias herdadas da 3S e 3T

- additive-only em todas as migrations.
- zero impacto no legado operacional.
- nenhuma alteracao destrutiva em objetos existentes.
- nenhum toque em `/afastamentos/cid-analytics`.
- nenhuma alteracao em auth/shared/frontend.
- nenhuma reutilizacao de tabelas legadas como staging.

---

## C) Estrategia estrutural adotada

- Estrategia: schema isolado `abs_intel` dentro do mesmo projeto.
- Naming adotado:
  - tabelas dimensionais/fatos: prefixo `abs_`.
  - staging: prefixo `stg_abs_`.
  - funcao auxiliar: `fn_abs_set_updated_at`.
- Justificativa de nao colisao:
  - objetos novos criados fora do `public`, em schema dedicado.
  - nomes diferenciados dos artefatos legados.
  - ausencia de alteracao em contratos das rotas atuais.

---

## D) Inventario do que sera criado no package

Migrations geradas:
- `database/migrations/007_create_abs_intel_dimensions.sql`
- `database/migrations/008_create_abs_intel_facts_and_staging.sql`
- `database/migrations/009_create_abs_intel_psychosocial_ergonomic.sql`

Objetos novos incluidos:
- schema novo: `abs_intel`.
- tabelas novas:
  - `abs_intel.abs_dim_servidor`
  - `abs_intel.abs_dim_vinculo_servidor`
  - `abs_intel.abs_dim_tempo`
  - `abs_intel.abs_fact_afastamento_evento`
  - `abs_intel.abs_fact_afastamento_cid`
  - `abs_intel.abs_fact_population_snapshot`
  - `abs_intel.abs_dim_psychosocial_factor`
  - `abs_intel.abs_fact_psychosocial_assessment`
  - `abs_intel.abs_fact_psychosocial_signal`
  - `abs_intel.abs_dim_ergonomic_factor`
  - `abs_intel.abs_fact_ergonomic_assessment`
  - `abs_intel.abs_fact_ergonomic_exposure`
  - `abs_intel.abs_fact_ergonomic_action_plan`
  - `abs_intel.stg_abs_evento`
  - `abs_intel.stg_abs_evento_cid`
- indices novos: criados para chaves de consulta e unicidade operacional do dominio isolado.
- constraints novas: checks e unicidades de integridade apenas nos objetos novos.
- staging novo: dedicado no schema isolado, sem reaproveitamento do legado.
- views/funcoes auxiliares:
  - nenhuma view nova nesta microfase.
  - funcao auxiliar nova `abs_intel.fn_abs_set_updated_at`.

---

## E) Garantias de nao interferencia

O package evita tocar legado porque:
- nao altera tabelas legadas (`public.*` em uso atual).
- nao altera policies legadas.
- nao altera triggers legadas.
- nao altera contratos atuais do frontend.
- nao altera auth/shared.
- nao altera `/afastamentos/cid-analytics`.
- usa schema isolado e naming dedicado para evitar colisao.

---

## F) Rollback por migration

Rollback documental previsto (nao executado nesta fase):
- 007: remover objetos criados no escopo da migration (ou `DROP SCHEMA abs_intel CASCADE` somente em ambiente controlado e se nao houver dependencias externas).
- 008: remover fatos/staging isolados criados na migration, preservando legado.
- 009: remover estruturas psicossociais/ergonomicas isoladas criadas na migration.

Regra de reversibilidade:
- qualquer rollback deve atuar exclusivamente no schema `abs_intel` e nunca em objetos legados do `public` usados pela plataforma atual.

---

## G) Criterios de bloqueio para aplicacao

A 3V deve continuar proibida se houver:
- duvida sobre nao interferencia com contratos atuais.
- risco de colisao de naming nao resolvido.
- ausencia de plano de rollback aprovado.
- qualquer necessidade de alterar auth/shared/frontend.
- qualquer risco de impacto em `/afastamentos/cid-analytics`.

---

## H) Proximo passo seguro

Proxima microfase:
- 3V - aplicacao controlada das migrations.

Observacao obrigatoria:
- nesta 3U as migrations foram apenas geradas e documentadas, sem aplicacao.
