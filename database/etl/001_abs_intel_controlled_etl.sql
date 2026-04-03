-- =====================================================
-- ETL CONTROLADO: ABSENTEISMO INTELIGENTE (FASE 3W)
-- Alvo: schema abs_intel
-- Fonte: public.afastamentos, public.afastamento_cids, public.servidores
-- Regra: escrita apenas em abs_intel
-- =====================================================

BEGIN;

TRUNCATE TABLE
    abs_intel.abs_fact_psychosocial_signal,
    abs_intel.abs_fact_psychosocial_assessment,
    abs_intel.abs_fact_ergonomic_action_plan,
    abs_intel.abs_fact_ergonomic_exposure,
    abs_intel.abs_fact_ergonomic_assessment,
    abs_intel.abs_fact_afastamento_cid,
    abs_intel.abs_fact_afastamento_evento,
    abs_intel.abs_fact_population_snapshot,
    abs_intel.stg_abs_evento_cid,
    abs_intel.stg_abs_evento,
    abs_intel.abs_dim_psychosocial_factor,
    abs_intel.abs_dim_ergonomic_factor,
    abs_intel.abs_dim_vinculo_servidor,
    abs_intel.abs_dim_tempo,
    abs_intel.abs_dim_servidor
RESTART IDENTITY;

WITH src_servidores AS (
    SELECT
        regexp_replace(COALESCE(s.cpf, ''), '[^0-9]', '', 'g') AS cpf_digits,
        NULLIF(regexp_replace(COALESCE(s.cpf, ''), '[^0-9]', '', 'g'), '') AS cpf,
        NULLIF(trim(s.nome), '') AS nome,
        CASE
            WHEN upper(COALESCE(s.sexo, '')) IN ('F', 'FEMININO') THEN 'F'
            WHEN upper(COALESCE(s.sexo, '')) IN ('M', 'MASCULINO') THEN 'M'
            ELSE 'NAO_INFORMADO'
        END AS sexo,
        CASE
            WHEN trim(COALESCE(s.nascimento, '')) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN trim(s.nascimento)::date
            WHEN trim(COALESCE(s.nascimento, '')) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN to_date(trim(s.nascimento), 'DD/MM/YYYY')
            WHEN trim(COALESCE(s.nascimento, '')) ~ '^[0-9]{4,5}$' THEN (DATE '1899-12-30' + trim(s.nascimento)::integer * INTERVAL '1 day')::date
            ELSE NULL
        END AS data_nascimento,
        NULLIF(trim(s.deficiencia_rais), '') AS deficiencia_rais
    FROM public.servidores s
),
src_afast_dedup AS (
    SELECT *
    FROM (
        SELECT
            a.id,
            NULLIF(regexp_replace(COALESCE(a.servidor_cpf, ''), '[^0-9]', '', 'g'), '') AS cpf,
            NULLIF(trim(a.servidor_nome), '') AS nome,
            NULLIF(trim(a.servidor_matricula), '') AS matricula,
            NULLIF(trim(a.servidor_contrato), '') AS contrato,
            NULLIF(trim(a.servidor_secretaria), '') AS secretaria,
            NULLIF(trim(COALESCE(a.servidor_cargo, a.natureza_cargo)), '') AS cargo,
            NULLIF(trim(a.natureza_cargo), '') AS natureza_cargo,
            a.data_inicio,
            a.data_fim,
            COALESCE(
                a.dias_afastado,
                GREATEST((COALESCE(a.data_fim, a.data_inicio) - a.data_inicio) + 1, 0)
            )::int AS dias_afastado,
            COALESCE(NULLIF(trim(a.tipo_afastamento), ''), 'NAO_INFORMADO') AS tipo_afastamento,
            NULLIF(trim(a.situacao), '') AS situacao,
            NULLIF(trim(a.status), '') AS status,
            NULLIF(trim(a.cid), '') AS cid_fallback,
            COALESCE(a.is_acidente_trabalho, FALSE) AS is_acidente_trabalho,
            COALESCE(
                NULLIF(trim(a.hash_auditoria), ''),
                md5(
                    concat_ws(
                        '|',
                        COALESCE(a.servidor_cpf, ''),
                        COALESCE(a.servidor_matricula, ''),
                        COALESCE(a.servidor_contrato, ''),
                        COALESCE(a.data_inicio::text, ''),
                        COALESCE(a.data_fim::text, ''),
                        COALESCE(a.tipo_afastamento, ''),
                        COALESCE(a.dias_afastado::text, ''),
                        COALESCE(a.status, ''),
                        COALESCE(a.situacao, ''),
                        COALESCE(a.cid, '')
                    )
                )
            ) AS source_event_hash,
            row_number() OVER (
                PARTITION BY COALESCE(
                    NULLIF(trim(a.hash_auditoria), ''),
                    md5(
                        concat_ws(
                            '|',
                            COALESCE(a.servidor_cpf, ''),
                            COALESCE(a.servidor_matricula, ''),
                            COALESCE(a.servidor_contrato, ''),
                            COALESCE(a.data_inicio::text, ''),
                            COALESCE(a.data_fim::text, ''),
                            COALESCE(a.tipo_afastamento, ''),
                            COALESCE(a.dias_afastado::text, ''),
                            COALESCE(a.status, ''),
                            COALESCE(a.situacao, ''),
                            COALESCE(a.cid, '')
                        )
                    )
                )
                ORDER BY a.id
            ) AS rn
        FROM public.afastamentos a
        WHERE a.data_inicio IS NOT NULL
    ) x
    WHERE x.rn = 1
),
dim_servidor_src AS (
    SELECT cpf, nome, sexo, data_nascimento, deficiencia_rais
    FROM src_servidores
    WHERE cpf IS NOT NULL AND nome IS NOT NULL
    UNION
    SELECT
        d.cpf,
        COALESCE(d.nome, 'NOME_NAO_INFORMADO') AS nome,
        'NAO_INFORMADO' AS sexo,
        NULL::date AS data_nascimento,
        NULL::text AS deficiencia_rais
    FROM src_afast_dedup d
    WHERE d.cpf IS NOT NULL
)
SELECT *
INTO TEMP TABLE tmp_src_afast_dedup
FROM src_afast_dedup;

