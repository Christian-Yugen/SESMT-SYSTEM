-- Script para adicionar campos do Assomasul à tabela de abono_salarial
ALTER TABLE public.abono_salarial
ADD COLUMN IF NOT EXISTS assomasul_numero TEXT;
-- Garantir que a coluna de data também exista (caso não tenha sido criada anteriormente)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'abono_salarial'
        AND column_name = 'assomasul_data'
) THEN
ALTER TABLE public.abono_salarial
ADD COLUMN assomasul_data DATE;
END IF;
END $$;
COMMENT ON COLUMN public.abono_salarial.assomasul_numero IS 'Número do registro externo no Assomasul';
COMMENT ON COLUMN public.abono_salarial.assomasul_data IS 'Data da publicação externa no Assomasul';