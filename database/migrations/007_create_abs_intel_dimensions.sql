-- =====================================================
-- MIGRACAO: Absenteismo Inteligente - Isolamento Interno (Dimensoes)
-- Versao: 007
-- Data: 2026-04-02
-- Descricao: Cria schema isolado abs_intel e dimensoes base
--            additive-only sem tocar objetos legados.
-- =====================================================

CREATE SCHEMA IF NOT EXISTS abs_intel;

CREATE OR REPLACE FUNCTION abs_intel.fn_abs_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS abs_intel.abs_dim_servidor (
    servidor_id BIGSERIAL PRIMARY KEY,
    cpf TEXT,
    cpf_mascarado TEXT,
    nome TEXT NOT NULL,
    sexo TEXT,
    data_nascimento DATE,
    raca_cor TEXT,
    instrucao TEXT,
    estado_civil TEXT,
    nacionalidade TEXT,
    deficiencia_rais TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_abs_dim_servidor_cpf_digits CHECK (
        cpf IS NULL OR cpf ~ '^[0-9]{11}$'
    ),
    CONSTRAINT chk_abs_dim_servidor_sexo CHECK (
        sexo IS NULL OR sexo IN ('F', 'M', 'NAO_INFORMADO')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_abs_dim_servidor_cpf
    ON abs_intel.abs_dim_servidor (cpf)
    WHERE cpf IS NOT NULL AND cpf <> '';

CREATE INDEX IF NOT EXISTS idx_abs_dim_servidor_nome
    ON abs_intel.abs_dim_servidor (nome);

CREATE INDEX IF NOT EXISTS idx_abs_dim_servidor_sexo
    ON abs_intel.abs_dim_servidor (sexo);

CREATE TABLE IF NOT EXISTS abs_intel.abs_dim_vinculo_servidor (
    vinculo_id BIGSERIAL PRIMARY KEY,
    servidor_id BIGINT NOT NULL REFERENCES abs_intel.abs_dim_servidor (servidor_id) ON DELETE RESTRICT,
    matricula TEXT NOT NULL,
    contrato TEXT NOT NULL,
    secretaria TEXT,
    cargo TEXT,
    natureza_cargo TEXT,
    nome_vinculo TEXT,
    categoria_funcional TEXT,
    situacao_funcional TEXT,
    data_admissao DATE,
    unidade_orcamentaria TEXT,
    local_trabalho TEXT,
    subdivisao TEXT,
    horas_mes NUMERIC(8,2),
    dias_semana NUMERIC(6,2),
    horas_semana NUMERIC(8,2),
    jornada NUMERIC(8,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_abs_dim_vinculo_operacional UNIQUE (servidor_id, matricula, contrato),
    CONSTRAINT chk_abs_dim_vinculo_matricula_not_blank CHECK (btrim(matricula) <> ''),
    CONSTRAINT chk_abs_dim_vinculo_contrato_not_blank CHECK (btrim(contrato) <> '')
);

CREATE INDEX IF NOT EXISTS idx_abs_dim_vinculo_matricula
    ON abs_intel.abs_dim_vinculo_servidor (matricula);

CREATE INDEX IF NOT EXISTS idx_abs_dim_vinculo_contrato
    ON abs_intel.abs_dim_vinculo_servidor (contrato);

CREATE INDEX IF NOT EXISTS idx_abs_dim_vinculo_secretaria
    ON abs_intel.abs_dim_vinculo_servidor (secretaria);

CREATE INDEX IF NOT EXISTS idx_abs_dim_vinculo_cargo
    ON abs_intel.abs_dim_vinculo_servidor (cargo);

CREATE INDEX IF NOT EXISTS idx_abs_dim_vinculo_local_trabalho
    ON abs_intel.abs_dim_vinculo_servidor (local_trabalho);

CREATE INDEX IF NOT EXISTS idx_abs_dim_vinculo_natureza_cargo
    ON abs_intel.abs_dim_vinculo_servidor (natureza_cargo);

CREATE TABLE IF NOT EXISTS abs_intel.abs_dim_tempo (
    tempo_id BIGSERIAL PRIMARY KEY,
    data_calendario DATE NOT NULL,
    ano INTEGER NOT NULL,
    semestre INTEGER NOT NULL,
    trimestre INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    dia INTEGER NOT NULL,
    competencia_yyyymm INTEGER NOT NULL,
    dia_semana INTEGER NOT NULL,
    nome_dia_semana TEXT NOT NULL,
    nome_mes TEXT NOT NULL,
    is_fim_semana BOOLEAN NOT NULL DEFAULT FALSE,
    is_dia_util BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_abs_dim_tempo_data UNIQUE (data_calendario),
    CONSTRAINT chk_abs_dim_tempo_semestre CHECK (semestre IN (1, 2)),
    CONSTRAINT chk_abs_dim_tempo_trimestre CHECK (trimestre BETWEEN 1 AND 4),
    CONSTRAINT chk_abs_dim_tempo_mes CHECK (mes BETWEEN 1 AND 12),
    CONSTRAINT chk_abs_dim_tempo_dia CHECK (dia BETWEEN 1 AND 31),
    CONSTRAINT chk_abs_dim_tempo_dia_semana CHECK (dia_semana BETWEEN 1 AND 7)
);

CREATE INDEX IF NOT EXISTS idx_abs_dim_tempo_competencia
    ON abs_intel.abs_dim_tempo (competencia_yyyymm);

CREATE INDEX IF NOT EXISTS idx_abs_dim_tempo_ano_mes
    ON abs_intel.abs_dim_tempo (ano, mes);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_abs_dim_servidor_updated_at'
    ) THEN
        CREATE TRIGGER trg_abs_dim_servidor_updated_at
        BEFORE UPDATE ON abs_intel.abs_dim_servidor
        FOR EACH ROW EXECUTE FUNCTION abs_intel.fn_abs_set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_abs_dim_vinculo_servidor_updated_at'
    ) THEN
        CREATE TRIGGER trg_abs_dim_vinculo_servidor_updated_at
        BEFORE UPDATE ON abs_intel.abs_dim_vinculo_servidor
        FOR EACH ROW EXECUTE FUNCTION abs_intel.fn_abs_set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_abs_dim_tempo_updated_at'
    ) THEN
        CREATE TRIGGER trg_abs_dim_tempo_updated_at
        BEFORE UPDATE ON abs_intel.abs_dim_tempo
        FOR EACH ROW EXECUTE FUNCTION abs_intel.fn_abs_set_updated_at();
    END IF;
END $$;

COMMENT ON SCHEMA abs_intel IS 'Schema isolado do dominio de absenteismo inteligente (FASE 3U).';

-- =====================================================
-- FIM DA MIGRACAO 007
-- =====================================================
