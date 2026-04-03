-- =====================================================
-- MIGRACAO: Grants PostgREST para schema abs_intel
-- Versao: 010
-- Data: 2026-06-08
-- Descricao: Concede acesso ao schema abs_intel para
--            os roles PostgREST (service_role obrigatorio,
--            anon/authenticated bloqueados por seguranca).
--
-- PRE-REQUISITO OBRIGATORIO (manual):
--   No Supabase Dashboard:
--   Settings -> API -> Exposed Schemas
--   Adicionar "abs_intel" na lista de schemas expostos.
--   Sem essa configuracao, mesmo com este SQL aplicado,
--   o PostgREST retornara PGRST106 (schema nao encontrado).
--
-- COMO EXECUTAR:
--   Supabase Dashboard -> SQL Editor -> colar e executar.
-- =====================================================

-- 1. Conceder USAGE no schema para os roles PostgREST.
--    USAGE e necessario para que o role possa referenciar
--    objetos dentro do schema, mesmo que ainda nao leia dados.
GRANT USAGE ON SCHEMA abs_intel TO anon;
GRANT USAGE ON SCHEMA abs_intel TO authenticated;
GRANT USAGE ON SCHEMA abs_intel TO service_role;

-- 2. Conceder SELECT apenas ao service_role.
--    O endpoint de epidemiologia opera exclusivamente com
--    SUPABASE_SERVICE_ROLE_KEY. anon e authenticated nao
--    precisam de acesso de leitura — isolamento garantido.
GRANT SELECT ON abs_intel.abs_fact_afastamento_evento   TO service_role;
GRANT SELECT ON abs_intel.abs_fact_afastamento_cid      TO service_role;
GRANT SELECT ON abs_intel.abs_dim_servidor               TO service_role;
GRANT SELECT ON abs_intel.abs_dim_vinculo_servidor       TO service_role;
GRANT SELECT ON abs_intel.abs_fact_population_snapshot   TO service_role;

-- 3. Garantir que anon/authenticated nao possam ler dados
--    de nenhuma tabela do dominio isolado.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA abs_intel FROM anon;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA abs_intel FROM authenticated;

-- 4. Recarregar configuracao do PostgREST.
--    Em Supabase hospedado, isso sinaliza o proxy para
--    reprocessar as rotas de schema imediatamente.
NOTIFY pgrst, 'reload config';
