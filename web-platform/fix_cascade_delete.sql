-- ============================================
-- CORREÇÃO DE INTEGRIDADE REFERENCIAL (CASCADE DELETE)
-- Este script permite que abonos sejam excluídos mesmo tendo logs associados.
-- ============================================
-- 1. Remover a constraint antiga que impede a exclusão
ALTER TABLE public.abono_salarial_logs DROP CONSTRAINT IF EXISTS abono_salarial_logs_abono_id_fkey;
-- 2. Recriar a constraint com ON DELETE CASCADE
-- Isso fará com que, ao deletar um abono, todos os logs dele também sejam deletados automaticamente.
ALTER TABLE public.abono_salarial_logs
ADD CONSTRAINT abono_salarial_logs_abono_id_fkey FOREIGN KEY (abono_id) REFERENCES public.abono_salarial(id) ON DELETE CASCADE;