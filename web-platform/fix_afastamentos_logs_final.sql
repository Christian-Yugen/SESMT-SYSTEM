
-- Adicionar colunas faltantes e corrigir tipos na tabela de logs de afastamentos
-- Para garantir que o campo 'alterado_por' (string de nome/email) seja aceito

ALTER TABLE public.afastamentos_logs ADD COLUMN IF NOT EXISTS alterado_por TEXT;
ALTER TABLE public.afastamentos_logs ADD COLUMN IF NOT EXISTS usuario_email TEXT; -- Já deve existir mas garantindo

-- Garantir colunas na tabela principal
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id);

-- Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';
