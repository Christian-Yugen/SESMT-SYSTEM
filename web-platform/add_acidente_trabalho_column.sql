-- Adiciona coluna para identificar acidente de trabalho na tabela de afastamentos
ALTER TABLE public.afastamentos 
ADD COLUMN IF NOT EXISTS is_acidente_trabalho BOOLEAN DEFAULT FALSE;

-- Atualiza a política de segurança (RLS) se necessário (geralmente não precisa se for ALL)
-- Mas garante que a coluna seja visível para quem tem acesso à tabela
COMMENT ON COLUMN public.afastamentos.is_acidente_trabalho IS 'Identifica se o afastamento é decorrente de acidente de trabalho';
