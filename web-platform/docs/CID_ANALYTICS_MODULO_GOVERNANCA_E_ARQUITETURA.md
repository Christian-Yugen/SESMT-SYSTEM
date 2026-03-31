# MODULO CID ANALYTICS - GOVERNANCA, ARQUITETURA E SUSTENTACAO

Status: ATIVO
Fase atual da trilha: FASE 10 - Documentacao e consolidacao arquitetural
Ultima atualizacao: 2026-03-30
Escopo: web-platform / modulo Gestao Analitica de Afastamentos por CID

## 1. Finalidade institucional

Nome oficial do modulo:
- Gestao Analitica de Afastamentos por CID

Rota oficial:
- /afastamentos/cid-analytics

Finalidade institucional:
- Prover leitura epidemiologica ocupacional com foco em agravos CID, impacto operacional e recorrencia, para apoiar priorizacao tecnica, decisao gerencial e acao preventiva do SESMT.

Diferencas entre rotas proximas:
- /afastamentos:
	- operacao e gestao transacional da base de afastamentos.
	- foco em cadastro, status e acompanhamento administrativo.
- /afastamentos/analytics:
	- leitura analitica operacional ampla do dominio de afastamentos.
	- foco em acompanhamento gerencial geral, sem aprofundamento epidemiologico CID por camada dual-layer.
- /afastamentos/cid-analytics:
	- leitura epidemiologica especializada por CID/capitulo, recorrencia e impacto ocupacional.
	- foco em concentracao clinica, persistencia e inteligencia gerencial auditavel.

Publico-alvo interno:
- Gestao executiva
- Coordenacao SESMT
- Equipe tecnica SESMT (medicina, enfermagem, seguranca)
- Analise institucional orientada a prevencao

Camadas de leitura do modulo:
- executiva: cards de magnitude, impacto e recorrencia
- tecnica: rankings CID/capitulo e cruzamentos ocupacionais
- investigativa: episodios por servidor e recorrencia por janela

## 2. Arquitetura funcional consolidada

Fonte declarativa canônica:
- src/lib/afastamentos-cid-page-architecture.ts

Modo de arquitetura:
- tabbed (estruturada em abas)

Ordem de leitura da tela:
1. Header analitico e filtros globais
2. Cards executivos
3. Panorama epidemiologico
4. Tendencia temporal
5. Visao ocupacional
6. Casos e recorrencia

Estrutura em abas e funcao de cada aba:
- Visao Geral:
	- leitura executiva consolidada de magnitude, impacto e sinais gerenciais.
- CID e Capitulos:
	- concentracao por capitulo e CID, impacto em dias e tendencia clinica.
- Visao Ocupacional:
	- cruzamento de agravos com secretaria, cargo e natureza.
- Casos e Recorrencia:
	- investigacao de episodios por servidor, acumulado e intervalos.

Relacao entre blocos principais:
- filtros globais dirigem todo o recorte.
- cards sintetizam o estado do recorte.
- paineis detalham cada perspectiva.
- drill-down conecta capitulo para CID e investigacao por recorrencia.

## 3. Pipeline analitico (auditavel)

Fonte canônica do pipeline:
- src/lib/afastamentos-cid-analytics.ts
- src/types/afastamentos-cid-analytics.ts

Estrategia dual-layer:
- camada por evento (AfastamentoEventFact):
	- uma linha por episodio de afastamento.
	- usada para magnitude, persistencia, ocupacional e temporal.
- camada por ocorrencia CID (CidOccurrenceFact):
	- uma linha por CID dentro do evento.
	- usada para concentracao clinica e distribuicoes por agravo.

Politicas oficiais:
- recorrencia principal: 180 dias
- janelas paralelas: 90, 180, 365 dias
- multiplos CIDs: modo dual-layer
- alocacao de dias: shared-days (dias proporcionais por ocorrencia CID)
- faixas de duracao: 1-3, 4-7, 8-14, 15-30, 31-90, 91+

Metricas oficiais:
- magnitude:
	- totalAfastamentos
	- totalServidoresAfastados
	- totalDiasPerdidos
	- duracaoMedia
	- duracaoMediana
- persistencia:
	- percentualRecorrenciaPrimaryWindow
	- totalEventosRecorrentesPrimaryWindow
	- diasAcumuladosServidoresRecorrentes
- distribuicao:
	- concentracaoPorCapitulo
	- concentracaoPorCid
	- concentracaoPorSecretaria
	- concentracaoPorCargo
	- rankingImpactoDiasPorSecretaria
- tendencia:
	- serie por competencia (YYYY-MM)

Dimensoes oficiais:
- temporal: ano, mes, quarter, competencia, semana
- ocupacional: secretaria, cargo, naturezaCargo, contrato, matricula
- clinica: tipoAfastamento, isAcidenteTrabalho, cidCode, cidDesc, cidChapter
- evento: afastamentoId, servidorCpf, datas, dias, status/situacao
- recorrencia: episodio, janelas, dias entre episodios, acumulado

## 4. Enriquecimento de dados e garantias

Fontes e regras de enriquecimento:
- exclusao de maternidade na origem do dataset analitico
- sanitizacao de legado (SEM CID, NAO INFORMADO, placeholders)
- lookup de CID em base de dados
- resolucao complementar por catalogo local e range/chapter

