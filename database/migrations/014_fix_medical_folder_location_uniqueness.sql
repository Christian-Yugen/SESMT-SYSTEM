-- Corrige deriva de schema em bases onde a coluna pasta foi tratada como única isoladamente.
DO $$
DECLARE
    constraint_name text;
    index_name text;
    pasta_attnum smallint;
BEGIN
    SELECT attnum
      INTO pasta_attnum
      FROM pg_attribute
     WHERE attrelid = 'public.medical_folders'::regclass
       AND attname = 'pasta'
       AND NOT attisdropped;

    IF pasta_attnum IS NULL THEN
        RAISE EXCEPTION 'Coluna public.medical_folders.pasta não encontrada';
    END IF;

    FOR constraint_name IN
        SELECT conname
          FROM pg_constraint
         WHERE conrelid = 'public.medical_folders'::regclass
           AND contype = 'u'
           AND array_length(conkey, 1) = 1
           AND conkey[1] = pasta_attnum
    LOOP
        EXECUTE format(
            'ALTER TABLE public.medical_folders DROP CONSTRAINT IF EXISTS %I',
            constraint_name
        );
    END LOOP;

    FOR index_name IN
        SELECT indexname
          FROM pg_indexes
         WHERE schemaname = 'public'
           AND tablename = 'medical_folders'
           AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
           AND indexdef ~* '\\(pasta\\)'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I', index_name);
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_medical_folders_location
    ON public.medical_folders (armario, gaveta, pasta);