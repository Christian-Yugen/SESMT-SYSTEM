-- =====================================================
-- MIGRACAO: Programa Unificado de Absenteismo - Estruturas de Risco
-- Versao: 006
-- Data: 2026-03-31
-- Descricao: Cria estruturas preparatorias psicossociais e ergonomicas
--            (FASE 2 estrutural, sem carga)
-- =====================================================

-- 1) PSICOSSOCIAL
CREATE TABLE IF NOT EXISTS public.dim_psychosocial_factor (
    psychosocial_factor_id BIGSERIAL PRIMARY KEY,
    codigo TEXT,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    fonte_normativa TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dim_psychosocial_factor_codigo UNIQUE (codigo)
);

CREATE TABLE IF NOT EXISTS public.fact_psychosocial_assessment (
    psychosocial_assessment_id BIGSERIAL PRIMARY KEY,
    servidor_id BIGINT REFERENCES public.dim_servidor (servidor_id) ON DELETE RESTRICT,
    vinculo_id BIGINT REFERENCES public.dim_vinculo_servidor (vinculo_id) ON DELETE RESTRICT,
    tempo_id BIGINT REFERENCES public.dim_tempo (tempo_id) ON DELETE RESTRICT,
    psychosocial_factor_id BIGINT REFERENCES public.dim_psychosocial_factor (psychosocial_factor_id) ON DELETE RESTRICT,
    instrumento TEXT,
    score NUMERIC(12,4),
    nivel_risco TEXT,
    avaliador TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fact_psychosocial_signal (
    psychosocial_signal_id BIGSERIAL PRIMARY KEY,
    afastamento_id BIGINT REFERENCES public.fact_afastamento_evento (afastamento_id) ON DELETE SET NULL,
    servidor_id BIGINT REFERENCES public.dim_servidor (servidor_id) ON DELETE RESTRICT,
    vinculo_id BIGINT REFERENCES public.dim_vinculo_servidor (vinculo_id) ON DELETE RESTRICT,
    cid_codigo TEXT,
    signal_strength NUMERIC(12,4),
    status_investigacao TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fact_psychosocial_signal_strength CHECK (
        signal_strength IS NULL OR signal_strength >= 0
    )
);

-- 2) ERGONOMIA
CREATE TABLE IF NOT EXISTS public.dim_ergonomic_factor (
    ergonomic_factor_id BIGSERIAL PRIMARY KEY,
    codigo TEXT,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    fonte_normativa TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dim_ergonomic_factor_codigo UNIQUE (codigo)
);

CREATE TABLE IF NOT EXISTS public.fact_ergonomic_assessment (
    ergonomic_assessment_id BIGSERIAL PRIMARY KEY,
    servidor_id BIGINT REFERENCES public.dim_servidor (servidor_id) ON DELETE RESTRICT,
    vinculo_id BIGINT REFERENCES public.dim_vinculo_servidor (vinculo_id) ON DELETE RESTRICT,
    tempo_id BIGINT REFERENCES public.dim_tempo (tempo_id) ON DELETE RESTRICT,
    ergonomic_factor_id BIGINT REFERENCES public.dim_ergonomic_factor (ergonomic_factor_id) ON DELETE RESTRICT,
    metodo_avaliacao TEXT,
    score NUMERIC(12,4),
    nivel_risco TEXT,
    avaliador TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fact_ergonomic_exposure (
    ergonomic_exposure_id BIGSERIAL PRIMARY KEY,
    servidor_id BIGINT REFERENCES public.dim_servidor (servidor_id) ON DELETE RESTRICT,
    vinculo_id BIGINT REFERENCES public.dim_vinculo_servidor (vinculo_id) ON DELETE RESTRICT,
    ergonomic_factor_id BIGINT REFERENCES public.dim_ergonomic_factor (ergonomic_factor_id) ON DELETE RESTRICT,
    local_trabalho TEXT,
    frequencia_exposicao TEXT,
    intensidade_exposicao TEXT,
    inicio_exposicao DATE,
    fim_exposicao DATE,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fact_ergonomic_exposure_periodo CHECK (
        fim_exposicao IS NULL OR inicio_exposicao IS NULL OR fim_exposicao >= inicio_exposicao
    )
);

CREATE TABLE IF NOT EXISTS public.fact_ergonomic_action_plan (
    ergonomic_action_plan_id BIGSERIAL PRIMARY KEY,
    ergonomic_assessment_id BIGINT REFERENCES public.fact_ergonomic_assessment (ergonomic_assessment_id) ON DELETE SET NULL,
    servidor_id BIGINT REFERENCES public.dim_servidor (servidor_id) ON DELETE RESTRICT,
    vinculo_id BIGINT REFERENCES public.dim_vinculo_servidor (vinculo_id) ON DELETE RESTRICT,
    prioridade TEXT,
    acao_recomendada TEXT NOT NULL,
    responsavel TEXT,
    data_prevista DATE,
    data_execucao DATE,
    status_acao TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fact_ergonomic_action_plan_datas CHECK (
        data_execucao IS NULL OR data_prevista IS NULL OR data_execucao >= data_prevista
    )
);

-- 3) INDICES DE CONSULTA
CREATE INDEX IF NOT EXISTS idx_fact_psychosocial_assessment_servidor
    ON public.fact_psychosocial_assessment (servidor_id);
