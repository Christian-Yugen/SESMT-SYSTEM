-- =====================================================
-- MIGRACAO: FASE 3B - Hardening conservador de RLS (public)
-- Versao: 011
-- Data: 2026-04-22
-- Descricao: Habilita Row Level Security nas tabelas analiticas
--            públicas e revoga privilégios de leitura a anon e
--            authenticated de forma conservadora.
-- NOTAS IMPORTANTES:
--  - Esta migration trata APENAS as 13 tabelas listadas abaixo.
--  - Nao cria policies.
--  - Nao cria GRANTs.
--  - Nao altera dados, nao dropa tabelas/colunas nem executa truncates.
--  - NAO EXECUTAR em producao sem testes em staging.
-- =====================================================

BEGIN;

-- 1) Habilitar RLS nas tabelas públicas alvo
ALTER TABLE public.dim_servidor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_vinculo_servidor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_tempo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_afastamento_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_afastamento_cid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_population_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_psychosocial_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_psychosocial_factor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_psychosocial_signal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ergonomic_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_ergonomic_factor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ergonomic_exposure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ergonomic_action_plan ENABLE ROW LEVEL SECURITY;

-- 2) Revogar privilegios diretos de leitura (anon) — conservador
REVOKE ALL ON TABLE public.dim_servidor FROM anon;
REVOKE ALL ON TABLE public.dim_vinculo_servidor FROM anon;
REVOKE ALL ON TABLE public.dim_tempo FROM anon;
REVOKE ALL ON TABLE public.fact_afastamento_evento FROM anon;
REVOKE ALL ON TABLE public.fact_afastamento_cid FROM anon;
REVOKE ALL ON TABLE public.fact_population_snapshot FROM anon;
REVOKE ALL ON TABLE public.fact_psychosocial_assessment FROM anon;
REVOKE ALL ON TABLE public.dim_psychosocial_factor FROM anon;
REVOKE ALL ON TABLE public.fact_psychosocial_signal FROM anon;
REVOKE ALL ON TABLE public.fact_ergonomic_assessment FROM anon;
REVOKE ALL ON TABLE public.dim_ergonomic_factor FROM anon;
REVOKE ALL ON TABLE public.fact_ergonomic_exposure FROM anon;
REVOKE ALL ON TABLE public.fact_ergonomic_action_plan FROM anon;

-- 3) Revogar privilegios diretos de leitura (authenticated) — conservador
REVOKE ALL ON TABLE public.dim_servidor FROM authenticated;
REVOKE ALL ON TABLE public.dim_vinculo_servidor FROM authenticated;
REVOKE ALL ON TABLE public.dim_tempo FROM authenticated;
REVOKE ALL ON TABLE public.fact_afastamento_evento FROM authenticated;
REVOKE ALL ON TABLE public.fact_afastamento_cid FROM authenticated;
REVOKE ALL ON TABLE public.fact_population_snapshot FROM authenticated;
REVOKE ALL ON TABLE public.fact_psychosocial_assessment FROM authenticated;
REVOKE ALL ON TABLE public.dim_psychosocial_factor FROM authenticated;
REVOKE ALL ON TABLE public.fact_psychosocial_signal FROM authenticated;
REVOKE ALL ON TABLE public.fact_ergonomic_assessment FROM authenticated;
REVOKE ALL ON TABLE public.dim_ergonomic_factor FROM authenticated;
REVOKE ALL ON TABLE public.fact_ergonomic_exposure FROM authenticated;
REVOKE ALL ON TABLE public.fact_ergonomic_action_plan FROM authenticated;

-- 4) Observacoes e recomendações
--  - Policies de SELECT/INSERT/UPDATE/DELETE devem ser criadas
--    posteriormente de forma controlada por tabela e por role.
--  - Recomenda-se aplicar esta migration em staging e rodar
--    testes de integração e jobs ETL antes de avançar.

COMMIT;

-- =====================================================
-- FIM DA MIGRACAO 011
-- =====================================================
