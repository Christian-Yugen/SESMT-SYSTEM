
-- Adicionar colunas de auditoria faltantes nas tabelas de afastamentos
-- O erro ocorre porque o código tenta inserir 'hash_auditoria' mas a coluna não existe no banco

-- 1. Adicionar hash_auditoria na tabela principal
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS hash_auditoria TEXT;

-- 2. Adicionar hash_auditoria e motivo_alteracao na tabela de logs
ALTER TABLE public.afastamentos_logs ADD COLUMN IF NOT EXISTS hash_auditoria TEXT;
ALTER TABLE public.afastamentos_logs ADD COLUMN IF NOT EXISTS motivo_alteracao TEXT;

-- 3. Caso a tabela 'eliminations' realmente exista (conforme a mensagem de erro)
-- Adiciona a coluna lá também por precaução para evitar o erro de cache
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'eliminations') THEN
        ALTER TABLE public.eliminations ADD COLUMN IF NOT EXISTS hash_auditoria TEXT;
    END IF;
END $$;

-- 4. Notificar PostgREST para recarregar o cache do esquema
-- Isso é fundamental para resolver o erro "Could not find column in the schema cache"
NOTIFY pgrst, 'reload schema';
