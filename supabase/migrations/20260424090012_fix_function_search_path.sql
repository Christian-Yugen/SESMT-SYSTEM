-- =====================================================
-- MIGRACAO: FASE 4 - Fix Function Search Path (safe)
-- Versao: 012
-- Data: 2026-04-22
-- Descricao: Adiciona SET search_path a funções com corpo idempotente
--            para eliminar a dependência de search_path mutável.
-- NOTAS IMPORTANTES:
--  - Esta migration contém apenas CREATE OR REPLACE FUNCTION
--    que preservam assinatura e corpo original, adicionando
--    apenas a clausula `SET search_path` apropriada.
--  - NAO executar esta migration em produção sem testes.
-- =====================================================

BEGIN;

-- 1) update_medical_folders_updated_at (definida originalmente em 003_create_medical_archive_tables.sql)
CREATE OR REPLACE FUNCTION public.update_medical_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- 2) public.trg_set_updated_at_absenteismo (definida originalmente em 004_create_absenteeism_intelligence_dimensions.sql)
CREATE OR REPLACE FUNCTION public.trg_set_updated_at_absenteismo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- 3) abs_intel.fn_abs_set_updated_at (definida originalmente em 007_create_abs_intel_dimensions.sql)
CREATE OR REPLACE FUNCTION abs_intel.fn_abs_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = abs_intel, public, pg_temp;

COMMIT;

-- =====================================================
-- FIM DA MIGRACAO 012
-- =====================================================
