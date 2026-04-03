-- =====================================================
-- MIGRACAO: Absenteismo Inteligente - Isolamento Interno (Fatos e Staging)
-- Versao: 008
-- Data: 2026-04-02
-- Descricao: Cria fatos e staging dedicados no schema abs_intel
--            additive-only sem tocar legado operacional.
-- =====================================================

CREATE TABLE IF NOT EXISTS abs_intel.abs_fact_afastamento_evento (
    afastamento_id BIGSERIAL PRIMARY KEY,
    servidor_id BIGINT REFERENCES abs_intel.abs_dim_servidor (servidor_id) ON DELETE RESTRICT,
    vinculo_id BIGINT REFERENCES abs_intel.abs_dim_vinculo_servidor (vinculo_id) ON DELETE RESTRICT,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    dias_afastado INTEGER,
    tipo_licenca TEXT NOT NULL,
    situacao TEXT,
    status TEXT,
    condicao TEXT,
    is_acidente_trabalho BOOLEAN NOT NULL DEFAULT FALSE,
    source_event_hash TEXT NOT NULL,
    pendente_resolucao_vinculo BOOLEAN NOT NULL DEFAULT FALSE,
    chave_vinculo_bruta_cpf TEXT,
    chave_vinculo_bruta_matricula TEXT,
    chave_vinculo_bruta_contrato TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_abs_fact_afastamento_evento_hash UNIQUE (source_event_hash),
    CONSTRAINT chk_abs_fact_afastamento_evento_periodo CHECK (
        data_fim IS NULL OR data_fim >= data_inicio
    ),
    CONSTRAINT chk_abs_fact_afastamento_evento_dias CHECK (
        dias_afastado IS NULL OR dias_afastado >= 0
    ),
    CONSTRAINT chk_abs_fact_afastamento_evento_pendente_vinculo CHECK (
        (pendente_resolucao_vinculo = TRUE AND vinculo_id IS NULL)
        OR (pendente_resolucao_vinculo = FALSE)
    )
);

CREATE INDEX IF NOT EXISTS idx_abs_fact_afastamento_evento_servidor
    ON abs_intel.abs_fact_afastamento_evento (servidor_id);

CREATE INDEX IF NOT EXISTS idx_abs_fact_afastamento_evento_vinculo
    ON abs_intel.abs_fact_afastamento_evento (vinculo_id);

CREATE INDEX IF NOT EXISTS idx_abs_fact_afastamento_evento_datas
    ON abs_intel.abs_fact_afastamento_evento (data_inicio, data_fim);

CREATE INDEX IF NOT EXISTS idx_abs_fact_afastamento_evento_tipo
    ON abs_intel.abs_fact_afastamento_evento (tipo_licenca);

CREATE INDEX IF NOT EXISTS idx_abs_fact_afastamento_evento_status
    ON abs_intel.abs_fact_afastamento_evento (status, situacao);

CREATE INDEX IF NOT EXISTS idx_abs_fact_afastamento_evento_chave_bruta
    ON abs_intel.abs_fact_afastamento_evento (
        chave_vinculo_bruta_cpf,
        chave_vinculo_bruta_matricula,
        chave_vinculo_bruta_contrato
    );

