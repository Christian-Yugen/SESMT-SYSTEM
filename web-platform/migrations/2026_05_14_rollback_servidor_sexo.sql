-- Rollback para 2026_05_14_add_servidor_sexo_and_backfill.sql
-- Observação: este rollback cria um backup dos valores atuais e remove triggers/funções/constraint/coluna.

BEGIN;

-- 1) Backup dos valores existentes (idempotente)
CREATE TABLE IF NOT EXISTS public.afastamentos_servidor_sexo_backup (
  id bigint PRIMARY KEY,
  servidor_cpf text,
  servidor_nome text,
  servidor_sexo varchar(1),
  backup_ts timestamptz DEFAULT now()
);

INSERT INTO public.afastamentos_servidor_sexo_backup(id, servidor_cpf, servidor_nome, servidor_sexo, backup_ts)
SELECT a.id, a.servidor_cpf, a.servidor_nome, a.servidor_sexo, now()
FROM public.afastamentos a
WHERE a.servidor_sexo IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.afastamentos_servidor_sexo_backup b WHERE b.id = a.id
  );

-- 2) Remove triggers e funções associadas
DROP TRIGGER IF EXISTS trg_propagate_servidores_sexo ON public.servidores;
DROP FUNCTION IF EXISTS public.propagate_servidores_sexo_to_afastamentos();

DROP TRIGGER IF EXISTS trg_set_afastamentos_servidor_sexo ON public.afastamentos;
DROP FUNCTION IF EXISTS public.set_afastamentos_servidor_sexo_from_servidores();

-- 3) Remove constraint de checagem
ALTER TABLE public.afastamentos DROP CONSTRAINT IF EXISTS afastamentos_servidor_sexo_check;

-- 4) (Opcional) Remove a coluna servidor_sexo
ALTER TABLE public.afastamentos DROP COLUMN IF EXISTS servidor_sexo;

COMMIT;

-- Instruções: este script é destrutivo (remove coluna). Use apenas se quiser reverter completamente.
