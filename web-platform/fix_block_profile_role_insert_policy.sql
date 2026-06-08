-- web-platform/fix_block_profile_role_insert_policy.sql
-- Propósito: impedir que usuários autenticados insiram registros em public.profiles com o campo `role` definido.
-- Apenas administradores (via policy) ou ações server-side (service role) poderão definir `role`.

BEGIN;

-- Remover policy permissiva de INSERT para o próprio perfil
DROP POLICY IF EXISTS "Permitir inserção de perfil próprio" ON public.profiles;

-- Recriar policy de inserção permitindo apenas que o usuário crie seu próprio profile
-- e que o novo registro não contenha um valor em `role`.
CREATE POLICY "Permitir inserção de perfil próprio"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() = id
  AND role IS NULL
);

-- Garantir policy para admins inserirem perfis (com role) quando necessário
DROP POLICY IF EXISTS "Admins podem inserir perfis" ON public.profiles;
CREATE POLICY "Admins podem inserir perfis"
ON public.profiles
FOR INSERT
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

COMMIT;