WITH src_servidores AS (
    SELECT
        regexp_replace(COALESCE(s.cpf, ''), '[^0-9]', '', 'g') AS cpf_digits,
        NULLIF(regexp_replace(COALESCE(s.cpf, ''), '[^0-9]', '', 'g'), '') AS cpf,
        NULLIF(trim(s.nome), '') AS nome,
        CASE
            WHEN upper(COALESCE(s.sexo, '')) IN ('F', 'FEMININO') THEN 'F'
            WHEN upper(COALESCE(s.sexo, '')) IN ('M', 'MASCULINO') THEN 'M'
            ELSE 'NAO_INFORMADO'
        END AS sexo,
        CASE
            WHEN trim(COALESCE(s.nascimento, '')) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN trim(s.nascimento)::date
            WHEN trim(COALESCE(s.nascimento, '')) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN to_date(trim(s.nascimento), 'DD/MM/YYYY')
            WHEN trim(COALESCE(s.nascimento, '')) ~ '^[0-9]{4,5}$' THEN (DATE '1899-12-30' + trim(s.nascimento)::integer * INTERVAL '1 day')::date
            ELSE NULL
        END AS data_nascimento,
        NULLIF(trim(s.deficiencia_rais), '') AS deficiencia_rais
    FROM public.servidores s
)
SELECT *
INTO TEMP TABLE tmp_src_servidores
FROM src_servidores;

WITH dim_servidor_src AS (
    SELECT cpf, nome, sexo, data_nascimento, deficiencia_rais
    FROM tmp_src_servidores
    WHERE cpf IS NOT NULL AND nome IS NOT NULL
    UNION
    SELECT
        d.cpf,
        COALESCE(d.nome, 'NOME_NAO_INFORMADO') AS nome,
        'NAO_INFORMADO' AS sexo,
        NULL::date AS data_nascimento,
        NULL::text AS deficiencia_rais
    FROM tmp_src_afast_dedup d
    WHERE d.cpf IS NOT NULL
)
INSERT INTO abs_intel.abs_dim_servidor (
    cpf,
    cpf_mascarado,
    nome,
    sexo,
    data_nascimento,
    deficiencia_rais
)
SELECT DISTINCT ON (s.cpf)
    s.cpf,
    CASE
        WHEN length(s.cpf) = 11 THEN substr(s.cpf, 1, 3) || '.***.***-' || substr(s.cpf, 10, 2)
        ELSE NULL
    END AS cpf_mascarado,
    s.nome,
    COALESCE(NULLIF(s.sexo, ''), 'NAO_INFORMADO') AS sexo,
    s.data_nascimento,
    s.deficiencia_rais
