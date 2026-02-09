
-- POLÍTICAS DE SEGURANÇA PARA GESTÃO DE OPERADORES (ADMIN)
-- Execute este script no SQL Editor do seu Supabase para permitir que 
-- administradores gerenciem outros usuários.

-- 1. Remover políticas antigas se necessário (opcional, mas recomendado para evitar conflitos)
-- DROP POLICY IF EXISTS "Admins podem tudo" ON public.profiles;
-- DROP POLICY IF EXISTS "Permitir inserção de novos operadores por admins" ON public.profiles;

-- 2. Permitir que ADMIMS insiram novos perfis (Pré-autorização)
CREATE POLICY "Admins podem inserir perfis" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 3. Permitir que ADMINS atualizem qualquer perfil (Mudar cargo/role)
CREATE POLICY "Admins podem atualizar perfis" 
ON public.profiles 
FOR UPDATE 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 4. Permitir que ADMINS removam acessos
CREATE POLICY "Admins podem deletar perfis" 
ON public.profiles 
FOR DELETE 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 5. Garantir que usuários continuem podendo inserir seu próprio perfil no primeiro acesso
-- (Caso a política "Permitir inserção de perfil próprio" do arquivo anterior não esteja ativa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir inserção de perfil próprio') THEN
        CREATE POLICY "Permitir inserção de perfil próprio" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;