CREATE INDEX IF NOT EXISTS idx_fact_psychosocial_assessment_vinculo
    ON public.fact_psychosocial_assessment (vinculo_id);
CREATE INDEX IF NOT EXISTS idx_fact_psychosocial_assessment_tempo
    ON public.fact_psychosocial_assessment (tempo_id);
CREATE INDEX IF NOT EXISTS idx_fact_psychosocial_signal_afastamento
    ON public.fact_psychosocial_signal (afastamento_id);
CREATE INDEX IF NOT EXISTS idx_fact_psychosocial_signal_cid
    ON public.fact_psychosocial_signal (cid_codigo);

CREATE INDEX IF NOT EXISTS idx_fact_ergonomic_assessment_servidor
    ON public.fact_ergonomic_assessment (servidor_id);
CREATE INDEX IF NOT EXISTS idx_fact_ergonomic_assessment_vinculo
    ON public.fact_ergonomic_assessment (vinculo_id);
CREATE INDEX IF NOT EXISTS idx_fact_ergonomic_exposure_factor
    ON public.fact_ergonomic_exposure (ergonomic_factor_id);
CREATE INDEX IF NOT EXISTS idx_fact_ergonomic_exposure_local
    ON public.fact_ergonomic_exposure (local_trabalho);
CREATE INDEX IF NOT EXISTS idx_fact_ergonomic_action_plan_status
    ON public.fact_ergonomic_action_plan (status_acao, prioridade);

-- 4) TRIGGERS UPDATED_AT
DROP TRIGGER IF EXISTS trg_dim_psychosocial_factor_updated_at ON public.dim_psychosocial_factor;
CREATE TRIGGER trg_dim_psychosocial_factor_updated_at
BEFORE UPDATE ON public.dim_psychosocial_factor
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

DROP TRIGGER IF EXISTS trg_fact_psychosocial_assessment_updated_at ON public.fact_psychosocial_assessment;
CREATE TRIGGER trg_fact_psychosocial_assessment_updated_at
BEFORE UPDATE ON public.fact_psychosocial_assessment
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

DROP TRIGGER IF EXISTS trg_fact_psychosocial_signal_updated_at ON public.fact_psychosocial_signal;
CREATE TRIGGER trg_fact_psychosocial_signal_updated_at
BEFORE UPDATE ON public.fact_psychosocial_signal
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

DROP TRIGGER IF EXISTS trg_dim_ergonomic_factor_updated_at ON public.dim_ergonomic_factor;
CREATE TRIGGER trg_dim_ergonomic_factor_updated_at
BEFORE UPDATE ON public.dim_ergonomic_factor
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

DROP TRIGGER IF EXISTS trg_fact_ergonomic_assessment_updated_at ON public.fact_ergonomic_assessment;
CREATE TRIGGER trg_fact_ergonomic_assessment_updated_at
BEFORE UPDATE ON public.fact_ergonomic_assessment
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

DROP TRIGGER IF EXISTS trg_fact_ergonomic_exposure_updated_at ON public.fact_ergonomic_exposure;
CREATE TRIGGER trg_fact_ergonomic_exposure_updated_at
BEFORE UPDATE ON public.fact_ergonomic_exposure
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

DROP TRIGGER IF EXISTS trg_fact_ergonomic_action_plan_updated_at ON public.fact_ergonomic_action_plan;
CREATE TRIGGER trg_fact_ergonomic_action_plan_updated_at
BEFORE UPDATE ON public.fact_ergonomic_action_plan
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

-- 5) COMENTARIOS
COMMENT ON TABLE public.dim_psychosocial_factor IS 'Catalogo de fatores psicossociais para NR-1/PGR.';
COMMENT ON TABLE public.fact_psychosocial_assessment IS 'Estrutura de avaliacoes psicossociais. Sem carga nesta fase.';
COMMENT ON TABLE public.fact_psychosocial_signal IS 'Sinais psicossociais derivados de afastamentos e contexto ocupacional.';
COMMENT ON TABLE public.dim_ergonomic_factor IS 'Catalogo de fatores ergonomicos para NR-17/AEP/AET.';
COMMENT ON TABLE public.fact_ergonomic_assessment IS 'Estrutura de avaliacoes ergonomicas. Sem carga nesta fase.';
COMMENT ON TABLE public.fact_ergonomic_exposure IS 'Estrutura de exposicao ergonomica por servidor/vinculo/local.';
COMMENT ON TABLE public.fact_ergonomic_action_plan IS 'Plano de acao ergonomico. Sem execucao nesta fase.';

-- =====================================================
-- FIM DA MIGRACAO 006
-- =====================================================