FROM dim_servidor_src s
WHERE s.cpf IS NOT NULL
  AND s.nome IS NOT NULL;

WITH dim_servidores AS (
    SELECT servidor_id, cpf
    FROM abs_intel.abs_dim_servidor
),
vinculos_servidores AS (
    SELECT
        ds.servidor_id,
        NULLIF(trim(s.matricula), '') AS matricula,
        NULLIF(trim(s.contrato), '') AS contrato,
        NULLIF(trim(s.secretaria), '') AS secretaria,
        NULLIF(trim(s.cargo), '') AS cargo,
        NULLIF(trim(s.natureza_cargo), '') AS natureza_cargo,
        NULLIF(trim(s.vinculo), '') AS nome_vinculo,
        NULL::text AS categoria_funcional,
        NULL::text AS situacao_funcional,
        CASE
            WHEN trim(COALESCE(s.admissao, '')) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN trim(s.admissao)::date
            WHEN trim(COALESCE(s.admissao, '')) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN to_date(trim(s.admissao), 'DD/MM/YYYY')
            WHEN trim(COALESCE(s.admissao, '')) ~ '^[0-9]{4,5}$' THEN (DATE '1899-12-30' + trim(s.admissao)::integer * INTERVAL '1 day')::date
            ELSE NULL
        END AS data_admissao,
        NULL::text AS unidade_orcamentaria,
        NULLIF(trim(s.local_trabalho), '') AS local_trabalho,
        NULL::text AS subdivisao,
        NULL::numeric AS horas_mes,
        NULL::numeric AS dias_semana,
        NULL::numeric AS horas_semana,
        NULL::numeric AS jornada
    FROM public.servidores s
    JOIN dim_servidores ds ON ds.cpf = NULLIF(regexp_replace(COALESCE(s.cpf, ''), '[^0-9]', '', 'g'), '')
),
vinculos_afast AS (
    SELECT
        ds.servidor_id,
        d.matricula,
        d.contrato,
        d.secretaria,
        d.cargo,
        d.natureza_cargo,
        NULL::text AS nome_vinculo,
        NULL::text AS categoria_funcional,
        NULL::text AS situacao_funcional,
        NULL::date AS data_admissao,
        NULL::text AS unidade_orcamentaria,
        NULL::text AS local_trabalho,
        NULL::text AS subdivisao,
        NULL::numeric AS horas_mes,
        NULL::numeric AS dias_semana,
        NULL::numeric AS horas_semana,
        NULL::numeric AS jornada
    FROM tmp_src_afast_dedup d
    JOIN dim_servidores ds ON ds.cpf = d.cpf
),
vinculos_union AS (
    SELECT * FROM vinculos_servidores
    UNION
    SELECT * FROM vinculos_afast
)
INSERT INTO abs_intel.abs_dim_vinculo_servidor (
    servidor_id,
    matricula,
    contrato,
    secretaria,
    cargo,
    natureza_cargo,
    nome_vinculo,
    categoria_funcional,
    situacao_funcional,
    data_admissao,
    unidade_orcamentaria,
    local_trabalho,
    subdivisao,
    horas_mes,
    dias_semana,
    horas_semana,
    jornada
)
SELECT DISTINCT ON (v.servidor_id, v.matricula, v.contrato)
    v.servidor_id,
    v.matricula,
    v.contrato,
    v.secretaria,
    v.cargo,
    v.natureza_cargo,
    v.nome_vinculo,
    v.categoria_funcional,
    v.situacao_funcional,
    v.data_admissao,
    v.unidade_orcamentaria,
    v.local_trabalho,
    v.subdivisao,
    v.horas_mes,
    v.dias_semana,
    v.horas_semana,
    v.jornada
FROM vinculos_union v
WHERE v.matricula IS NOT NULL
    AND v.contrato IS NOT NULL
ORDER BY
        v.servidor_id,
        v.matricula,
        v.contrato,
        (CASE WHEN v.secretaria IS NOT NULL THEN 1 ELSE 0 END
         + CASE WHEN v.cargo IS NOT NULL THEN 1 ELSE 0 END
         + CASE WHEN v.local_trabalho IS NOT NULL THEN 1 ELSE 0 END
         + CASE WHEN v.natureza_cargo IS NOT NULL THEN 1 ELSE 0 END) DESC;

