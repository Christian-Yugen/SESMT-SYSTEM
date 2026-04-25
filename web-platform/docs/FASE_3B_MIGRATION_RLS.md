# FASE 3B — MIGRATION RLS DAS 13 TABELAS

## 1. Status geral
- Objetivo: criar migration SQL versionada, conservadora e segura para corrigir alertas "RLS Disabled in Public" nas 13 tabelas públicas indicadas.
- Ação executada: migration criada em `database/migrations/011_harden_rls_absenteismo_public_tables.sql`.
- Observação: A migration foi criada no repositório local; **NÃO** foi aplicada em qualquer banco nem executado `supabase db push`.

## 2. Documentos e arquivos lidos
Foram lidos (verificação obrigatória antes da criação):
- `AGENTS.md`
- `web-platform/DESIGN_SYSTEM_SESMT_GOVERNANCA_VISUAL_UNIFICADA.md`
- `web-platform/docs/ABSENTEISMO_INTELIGENTE_GOVERNANCA_E_PLANO_DIRETOR.md`
- `web-platform/docs/CID_ANALYTICS_MODULO_GOVERNANCA_E_ARQUITETURA.md`
- `web-platform/docs/ABSENTEISMO_INTELIGENTE_FASE_3A_DRY_RUN_OFFLINE.md`
- Migrations relevantes:
  - `database/migrations/004_create_absenteeism_intelligence_dimensions.sql`
  - `database/migrations/005_create_absenteeism_intelligence_facts.sql`
  - `database/migrations/006_create_absenteeism_risk_structures.sql`
  - `database/migrations/007_create_abs_intel_dimensions.sql`
  - `database/migrations/008_create_abs_intel_facts_and_staging.sql`
  - `database/migrations/009_create_abs_intel_psychosocial_ergonomic.sql`
  - `database/migrations/010_abs_intel_postgrest_grants.sql`
- Scripts/SQL relacionados a RLS e correções: `web-platform/fix_security_advisor_issue.sql` (inspecionado para entender correções anteriores)

## 3. Migration criada
- Caminho: `database/migrations/011_harden_rls_absenteismo_public_tables.sql`
- Versão/nome: 011_harden_rls_absenteismo_public_tables.sql
- Nota: escolhi o diretório `database/migrations` para manter o padrão numérico do repositório (003..010). O arquivo contém comandos `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` e `REVOKE ALL ... FROM anon|authenticated` para as 13 tabelas.

## 4. Tabelas tratadas (exatas)
A migration trata exclusivamente as seguintes 13 tabelas públicas:
1. `public.dim_servidor`
2. `public.dim_vinculo_servidor`
3. `public.dim_tempo`
4. `public.fact_afastamento_evento`
5. `public.fact_afastamento_cid`
6. `public.fact_population_snapshot`
7. `public.fact_psychosocial_assessment`
8. `public.dim_psychosocial_factor`
9. `public.fact_psychosocial_signal`
10. `public.fact_ergonomic_assessment`
11. `public.dim_ergonomic_factor`
12. `public.fact_ergonomic_exposure`
13. `public.fact_ergonomic_action_plan`

## 5. Ações aplicadas na migration
- ENABLE RLS: aplicado com `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY` para cada uma das 13 tabelas.
- REVOKE anon: `REVOKE ALL ON TABLE <table> FROM anon;` para cada tabela.
- REVOKE authenticated: `REVOKE ALL ON TABLE <table> FROM authenticated;` para cada tabela.
- Policies criadas: nenhuma.
- Grants criados: nenhum.

## 6. Tabelas propositalmente não alteradas
Confirmado que **não** alterei ou toquei (nem em SQL criado):
- `aso_history`;
- `portarias_abono`;
- `servidores` (tabela operacional diferente de `dim_servidor`);
- tabelas de afastamentos transacionais além das 13 listadas (exceto `fact_afastamento_*` especificadas);
- `profiles`;
- `abono_salarial`;
- logs;
- `atestados_staging`;
- funções com `search_path` mutável.

