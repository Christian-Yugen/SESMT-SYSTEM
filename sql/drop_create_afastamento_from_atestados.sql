-- Script: remover a função create_afastamento_from_atestados
-- Execute este SQL no Supabase SQL Editor ou via psql

DROP FUNCTION IF EXISTS public.create_afastamento_from_atestados(
  bigint[], jsonb, text, integer, boolean, boolean, integer, integer, text, text, boolean, text, text, text, text
);
