-- ALIMENTACAO DE FATORES PSICOSSOCIAIS PADRAO (SESMT-SYSTEM)
-- Esquema: abs_intel | Tabela: abs_dim_psychosocial_factor

-- 1. Limpar possiveis residuos (opcional)
-- TRUNCATE TABLE abs_intel.abs_dim_psychosocial_factor RESTART IDENTITY CASCADE;

-- 2. Inserir catalogo normativo NR-1
INSERT INTO abs_intel.abs_dim_psychosocial_factor 
(codigo, nome, descricao, categoria, fonte_normativa, is_active)
VALUES
('FPS-001', 'Demandas Psicologicas', 'Pressao de tempo, volume de trabalho e complexidade das tarefas que geram sobrecarga cognitiva.', 'DEMANDA-CONTROLE', 'NR-1 / Modelo Karasek', true),
('FPS-002', 'Controle sobre o Trabalho', 'Grau de autonomia e possibilidade de uso de habilidades na execucao das atividades.', 'DEMANDA-CONTROLE', 'NR-1 / Modelo Karasek', true),
('FPS-003', 'Suporte Social Interpessoal', 'Qualidade do apoio recebido de colegas e supervisores no ambiente de trabalho.', 'RELACOES-SOCIAIS', 'NR-1 / Modelo Karasek', true),
('FPS-004', 'Inseguranca no Emprego', 'Preocupacao excessiva com a instabilidade contratual ou mudancas organizacionais negativas.', 'CONTEXTO-OCUPACIONAL', 'NR-1 / OSHA', true),
('FPS-005', 'Conflito de Papéis', 'Dissonancia entre as exigencias do cargo e os valores ou capacidades do servidor.', 'RELACOES-SOCIAIS', 'NR-1 / NR-17', true),
('FPS-006', 'Interface Trabalho-Familia', 'Dificuldade de conciliar as exigencias profissionais com a vida pessoal e familiar.', 'CONTEXTO-OCUPACIONAL', 'NR-1 / NR-17', true),
('FPS-007', 'Exposicao a Violencia/Assedio', 'Situacoes de desrespeito, humilhacao ou violencia psicologica no ambiente laboral.', 'RISCO-CRITICO', 'NR-1 / OIT-190', true),
('FPS-008', 'Falta de Reconhecimento', 'Percepcao de desequilibrio entre o esforco empenhado e a recompensa (financeira ou moral).', 'ESFORCO-RECOMPENSA', 'NR-1 / Modelo Siegrist', true);

-- 3. Verificar insercao
-- SELECT * FROM abs_intel.abs_dim_psychosocial_factor;
