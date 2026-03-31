# ABSENTEISMO INTELIGENTE - BACKLOG MACRO

Status: CANONICO
Versao: 1.0.0
Data: 2026-03-31

## 1. Objetivo

Organizar o programa unificado por fase com rastreabilidade de objetivo, entregaveis, artefatos, testes, dependencias e status.

## 2. Backlog por fase

| Fase | Nome da fase | Objetivo | Entregaveis esperados | Artefatos esperados | Testes/validacoes esperados | Dependencias | Status inicial | Observacoes criticas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Governanca | Congelar escopo, trilha e metodo | Documento canonico, backlog macro, templates, index atualizado | 4 docs canonicos + atualizacao de index | Revisao documental cruzada | Nenhuma | Concluida | Proibido adiantar implementacao |
| 1 | Requisitos tecnicos | Consolidar contratos de requisitos por dominio | Especificacao de requisitos e regras de negocio | Documento tecnico de requisitos | Revisao tecnica funcional | 0 | Nao iniciada | Sem alterar schema nesta fase |
| 2 | Contrato de schema | Definir modelo de dados alvo | Proposta de schema e mapeamento de entidades | Documento de modelagem + scripts planejados | Revisao de consistencia relacional | 1 | Nao iniciada | Sem executar migration sem aprovacao |
| 3 | ETL base | Estruturar carga e sincronizacao | Pipelines de ingestao e normalizacao | Plano ETL + jobs + logs de carga | Validacao de integridade de carga | 2 | Nao iniciada | Evitar drift de dados cadastrais |
| 4 | Denominadores | Formalizar populacao ativa por recorte temporal | Snapshot populacional versionado | Modelo fact_population_snapshot | Validacao de consistencia temporal | 3 | Nao iniciada | Sem denominador nao ha taxa confiavel |
| 5 | Epidemiologia I | Implementar base de indicadores classicos | Funcoes TAD/IFL/DML/MDL/IG (nucleo) | Lib afastamentos-epidemiologia.ts (parte 1) | Teste de formula e reproducao | 4 | Nao iniciada | Nao publicar sem auditoria numerica |
| 6 | Epidemiologia II | Consolidar estratificacoes e cortes oficiais | Indicadores por sexo, idade, tempo, categoria e unidade | Lib afastamentos-epidemiologia.ts (parte 2) | Testes de estratificacao | 5 | Nao iniciada | Garantir consistencia entre recortes |
| 7 | Ergonomia I | Integrar NR-17/AEP/AET ao contexto de afastamentos | Modelo ergonomico inicial e criterios de correlacao | Lib afastamentos-ergonomia.ts (parte 1) | Validacao tecnica com regras ergonomicas | 6 | Nao iniciada | Sem causalidade automatica |
| 8 | Ergonomia II | Consolidar priorizacao ergonomica | Regras de prioridade e sinais de acao | Lib afastamentos-prevention-priority.ts (parcial) | Testes de priorizacao | 7 | Nao iniciada | Preservar leitura ocupacional contextual |
| 9 | Psicossocial I | Integrar NR-1/PGR ao monitoramento | Modelo psicossocial inicial | Lib afastamentos-psychosocial.ts (parte 1) | Validacao tecnica de vinculo organizacional | 6 | Nao iniciada | CID F e M como sinal, nao nexo automatico |
| 10 | Psicossocial II + clinico-ocupacional | Consolidar leitura investigativa integrada | Regras de consolidacao e investigacao | Lib afastamentos-psychosocial.ts (parte 2) + consolidacao | Teste de consistencia investigativa | 9 | Nao iniciada | Respeitar nucleo cid-analytics preservado |
| 11 | Relatorios formais | Formalizar saidas executivas, tecnicas e medicas | Geracao de relatorios oficiais | Lib afastamentos-reporting.ts | Testes de conformidade e rastreabilidade | 10 | Nao iniciada | Evidencias obrigatorias por relatorio |
| 12 | Board unificado | Consolidar painel de prevencao | Rota prevention-board e score final | /afastamentos/prevention-board + score unificado | QA final e homologacao | 11 | Nao iniciada | Nao quebrar contratos anteriores |

## 3. Dependencias gerais

- Sequencia principal: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12
- Dependencia de dados: 5 e 6 somente apos 4 validada.
- Dependencia de integracao: 7 e 9 exigem base epidemiologica minima consolidada.

## 4. Escopo e controle de status

Status permitidos por fase:
- Nao iniciada
- Em execucao
- Em validacao
- Concluida
- Concluida com ressalvas

Toda mudanca de status exige:
- referencia de evidencias;
- testes executados;
- responsavel e data.

## 5. Observacoes estruturantes

- O modulo /afastamentos/cid-analytics permanece preservado durante todo o programa.
- A FASE 0 e documental e nao autoriza schema, ETL, telas ou implementacao de motor epidemiologico.
- A progressao para FASE 1 depende de aprovacao formal da governanca.
