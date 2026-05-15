-- Prepara uma função segura para reencaixar portarias geradas incorretamente
-- em lacunas ainda livres abaixo de um número-limite válido.
--
-- Exemplo de uso para o cenário atual informado pelo usuário:
-- SELECT *
--   FROM public.reassign_portarias_afastamento_into_available_gaps(
--     2026,
--     593,
--     594,
--     620
--   );

CREATE OR REPLACE FUNCTION public.reassign_portarias_afastamento_into_available_gaps(
  p_ano integer,
  p_last_valid_numero integer,
  p_wrong_from_numero integer,
  p_wrong_to_numero integer
)
RETURNS TABLE(portaria_id bigint, old_numero integer, new_numero integer)
LANGUAGE plpgsql
AS $$
DECLARE
  target_count integer;
  available_count integer;
  base_temp_numero integer;
BEGIN
  IF p_wrong_from_numero > p_wrong_to_numero THEN
    RAISE EXCEPTION 'Faixa inválida: p_wrong_from_numero (%) maior que p_wrong_to_numero (%)',
      p_wrong_from_numero,
      p_wrong_to_numero;
  END IF;

  CREATE TEMP TABLE tmp_portarias_target (
    portaria_id bigint PRIMARY KEY,
    old_numero integer NOT NULL,
    seq integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_portarias_target (portaria_id, old_numero, seq)
  SELECT
    p.id,
    p.numero,
    row_number() OVER (ORDER BY p.created_at, p.id)
  FROM public.portarias_afastamento p
  WHERE p.ano = p_ano
    AND p.numero BETWEEN p_wrong_from_numero AND p_wrong_to_numero;

  SELECT count(*) INTO target_count FROM tmp_portarias_target;

  IF target_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma portaria encontrada na faixa %-% para o ano %.',
      p_wrong_from_numero,
      p_wrong_to_numero,
      p_ano;
  END IF;

  CREATE TEMP TABLE tmp_available_numbers (
    new_numero integer PRIMARY KEY,
    seq integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_available_numbers (new_numero, seq)
  SELECT
    candidate.numero,
    row_number() OVER (ORDER BY candidate.numero)
  FROM generate_series(1, p_last_valid_numero - 1) AS candidate(numero)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.portarias_afastamento p
    WHERE p.ano = p_ano
      AND p.numero = candidate.numero
  );

  SELECT count(*) INTO available_count FROM tmp_available_numbers;

  IF available_count < target_count THEN
    RAISE EXCEPTION
      'Não há lacunas suficientes abaixo de % para reencaixar % portarias do ano %. Lacunas disponíveis: %.',
      p_last_valid_numero,
      target_count,
      p_ano,
      available_count;
  END IF;

  SELECT COALESCE(MAX(numero), 0) + 1000
    INTO base_temp_numero
  FROM public.portarias_afastamento
  WHERE ano = p_ano;

  UPDATE public.portarias_afastamento p
     SET numero = base_temp_numero + t.seq
    FROM tmp_portarias_target t
   WHERE p.id = t.portaria_id;

  CREATE TEMP TABLE tmp_portaria_reassignment (
    portaria_id bigint PRIMARY KEY,
    old_numero integer NOT NULL,
    new_numero integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_portaria_reassignment (portaria_id, old_numero, new_numero)
  SELECT
    t.portaria_id,
    t.old_numero,
    a.new_numero
  FROM tmp_portarias_target t
  JOIN tmp_available_numbers a
    ON a.seq = t.seq;

  UPDATE public.portarias_afastamento p
     SET numero = r.new_numero
    FROM tmp_portaria_reassignment r
   WHERE p.id = r.portaria_id;

  RETURN QUERY
  SELECT r.portaria_id, r.old_numero, r.new_numero
  FROM tmp_portaria_reassignment r
  ORDER BY r.new_numero;
END;
$$;