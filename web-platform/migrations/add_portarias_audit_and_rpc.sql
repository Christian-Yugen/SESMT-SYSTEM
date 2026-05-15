-- Migração: auditoria de portarias, RPC de disponibilidade e função de limpeza

-- 1) Tabela de auditoria
CREATE TABLE IF NOT EXISTS public.portarias_afastamento_audit (
  id bigserial PRIMARY KEY,
  portaria_id bigint,
  old_numero integer,
  new_numero integer,
  ano integer,
  operation text,
  changed_at timestamptz DEFAULT now(),
  changed_by text
);

-- Habilitar RLS e políticas para permitir inserção por usuários autorizados
ALTER TABLE IF EXISTS public.portarias_afastamento_audit ENABLE ROW LEVEL SECURITY;

-- Permitir inserção de logs por perfis com role 'admin' ou 'nurse'
DROP POLICY IF EXISTS "Portarias audit: Permitir inserção" ON public.portarias_afastamento_audit;
CREATE POLICY "Portarias audit: Permitir inserção" ON public.portarias_afastamento_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'nurse')
    )
  );

-- Permitir leitura dos logs apenas para admin ou nurse
DROP POLICY IF EXISTS "Portarias audit: Leitura restrita" ON public.portarias_afastamento_audit;
CREATE POLICY "Portarias audit: Leitura restrita" ON public.portarias_afastamento_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'nurse')
    )
  );

-- 2) Função trigger para registrar inserts/updates relevantes
CREATE OR REPLACE FUNCTION public.portarias_afastamento_audit_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.portarias_afastamento_audit (portaria_id, old_numero, new_numero, ano, operation, changed_by)
    VALUES (NEW.id, NULL, NEW.numero, NEW.ano, 'INSERT', auth.uid()::text);
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.numero IS DISTINCT FROM NEW.numero) OR (OLD.ano IS DISTINCT FROM NEW.ano) THEN
      INSERT INTO public.portarias_afastamento_audit (portaria_id, old_numero, new_numero, ano, operation, changed_by)
      VALUES (NEW.id, OLD.numero, NEW.numero, NEW.ano, 'UPDATE', auth.uid()::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_portarias_afastamento_audit'
      AND tgrelid = 'public.portarias_afastamento'::regclass
  ) THEN
    CREATE TRIGGER trg_portarias_afastamento_audit
      AFTER INSERT OR UPDATE ON public.portarias_afastamento
      FOR EACH ROW EXECUTE FUNCTION public.portarias_afastamento_audit_trigger();
  END IF;
END;
$$;

-- 3) RPC: verificar disponibilidade de um número/ano
CREATE OR REPLACE FUNCTION public.check_portaria_availability(numero integer, ano integer)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT NOT EXISTS(SELECT 1 FROM public.portarias_afastamento WHERE numero = $1 AND ano = $2);
$$;

-- 4) Garantir coluna de timestamp na tabela de backups (se existir)
ALTER TABLE IF EXISTS public.portarias_afastamento_duplicates_backup
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 5) Função de limpeza para backups antigos
CREATE OR REPLACE FUNCTION public.cleanup_portarias_backups(p_days integer DEFAULT 30)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.portarias_afastamento_duplicates_backup
  WHERE created_at < now() - (p_days || ' days')::interval;
END;
$$;

-- 6) Agendamento opcional via pg_cron (se instalado)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- usar string simples para evitar conflito com dollar-quoting
    PERFORM cron.schedule('cleanup_portarias_backups_daily', '0 3 * * *', 'SELECT public.cleanup_portarias_backups()');
  END IF;
END;
$$;
