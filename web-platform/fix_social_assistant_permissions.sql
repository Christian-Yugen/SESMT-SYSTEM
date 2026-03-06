-- ====================================================================
-- SCRIPT DE AJUSTE DE PERMISSÕES PARA ASSISTENTE SOCIAL (ABONO)
-- Este script concede paridade ao perfil 'social_assistant' com o 'admin'
-- nas tabelas do módulo de Abono Salarial e Portarias.
-- ====================================================================
-- 1. TABELA: abono_salarial
-- --------------------------------------------------------------------
-- Permitir SELECT (Já deve existir, mas reforçando)
DROP POLICY IF EXISTS "social_assistant_select_abono" ON public.abono_salarial;
CREATE POLICY "social_assistant_select_abono" ON public.abono_salarial FOR
SELECT USING (true);
-- Permitir INSERT para social_assistant
DROP POLICY IF EXISTS "social_assistant_insert_abono" ON public.abono_salarial;
CREATE POLICY "social_assistant_insert_abono" ON public.abono_salarial FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'social_assistant', 'nurse', 'operator')
        )
    );
-- Permitir UPDATE para social_assistant
DROP POLICY IF EXISTS "social_assistant_update_abono" ON public.abono_salarial;
CREATE POLICY "social_assistant_update_abono" ON public.abono_salarial FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'social_assistant', 'nurse', 'operator')
        )
    );
-- Permitir DELETE para social_assistant (Paridade com Admin)
DROP POLICY IF EXISTS "social_assistant_delete_abono" ON public.abono_salarial;
CREATE POLICY "social_assistant_delete_abono" ON public.abono_salarial FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'social_assistant')
    )
);
-- 2. TABELA: portarias_abono
-- --------------------------------------------------------------------
ALTER TABLE public.portarias_abono ENABLE ROW LEVEL SECURITY;
-- Permitir SELECT para todos autenticados
DROP POLICY IF EXISTS "select_portarias_abono" ON public.portarias_abono;
CREATE POLICY "select_portarias_abono" ON public.portarias_abono FOR
SELECT USING (auth.role() = 'authenticated');
-- Permitir INSERT para social_assistant e admin
DROP POLICY IF EXISTS "insert_portarias_abono" ON public.portarias_abono;
CREATE POLICY "insert_portarias_abono" ON public.portarias_abono FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'social_assistant')
        )
    );
-- Permitir UPDATE para social_assistant e admin
DROP POLICY IF EXISTS "update_portarias_abono" ON public.portarias_abono;
CREATE POLICY "update_portarias_abono" ON public.portarias_abono FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'social_assistant')
        )
    );
-- Permitir DELETE para social_assistant e admin
DROP POLICY IF EXISTS "delete_portarias_abono" ON public.portarias_abono;
CREATE POLICY "delete_portarias_abono" ON public.portarias_abono FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'social_assistant')
    )
);
-- 3. TABELAS DE LOGS (Auditoria)
-- --------------------------------------------------------------------
-- abono_salarial_logs
DROP POLICY IF EXISTS "social_assistant_logs_policy" ON public.abono_salarial_logs;
CREATE POLICY "social_assistant_logs_policy" ON public.abono_salarial_logs FOR ALL USING (auth.role() = 'authenticated');
-- portarias_abono_logs
ALTER TABLE public.portarias_abono_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portarias_logs_policy" ON public.portarias_abono_logs;
CREATE POLICY "portarias_logs_policy" ON public.portarias_abono_logs FOR ALL USING (auth.role() = 'authenticated');
-- 4. GRANT PERMISSIONS
-- --------------------------------------------------------------------
GRANT ALL ON public.abono_salarial TO authenticated;
GRANT ALL ON public.portarias_abono TO authenticated;
GRANT ALL ON public.abono_salarial_logs TO authenticated;
GRANT ALL ON public.portarias_abono_logs TO authenticated;
GRANT USAGE,
    SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;