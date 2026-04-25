# FASE 4 — FUNÇÕES COM SEARCH_PATH MUTÁVEL
 - `public.update_medical_folders_updated_at()`
  - Arquivo: `database/migrations/003_create_medical_archive_tables.sql`
  - Assinatura exata: `CREATE OR REPLACE FUNCTION public.update_medical_folders_updated_at() RETURNS TRIGGER` (sem argumentos)
  - Linguagem: `plpgsql`
## 2. Documentos e arquivos lidos
- `AGENTS.md`
- `web-platform/DESIGN_SYSTEM_SESMT_GOVERNANCA_VISUAL_UNIFICADA.md`
- `web-platform/docs/ABSENTEISMO_INTELIGENTE_GOVERNANCA_E_PLANO_DIRETOR.md`
- Relatórios anteriores: Fase 1.B, 2.B, 3A, 3A.1, 3B (arquivos do repo inspecionados)
- Migrations analisadas onde as funções aparecem:
  - `database/migrations/003_create_medical_archive_tables.sql`
  - `database/migrations/004_create_absenteeism_intelligence_dimensions.sql`
  - `database/migrations/005_create_absenteeism_intelligence_facts.sql`
  - `database/migrations/006_create_absenteeism_risk_structures.sql`
  - `database/migrations/007_create_abs_intel_dimensions.sql`
  - `database/migrations/008_create_abs_intel_facts_and_staging.sql`

## 3. Funções auditadas
- `update_medical_folders_updated_at` (schema: public implied)
- `public.trg_set_updated_at_absenteismo` (schema: public)
- `abs_intel.fn_abs_set_updated_at` (schema: abs_intel)

## 4. Assinaturas localizadas (exatas)
- `update_medical_folders_updated_at()`
  - Arquivo: `database/migrations/003_create_medical_archive_tables.sql`
  - Assinatura exata: `CREATE OR REPLACE FUNCTION update_medical_folders_updated_at() RETURNS TRIGGER` (sem argumentos)
  - Linguagem: `plpgsql`

- `public.trg_set_updated_at_absenteismo()`
  - Arquivo: `database/migrations/004_create_absenteeism_intelligence_dimensions.sql`
  - Assinatura exata: `CREATE OR REPLACE FUNCTION public.trg_set_updated_at_absenteismo() RETURNS TRIGGER` (sem argumentos)
  - Linguagem: `plpgsql`

- `abs_intel.fn_abs_set_updated_at()`
  - Arquivo: `database/migrations/007_create_abs_intel_dimensions.sql`
  - Assinatura exata: `CREATE OR REPLACE FUNCTION abs_intel.fn_abs_set_updated_at() RETURNS TRIGGER` (sem argumentos)
  - Linguagem: `plpgsql`

## 5. Triggers / tabelas dependentes (mapeamento)
- `update_medical_folders_updated_at()`
  - Trigger: `trigger_medical_folders_updated_at` — `BEFORE UPDATE ON medical_folders` — tabela: `medical_folders` (public)

- `public.trg_set_updated_at_absenteismo()` — triggers espalhadas nas migrations:
  - `trg_dim_servidor_updated_at` — `BEFORE UPDATE ON public.dim_servidor`
  - `trg_dim_vinculo_servidor_updated_at` — `BEFORE UPDATE ON public.dim_vinculo_servidor`
  - `trg_dim_tempo_updated_at` — `BEFORE UPDATE ON public.dim_tempo`
  - `trg_fact_afastamento_evento_updated_at` — `BEFORE UPDATE ON public.fact_afastamento_evento`
  - `trg_fact_afastamento_cid_updated_at` — `BEFORE UPDATE ON public.fact_afastamento_cid`
  - `trg_fact_population_snapshot_updated_at` — `BEFORE UPDATE ON public.fact_population_snapshot`
  - `trg_dim_psychosocial_factor_updated_at` — `BEFORE UPDATE ON public.dim_psychosocial_factor`
  - `trg_fact_psychosocial_assessment_updated_at` — `BEFORE UPDATE ON public.fact_psychosocial_assessment`
  - `trg_fact_psychosocial_signal_updated_at` — `BEFORE UPDATE ON public.fact_psychosocial_signal`
  - `trg_dim_ergonomic_factor_updated_at` — `BEFORE UPDATE ON public.dim_ergonomic_factor`
  - `trg_fact_ergonomic_assessment_updated_at` — `BEFORE UPDATE ON public.fact_ergonomic_assessment`
  - `trg_fact_ergonomic_exposure_updated_at` — `BEFORE UPDATE ON public.fact_ergonomic_exposure`
  - `trg_fact_ergonomic_action_plan_updated_at` — `BEFORE UPDATE ON public.fact_ergonomic_action_plan`

