
-- FIX: Database Audit and Schema Mismatch Resolver
-- This script fixes the missing columns and type mismatches in the Afastamentos system.

-- 1. Correct Afastamentos Table
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS hash_auditoria TEXT;

-- 2. Correct Afastamentos Logs (Fix type mismatch and add columns)
-- Temporarily drop constraint if exists
ALTER TABLE public.afastamentos_logs DROP CONSTRAINT IF EXISTS afastamentos_logs_afastamento_id_fkey;

-- Change type from UUID to BIGINT (to match afastamentos.id)
ALTER TABLE public.afastamentos_logs 
  ALTER COLUMN afastamento_id TYPE BIGINT USING (NULL); -- Safe because table is empty

-- Re-add constraint
ALTER TABLE public.afastamentos_logs 
  ADD CONSTRAINT afastamentos_logs_afastamento_id_fkey 
  FOREIGN KEY (afastamento_id) REFERENCES public.afastamentos(id) ON DELETE CASCADE;

-- Add missing columns
ALTER TABLE public.afastamentos_logs ADD COLUMN IF NOT EXISTS hash_auditoria TEXT;
ALTER TABLE public.afastamentos_logs ADD COLUMN IF NOT EXISTS motivo_alteracao TEXT;

-- 3. Correct Portarias Afastamento (Fix type mismatch)
ALTER TABLE public.portarias_afastamento DROP CONSTRAINT IF EXISTS portarias_afastamento_afastamento_id_fkey;

ALTER TABLE public.portarias_afastamento 
  ALTER COLUMN afastamento_id TYPE BIGINT USING (NULL);

ALTER TABLE public.portarias_afastamento 
  ADD CONSTRAINT portarias_afastamento_afastamento_id_fkey 
  FOREIGN KEY (afastamento_id) REFERENCES public.afastamentos(id) ON DELETE CASCADE;

-- 4. Audit Column for Abono (already exists or was requested)
ALTER TABLE public.abono_salarial ADD COLUMN IF NOT EXISTS hash_auditoria TEXT;
ALTER TABLE public.abono_salarial_logs ADD COLUMN IF NOT EXISTS hash_auditoria TEXT;

-- 5. Mystery 'eliminations' Table Check
-- conform user error: "Could not find the 'hash_auditoria' column of 'eliminations'"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'eliminations') THEN
        ALTER TABLE public.eliminations ADD COLUMN IF NOT EXISTS hash_auditoria TEXT;
    END IF;
END $$;

-- 6. CRITICAL: Refresh Scheme Cache
NOTIFY pgrst, 'reload schema';
