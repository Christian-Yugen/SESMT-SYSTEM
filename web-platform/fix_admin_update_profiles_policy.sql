/*
  web-platform/fix_admin_update_profiles_policy.sql

  Propósito: garantir que usuários com `role = 'admin'` em `public.profiles`
  possam atualizar outros perfis (incluindo mudança de `role`).

  Uso: execute no SQL Editor do projeto Supabase como um mantenedor.
  Observação: revisar políticas em produção e aprová-las com a equipe.
*/

BEGIN;

-- Remover policy antiga, se existir
DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON public.profiles;

-- Recriar policy de UPDATE permitindo que admins atualizem perfis
CREATE POLICY "Admins podem atualizar perfis"
ON public.profiles
FOR UPDATE
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK (true);

COMMIT;

-- Nota: esta policy permite que qualquer usuário cujo profile.role = 'admin'
-- atualize qualquer registro em public.profiles. Se preferir limitar campos
-- específicos (ex: impedir alteração de `id`), adicione condições em WITH CHECK.
