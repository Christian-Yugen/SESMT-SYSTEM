-- =====================================================
-- MIGRACAO: Programa Unificado de Absenteismo - Fatos
-- Versao: 005
-- Data: 2026-03-31
-- Descricao: Cria fatos de evento de afastamento, ocorrencia CID
--            e snapshot populacional
-- =====================================================

-- 1) FATO DE EVENTO DE AFASTAMENTO
CREATE TABLE IF NOT EXISTS public.fact_afastamento_evento (
    afastamento_id BIGSERIAL PRIMARY KEY,
    servidor_id BIGINT REFERENCES public.dim_servidor (servidor_id) ON DELETE RESTRICT,
    vinculo_id BIGINT REFERENCES public.dim_vinculo_servidor (vinculo_id) ON DELETE RESTRICT,
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
    CONSTRAINT uq_fact_afastamento_evento_hash UNIQUE (source_event_hash),
    CONSTRAINT chk_fact_afastamento_evento_periodo CHECK (
        data_fim IS NULL OR data_fim >= data_inicio
    ),
    CONSTRAINT chk_fact_afastamento_evento_dias CHECK (
        dias_afastado IS NULL OR dias_afastado >= 0
    ),
    CONSTRAINT chk_fact_afastamento_evento_pendente_vinculo CHECK (
        (pendente_resolucao_vinculo = TRUE AND vinculo_id IS NULL)
        OR
        (pendente_resolucao_vinculo = FALSE)
    )
);

CREATE INDEX IF NOT EXISTS idx_fact_afastamento_evento_servidor
    ON public.fact_afastamento_evento (servidor_id);

CREATE INDEX IF NOT EXISTS idx_fact_afastamento_evento_vinculo
    ON public.fact_afastamento_evento (vinculo_id);

CREATE INDEX IF NOT EXISTS idx_fact_afastamento_evento_datas
    ON public.fact_afastamento_evento (data_inicio, data_fim);

CREATE INDEX IF NOT EXISTS idx_fact_afastamento_evento_tipo
    ON public.fact_afastamento_evento (tipo_licenca);

CREATE INDEX IF NOT EXISTS idx_fact_afastamento_evento_status
    ON public.fact_afastamento_evento (status, situacao);

CREATE INDEX IF NOT EXISTS idx_fact_afastamento_evento_hash
    ON public.fact_afastamento_evento (source_event_hash);

CREATE INDEX IF NOT EXISTS idx_fact_afastamento_evento_chave_bruta
    ON public.fact_afastamento_evento (
        chave_vinculo_bruta_cpf,
        chave_vinculo_bruta_matricula,
        chave_vinculo_bruta_contrato
    );

-- 2) FATO DE OCORRENCIA CID POR EVENTO
CREATE TABLE IF NOT EXISTS public.fact_afastamento_cid (
    afastamento_cid_id BIGSERIAL PRIMARY KEY,
    afastamento_id BIGINT NOT NULL REFERENCES public.fact_afastamento_evento (afastamento_id) ON DELETE CASCADE,
    cid_codigo TEXT NOT NULL,
    cid_descricao TEXT,
    cid_capitulo TEXT,
    occurrence_weight NUMERIC(12,6) NOT NULL DEFAULT 1.0,
    allocated_days NUMERIC(12,4),
    cid_ordem INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fact_afastamento_cid_weight CHECK (occurrence_weight > 0),
    CONSTRAINT chk_fact_afastamento_cid_allocated_days CHECK (allocated_days IS NULL OR allocated_days >= 0),
    CONSTRAINT chk_fact_afastamento_cid_ordem CHECK (cid_ordem IS NULL OR cid_ordem >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fact_afastamento_cid_evento_ordem
    ON public.fact_afastamento_cid (afastamento_id, cid_ordem)
    WHERE cid_ordem IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fact_afastamento_cid_evento
    ON public.fact_afastamento_cid (afastamento_id);

CREATE INDEX IF NOT EXISTS idx_fact_afastamento_cid_codigo
    ON public.fact_afastamento_cid (cid_codigo);

CREATE INDEX IF NOT EXISTS idx_fact_afastamento_cid_capitulo
    ON public.fact_afastamento_cid (cid_capitulo);

-- 3) FATO DE SNAPSHOT POPULACIONAL
CREATE TABLE IF NOT EXISTS public.fact_population_snapshot (
    snapshot_id BIGSERIAL PRIMARY KEY,
    tempo_id BIGINT NOT NULL REFERENCES public.dim_tempo (tempo_id) ON DELETE RESTRICT,
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
    CONSTRAINT chk_fact_population_snapshot_qtd CHECK (qtd_populacao_ativa >= 0),
    CONSTRAINT chk_fact_population_snapshot_sexo CHECK (
        sexo IS NULL OR sexo IN ('F', 'M', 'NAO_INFORMADO')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fact_population_snapshot_dimensional
    ON public.fact_population_snapshot (
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

CREATE INDEX IF NOT EXISTS idx_fact_population_snapshot_competencia
    ON public.fact_population_snapshot (competencia_yyyymm);

CREATE INDEX IF NOT EXISTS idx_fact_population_snapshot_tempo
    ON public.fact_population_snapshot (tempo_id);

CREATE INDEX IF NOT EXISTS idx_fact_population_snapshot_secretaria
    ON public.fact_population_snapshot (secretaria);

CREATE INDEX IF NOT EXISTS idx_fact_population_snapshot_local
    ON public.fact_population_snapshot (local_trabalho);

-- 4) TRIGGERS UPDATED_AT
DROP TRIGGER IF EXISTS trg_fact_afastamento_evento_updated_at ON public.fact_afastamento_evento;
CREATE TRIGGER trg_fact_afastamento_evento_updated_at
BEFORE UPDATE ON public.fact_afastamento_evento
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

DROP TRIGGER IF EXISTS trg_fact_afastamento_cid_updated_at ON public.fact_afastamento_cid;
CREATE TRIGGER trg_fact_afastamento_cid_updated_at
BEFORE UPDATE ON public.fact_afastamento_cid
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

DROP TRIGGER IF EXISTS trg_fact_population_snapshot_updated_at ON public.fact_population_snapshot;
CREATE TRIGGER trg_fact_population_snapshot_updated_at
BEFORE UPDATE ON public.fact_population_snapshot
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_absenteismo();

-- 5) COMENTARIOS
COMMENT ON TABLE public.fact_afastamento_evento IS 'Evento unico de afastamento. Existe independente de CID e com hash tecnico anti-duplicidade.';
COMMENT ON TABLE public.fact_afastamento_cid IS 'Ocorrencia CID por evento (suporte a multiplos CIDs por afastamento).';
COMMENT ON TABLE public.fact_population_snapshot IS 'Snapshot de populacao ativa para denominadores epidemiologicos por competencia.';
COMMENT ON COLUMN public.fact_afastamento_cid.allocated_days IS 'Dias alocados por CID para manter compatibilidade dual-layer e evitar inflacao de dias.';
COMMENT ON COLUMN public.fact_afastamento_evento.source_event_hash IS 'Hash tecnico para deduplicacao do evento de afastamento.';

-- =====================================================
-- FIM DA MIGRACAO 005
-- =====================================================
