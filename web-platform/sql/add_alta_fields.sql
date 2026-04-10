-- Migration: adicionar campos de alta médica em public.afastamentos
-- Migration: adicionar campos de alta médica em public.afastamentos

-- Este script usa um bloco anônimo PL/pgSQL para verificar a existência
-- das colunas antes de adicioná-las. Compatível com PostgreSQL/Supabase.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'afastamentos' AND column_name = 'data_alta'
  ) THEN
    ALTER TABLE public.afastamentos ADD COLUMN data_alta DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'afastamentos' AND column_name = 'medico_alta'
  ) THEN
    ALTER TABLE public.afastamentos ADD COLUMN medico_alta TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'afastamentos' AND column_name = 'medico_alta_crm'
  ) THEN
    ALTER TABLE public.afastamentos ADD COLUMN medico_alta_crm TEXT;
  END IF;
END $$;

-- Nota: executar este arquivo no banco (psql ou painel do Supabase) para aplicar a alteração.
