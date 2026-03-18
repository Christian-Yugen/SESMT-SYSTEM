
-- TABELA PARA MENSAGENS CONFIGURÁVEIS PELO ADMINISTRADOR
CREATE TABLE IF NOT EXISTS public.system_greetings (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- INSERIR MENSAGEM PADRÃO
INSERT INTO public.system_greetings (content, priority) 
VALUES ('Estamos muito felizes em ter você conosco hoje! Que seu trabalho seja leve e produtivo.', 1);

-- HABILITAR RLS
ALTER TABLE public.system_greetings ENABLE ROW LEVEL SECURITY;

-- POLÍTICA: TODOS OS USUÁRIOS AUTENTICADOS PODEM LER MENSAGENS ATIVAS
CREATE POLICY "Mensagens visíveis por todos autenticados" 
ON public.system_greetings FOR SELECT 
TO authenticated 
USING (active = true);

-- POLÍTICA: APENAS ADMINS PODEM GERENCIAR MENSAGENS
CREATE POLICY "Admins podem gerenciar mensagens" 
ON public.system_greetings FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- GRANT
GRANT SELECT ON public.system_greetings TO authenticated;