- `abs_intel.fn_abs_set_updated_at()` — triggers (abs_intel schema):
  - `trg_abs_dim_servidor_updated_at` — `BEFORE UPDATE ON abs_intel.abs_dim_servidor`
  - `trg_abs_dim_vinculo_servidor_updated_at` — `BEFORE UPDATE ON abs_intel.abs_dim_vinculo_servidor`
  - `trg_abs_dim_tempo_updated_at` — `BEFORE UPDATE ON abs_intel.abs_dim_tempo`
  - `trg_abs_fact_afastamento_evento_updated_at` — `BEFORE UPDATE ON abs_intel.abs_fact_afastamento_evento`
  - `trg_abs_fact_afastamento_cid_updated_at` — `BEFORE UPDATE ON abs_intel.abs_fact_afastamento_cid`
  - `trg_abs_fact_population_snapshot_updated_at` — `BEFORE UPDATE ON abs_intel.abs_fact_population_snapshot`
  - `trg_stg_abs_evento_updated_at` — `BEFORE UPDATE ON abs_intel.stg_abs_evento`
  - `trg_stg_abs_evento_cid_updated_at` — `BEFORE UPDATE ON abs_intel.stg_abs_evento_cid`

## 6. Risco identificado
- Observação: todas as três funções têm corpo trivial (apenas `NEW.updated_at = NOW(); RETURN NEW;`) e não referenciam objetos externos sem schema. O risco de quebrar lógica ao adicionar `SET search_path` é baixo.
- Risco residual: se alguma invocação depender implicitamente de search_path alterado (ex.: chamadas a funções/objetos não qualificados dentro do corpo), a alteração poderia impactar; contudo o corpo atual não faz referência a nomes não qualificados.

## 7. Migration criada
- Caminho: `database/migrations/012_fix_function_search_path.sql`
- Conteúdo: cria `CREATE OR REPLACE FUNCTION` para as 3 funções, preservando corpo original e adicionando `SET search_path` apropriado.
  - Para funções em `public`: `SET search_path = public, pg_temp`.
  - Para função em `abs_intel`: `SET search_path = abs_intel, public, pg_temp`.
- Nota: A migration foi criada apenas como arquivo; **NÃO** foi aplicada em nenhum banco.
- Nota adicional: A função `update_medical_folders_updated_at` foi schema-qualificada para `public.update_medical_folders_updated_at()` para eliminar dependência do `search_path` durante a execução da migration.

## 8. Correção aplicada (detalhes técnicos)
- `update_medical_folders_updated_at()` — adicionado: `SET search_path = public, pg_temp`.
- `public.trg_set_updated_at_absenteismo()` — adicionado: `SET search_path = public, pg_temp`.
- `abs_intel.fn_abs_set_updated_at()` — adicionado: `SET search_path = abs_intel, public, pg_temp`.

Racional: funções de trigger que operam apenas em `NEW`/`OLD` podem e devem definir explicitamente `search_path` para evitar resolução ambígua de objetos caso o ambiente tenha `search_path` mutável ou alterado por execução externa.

## 9. Funções não corrigidas, se houver
- Todas as 3 funções listadas foram localizadas e corrigidas (migration criada). Não houve função cuja assinatura não pôde ser determinada.

## 10. Validação estática
- Verificações feitas no arquivo criado (`012_fix_function_search_path.sql`):
  - sem `DROP TABLE` — OK
  - sem `TRUNCATE` — OK
  - sem `DELETE`/`UPDATE`/`INSERT` de dados — OK (apenas corpo de trigger preservado)
  - sem alteração de RLS/policies — OK
  - não toca nas 13 tabelas da Fase 3B explicitamente (apenas altera funções de trigger, que são seguras) — OK
  - preserva a lógica das funções (copiada exatamente)

## 11. O que NÃO foi alterado
- `database/migrations/011_harden_rls_absenteismo_public_tables.sql` — NÃO alterado.
- Nenhuma policy RLS foi criada ou alterada.
- Nenhuma tabela foi alterada.
- Nenhum dado foi alterado.
- Nenhuma UI foi alterada.
- Nenhuma regra analítica foi alterada.
- Nenhum cálculo foi alterado.

## 12. Próximo passo recomendado (staging)
1. Aplicar `012_fix_function_search_path.sql` em ambiente de staging controlado.
2. Executar smoke tests que toquem triggers (operações UPDATE nas tabelas dependentes listadas em (5)).
3. Monitorar logs de erro e latência; confirmar que todas as triggers continuam a atualizar `updated_at` como esperado.
4. Se algo falhar, reverter via `CREATE OR REPLACE FUNCTION` com o corpo anterior (ou aplicar rollback via nova migration que restaure assinatura anterior).

## 13. Garantias finais
- Nada foi aplicado em produção.
- Nenhum comando de banco remoto foi executado.
- Nenhuma tabela foi alterada.
- Nenhum dado foi alterado.
- Nenhuma policy foi criada ou alterada.
- Nenhuma migration anterior foi modificada.
- Nenhuma UI foi alterada.
- Nenhuma regra analítica foi alterada.
- Nenhuma variável de ambiente foi exposta.

PARE

---
Artefatos gerados:
- `database/migrations/012_fix_function_search_path.sql` (migration criada)
- `web-platform/docs/FASE_4_FUNCTIONS_SEARCH_PATH.md` (este relatório)
