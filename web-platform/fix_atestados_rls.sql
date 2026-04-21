-- =============================================================
-- FIX: RLS e índice único para public.atestados_import
-- Execute este script no SQL Editor do Supabase
-- =============================================================

-- 1. Remover índice único antigo (matricula, periodo) que causava deduplicação errada
--    A mesma pessoa pode ter vários CIDs no mesmo período
DROP INDEX IF EXISTS public.ux_atestados_matricula_periodo;

-- 2. Limpar dados incorretamente importados (serão reimportados pelo script Node)
TRUNCATE TABLE public.atestados_import RESTART IDENTITY;
TRUNCATE TABLE public.atestados_staging RESTART IDENTITY;

-- 3. Criar índice único correto: matricula + periodo + cid (permite múltiplos CIDs por período)
-- Observação: usamos colunas diretas para permitir ON CONFLICT (matricula,periodo,cid) no upsert.
CREATE UNIQUE INDEX IF NOT EXISTS ux_atestados_mat_per_cid
  ON public.atestados_import (matricula, periodo, cid);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.atestados_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atestados_staging ENABLE ROW LEVEL SECURITY;

-- 5. Criar política de leitura para usuários autenticados com roles corretas
--    (admin, nurse, analytic_manager, doctor) — igual ao padrão das demais tabelas
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

-- Política de escrita para admin/nurse (para futuras inserções via app)
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

-- Staging: apenas service_role acessa (não precisa de política para usuário comum)
-- (O service_role bypassa RLS automaticamente)

-- 6. Verificação final
SELECT count(*) AS total_atestados FROM public.atestados_import;
