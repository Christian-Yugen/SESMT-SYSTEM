-- =====================================================
-- MIGRATION: 013_harden_aso_history_insert.sql
-- FASE: 5F.1 - Endurecer INSERT client-side em public.aso_history
-- Data: 2026-04-23
-- Objetivo: Revogar privilégios e policies que permitam INSERT
--            direto por usuários `authenticated` na tabela
--            `public.aso_history`.
-- NOTAS IMPORTANTES:
--  - Esta migration modifica APENAS permissões/ políticas de
--    INSERT em `public.aso_history`.
--  - NÃO altera SELECT/UPDATE/DELETE em `aso_history`.
--  - NÃO modifica outras tabelas.
--  - NÃO executar diretamente em production; revisar em staging.
-- =====================================================

BEGIN;

-- 1) Revogar privilégio direto de INSERT concedido a `authenticated`
REVOKE INSERT ON public.aso_history FROM authenticated;

-- 1.b) Revogar privilégio direto de INSERT concedido a `anon` (conservador)
REVOKE INSERT ON public.aso_history FROM anon;

-- 2) Remover policy permissiva de INSERT, se existir (nome acuferido
--    do script de correção anterior). Esta ação é conservadora e
--    só remove a policy explícita abaixo.
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.aso_history;

-- Observação: caso existam outras policies nomeadas diferentemente
-- que permitam INSERT a `authenticated`, elas devem ser revisadas
-- manualmente antes de aplicar esta migration.

COMMIT;

-- =====================================================
-- FIM DA MIGRATION 013
-- =====================================================
