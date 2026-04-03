-- =====================================================
-- MIGRACAO: Programa Unificado de Absenteismo - Dimensoes
-- Versao: 004
-- Data: 2026-03-31
-- Descricao: Cria dimensoes base para servidor, vinculo e tempo
--            (FASE 2 - modelagem relacional)
-- =====================================================

-- 1) DIMENSAO DE SERVIDOR
CREATE TABLE IF NOT EXISTS public.dim_servidor (
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
    CONSTRAINT chk_dim_servidor_cpf_digits CHECK (
        cpf IS NULL OR cpf ~ '^[0-9]{11}$'
    ),
    CONSTRAINT chk_dim_servidor_sexo CHECK (
        sexo IS NULL OR sexo IN ('F', 'M', 'NAO_INFORMADO')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dim_servidor_cpf
    ON public.dim_servidor (cpf)
    WHERE cpf IS NOT NULL AND cpf <> '';

CREATE INDEX IF NOT EXISTS idx_dim_servidor_nome
    ON public.dim_servidor (nome);

CREATE INDEX IF NOT EXISTS idx_dim_servidor_sexo
    ON public.dim_servidor (sexo);

-- 2) DIMENSAO DE VINCULO
CREATE TABLE IF NOT EXISTS public.dim_vinculo_servidor (
    vinculo_id BIGSERIAL PRIMARY KEY,
    servidor_id BIGINT NOT NULL REFERENCES public.dim_servidor (servidor_id) ON DELETE RESTRICT,
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
    CONSTRAINT uq_dim_vinculo_servidor_operacional UNIQUE (servidor_id, matricula, contrato),
    CONSTRAINT chk_dim_vinculo_matricula_not_blank CHECK (btrim(matricula) <> ''),
    CONSTRAINT chk_dim_vinculo_contrato_not_blank CHECK (btrim(contrato) <> '')
);

CREATE INDEX IF NOT EXISTS idx_dim_vinculo_matricula
    ON public.dim_vinculo_servidor (matricula);

CREATE INDEX IF NOT EXISTS idx_dim_vinculo_contrato
    ON public.dim_vinculo_servidor (contrato);

CREATE INDEX IF NOT EXISTS idx_dim_vinculo_secretaria
    ON public.dim_vinculo_servidor (secretaria);

CREATE INDEX IF NOT EXISTS idx_dim_vinculo_cargo
    ON public.dim_vinculo_servidor (cargo);

CREATE INDEX IF NOT EXISTS idx_dim_vinculo_local_trabalho
    ON public.dim_vinculo_servidor (local_trabalho);

CREATE INDEX IF NOT EXISTS idx_dim_vinculo_natureza_cargo
    ON public.dim_vinculo_servidor (natureza_cargo);

-- 3) DIMENSAO DE TEMPO
CREATE TABLE IF NOT EXISTS public.dim_tempo (
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
    CONSTRAINT uq_dim_tempo_data UNIQUE (data_calendario),
    CONSTRAINT chk_dim_tempo_semestre CHECK (semestre IN (1, 2)),
    CONSTRAINT chk_dim_tempo_trimestre CHECK (trimestre BETWEEN 1 AND 4),
    CONSTRAINT chk_dim_tempo_mes CHECK (mes BETWEEN 1 AND 12),
    CONSTRAINT chk_dim_tempo_dia CHECK (dia BETWEEN 1 AND 31),
    CONSTRAINT chk_dim_tempo_dia_semana CHECK (dia_semana BETWEEN 1 AND 7)
);

CREATE INDEX IF NOT EXISTS idx_dim_tempo_competencia
    ON public.dim_tempo (competencia_yyyymm);

CREATE INDEX IF NOT EXISTS idx_dim_tempo_ano_mes
    ON public.dim_tempo (ano, mes);

-- 4) TRIGGER GENERICO DE UPDATED_AT (IDEMPOTENTE)
CREATE OR REPLACE FUNCTION public.trg_set_updated_at_absenteismo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dim_servidor_updated_at ON public.dim_servidor;
CREATE TRIGGER trg_dim_servidor_updated_at
BEFORE UPDATE ON public.dim_servidor
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

DROP TRIGGER IF EXISTS trg_dim_vinculo_servidor_updated_at ON public.dim_vinculo_servidor;
CREATE TRIGGER trg_dim_vinculo_servidor_updated_at
BEFORE UPDATE ON public.dim_vinculo_servidor
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

DROP TRIGGER IF EXISTS trg_dim_tempo_updated_at ON public.dim_tempo;
CREATE TRIGGER trg_dim_tempo_updated_at
BEFORE UPDATE ON public.dim_tempo
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

-- 5) COMENTARIOS
COMMENT ON TABLE public.dim_servidor IS 'Dimensao da pessoa servidora. Nao deve conter atributos de vinculo organizacional.';
COMMENT ON TABLE public.dim_vinculo_servidor IS 'Dimensao do vinculo funcional. Chave operacional: servidor + matricula + contrato.';
COMMENT ON TABLE public.dim_tempo IS 'Dimensao calendario para competencia, recortes temporais e denominadores.';

-- =====================================================
-- FIM DA MIGRACAO 004
-- =====================================================
