-- sql/import_atestados.sql
-- Script gerado para facilitar a importação dos dados de atestados
-- Uso:
-- 1) Crie as tabelas executando este arquivo (ou execute blocos manualmente).
-- 2) Carregue o CSV para a staging (veja exemplos abaixo).
-- 3) Execute o INSERT de transformação para popular a tabela final.
-- Observação: para carregar o CSV localmente use `psql` + \copy; para Supabase use a UI de import CSV ou um script que insira via API.

-- =============================
-- TABELA DE STAGING (TEXT BRUTO)
-- =============================
CREATE TABLE IF NOT EXISTS public.atestados_staging (
  matricula           text,
  contrato            text,
  nome                text,
  nome_cargo          text,
  sexo                text,
  nome_divisao        text,
  local_de_trabalho   text,
  nome_unidade        text,
  detalhes_vinculo    text,
  vinculo             text,
  dt_admissao         text,
  cid                 text,
  qtde_dias           text,
  qtde_afastamentos   text,
  periodo             text
);

-- =============================
-- TABELA FINAL (TIPOS ADEQUADOS)
-- =============================
CREATE TABLE IF NOT EXISTS public.atestados_import (
  id                  bigserial PRIMARY KEY,
  matricula           text NOT NULL,
  contrato            text,
  nome                text,
  nome_cargo          text,
  sexo                char(1),
  nome_divisao        text,
  local_de_trabalho   text,
  nome_unidade        text,
  detalhes_vinculo    text,
  vinculo             text,
  dt_admissao         date,
  cid                 text,
  qtde_dias           integer,
  qtde_afastamentos   integer,
  periodo             date,
  created_at          timestamptz DEFAULT now()
);

-- Índice único sugerido para evitar duplicidade por colaborador+periodo
CREATE UNIQUE INDEX IF NOT EXISTS ux_atestados_matricula_periodo ON public.atestados_import (matricula, periodo);

-- =============================
-- EXEMPLOS: carregar CSV para staging (executar no cliente psql)
-- =============================
-- No seu terminal (local), estando na raiz do projeto onde está 'dados/out/...' execute:
-- psql "postgresql://USER:PASS@HOST:PORT/DBNAME" -c "\copy public.atestados_staging FROM 'dados/out/janAmar26__Planilha1.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"
-- Ou, no psql interativo:
-- \copy public.atestados_staging FROM 'dados/out/janAmar26__Planilha1.csv' CSV HEADER ENCODING 'UTF8';

-- Observação sobre Supabase: o editor SQL do Supabase não permite \copy de arquivos locais. Use a funcionalidade "Table editor → Import CSV", ou então um script Python/Node.js que leia o CSV e insira via cliente/PostgREST.

-- =============================
-- TRANSFORMAÇÃO: mover da staging para a tabela final (segura)
-- =============================
BEGIN;

INSERT INTO public.atestados_import (
  matricula, contrato, nome, nome_cargo, sexo, nome_divisao,
  local_de_trabalho, nome_unidade, detalhes_vinculo, vinculo,
  dt_admissao, cid, qtde_dias, qtde_afastamentos, periodo
)
SELECT
  NULLIF(trim(matricula),'') AS matricula,
  NULLIF(trim(contrato),'') AS contrato,
  NULLIF(trim(nome),'') AS nome,
  NULLIF(trim(nome_cargo),'') AS nome_cargo,
  CASE WHEN trim(sexo) = '' THEN NULL ELSE substr(trim(sexo),1,1) END AS sexo,
  NULLIF(trim(nome_divisao),'') AS nome_divisao,
  NULLIF(trim(local_de_trabalho),'') AS local_de_trabalho,
  NULLIF(trim(nome_unidade),'') AS nome_unidade,
  NULLIF(trim(detalhes_vinculo),'') AS detalhes_vinculo,
  NULLIF(trim(vinculo),'') AS vinculo,
  CASE WHEN trim(dt_admissao) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN trim(dt_admissao)::date ELSE NULL END AS dt_admissao,
  NULLIF(NULLIF(trim(cid),'0'),'') AS cid,
  CASE WHEN trim(qtde_dias) ~ '^[0-9]+$' THEN trim(qtde_dias)::int ELSE NULL END AS qtde_dias,
  CASE WHEN trim(qtde_afastamentos) ~ '^[0-9]+$' THEN trim(qtde_afastamentos)::int ELSE NULL END AS qtde_afastamentos,
  CASE WHEN trim(periodo) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN trim(periodo)::date ELSE NULL END AS periodo
FROM public.atestados_staging;

COMMIT;

-- =============================
-- CHECKS E LIMPEZA (opcional)
-- =============================
-- Exemplo: encontrar registros com datas inválidas ou campos numéricos sujos
-- SELECT * FROM public.atestados_staging WHERE dt_admissao <> '' AND dt_admissao !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' LIMIT 50;
-- SELECT * FROM public.atestados_staging WHERE qtde_dias <> '' AND qtde_dias !~ '^[0-9]+$' LIMIT 50;

-- Após validar a importação, se desejar remover a staging:
-- DROP TABLE public.atestados_staging;

-- FIM