WITH bounds AS (
    SELECT
        COALESCE(min(data_inicio), current_date) AS min_date,
        COALESCE(max(COALESCE(data_fim, data_inicio)), current_date) AS max_date
    FROM tmp_src_afast_dedup
),
dates AS (
    SELECT generate_series(min_date, max_date, interval '1 day')::date AS d
    FROM bounds
)
INSERT INTO abs_intel.abs_dim_tempo (
    data_calendario,
    ano,
    semestre,
    trimestre,
    mes,
    dia,
    competencia_yyyymm,
    dia_semana,
    nome_dia_semana,
    nome_mes,
    is_fim_semana,
    is_dia_util
)
SELECT
    d,
    EXTRACT(YEAR FROM d)::int,
    CASE WHEN EXTRACT(MONTH FROM d)::int <= 6 THEN 1 ELSE 2 END,
    EXTRACT(QUARTER FROM d)::int,
    EXTRACT(MONTH FROM d)::int,
    EXTRACT(DAY FROM d)::int,
    (EXTRACT(YEAR FROM d)::int * 100 + EXTRACT(MONTH FROM d)::int),
    EXTRACT(ISODOW FROM d)::int,
    to_char(d, 'FMDay'),
    to_char(d, 'FMMonth'),
    EXTRACT(ISODOW FROM d)::int IN (6, 7),
    EXTRACT(ISODOW FROM d)::int NOT IN (6, 7)
FROM dates;

WITH run_ctx AS (
    SELECT 'run_' || to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS') AS trace_run_id
)
INSERT INTO abs_intel.stg_abs_evento (
    trace_run_id,
    source_event_hash,
    payload,
    status
)
SELECT
    r.trace_run_id,
    d.source_event_hash,
    jsonb_build_object(
        'afastamento_id', d.id,
        'cpf', d.cpf,
        'matricula', d.matricula,
        'contrato', d.contrato,
        'data_inicio', d.data_inicio,
        'data_fim', d.data_fim,
        'dias_afastado', d.dias_afastado,
        'tipo_afastamento', d.tipo_afastamento
    ),
    'PENDING'
FROM tmp_src_afast_dedup d
CROSS JOIN run_ctx r;

WITH dim_servidores AS (
    SELECT servidor_id, cpf
    FROM abs_intel.abs_dim_servidor
),
src AS (
    SELECT * FROM tmp_src_afast_dedup
),
resolved AS (
    SELECT
        s.id AS source_afastamento_id,
        ds.servidor_id,
        dv.vinculo_id,
        s.data_inicio,
        s.data_fim,
        s.dias_afastado,
        s.tipo_afastamento,
        s.situacao,
        s.status,
        NULL::text AS condicao,
        s.is_acidente_trabalho,
        s.source_event_hash,
        CASE WHEN dv.vinculo_id IS NULL THEN TRUE ELSE FALSE END AS pendente_resolucao_vinculo,
        s.cpf AS chave_vinculo_bruta_cpf,
        s.matricula AS chave_vinculo_bruta_matricula,
        s.contrato AS chave_vinculo_bruta_contrato,
        s.cid_fallback
    FROM src s
    LEFT JOIN dim_servidores ds ON ds.cpf = s.cpf
    LEFT JOIN abs_intel.abs_dim_vinculo_servidor dv
        ON dv.servidor_id = ds.servidor_id
       AND dv.matricula = s.matricula
       AND dv.contrato = s.contrato
)
INSERT INTO abs_intel.abs_fact_afastamento_evento (
    servidor_id,
    vinculo_id,
    data_inicio,
    data_fim,
    dias_afastado,
    tipo_licenca,
    situacao,
    status,
    condicao,
    is_acidente_trabalho,
    source_event_hash,
    pendente_resolucao_vinculo,
    chave_vinculo_bruta_cpf,
    chave_vinculo_bruta_matricula,
    chave_vinculo_bruta_contrato
)
SELECT
    r.servidor_id,
    r.vinculo_id,
    r.data_inicio,
    r.data_fim,
    r.dias_afastado,
    r.tipo_afastamento,
    r.situacao,
    r.status,
    r.condicao,
    r.is_acidente_trabalho,
    r.source_event_hash,
    r.pendente_resolucao_vinculo,
    r.chave_vinculo_bruta_cpf,
    r.chave_vinculo_bruta_matricula,
    r.chave_vinculo_bruta_contrato
FROM resolved r;