CREATE TABLE IF NOT EXISTS abs_intel.abs_fact_afastamento_cid (
    afastamento_cid_id BIGSERIAL PRIMARY KEY,
    afastamento_id BIGINT NOT NULL REFERENCES abs_intel.abs_fact_afastamento_evento (afastamento_id) ON DELETE CASCADE,
    cid_codigo TEXT NOT NULL,
    cid_descricao TEXT,
    cid_capitulo TEXT,
    occurrence_weight NUMERIC(12,6) NOT NULL DEFAULT 1.0,
    allocated_days NUMERIC(12,4),
    cid_ordem INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_abs_fact_afastamento_cid_weight CHECK (occurrence_weight > 0),
    CONSTRAINT chk_abs_fact_afastamento_cid_allocated_days CHECK (allocated_days IS NULL OR allocated_days >= 0),
    CONSTRAINT chk_abs_fact_afastamento_cid_ordem CHECK (cid_ordem IS NULL OR cid_ordem >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_abs_fact_afastamento_cid_evento_ordem
    ON abs_intel.abs_fact_afastamento_cid (afastamento_id, cid_ordem)
    WHERE cid_ordem IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_abs_fact_afastamento_cid_evento
    ON abs_intel.abs_fact_afastamento_cid (afastamento_id);

CREATE INDEX IF NOT EXISTS idx_abs_fact_afastamento_cid_codigo
    ON abs_intel.abs_fact_afastamento_cid (cid_codigo);

CREATE INDEX IF NOT EXISTS idx_abs_fact_afastamento_cid_capitulo
    ON abs_intel.abs_fact_afastamento_cid (cid_capitulo);

CREATE TABLE IF NOT EXISTS abs_intel.abs_fact_population_snapshot (
    snapshot_id BIGSERIAL PRIMARY KEY,
    tempo_id BIGINT NOT NULL REFERENCES abs_intel.abs_dim_tempo (tempo_id) ON DELETE RESTRICT,
    competencia_yyyymm INTEGER NOT NULL,
    secretaria TEXT,
    unidade_orcamentaria TEXT,
    local_trabalho TEXT,
    categoria_funcional TEXT,
    natureza_cargo TEXT,
    sexo TEXT,
    faixa_etaria TEXT,
    faixa_tempo_servico TEXT,
    qtd_populacao_ativa INTEGER NOT NULL,
    fonte TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_abs_fact_population_snapshot_qtd CHECK (qtd_populacao_ativa >= 0),
    CONSTRAINT chk_abs_fact_population_snapshot_sexo CHECK (
        sexo IS NULL OR sexo IN ('F', 'M', 'NAO_INFORMADO')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_abs_fact_population_snapshot_dimensional
    ON abs_intel.abs_fact_population_snapshot (
        competencia_yyyymm,
        COALESCE(secretaria, ''),
        COALESCE(unidade_orcamentaria, ''),
        COALESCE(local_trabalho, ''),
        COALESCE(categoria_funcional, ''),
        COALESCE(natureza_cargo, ''),
        COALESCE(sexo, ''),
        COALESCE(faixa_etaria, ''),
        COALESCE(faixa_tempo_servico, '')
    );

CREATE INDEX IF NOT EXISTS idx_abs_fact_population_snapshot_competencia
    ON abs_intel.abs_fact_population_snapshot (competencia_yyyymm);

CREATE INDEX IF NOT EXISTS idx_abs_fact_population_snapshot_tempo
    ON abs_intel.abs_fact_population_snapshot (tempo_id);

CREATE TABLE IF NOT EXISTS abs_intel.stg_abs_evento (
    stg_evento_id BIGSERIAL PRIMARY KEY,
    trace_run_id TEXT NOT NULL,
    source_event_hash TEXT,
    payload JSONB,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stg_abs_evento_trace
    ON abs_intel.stg_abs_evento (trace_run_id);

CREATE INDEX IF NOT EXISTS idx_stg_abs_evento_status
    ON abs_intel.stg_abs_evento (status);

CREATE TABLE IF NOT EXISTS abs_intel.stg_abs_evento_cid (
    stg_evento_cid_id BIGSERIAL PRIMARY KEY,
    stg_evento_id BIGINT NOT NULL REFERENCES abs_intel.stg_abs_evento (stg_evento_id) ON DELETE CASCADE,
    cid_codigo TEXT,
    cid_descricao TEXT,
    cid_capitulo TEXT,
    cid_ordem INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stg_abs_evento_cid_evento
    ON abs_intel.stg_abs_evento_cid (stg_evento_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_abs_fact_afastamento_evento_updated_at'
    ) THEN
        CREATE TRIGGER trg_abs_fact_afastamento_evento_updated_at
        BEFORE UPDATE ON abs_intel.abs_fact_afastamento_evento
        FOR EACH ROW EXECUTE FUNCTION abs_intel.fn_abs_set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_abs_fact_afastamento_cid_updated_at'
    ) THEN
        CREATE TRIGGER trg_abs_fact_afastamento_cid_updated_at
        BEFORE UPDATE ON abs_intel.abs_fact_afastamento_cid
        FOR EACH ROW EXECUTE FUNCTION abs_intel.fn_abs_set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_abs_fact_population_snapshot_updated_at'
    ) THEN
        CREATE TRIGGER trg_abs_fact_population_snapshot_updated_at
        BEFORE UPDATE ON abs_intel.abs_fact_population_snapshot
        FOR EACH ROW EXECUTE FUNCTION abs_intel.fn_abs_set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_stg_abs_evento_updated_at'
    ) THEN
        CREATE TRIGGER trg_stg_abs_evento_updated_at
        BEFORE UPDATE ON abs_intel.stg_abs_evento
        FOR EACH ROW EXECUTE FUNCTION abs_intel.fn_abs_set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_stg_abs_evento_cid_updated_at'
    ) THEN
        CREATE TRIGGER trg_stg_abs_evento_cid_updated_at
        BEFORE UPDATE ON abs_intel.stg_abs_evento_cid
        FOR EACH ROW EXECUTE FUNCTION abs_intel.fn_abs_set_updated_at();
    END IF;
END $$;

-- =====================================================
-- FIM DA MIGRACAO 008
-- =====================================================
