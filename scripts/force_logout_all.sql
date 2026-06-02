-- scripts/force_logout_all.sql
-- Purpose: Forçar logout imediato de todos os usuários removendo entradas em auth.sessions.
-- Usage: Execute no Supabase SQL Editor com privilégios apropriados.
-- WARNING: Isso remove refresh tokens; JWTs já emitidos permanecem válidos até expirarem.

-- Verificar quantidade de sessões antes
SELECT count(*) AS sessions_before FROM auth.sessions;

-- Forçar logout: remove todas as sessões
DELETE FROM auth.sessions;

-- Confirmar quantidade de sessões depois
SELECT count(*) AS sessions_after FROM auth.sessions;

-- Optional: caso prefira manter sessions de um usuário específico (ex: admin), use:
-- DELETE FROM auth.sessions WHERE user_id <> 'fc449ef5-79e9-4826-96dd-5cb87c567377';
