
-- Tabela para Afastamentos (Auxílio Doença / Licença Maternidade)
CREATE TABLE IF NOT EXISTS public.afastamentos (
    id BIGSERIAL PRIMARY KEY,
    servidor_cpf TEXT NOT NULL,
    servidor_nome TEXT NOT NULL,
    servidor_matricula TEXT NOT NULL,
    servidor_contrato TEXT, -- IMPORTANTE: Diferencia os vínculos
    servidor_secretaria TEXT,
    natureza_cargo TEXT,
    tipo_afastamento TEXT NOT NULL, -- AUX. DOENÇA, LICENÇA MATERNIDADE
    dias_afastado INTEGER,
    cid TEXT, -- Pode conter múltiplos separados por vírgula no legado, mas usaremos tabela vinculada
    data_inicio DATE NOT NULL,
    data_fim DATE,
    data_pericia DATE, -- Data da perícia técnica
    perito_nome TEXT,   -- Nome do médico perito
    perito_crm TEXT,    -- CRM/MS do perito
    situacao TEXT DEFAULT 'EM_ANDAMENTO', -- EM_ANDAMENTO, FINALIZADO (ALTA), PRORROGADO
    status TEXT DEFAULT 'ATIVO', -- Para compatibilidade com planilha (ATIVO/INATIVO)
    observacoes TEXT,
    renovado_por_id BIGINT REFERENCES public.afastamentos(id) ON DELETE SET NULL, -- Para prorrogação
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_por UUID REFERENCES auth.users(id),
    anexo_url TEXT
);

-- Tabela para Múltiplos CIDs por Afastamento (Padronização CID-10)
CREATE TABLE IF NOT EXISTS public.afastamento_cids (
    id BIGSERIAL PRIMARY KEY,
    afastamento_id BIGINT REFERENCES public.afastamentos(id) ON DELETE CASCADE,
    cid_codigo TEXT NOT NULL, -- Ex: J45
    cid_descricao TEXT,        -- Ex: Asma
    cid_capitulo TEXT,         -- Ex: Capítulo X (Para estatísticas)
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para Portarias de Afastamento (Oficialização)
CREATE TABLE IF NOT EXISTS public.portarias_afastamento (
    id BIGSERIAL PRIMARY KEY,
    afastamento_id BIGINT REFERENCES public.afastamentos(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    link_documento TEXT, -- URL para o documento salvo
    data_emissao DATE DEFAULT CURRENT_DATE,
    criado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.afastamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afastamento_cids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portarias_afastamento ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (LGPD: Sigilo Médico)
-- Somente Enfermeiros, Administradores e Futuramente Médicos
CREATE POLICY "Afastamentos: Acesso restrito (Auditores e Saúde)" 
ON public.afastamentos FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (role = 'admin' OR role = 'nurse')
    )
);

CREATE POLICY "Afastamento CIDs: Acesso restrito" 
ON public.afastamento_cids FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (role = 'admin' OR role = 'nurse')
    )
);

CREATE POLICY "Portarias Afastamento: Acesso restrito" 
ON public.portarias_afastamento FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (role = 'admin' OR role = 'nurse')
    )
);

-- Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.afastamentos_logs (
    id BIGSERIAL PRIMARY KEY,
    afastamento_id BIGINT REFERENCES public.afastamentos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    usuario_email TEXT,
    data_alteracao TIMESTAMPTZ DEFAULT NOW(),
    motivo TEXT,
    dados_anteriores JSONB,
    dados_novos JSONB
);

ALTER TABLE public.afastamentos_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Afastamentos Logs: Leitura para Auditores" 
ON public.afastamentos_logs FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (role = 'admin' OR role = 'nurse')));
