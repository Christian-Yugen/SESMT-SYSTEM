-- Supabase migration: criar RPC para junção de atestados e criação transacional de afastamento
BEGIN;

CREATE OR REPLACE FUNCTION public.create_afastamento_from_atestados(
  p_atestado_ids bigint[] DEFAULT NULL,
  p_manual_ranges jsonb DEFAULT '[]'::jsonb,
  p_tipo_afastamento text DEFAULT 'AUX. DOENÇA',
  p_threshold integer DEFAULT 15,
  p_threshold_inclusive boolean DEFAULT false,
  p_create_portaria boolean DEFAULT true,
  p_portaria_numero integer DEFAULT NULL,
  p_ano integer DEFAULT NULL,
  p_perito_nome text DEFAULT NULL,
  p_perito_crm text DEFAULT NULL,
  p_encaminhamento_inss boolean DEFAULT NULL,
  p_servidor_cpf text DEFAULT NULL,
  p_servidor_matricula text DEFAULT NULL,
  p_servidor_contrato text DEFAULT NULL,
  p_observacoes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_user_email text := (SELECT email FROM public.profiles WHERE id = v_user LIMIT 1);
  v_tmp_count integer;
  v_row record;
  v_item jsonb;
  v_cur_s date := NULL;
  v_cur_e date := NULL;
  merged jsonb := '[]'::jsonb;
  total_days integer := 0;
  meets boolean := false;
  v_afastamento_id bigint;
  v_ano integer := COALESCE(p_ano, EXTRACT(YEAR FROM CURRENT_DATE)::int);
  v_next_num integer;
  v_portaria_id bigint := NULL;
  v_portaria_num integer := NULL;
  v_portaria_ano integer := NULL;
  v_portaria_data date := NULL;
  v_servidor_nome text := NULL;
  v_natureza_cargo text := NULL;
  v_servidor_cargo text := NULL;
  v_servidor_secretaria text := NULL;
  v_matricula text := p_servidor_matricula;
  v_atestados_json jsonb := '[]'::jsonb;
BEGIN
  -- Verificar permissões: apenas perfis admin ou nurse podem invocar este RPC
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user AND (role = 'admin' OR role = 'nurse')) THEN
    RAISE EXCEPTION 'Permissão negada: perfil não autorizado';
  END IF;
  IF (p_atestado_ids IS NULL OR array_length(p_atestado_ids,1) IS NULL) AND (p_manual_ranges IS NULL OR jsonb_array_length(p_manual_ranges)=0) THEN
    RAISE EXCEPTION 'Informe ao menos um atestado ou faixa manual';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS tmp_ranges(s date, e date, atestado_id bigint) ON COMMIT DROP;

  IF p_atestado_ids IS NOT NULL AND array_length(p_atestado_ids,1) > 0 THEN
    INSERT INTO tmp_ranges(s,e,atestado_id)
    SELECT
      periodo::date AS s,
      (periodo::date + (COALESCE(qtde_dias,1) - 1))::date AS e,
      id
    FROM public.atestados_import
    WHERE id = ANY(p_atestado_ids);

    SELECT count(*) INTO v_tmp_count FROM tmp_ranges WHERE atestado_id IS NOT NULL;
    IF v_tmp_count <> array_length(p_atestado_ids,1) THEN
      RAISE EXCEPTION 'Alguns atestados não foram encontrados';
    END IF;

    IF v_matricula IS NULL THEN
      SELECT matricula INTO v_matricula FROM public.atestados_import WHERE id = p_atestado_ids[1] LIMIT 1;
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'matricula', matricula, 'data_inicio', periodo::text, 'qtde_dias', qtde_dias)), '[]'::jsonb)
      INTO v_atestados_json
      FROM public.atestados_import
      WHERE id = ANY(p_atestado_ids);
  END IF;

  IF p_manual_ranges IS NOT NULL AND jsonb_array_length(p_manual_ranges) > 0 THEN
    FOR v_item IN SELECT jsonb_array_elements(p_manual_ranges) LOOP
      PERFORM (v_item->>'data_inicio')::date; -- will raise if invalid
      INSERT INTO tmp_ranges(s,e,atestado_id)
      VALUES ((v_item->>'data_inicio')::date, (v_item->>'data_fim')::date, NULL);
    END LOOP;
  END IF;

  SELECT count(*) INTO v_tmp_count FROM tmp_ranges;
  IF v_tmp_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma faixa válida encontrada';
  END IF;

  -- Merge intervals ordered by start
  FOR v_row IN SELECT s,e FROM tmp_ranges ORDER BY s, e LOOP
    IF v_cur_s IS NULL THEN
      v_cur_s := v_row.s;
      v_cur_e := v_row.e;
    ELSE
      IF v_row.s <= v_cur_e + 1 THEN
        IF v_row.e > v_cur_e THEN
          v_cur_e := v_row.e;
        END IF;
      ELSE
        merged := merged || jsonb_build_array(jsonb_build_object('data_inicio', v_cur_s::text, 'data_fim', v_cur_e::text));
        total_days := total_days + (v_cur_e - v_cur_s + 1);
        v_cur_s := v_row.s;
        v_cur_e := v_row.e;
      END IF;
    END IF;
  END LOOP;

  IF v_cur_s IS NOT NULL THEN
    merged := merged || jsonb_build_array(jsonb_build_object('data_inicio', v_cur_s::text, 'data_fim', v_cur_e::text));
    total_days := total_days + (v_cur_e - v_cur_s + 1);
  END IF;

  IF p_threshold_inclusive THEN
    meets := total_days >= p_threshold;
  ELSE
    meets := total_days > p_threshold;
  END IF;

  -- Try to enrich servidor info when possible
  IF p_servidor_cpf IS NOT NULL THEN
    SELECT nome, natureza_cargo, matricula, contrato, cargo, secretaria
      INTO v_servidor_nome, v_natureza_cargo, v_matricula, p_servidor_contrato, v_servidor_cargo, v_servidor_secretaria
    FROM public.servidores
    WHERE regexp_replace(coalesce(cpf,''),'[^0-9]','','g') = regexp_replace(p_servidor_cpf,'[^0-9]','','g')
    LIMIT 1;
  ELSIF v_matricula IS NOT NULL THEN
    SELECT nome, natureza_cargo, matricula, contrato, cargo, secretaria
      INTO v_servidor_nome, v_natureza_cargo, v_matricula, p_servidor_contrato, v_servidor_cargo, v_servidor_secretaria
    FROM public.servidores
    WHERE matricula = v_matricula
    LIMIT 1;
  END IF;

  IF v_servidor_nome IS NULL AND p_atestado_ids IS NOT NULL THEN
    SELECT nome INTO v_servidor_nome FROM public.atestados_import WHERE id = p_atestado_ids[1] LIMIT 1;
  END IF;

  IF NOT meets THEN
    RETURN jsonb_build_object(
      'created', false,
      'total_days', total_days,
      'merged_ranges', merged,
      'message', 'Não atingiu o limite de dias para criação automática'
    );
  END IF;

  -- Create afastamento record
  INSERT INTO public.afastamentos(
    servidor_cpf, servidor_nome, servidor_matricula, servidor_contrato, servidor_cargo, servidor_secretaria,
    natureza_cargo, tipo_afastamento, dias_afastado, data_inicio, data_fim,
    perito_nome, perito_crm, observacoes, is_juncao_atestados, juncao_meta, criado_por
  )
  VALUES (
    p_servidor_cpf,
    COALESCE(v_servidor_nome, 'Desconhecido'),
    COALESCE(v_matricula, COALESCE(p_servidor_matricula,'')),
    p_servidor_contrato,
    v_servidor_cargo,
    v_servidor_secretaria,
    v_natureza_cargo,
    p_tipo_afastamento,
    total_days,
    (SELECT min((r->>'data_inicio')::date) FROM jsonb_array_elements(merged) r),
    (SELECT max((r->>'data_fim')::date) FROM jsonb_array_elements(merged) r),
    p_perito_nome,
    p_perito_crm,
    p_observacoes,
    TRUE,
    jsonb_build_object(
      'atestados', v_atestados_json,
      'manual_ranges', p_manual_ranges,
      'merged_ranges', merged,
      'total_days', total_days,
      'threshold', p_threshold,
      'threshold_inclusive', p_threshold_inclusive
    ),
    v_user
  )
  RETURNING id INTO v_afastamento_id;

  -- Persist original atestados references
  IF p_atestado_ids IS NOT NULL AND array_length(p_atestado_ids,1) > 0 THEN
    INSERT INTO public.afastamento_atestados(afastamento_id, atestado_id, data_inicio, data_fim, dias, criado_por)
    SELECT v_afastamento_id, id, periodo::date, (periodo::date + (COALESCE(qtde_dias,1) -1))::date, COALESCE(qtde_dias,1), v_user
    FROM public.atestados_import
    WHERE id = ANY(p_atestado_ids);
  END IF;

  -- Persist merged ranges (representação das faixas efetivas)
  FOR v_row IN SELECT (r->>'data_inicio')::date AS s, (r->>'data_fim')::date AS e FROM jsonb_array_elements(merged) r LOOP
    INSERT INTO public.afastamento_atestados(afastamento_id, atestado_id, data_inicio, data_fim, dias, criado_por)
    VALUES (v_afastamento_id, NULL, v_row.s, v_row.e, (v_row.e - v_row.s + 1), v_user);
  END LOOP;

  -- Audit log
  INSERT INTO public.afastamentos_logs(afastamento_id, usuario_id, usuario_email, motivo, dados_novos)
  VALUES (v_afastamento_id, v_user, v_user_email, 'Criado por junção de atestados', jsonb_build_object('created_by', v_user, 'meta', jsonb_build_object('total_days', total_days, 'merged_ranges', merged)));

  -- Criar portaria se aplicável
  IF p_create_portaria AND COALESCE(p_encaminhamento_inss, FALSE) = FALSE THEN
    PERFORM pg_advisory_xact_lock(425867, v_ano);
    IF p_portaria_numero IS NOT NULL THEN
      INSERT INTO public.portarias_afastamento(afastamento_id, numero, ano, data_emissao, criado_por)
      VALUES (v_afastamento_id, p_portaria_numero, v_ano, CURRENT_DATE, v_user)
      RETURNING id, numero, ano, data_emissao INTO v_portaria_id, v_portaria_num, v_portaria_ano, v_portaria_data;
    ELSE
      SELECT COALESCE(MAX(numero),0) + 1 INTO v_next_num FROM public.portarias_afastamento WHERE ano = v_ano;
      INSERT INTO public.portarias_afastamento(afastamento_id, numero, ano, data_emissao, criado_por)
      VALUES (v_afastamento_id, v_next_num, v_ano, CURRENT_DATE, v_user)
      RETURNING id, numero, ano, data_emissao INTO v_portaria_id, v_portaria_num, v_portaria_ano, v_portaria_data;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'created', true,
    'afastamento_id', v_afastamento_id,
    'total_days', total_days,
    'merged_ranges', merged,
    'portaria', CASE WHEN v_portaria_id IS NOT NULL THEN jsonb_build_object('id', v_portaria_id, 'numero', v_portaria_num, 'ano', v_portaria_ano, 'data_emissao', v_portaria_data) ELSE NULL END
  );
END;
$$;

COMMIT;
-- Ajustar owner para permitir execução como definer (quando reaplicada)
ALTER FUNCTION public.create_afastamento_from_atestados(bigint[], jsonb, text, integer, boolean, boolean, integer, integer, text, text, boolean, text, text, text, text) OWNER TO postgres;
