
-- LIBERAR ACESSO À TABELA DE PERFIS (PROFILES)
-- Execute este comando no SQL Editor do seu Supabase para que os novos usuários apareçam na lista.

-- 1. Permitir que o sistema crie o perfil do usuário logo após o login
CREATE POLICY "Permitir inserção de perfil próprio" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2. Permitir que o sistema atualize as informações do perfil (como e-mail ou último acesso)
CREATE POLICY "Permitir atualização de perfil próprio" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- 3. Permitir que o Administrador (e outros usuários autenticados) vejam a lista de perfis
-- Nota: Se quiser mais restrito, pode mudar 'true' para '(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin''
CREATE POLICY "Perfis visíveis por usuários autenticados" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');
