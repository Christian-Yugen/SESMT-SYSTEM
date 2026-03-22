-- Adicionar coluna contrato à tabela de histórico de ASOs
ALTER TABLE public.aso_history 
ADD COLUMN IF NOT EXISTS contrato TEXT;

-- Comentário para documentação
COMMENT ON COLUMN public.aso_history.contrato IS 'Número do contrato/vínculo do servidor no momento da geração do documento';
