-- ============================================
-- CORREÇÃO DE POLÍTICAS DE EXCLUSÃO DE ASO (VERSÃO 2)
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Garantir que administradores tenham permissão total de DELETE na tabela aso_history
DROP POLICY IF EXISTS "Admins podem deletar do aso_history" ON public.aso_history;
CREATE POLICY "Admins podem deletar do aso_history" ON public.aso_history 
FOR DELETE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 2. Limpeza de dados órfãos em deletion_requests
-- Algumas solicitações podem apontar para registros que já foram deletados manualmente.
-- Removemos essas solicitações órfãs para permitir a criação da chave estrangeira.
DELETE FROM public.deletion_requests
WHERE history_record_id NOT IN (SELECT id FROM public.aso_history);

-- 3. Corrigir a restrição de chave estrangeira em deletion_requests
-- Adicionamos ON DELETE CASCADE para que a solicitação seja limpa se o histórico for deletado.
ALTER TABLE public.deletion_requests 
DROP CONSTRAINT IF EXISTS deletion_requests_history_record_id_fkey;

ALTER TABLE public.deletion_requests 
ADD CONSTRAINT deletion_requests_history_record_id_fkey 
FOREIGN KEY (history_record_id) 
REFERENCES public.aso_history(id) 
ON DELETE CASCADE;

-- 4. (OPCIONAL) Limpeza retroativa via SQL
-- Descomente abaixo para deletar todos os aprovados de uma vez
-- DELETE FROM public.aso_history 
-- WHERE id IN (SELECT history_record_id FROM public.deletion_requests WHERE status = 'approved');

-- ============================================
-- FIM DO SCRIPT
-- ============================================
