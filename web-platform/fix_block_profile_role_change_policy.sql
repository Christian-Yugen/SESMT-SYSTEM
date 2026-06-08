/*
  web-platform/fix_block_profile_role_change_policy.sql

  Propósito: impedir que usuários autenticados alterem o campo `role`
  do próprio registro em `public.profiles`. Apenas usuários com `role='admin'`
  poderão alterar `role` via a policy de admins (criada separadamente).

  Uso: execute no SQL Editor do projeto Supabase.
*/

BEGIN;

-- Remover policy permissiva de update para o próprio perfil
DROP POLICY IF EXISTS "Permitir atualização de perfil próprio" ON public.profiles;

-- Recriar policy de atualização do próprio perfil, mas bloqueando alteração de `role`
CREATE POLICY "Permitir atualização de perfil próprio"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Permite atualizar somente se o valor de `role` não for alterado.
  AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR role IS NULL)
);

COMMIT;

-- Observação: admins continuam autorizados pela policy específica de admins
-- (web-platform/fix_admin_update_profiles_policy.sql) que permite updates com WITH CHECK (true).
