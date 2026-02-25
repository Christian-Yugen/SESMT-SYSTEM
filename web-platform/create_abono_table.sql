-- ============================================
-- SISTEMA DE ABONO SALARIAL - SESMT
-- Este script cria a tabela de abono salarial e configura RLS
-- ============================================
-- 1. CRIAR TABELA DE ABONO SALARIAL
CREATE TABLE IF NOT EXISTS public.abono_salarial (
    id BIGSERIAL PRIMARY KEY,
    cpf TEXT NOT NULL,
    nome TEXT NOT NULL,
    portaria TEXT,
    assomasul_data DATE,
    inicio DATE,
    quant INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- 2. HABILITAR ROW LEVEL SECURITY
ALTER TABLE public.abono_salarial ENABLE ROW LEVEL SECURITY;
-- 3. POLÍTICAS DE SEGURANÇA
-- Usuários autenticados podem ver todos os abonos
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os abonos" ON public.abono_salarial;
CREATE POLICY "Usuários autenticados podem ver todos os abonos" ON public.abono_salarial FOR
SELECT USING (auth.role() = 'authenticated');
-- Apenas admins, enfermeiros e operadores podem inserir/editar abonos
DROP POLICY IF EXISTS "Admins e enfermeiros podem inserir abonos" ON public.abono_salarial;
CREATE POLICY "Admins e enfermeiros podem inserir abonos" ON public.abono_salarial FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'nurse', 'operator')
        )
    );
DROP POLICY IF EXISTS "Admins e enfermeiros podem atualizar abonos" ON public.abono_salarial;
CREATE POLICY "Admins e enfermeiros podem atualizar abonos" ON public.abono_salarial FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'nurse', 'operator')
        )
    );
-- 4. PERMISSÕES
GRANT SELECT,
    INSERT,
    UPDATE ON public.abono_salarial TO authenticated;
-- 5. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_abono_salarial_cpf ON public.abono_salarial(cpf);
CREATE INDEX IF NOT EXISTS idx_abono_salarial_nome ON public.abono_salarial(nome);