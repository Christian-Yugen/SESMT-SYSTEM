
-- CORREÇÃO DE POLÍTICAS DE SEGURANÇA (RLS) APÓS SECURITY ADVISOR
-- Este script libera o acesso de leitura para usuários autenticados nas tabelas principais.
-- Execute este script no SQL Editor do Supabase (Painel lateral esquerdo -> SQL Editor).

-- 1. TABELA DE SERVIDORES (Onde ocorre o erro de "não encontrado")
ALTER TABLE public.servidores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.servidores;
CREATE POLICY "Permitir leitura para usuários autenticados" 
ON public.servidores FOR SELECT 
TO authenticated 
USING (true);

-- 2. TABELA DE FUNÇÕES
ALTER TABLE public.funcoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.funcoes;
CREATE POLICY "Permitir leitura para usuários autenticados" 
ON public.funcoes FOR SELECT 
TO authenticated 
USING (true);

-- 3. TABELA DE CONFIGURAÇÃO DE EXAMES
ALTER TABLE public.exames_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.exames_config;
CREATE POLICY "Permitir leitura para usuários autenticados" 
ON public.exames_config FOR SELECT 
TO authenticated 
USING (true);

-- 4. TABELA DE HISTÓRICO (ASO_HISTORY)
ALTER TABLE public.aso_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.aso_history;
CREATE POLICY "Permitir leitura para usuários autenticados" 
ON public.aso_history FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.aso_history;
CREATE POLICY "Permitir inserção para usuários autenticados" 
ON public.aso_history FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 5. TABELA DE PERFIS (PROFILES) - Garantir visibilidade para mapeamento de usuários
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Perfis visíveis por usuários autenticados" ON public.profiles;
CREATE POLICY "Perfis visíveis por usuários autenticados" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- 6. GARANTIR PERMISSÃO NAS TABELAS (Caso o Security Advisor tenha alterado o GRANT)
GRANT SELECT ON public.servidores TO authenticated;
GRANT SELECT ON public.funcoes TO authenticated;
GRANT SELECT ON public.exames_config TO authenticated;
GRANT SELECT ON public.aso_history TO authenticated;
GRANT INSERT ON public.aso_history TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
