-- Script de Melhoria Estrutural: Servidores (V2)
-- Adiciona colunas para novos vínculos e campos de dados adicionais

-- 1. Colunas base para vínculos e metadados
ALTER TABLE public.servidores 
ADD COLUMN IF NOT EXISTS contrato TEXT,
ADD COLUMN IF NOT EXISTS sexo TEXT,
ADD COLUMN IF NOT EXISTS local_trabalho TEXT,
ADD COLUMN IF NOT EXISTS vinculo TEXT,
ADD COLUMN IF NOT EXISTS natureza_cargo TEXT;

-- 2. Novas colunas solicitadas (Nascimento, Admissão, RAIS, PIS)
-- Nota: 'nascimento' costuma ser DATE, mas no seu banco atual está como string/timestamp. 
-- Vamos garantir que os novos campos existam:
ALTER TABLE public.servidores 
ADD COLUMN IF NOT EXISTS admissao TEXT,
ADD COLUMN IF NOT EXISTS deficiencia_rais TEXT,
ADD COLUMN IF NOT EXISTS pis_pasep TEXT;

-- 3. Limpeza para Chave Composta
UPDATE public.servidores SET contrato = '1' WHERE contrato IS NULL;

-- 4. Restrição de Unicidade (CPF + Matrícula + Contrato)
ALTER TABLE public.servidores DROP CONSTRAINT IF EXISTS unique_servidor_vinculo;
ALTER TABLE public.servidores ADD CONSTRAINT unique_servidor_vinculo UNIQUE (cpf, matricula, contrato);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_servidores_composite_key ON public.servidores (cpf, matricula, contrato);
