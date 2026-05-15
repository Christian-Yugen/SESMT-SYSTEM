-- Migration: add unique constraint to portarias_afastamento
-- Adds a UNIQUE constraint on (numero, ano) to avoid duplicate portaria numbers per year.
-- WARNING: This migration will attempt to fix existing duplicate (numero, ano)
-- entries by renumbering duplicate rows (keeping the earliest by created_at)
-- and then adding a UNIQUE constraint on (numero, ano). Please review and
-- backup your data before running in production.

-- 1) Backup duplicated rows into a helper table (created once)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'portarias_afastamento_duplicates_backup'
  ) THEN
    CREATE TABLE public.portarias_afastamento_duplicates_backup AS TABLE public.portarias_afastamento WITH NO DATA;
    INSERT INTO public.portarias_afastamento_duplicates_backup
      SELECT * FROM public.portarias_afastamento
      WHERE (numero, ano) IN (
        SELECT numero, ano FROM public.portarias_afastamento GROUP BY numero, ano HAVING COUNT(*) > 1
      );
  END IF;
END
$$;

-- 2) Renumerar duplicados por ano: para cada grupo (numero, ano) com >1
-- mantém o primeiro registro (por created_at) e atribui novos números
-- crescentes (acima do máximo atual) para os demais registros.
DO $$
DECLARE
  rec RECORD;
  dup RECORD;
  next_num INTEGER;
BEGIN
  FOR rec IN
    SELECT ano, numero FROM public.portarias_afastamento GROUP BY ano, numero HAVING COUNT(*) > 1
  LOOP
    next_num := (SELECT COALESCE(MAX(numero),0) FROM public.portarias_afastamento WHERE ano = rec.ano);
    FOR dup IN
      SELECT id FROM public.portarias_afastamento
      WHERE ano = rec.ano AND numero = rec.numero
      ORDER BY created_at, id
      OFFSET 1
    LOOP
      next_num := next_num + 1;
      UPDATE public.portarias_afastamento SET numero = next_num WHERE id = dup.id;
    END LOOP;
  END LOOP;
END
$$;

-- 3) Adicionar constraint UNIQUE(numero, ano) se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_portaria_por_ano'
  ) THEN
    ALTER TABLE public.portarias_afastamento
      ADD CONSTRAINT unique_portaria_por_ano UNIQUE (numero, ano);
  END IF;
END
$$;
