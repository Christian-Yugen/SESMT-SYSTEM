-- Add servidor_contrato column to portarias_abono table
ALTER TABLE portarias_abono ADD COLUMN IF NOT EXISTS servidor_contrato TEXT;

-- Update the Audit Log table as well
ALTER TABLE portarias_abono_logs ADD COLUMN IF NOT EXISTS servidor_contrato TEXT;