WITH event_map AS (
    SELECT
        f.afastamento_id,
        f.source_event_hash,
        f.dias_afastado,
        s.id AS source_afastamento_id,
        s.cid_fallback
    FROM abs_intel.abs_fact_afastamento_evento f
    JOIN tmp_src_afast_dedup s ON s.source_event_hash = f.source_event_hash
),
cid_from_table AS (
    SELECT
        em.afastamento_id,
        NULLIF(trim(c.cid_codigo), '') AS cid_codigo,
        NULLIF(trim(c.cid_descricao), '') AS cid_descricao,
        NULLIF(trim(c.cid_capitulo), '') AS cid_capitulo,
        c.id AS source_cid_id,
        1 AS source_priority,
        em.dias_afastado
    FROM event_map em
    JOIN public.afastamento_cids c ON c.afastamento_id = em.source_afastamento_id
),
cid_fallback AS (
    SELECT
        em.afastamento_id,
        NULLIF(trim(em.cid_fallback), '') AS cid_codigo,
        NULL::text AS cid_descricao,
        NULL::text AS cid_capitulo,
        NULL::bigint AS source_cid_id,
        2 AS source_priority,
        em.dias_afastado
    FROM event_map em
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.afastamento_cids c
        WHERE c.afastamento_id = em.source_afastamento_id
    )
),
cid_union AS (
    SELECT * FROM cid_from_table
    UNION ALL
    SELECT * FROM cid_fallback
),
cid_clean AS (
    SELECT
        afastamento_id,
        COALESCE(NULLIF(regexp_replace(upper(cid_codigo), '[^A-Z0-9\\.]', '', 'g'), ''), 'CID_NAO_INFORMADO') AS cid_codigo,
        COALESCE(cid_descricao, 'DESCRICAO_NAO_INFORMADA') AS cid_descricao,
        COALESCE(cid_capitulo, 'CAPITULO_NAO_INFORMADO') AS cid_capitulo,
        dias_afastado,
        row_number() OVER (
            PARTITION BY afastamento_id,
                         COALESCE(NULLIF(regexp_replace(upper(cid_codigo), '[^A-Z0-9\\.]', '', 'g'), ''), 'CID_NAO_INFORMADO')
            ORDER BY source_priority, source_cid_id NULLS LAST
        ) AS dedup_rn
    FROM cid_union
),
cid_dedup AS (
    SELECT
        afastamento_id,
        cid_codigo,
        cid_descricao,
        cid_capitulo,
        dias_afastado
    FROM cid_clean
    WHERE dedup_rn = 1
),
cid_ranked AS (
    SELECT
        c.*,
        count(*) OVER (PARTITION BY c.afastamento_id) AS cid_count,
        row_number() OVER (PARTITION BY c.afastamento_id ORDER BY c.cid_codigo) AS cid_ordem
    FROM cid_dedup c
)
INSERT INTO abs_intel.abs_fact_afastamento_cid (
    afastamento_id,
    cid_codigo,
    cid_descricao,
    cid_capitulo,
    occurrence_weight,
    allocated_days,
    cid_ordem
)
SELECT
    cr.afastamento_id,
    cr.cid_codigo,
    cr.cid_descricao,
    cr.cid_capitulo,
    (1.0 / cr.cid_count)::numeric(12,6) AS occurrence_weight,
    CASE
        WHEN cr.dias_afastado IS NULL THEN NULL
        ELSE round((cr.dias_afastado::numeric / cr.cid_count::numeric), 4)
    END AS allocated_days,
    cr.cid_ordem
FROM cid_ranked cr;

