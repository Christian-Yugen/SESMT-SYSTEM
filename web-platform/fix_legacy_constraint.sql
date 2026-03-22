-- Script de Correção de Restrições Legadas
-- Remove a trava antiga que impedia múltiplos vínculos para o mesmo CPF/Matrícula

-- 1. Remover a restrição antiga pelo nome identificado no log de erro
-- O erro foi: "servidores_cpf_matricula_key"
ALTER TABLE public.servidores DROP CONSTRAINT IF EXISTS servidores_cpf_matricula_key;

-- 2. Garantir que a NOVA restrição exista e inclua o CONTRATO
ALTER TABLE public.servidores DROP CONSTRAINT IF EXISTS unique_servidor_vinculo;
ALTER TABLE public.servidores ADD CONSTRAINT unique_servidor_vinculo UNIQUE (cpf, matricula, contrato);

-- 3. Inserir manualmente um teste se necessário, mas o script de sincronização agora deve funcionar plenamente.
