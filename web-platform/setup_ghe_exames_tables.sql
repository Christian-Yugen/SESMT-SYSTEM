-- Script de Criação: GHE e Exames por Função
-- Este script cria a estrutura necessária para armazenar dados de riscos e exames obrigatórios

-- 1. Tabela de Metadados GHE
CREATE TABLE IF NOT EXISTS public.ghe_metadata (
    id BIGSERIAL PRIMARY KEY,
    cod TEXT UNIQUE NOT NULL,
    funcao TEXT NOT NULL,
    ghe TEXT,
    ghe_conjunto TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Exames por Função
CREATE TABLE IF NOT EXISTS public.exams_by_function (
    id BIGSERIAL PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('admissional', 'demissional', 'periodico')),
    funcao TEXT NOT NULL,
    ghe TEXT,
    exames JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_exam_assignment UNIQUE (tipo, funcao, ghe)
);

-- 3. Habilitar RLS (Opcional, mas recomendado)
ALTER TABLE public.ghe_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams_by_function ENABLE ROW LEVEL SECURITY;

-- 4. Políticas básicas (Leitura pública, Redação apenas via Service Role)
DROP POLICY IF EXISTS "Leitura pública GHE" ON public.ghe_metadata;
CREATE POLICY "Leitura pública GHE" ON public.ghe_metadata FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura pública Exames" ON public.exams_by_function;
CREATE POLICY "Leitura pública Exames" ON public.exams_by_function FOR SELECT USING (true);

-- 5. Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_ghe_metadata_funcao ON public.ghe_metadata(funcao);
CREATE INDEX IF NOT EXISTS idx_exams_by_function_lookup ON public.exams_by_function(tipo, funcao);