WITH competencias AS (
    SELECT
        t.competencia_yyyymm,
        min(t.tempo_id) AS tempo_id,
        make_date(min(t.ano), min(t.mes), 1) AS competencia_data
    FROM abs_intel.abs_dim_tempo t
    GROUP BY t.competencia_yyyymm
),
servidores_base AS (
    SELECT
        NULLIF(regexp_replace(COALESCE(s.cpf, ''), '[^0-9]', '', 'g'), '') AS cpf,
        NULLIF(trim(s.matricula), '') AS matricula,
        NULLIF(trim(s.contrato), '') AS contrato,
        NULLIF(trim(s.secretaria), '') AS secretaria,
        NULL::text AS unidade_orcamentaria,
        NULLIF(trim(s.local_trabalho), '') AS local_trabalho,
        NULL::text AS categoria_funcional,
        NULLIF(trim(s.natureza_cargo), '') AS natureza_cargo,
        CASE
            WHEN upper(COALESCE(s.sexo, '')) IN ('F', 'FEMININO') THEN 'F'
            WHEN upper(COALESCE(s.sexo, '')) IN ('M', 'MASCULINO') THEN 'M'
            ELSE 'NAO_INFORMADO'
        END AS sexo,
        CASE
            WHEN trim(COALESCE(s.nascimento, '')) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN trim(s.nascimento)::date
            WHEN trim(COALESCE(s.nascimento, '')) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN to_date(trim(s.nascimento), 'DD/MM/YYYY')
            WHEN trim(COALESCE(s.nascimento, '')) ~ '^[0-9]{4,5}$' THEN (DATE '1899-12-30' + trim(s.nascimento)::integer * INTERVAL '1 day')::date
            ELSE NULL
        END AS data_nascimento,
        CASE
            WHEN trim(COALESCE(s.admissao, '')) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN trim(s.admissao)::date
            WHEN trim(COALESCE(s.admissao, '')) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN to_date(trim(s.admissao), 'DD/MM/YYYY')
            WHEN trim(COALESCE(s.admissao, '')) ~ '^[0-9]{4,5}$' THEN (DATE '1899-12-30' + trim(s.admissao)::integer * INTERVAL '1 day')::date
            ELSE NULL
        END AS data_admissao
    FROM public.servidores s
),
expanded AS (
    SELECT
        c.tempo_id,
        c.competencia_yyyymm,
        sb.secretaria,
        sb.unidade_orcamentaria,
        sb.local_trabalho,
        sb.categoria_funcional,
        sb.natureza_cargo,
        sb.sexo,
        CASE
            WHEN sb.data_nascimento IS NULL THEN 'NAO_INFORMADO'
            ELSE
                CASE
                    WHEN EXTRACT(YEAR FROM age(c.competencia_data, sb.data_nascimento)) < 30 THEN 'ATE_29'
                    WHEN EXTRACT(YEAR FROM age(c.competencia_data, sb.data_nascimento)) BETWEEN 30 AND 39 THEN '30_39'
                    WHEN EXTRACT(YEAR FROM age(c.competencia_data, sb.data_nascimento)) BETWEEN 40 AND 49 THEN '40_49'
                    WHEN EXTRACT(YEAR FROM age(c.competencia_data, sb.data_nascimento)) BETWEEN 50 AND 59 THEN '50_59'
                    ELSE '60_OU_MAIS'
                END
        END AS faixa_etaria,
        CASE
            WHEN sb.data_admissao IS NULL THEN 'NAO_INFORMADO'
            ELSE
                CASE
                    WHEN EXTRACT(YEAR FROM age(c.competencia_data, sb.data_admissao)) < 1 THEN 'ATE_1_ANO'
                    WHEN EXTRACT(YEAR FROM age(c.competencia_data, sb.data_admissao)) BETWEEN 1 AND 5 THEN '1_5_ANOS'
                    WHEN EXTRACT(YEAR FROM age(c.competencia_data, sb.data_admissao)) BETWEEN 6 AND 10 THEN '6_10_ANOS'
                    ELSE '11_OU_MAIS'
                END
        END AS faixa_tempo_servico,
        concat_ws('|', COALESCE(sb.cpf, 'SEM_CPF'), COALESCE(sb.matricula, 'SEM_MAT'), COALESCE(sb.contrato, 'SEM_CONTR')) AS pessoa_chave
    FROM competencias c
    CROSS JOIN servidores_base sb
)
INSERT INTO abs_intel.abs_fact_population_snapshot (
    tempo_id,
    competencia_yyyymm,
    secretaria,
    unidade_orcamentaria,
    local_trabalho,
    categoria_funcional,
    natureza_cargo,
    sexo,
    faixa_etaria,
    faixa_tempo_servico,
    qtd_populacao_ativa,
    fonte
)
SELECT
    e.tempo_id,
    e.competencia_yyyymm,
    e.secretaria,
    e.unidade_orcamentaria,
    e.local_trabalho,
    e.categoria_funcional,
    e.natureza_cargo,
    e.sexo,
    e.faixa_etaria,
    e.faixa_tempo_servico,
    count(DISTINCT e.pessoa_chave)::int AS qtd_populacao_ativa,
    'ETL_3W_CONTROLADO'
FROM expanded e
GROUP BY
    e.tempo_id,
    e.competencia_yyyymm,
    e.secretaria,
    e.unidade_orcamentaria,
    e.local_trabalho,
    e.categoria_funcional,
    e.natureza_cargo,
    e.sexo,
    e.faixa_etaria,
    e.faixa_tempo_servico;

UPDATE abs_intel.stg_abs_evento
SET status = 'PROCESSED',
    processed_at = NOW();

COMMIT;
