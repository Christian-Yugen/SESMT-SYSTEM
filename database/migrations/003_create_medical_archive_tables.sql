-- =====================================================
-- MIGRAÇÃO: Sistema de Arquivo Médico (Prontuários)
-- Versão: 003
-- Data: 2026-02-12
-- Descrição: Cria tabelas para gerenciamento de localização
--            física de prontuários médicos em arquivo
-- =====================================================
-- 1. TABELA: medical_folders (Estado atual dos prontuários)
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    servidor_cpf TEXT NOT NULL UNIQUE,
    servidor_nome TEXT NOT NULL,
    armario INTEGER NOT NULL CHECK (armario > 0),
    gaveta INTEGER NOT NULL CHECK (
        gaveta BETWEEN 1 AND 3
    ),
    pasta INTEGER NOT NULL CHECK (pasta > 0),
    status TEXT NOT NULL CHECK (status IN ('ARQUIVADO', 'RETIRADO')),
    posse_nome TEXT,
    motivo_saida TEXT,
    data_saida TIMESTAMP WITH TIME ZONE,
    ultima_movimentacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Índices para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_medical_folders_cpf ON medical_folders(servidor_cpf);
CREATE INDEX IF NOT EXISTS idx_medical_folders_nome ON medical_folders(servidor_nome);
CREATE INDEX IF NOT EXISTS idx_medical_folders_status ON medical_folders(status);
CREATE INDEX IF NOT EXISTS idx_medical_folders_armario ON medical_folders(armario, gaveta, pasta);
-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_medical_folders_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_medical_folders_updated_at BEFORE
UPDATE ON medical_folders FOR EACH ROW EXECUTE FUNCTION update_medical_folders_updated_at();
-- 2. TABELA: medical_folder_logs (Histórico de movimentações)
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_folder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES medical_folders(id) ON DELETE CASCADE,
    tipo_acao TEXT NOT NULL CHECK (tipo_acao IN ('RETIRADA', 'DEVOLUCAO')),
    servidor_nome TEXT NOT NULL,
    motivo TEXT NOT NULL,
    anotacoes_devolucao TEXT,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    operador_sistema UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Índices para otimizar consultas de histórico
CREATE INDEX IF NOT EXISTS idx_medical_logs_folder ON medical_folder_logs(folder_id);
CREATE INDEX IF NOT EXISTS idx_medical_logs_data ON medical_folder_logs(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_medical_logs_operador ON medical_folder_logs(operador_sistema);
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Habilitar RLS nas tabelas
ALTER TABLE medical_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_folder_logs ENABLE ROW LEVEL SECURITY;
-- Políticas para medical_folders
-- Admins e arquivistas podem ver tudo
CREATE POLICY "Admins e arquivistas podem visualizar prontuários" ON medical_folders FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM profiles
            WHERE role IN ('admin', 'archivist', 'nurse')
        )
    );
-- Admins e arquivistas podem inserir
CREATE POLICY "Admins e arquivistas podem criar prontuários" ON medical_folders FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id
            FROM profiles
            WHERE role IN ('admin', 'archivist')
        )
    );
-- Admins e arquivistas podem atualizar
CREATE POLICY "Admins e arquivistas podem atualizar prontuários" ON medical_folders FOR
UPDATE USING (
        auth.uid() IN (
            SELECT id
            FROM profiles
            WHERE role IN ('admin', 'archivist')
        )
    );
-- Admins podem deletar
CREATE POLICY "Admins podem deletar prontuários" ON medical_folders FOR DELETE USING (
    auth.uid() IN (
        SELECT id
        FROM profiles
        WHERE role = 'admin'
    )
);
-- Políticas para medical_folder_logs
-- Qualquer usuário autorizado pode ver o histórico
CREATE POLICY "Usuários autorizados podem ver histórico" ON medical_folder_logs FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM profiles
            WHERE role IN ('admin', 'archivist', 'nurse')
        )
    );
-- Apenas admins e arquivistas podem inserir logs
CREATE POLICY "Admins e arquivistas podem criar logs" ON medical_folder_logs FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id
            FROM profiles
            WHERE role IN ('admin', 'archivist')
        )
    );
-- 4. DADOS DE EXEMPLO (DESENVOLVIMENTO)
-- =====================================================
-- Comentado para produção, descomente apenas em ambiente de desenvolvimento
/*
 INSERT INTO medical_folders (servidor_cpf, servidor_nome, armario, gaveta, pasta, status) VALUES
 ('030.307.754-96', 'JOÃO SILVA SANTOS', 5, 3, 10, 'ARQUIVADO'),
 ('123.456.789-00', 'MARIA OLIVEIRA COSTA', 2, 1, 45, 'ARQUIVADO'),
 ('987.654.321-00', 'CARLOS EDUARDO LIMA', 8, 2, 127, 'ARQUIVADO'),
 ('111.222.333-44', 'ANA PAULA RODRIGUES', 3, 1, 56, 'ARQUIVADO'),
 ('555.666.777-88', 'ROBERTO FERREIRA', 7, 3, 89, 'ARQUIVADO');
 */
-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE medical_folders IS 'Armazena a localização física atual de cada prontuário médico no arquivo';
COMMENT ON COLUMN medical_folders.servidor_cpf IS 'CPF único do servidor';
COMMENT ON COLUMN medical_folders.armario IS 'Número do armário onde está localizado (1-N)';
COMMENT ON COLUMN medical_folders.gaveta IS 'Número da gaveta dentro do armário (1-3)';
COMMENT ON COLUMN medical_folders.pasta IS 'Número da pasta suspensa dentro da gaveta';
COMMENT ON COLUMN medical_folders.status IS 'Status atual: ARQUIVADO (no local físico) ou RETIRADO (em posse de alguém)';
COMMENT ON COLUMN medical_folders.posse_nome IS 'Nome de quem está com o prontuário quando status=RETIRADO';
COMMENT ON COLUMN medical_folders.motivo_saida IS 'Motivo da retirada do arquivo';
COMMENT ON TABLE medical_folder_logs IS 'Histórico completo de todas as movimentações de prontuários (auditoria)';
COMMENT ON COLUMN medical_folder_logs.tipo_acao IS 'Tipo de movimentação: RETIRADA ou DEVOLUCAO';
COMMENT ON COLUMN medical_folder_logs.anotacoes_devolucao IS 'Observações feitas no momento da devolução';
COMMENT ON COLUMN medical_folder_logs.operador_sistema IS 'ID do usuário que registrou a movimentação';
-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================