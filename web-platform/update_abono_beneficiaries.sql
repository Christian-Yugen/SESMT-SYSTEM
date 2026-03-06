-- SCRIPT PARA SUPORTAR MÚLTIPLOS BENEFICIÁRIOS E RENOVAÇÃO
-- Este script adiciona a inteligência necessária para o fluxo de Ativo, Vencido e Finalizado.
-- 1. Adicionar colunas necessárias
ALTER TABLE abono_salarial
ADD COLUMN IF NOT EXISTS beneficiario_nome TEXT,
    ADD COLUMN IF NOT EXISTS status_manual TEXT DEFAULT 'ativo',
    ADD COLUMN IF NOT EXISTS renovado_por_id BIGINT REFERENCES abono_salarial(id);
-- 2. Comentários para documentação
COMMENT ON COLUMN abono_salarial.beneficiario_nome IS 'Nome do dependente ou identificador (ex: Filho 1)';
COMMENT ON COLUMN abono_salarial.renovado_por_id IS 'ID do novo abono que deu continuidade a este';
-- 3. Índice para performance em buscas de histórico
CREATE INDEX IF NOT EXISTS idx_abono_renovado_por ON abono_salarial(renovado_por_id);
-- Nota: A lógica de Vencido vs Finalizado será computada pelo Frontend
-- com base na data de hoje e na existência do renovado_por_id.