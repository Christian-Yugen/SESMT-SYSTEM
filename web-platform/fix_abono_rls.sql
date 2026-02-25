-- ATUALIZAÇÃO DE RLS PARA O PAPEL DE ASSISTENTE SOCIAL
-- Este script permite que Assistentes Sociais gerenciem o Abono Salarial
-- 1. Atualizar política de INSERÇÃO no abono_salarial
DROP POLICY IF EXISTS "Admins e enfermeiros podem inserir abonos" ON public.abono_salarial;
CREATE POLICY "Permitir inserção para admin, nurse, operator e social_assistant" ON public.abono_salarial FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'nurse', 'operator', 'social_assistant')
        )
    );
-- 2. Atualizar política de ATUALIZAÇÃO no abono_salarial
DROP POLICY IF EXISTS "Admins e enfermeiros podem atualizar abonos" ON public.abono_salarial;
CREATE POLICY "Permitir atualização para admin, nurse, operator e social_assistant" ON public.abono_salarial FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'nurse', 'operator', 'social_assistant')
        )
    );
-- 3. Atualizar política de LEITURA nos logs (Social Assistant deve ver o histórico que ele mesmo ajuda a criar)
DROP POLICY IF EXISTS "Apenas admins podem ver logs" ON public.abono_salarial_logs;
CREATE POLICY "Admin e Social Assistant podem ver logs" ON public.abono_salarial_logs FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'social_assistant', 'nurse', 'operator')
        )
    );
-- 4. Garantir que todos os cargos autorizados possam inserir logs
DROP POLICY IF EXISTS "Usuários autenticados podem inserir logs" ON public.abono_salarial_logs;
CREATE POLICY "Cargos autorizados podem inserir logs" ON public.abono_salarial_logs FOR
INSERT WITH CHECK (auth.role() = 'authenticated');