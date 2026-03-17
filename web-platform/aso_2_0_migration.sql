-- Migração ASO 2.0: Suporte a Dados Estruturados e Auditoria
-- Adiciona colunas para armazenar dados completos do servidor, exames e histórico de edições

ALTER TABLE aso_history ADD COLUMN IF NOT EXISTS servidor_nascimento DATE;
ALTER TABLE aso_history ADD COLUMN IF NOT EXISTS exams_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE aso_history ADD COLUMN IF NOT EXISTS risks TEXT;
ALTER TABLE aso_history ADD COLUMN IF NOT EXISTS function_name TEXT;
ALTER TABLE aso_history ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;

-- Comentários para documentação do esquema
COMMENT ON COLUMN aso_history.exams_json IS 'Lista estruturada de exames e suas respectivas datas';
COMMENT ON COLUMN aso_history.edit_history IS 'Log de auditoria contendo quem, quando e o que foi alterado';