Estado auditado consolidado:
- maternidade pos-filtro = 0
- legado pos-sanitizacao = 0
- residual de capitulo nao resolvido = 0

Evidencia de auditoria:
- tmp/cid_analytics_audit_report.json

Regra de manutencao:
- nenhuma manutencao futura pode reintroduzir maternidade/legado no dataset analitico final.
- qualquer alteracao de lookup/resolucao deve preservar as garantias acima.

## 5. Componentes principais implementados

Pagina principal do modulo:
- src/app/afastamentos/cid-analytics/page.tsx

Painel epidemiologico e clinico:
- src/components/analytics/cid/CidChapterRankingPanel.tsx
- src/components/analytics/cid/CidCodeRankingPanel.tsx
- src/components/analytics/cid/CidClinicalTrendPanel.tsx

Painel ocupacional:
- src/components/analytics/cid/CidOccupationalRankingPanel.tsx
- src/components/analytics/cid/CidNatureImpactPanel.tsx
- src/components/analytics/cid/CidOccupationalCrossPanel.tsx

Painel investigativo de recorrencia:
- src/components/analytics/cid/CidRecurrenceSummaryPanel.tsx
- src/components/analytics/cid/CidRecurrenceInvestigativeTable.tsx

Painel gerencial:
- src/components/analytics/cid/CidManagerialAlertsPanel.tsx
- src/components/analytics/cid/CidPriorityRankingPanel.tsx

Tipos compartilhados do modulo:
- src/components/analytics/cid/types.ts
- src/types/afastamentos-cid-analytics.ts

Libraries analiticas relacionadas:
- src/lib/afastamentos-cid-analytics.ts
- src/lib/afastamentos-cid-managerial.ts
- src/lib/afastamentos-cid-page-architecture.ts
- src/lib/cid-utils.ts

## 6. Governanca visual aplicada

Contratos obrigatorios aplicados:
- AGENTS.md
- DESIGN_SYSTEM_SESMT_GOVERNANCA_VISUAL_UNIFICADA.md

Aderencia consolidada:
- header canonico com CompactFilterBar
- filtros contextuais em ActionIconButton (extraActions)
- chips ativos em FilterChips
- cards estatisticos em StatisticCard e StatisticCardRow
- densidade visual e hierarquia coerentes por aba
- estados de loading, vazio e erro implementados
- tabelas extensas com rolagem horizontal controlada em mobile
- consolidacao responsiva concluida na FASE 9

## 7. Trilha de fases concluida

- FASE 0 - diagnostico
- FASE 1 - definicao funcional
- FASE 2 - modelagem analitica
- FASE 3 - arquitetura da pagina
- FASE 4 - visao geral executiva
- FASE 5 - CID e capitulos
- FASE 6 - visao ocupacional
- FASE 7 - casos e recorrencia
- FASE 8 - alertas e rankings gerenciais
- FASE 9 - consolidacao responsiva
- FASE 10 - documentacao final

## 8. Checklist de manutencao futura

Checklist obrigatorio antes de concluir qualquer alteracao no modulo:

- [ ] nao quebrar o pipeline dual-layer (evento + ocorrencia CID)
- [ ] nao alterar semantica das metricas sem atualizar esta documentacao
- [ ] nao reintroduzir maternidade no dataset analitico
- [ ] nao reintroduzir legado pos-sanitizacao
- [ ] nao criar filtros paralelos fora do header global
- [ ] nao criar paineis fora da governanca visual oficial
- [ ] validar build
- [ ] validar lint
- [ ] validar consistencia por breakpoint (320/360/390/430/768/desktop)
- [ ] validar coerencia com DESIGN_SYSTEM_SESMT_GOVERNANCA_VISUAL_UNIFICADA.md
- [ ] manter aderencia entre arquitetura declarativa e implementacao real

## 9. Limites do modulo e evolucoes futuras

Limites atuais (sem abrir escopo agora):
- modulo consolidado para leitura analitica e priorizacao tecnica.
- sem reabertura de escopo funcional encerrado nas fases 4-9.

Evolucoes futuras possiveis (nao implementadas nesta fase):
- exportacao analitica governada
- refinamento de visibilidade por perfil LGPD no drill-down
- alertas gerenciais avancados adicionais
- materializacao/performance para escala superior
- integracoes institucionais adicionais (camadas de planejamento e vigilancia)

## 10. Referencias cruzadas

Documentacao institucional relacionada:
- docs/SESMT_SYSTEM_DOCUMENTATION.md
- docs/ARCHITECTURE.md
- README.md

Governanca visual obrigatoria:
- DESIGN_SYSTEM_SESMT_GOVERNANCA_VISUAL_UNIFICADA.md
- ../AGENTS.md

## 11. Encerramento da FASE 10

Resultado:
- modulo CID Analytics formalmente consolidado em documentacao tecnica e institucional.
- base pronta para sustentacao, auditoria e evolucao controlada.

Marcadores de fechamento:
- RETOMAR_TRILHA_GERAL_DO_MODULO_CID
- MODULO_CID_CONSOLIDADO
