-- Migration: adicionar coluna servidor_sexo em afastamentos, backfill a partir de servidores.sexo
-- Data: 2026-05-14
-- Objetivo: garantir que a geração de portarias tenha acesso ao sexo do servidor
-- Observações:
-- 1) Esta migração é idempotente: pode ser executada mais de uma vez sem causar erro.
-- 2) Para ambientes de produção, faça backup antes de executar.

BEGIN;

-- 1) Adiciona coluna (se já existir, ignora)
ALTER TABLE public.afastamentos
  ADD COLUMN IF NOT EXISTS servidor_sexo VARCHAR(1);

-- 2) Backfill: popula servidor_sexo a partir da tabela public.servidores (coluna sexo)
-- Normaliza valores começando com 'F' -> 'F', começando com 'M' -> 'M'
UPDATE public.afastamentos a
SET servidor_sexo = (
  CASE
    WHEN upper(trim(s.sexo)) LIKE 'F%' THEN 'F'
    WHEN upper(trim(s.sexo)) LIKE 'M%' THEN 'M'
    ELSE NULL
  END
)
FROM public.servidores s
WHERE a.servidor_sexo IS NULL
  AND s.cpf IS NOT NULL
  AND s.cpf = a.servidor_cpf;

-- 3) Adiciona constraint de checagem (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'afastamentos_servidor_sexo_check'
  ) THEN
    ALTER TABLE public.afastamentos
      ADD CONSTRAINT afastamentos_servidor_sexo_check CHECK (servidor_sexo IN ('M','F') OR servidor_sexo IS NULL);
  END IF;
END
$$;

-- 4) Função: antes de inserir/atualizar, preenche servidor_sexo a partir de servidores.sexo quando ausente
CREATE OR REPLACE FUNCTION public.set_afastamentos_servidor_sexo_from_servidores()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.servidor_sexo IS NULL OR NEW.servidor_sexo = '') AND NEW.servidor_cpf IS NOT NULL THEN
    SELECT CASE
      WHEN upper(trim(s.sexo)) LIKE 'F%' THEN 'F'
      WHEN upper(trim(s.sexo)) LIKE 'M%' THEN 'M'
      ELSE NULL
    END
    INTO NEW.servidor_sexo
    FROM public.servidores s
    WHERE s.cpf = NEW.servidor_cpf
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- 5) Trigger: cria apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_afastamentos_servidor_sexo') THEN
    CREATE TRIGGER trg_set_afastamentos_servidor_sexo
    BEFORE INSERT OR UPDATE ON public.afastamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_afastamentos_servidor_sexo_from_servidores();
  END IF;
END
$$;

-- 6) Função para propagar alterações de sexo na tabela servidores para afastamentos existentes
CREATE OR REPLACE FUNCTION public.propagate_servidores_sexo_to_afastamentos()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sexo IS DISTINCT FROM OLD.sexo THEN
    UPDATE public.afastamentos
    SET servidor_sexo = (
      CASE
        WHEN NEW.sexo IS NULL THEN NULL
        WHEN upper(trim(NEW.sexo)) LIKE 'F%' THEN 'F'
        WHEN upper(trim(NEW.sexo)) LIKE 'M%' THEN 'M'
        ELSE NULL
      END
    )
    WHERE servidor_cpf = NEW.cpf;
  END IF;
  RETURN NEW;
END;
$$;

-- 7) Trigger em servidores: cria apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_propagate_servidores_sexo') THEN
    CREATE TRIGGER trg_propagate_servidores_sexo
    AFTER UPDATE OF sexo ON public.servidores
    FOR EACH ROW
    WHEN (OLD.sexo IS DISTINCT FROM NEW.sexo)
    EXECUTE FUNCTION public.propagate_servidores_sexo_to_afastamentos();
  END IF;
END
$$;

COMMIT;

-- ===== Instruções para execução/validação (produção) =====
-- 1) Fazer backup do banco antes de executar.
-- 2) Executar este arquivo via psql ou pelo editor SQL do Supabase.
-- Exemplo psql:
--   psql "$DATABASE_URL" -f 2026_05_14_add_servidor_sexo_and_backfill.sql
-- 3) Verificações pós-execução:
--   SELECT count(*) FROM public.afastamentos WHERE servidor_sexo IS NULL;
--   SELECT servidor_sexo, count(*) FROM public.afastamentos GROUP BY servidor_sexo;
--   SELECT tgname FROM pg_trigger WHERE tgname IN ('trg_set_afastamentos_servidor_sexo','trg_propagate_servidores_sexo');
