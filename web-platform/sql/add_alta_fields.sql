-- Migration: adicionar campos de alta médica em public.afastamentos

ALTER TABLE public.afastamentos
  ADD COLUMN IF NOT EXISTS data_alta DATE,
  ADD COLUMN IF NOT EXISTS medico_alta TEXT,
  ADD COLUMN IF NOT EXISTS medico_alta_crm TEXT;

-- Nota: executar este arquivo no banco (psql ou painel do Supabase) para aplicar a alteração.
