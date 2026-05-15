-- Limpeza controlada das portarias de afastamento já geradas incorretamente.
--
-- Objetivo:
-- 1) preservar snapshot dos registros atuais em tabelas de backup;
-- 2) remover os registros ativos de portarias e sua auditoria;
-- 3) manter os afastamentos intactos para novo lançamento manual das portarias.

BEGIN;

CREATE TABLE IF NOT EXISTS public.portarias_afastamento_reset_backup (
  LIKE public.portarias_afastamento INCLUDING ALL,
  backup_at timestamptz NOT NULL DEFAULT now(),
  backup_reason text NOT NULL DEFAULT 'reset manual de portarias historicas'
);

CREATE TABLE IF NOT EXISTS public.portarias_afastamento_audit_reset_backup (
  LIKE public.portarias_afastamento_audit INCLUDING ALL,
  backup_at timestamptz NOT NULL DEFAULT now(),
  backup_reason text NOT NULL DEFAULT 'reset manual de portarias historicas'
);

INSERT INTO public.portarias_afastamento_reset_backup (
  id,
  afastamento_id,
  numero,
  ano,
  link_documento,
  data_emissao,
  criado_por,
  created_at,
  backup_at,
  backup_reason
)
SELECT
  p.id,
  p.afastamento_id,
  p.numero,
  p.ano,
  p.link_documento,
  p.data_emissao,
  p.criado_por,
  p.created_at,
  now(),
  'reset manual de portarias historicas'
FROM public.portarias_afastamento p;

INSERT INTO public.portarias_afastamento_audit_reset_backup (
  id,
  portaria_id,
  old_numero,
  new_numero,
  ano,
  operation,
  changed_at,
  changed_by,
  backup_at,
  backup_reason
)
SELECT
  a.id,
  a.portaria_id,
  a.old_numero,
  a.new_numero,
  a.ano,
  a.operation,
  a.changed_at,
  a.changed_by,
  now(),
  'reset manual de portarias historicas'
FROM public.portarias_afastamento_audit a;

DELETE FROM public.portarias_afastamento_audit;
DELETE FROM public.portarias_afastamento_duplicates_backup;
DELETE FROM public.portarias_afastamento;

COMMIT;