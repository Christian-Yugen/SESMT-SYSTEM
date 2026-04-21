-- Apply-ready SQL: fix_atestados_rls_apply.sql
-- Cole no SQL Editor do Supabase e execute (idempotente)

-- 1) Remover possíveis índices/constraints conflitantes
ALTER TABLE public.atestados_import DROP CONSTRAINT IF EXISTS ux_atestados_mat_per_cid;
DROP INDEX IF EXISTS public.ux_atestados_mat_per_cid;

-- 2) Criar índice único compatível com ON CONFLICT (matricula, periodo, cid)
CREATE UNIQUE INDEX IF NOT EXISTS ux_atestados_mat_per_cid
  ON public.atestados_import (matricula, periodo, cid);

-- 3) Habilitar RLS nas tabelas envolvidas
ALTER TABLE public.atestados_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atestados_staging ENABLE ROW LEVEL SECURITY;

-- 4) Políticas de leitura/escrita (idempotentes)
DROP POLICY IF EXISTS "atestados_import_read" ON public.atestados_import;
CREATE POLICY "atestados_import_read"
  ON public.atestados_import
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'nurse', 'analytic_manager', 'doctor')
    )
  );

DROP POLICY IF EXISTS "atestados_import_write" ON public.atestados_import;
CREATE POLICY "atestados_import_write"
  ON public.atestados_import
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'nurse')
    )
  );

-- 5) Verificação rápida
SELECT count(*) AS total_atestados FROM public.atestados_import;
