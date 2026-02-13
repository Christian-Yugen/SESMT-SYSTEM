-- ============================================
-- SISTEMA DE EXCLUSÃO DE REGISTROS - SESMT
-- Execute este script no Supabase SQL Editor
-- ============================================
-- 1. CRIAR TABELA DE SOLICITAÇÕES DE EXCLUSÃO
CREATE TABLE IF NOT EXISTS public.deletion_requests (
    id BIGSERIAL PRIMARY KEY,
    history_record_id BIGINT NOT NULL,
    requester_id UUID NOT NULL REFERENCES auth.users(id),
    requester_name TEXT NOT NULL,
    deletion_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewer_name TEXT,
    original_data JSONB,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);
-- 2. HABILITAR ROW LEVEL SECURITY
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
-- 3. POLÍTICAS DE SEGURANÇA
-- Operadores podem ver suas próprias solicitações
DROP POLICY IF EXISTS "Operadores podem ver suas próprias solicitações" ON public.deletion_requests;
CREATE POLICY "Operadores podem ver suas próprias solicitações" ON public.deletion_requests FOR
SELECT USING (auth.uid() = requester_id);
-- Admin pode ver todas as solicitações
DROP POLICY IF EXISTS "Admin pode ver todas solicitações" ON public.deletion_requests;
CREATE POLICY "Admin pode ver todas solicitações" ON public.deletion_requests FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
        )
    );
-- Operadores autenticados podem criar solicitações
DROP POLICY IF EXISTS "Operadores podem criar solicitações" ON public.deletion_requests;
CREATE POLICY "Operadores podem criar solicitações" ON public.deletion_requests FOR
INSERT WITH CHECK (auth.uid() = requester_id);
-- Apenas admin pode atualizar status
DROP POLICY IF EXISTS "Admin pode atualizar solicitações" ON public.deletion_requests;
CREATE POLICY "Admin pode atualizar solicitações" ON public.deletion_requests FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
        )
    );
-- 4. PERMISSÕES
GRANT SELECT,
    INSERT ON public.deletion_requests TO authenticated;
GRANT UPDATE ON public.deletion_requests TO authenticated;
-- 5. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requester ON public.deletion_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_history_record ON public.deletion_requests(history_record_id);
-- 6. ADICIONAR COLUNAS NA TABELA aso_history
ALTER TABLE public.aso_history
ADD COLUMN IF NOT EXISTS deletion_pending BOOLEAN DEFAULT FALSE;
ALTER TABLE public.aso_history
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.aso_history
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.aso_history
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
-- 7. ÍNDICES NA TABELA aso_history
CREATE INDEX IF NOT EXISTS idx_aso_history_deletion_pending ON public.aso_history(deletion_pending);
CREATE INDEX IF NOT EXISTS idx_aso_history_deleted ON public.aso_history(deleted);
-- ============================================
-- FIM DO SCRIPT
-- ============================================