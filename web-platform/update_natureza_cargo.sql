-- Script para adicionar coluna Natureza do Cargo
-- Executar no editor do Supabase
-- 1. Adicionar à tabela de servidores (base de dados principal)
ALTER TABLE public.servidores
ADD COLUMN IF NOT EXISTS natureza_cargo TEXT;
COMMENT ON COLUMN public.servidores.natureza_cargo IS 'Natureza do Cargo (Efetivo, Temporário, Comissão, etc.) extraído do Excel';
-- 2. Adicionar à tabela de abono_salarial (para histórico e filtragem direta)
ALTER TABLE public.abono_salarial
ADD COLUMN IF NOT EXISTS natureza_cargo TEXT;
COMMENT ON COLUMN public.abono_salarial.natureza_cargo IS 'Natureza do Cargo no momento do registro do abono';
-- 3. Criar índices para performance de filtragem
CREATE INDEX IF NOT EXISTS idx_servidores_natureza ON public.servidores(natureza_cargo);
CREATE INDEX IF NOT EXISTS idx_abono_natureza ON public.abono_salarial(natureza_cargo);