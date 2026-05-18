-- Migration: adicionar coluna encaminhamento_inss em afastamentos
-- Data: 2026-05-18

BEGIN;

ALTER TABLE public.afastamentos
    ADD COLUMN IF NOT EXISTS encaminhamento_inss boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.afastamentos.encaminhamento_inss IS
    'Indica que o afastamento deve ser encaminhado ao INSS. Quando true, NAO sera gerada portaria.';

-- Helper function para aplicar backfill por natureza_cargo (execução manual)
CREATE OR REPLACE FUNCTION public.set_encaminhamento_inss_by_naturezas(naturezas text[])
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE public.afastamentos
    SET encaminhamento_inss = true
    WHERE natureza_cargo = ANY (naturezas);
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ SECURITY DEFINER;

-- Exemplo de uso (descomentar e ajustar se desejar rodar o backfill):
-- SELECT public.set_encaminhamento_inss_by_naturezas(ARRAY['CONTRATADO', 'TERCEIRIZADO', 'ESTAGIARIO']);

-- OBS: Rever policies RLS, RPCs e triggers que assumem existencia de portarias
-- e adaptar a aplicacao para checar `encaminhamento_inss` e pular criacao de portaria quando true.

COMMIT;
