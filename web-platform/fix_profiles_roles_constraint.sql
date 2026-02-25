-- CORREÇÃO DA CONSTRAINT DE CARGOS (ROLES)
-- Este script atualiza a lista de cargos permitidos na tabela profiles
-- 1. Remover a constraint antiga (ajustando para o nome padrão ou o nome que o erro mostrou)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- 2. Adicionar a nova constraint com todos os cargos necessários
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (
        role IN (
            'admin',
            'nurse',
            'social_assistant',
            'analytic_manager',
            'operator',
            'viewer'
        )
    );
-- 3. Garantir que as políticas de RLS continuem funcionando para os novos cargos
-- (Já incluído no script anterior, mas bom reforçar se necessário)