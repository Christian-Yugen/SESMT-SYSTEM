-- Migration: adicionar suporte a junção de atestados para criação de afastamentos
-- Cria a tabela de ligação `afastamento_atestados` e adiciona colunas em `afastamentos`
BEGIN;

-- Campo que marca que o afastamento foi criado a partir de junção de atestados
ALTER TABLE public.afastamentos
  ADD COLUMN IF NOT EXISTS is_juncao_atestados BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS juncao_meta JSONB;

-- Tabela que registra as referências entre afastamentos e atestados (ou faixas manuais)
CREATE TABLE IF NOT EXISTS public.afastamento_atestados (
  id BIGSERIAL PRIMARY KEY,
  afastamento_id BIGINT REFERENCES public.afastamentos(id) ON DELETE CASCADE,
  atestado_id BIGINT REFERENCES public.atestados_import(id) ON DELETE SET NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias INTEGER,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_afastamento_atestados_afastamento_id ON public.afastamento_atestados (afastamento_id);
CREATE INDEX IF NOT EXISTS idx_afastamento_atestados_atestado_id ON public.afastamento_atestados (atestado_id);

-- Habilitar RLS e política semelhante às outras tabelas sensíveis
ALTER TABLE public.afastamento_atestados ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'afastamento_atestados' AND p.polname = 'Afastamento Atestados: Acesso restrito'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Afastamento Atestados: Acesso restrito"
      ON public.afastamento_atestados FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (role = 'admin' OR role = 'nurse')
        )
      );
    $$;
  END IF;
END$$;

COMMIT;