## 7. Validação de segurança da migration (estática)
Checks executados (sem aplicar nada em banco):
- Conferi o conteúdo do arquivo criado: apenas `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` e `REVOKE ALL ... FROM anon|authenticated` sobre as 13 tabelas.
- Verifiquei que **não** há `DROP`, `TRUNCATE`, `DELETE`, `UPDATE`, `INSERT` no arquivo (apenas comentários que mencionam as palavras).
- Verifiquei que **não** há `CREATE POLICY` nem `USING (true)`.
- Verifiquei que **não** há `FORCE ROW LEVEL SECURITY`.
- Verifiquei que **não** há `GRANT ... TO anon` ou `GRANT ... TO authenticated` no arquivo novo.
- Confirmei que o arquivo altera apenas as 13 tabelas listadas.

Conclusão: a migration é apenas uma alteração de metadados (RLS + revogações) e atende às regras de segurança definidas.

## 8. Validações/testes executados
- Leituras/inspeções de arquivos e migrations listadas em (2).
- Executado scan estático no arquivo criado para palavras-chave proibidas (DROP/TRUNCATE/DELETE/INSERT/UPDATE/CREATE POLICY/USING(true)/FORCE RLS/GRANT anon/authenticated) — nenhum desses comandos foi encontrado na migration.
- NÃO executei `supabase db push`, NÃO apliquei a migration em qualquer ambiente e NÃO rodei comandos remotos.
- Não rodei `npm run build` ou testes que dependam de banco remoto.

## 9. Risco de quebra estimado
- Risco: BAIXO a MODERADO (conservador). Rationale:
  - Habilitar RLS e revogar privilégios pode causar 403/permission denied para consumidores que hoje usam `anon`/`authenticated` para consultas diretas (caso existam). No entanto, uma inspeção do código mostrou que os acessos analíticos importantes executam-se via `abs_intel`/server-side (service_role) e não via `anon` do cliente — o que reduz risco.
  - Se houver clientes legados que dependem de SELECT direto nas tabelas públicas com `authenticated` role, esses endpoints irão falhar até que policies específicas (restrictivas) sejam criadas.
  - Por isso a migração é conservadora (apenas revoga/ativa RLS) e exige testes em staging e revisão de consumidores antes de promoção para produção.

## 10. O que precisa ser testado em staging
- Testar todos os endpoints de absenteísmo que possam ler essas tabelas (API server e ETL): verificar que consultas server-side (service_role) continuam funcionando.
- Testar dashboards e relatórios que podem depender de `public.*` — confirmar se usam backend/service_role ou anon/auth.
- Rodar jobs ETL que leem `fact_population_snapshot`, `fact_afastamento_*` e garantir que FKs e índices permanecem válidos.
- Executar Supabase Security Advisor em staging e revisar alertas/resultados.
- Verificar logs de autenticação/erro para identificar consultas afetadas.
- Validar performance de queries após RLS (pouco impacto esperado, mas confirmar planos de execução se necessário).

## 11. Plano de aplicação seguro em staging (resumo)
1. Aplicar `database/migrations/011_harden_rls_absenteismo_public_tables.sql` em staging.
2. Rodar suíte de smoke tests para APIs dependentes (autenticadas e server-side).
3. Executar jobs ETL/cron vinculados ao absenteísmo e verificar sucesso.
4. Rodar Security Advisor e revisar discrepâncias.
5. Se houver endpoints quebrando, mapear consumidores e criar policies seletivas (ex.: policies de leitura para roles específicos com condições `USING(...)`) — criar uma nova migration para cada policy com testes.
6. Após validação completa e autorização da equipe de governança, agendar aplicação em produção com janelas de manutenção e monitoramento canary.

## 12. Rollback conceitual
- Não executar rollback automático em produção.
- Se houver quebra em staging, reverter por nova migration que re-estabeleça o estado anterior (ex.: `REVOKE` inverso ou `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`), incluindo um plano de testes para confirmar recuperação.
- Reversões devem ser controladas e auditadas; evitar alterações manuais ad-hoc.

## 13. Garantias finais
- Nenhuma alteração foi aplicada em produção.
- Nenhum comando de banco remoto foi executado.
- Nenhuma policy foi criada nesta migration.
- Nenhum dado foi alterado.
- Nenhuma tabela fora das 13 foi alterada.
- Nenhuma UI foi alterada.
- Nenhuma regra analítica foi alterada.
- Nenhum cálculo foi alterado.
- Nenhuma variável de ambiente foi exposta.

PARE

---
Relatórios e artefatos gerados:
- `database/migrations/011_harden_rls_absenteismo_public_tables.sql` (migration criada)
- `web-platform/docs/FASE_3B_MIGRATION_RLS.md` (este relatório)

