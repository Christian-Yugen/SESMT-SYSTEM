# Documentação Técnica e Funcional do SESMT-SYSTEM

Este documento representa a versão consolidada, auditada e validada do sistema SESMT-SYSTEM, servindo como única fonte da verdade (SSOT) baseada no código-fonte real.

## 1. Definição do Sistema
O **SESMT-SYSTEM** é uma plataforma de gestão de saúde ocupacional projetada para automatizar a emissão de ASOs (Atestados de Saúde Ocupacional), Encaminhamentos de Exames e Gestão de Abono Salarial. O sistema centraliza dados de servidores públicos e protocolos médicos, garantindo conformidade normativa (NR-7) e rastreabilidade institucional.

## 2. Resumo Executivo
O sistema atua como o cérebro operacional do SESMT, eliminando preenchimentos manuais e reduzindo erros de emissão. Seu valor reside na **blindagem jurídica** (evidências digitais de exames realizados) e na **eficiência administrativa** (automatização de renovações de abono).

## 3. Escopo Funcional Real
*   **Gerador de Documentos (Home):** Engine de busca de servidores, seleção de função/GHE e geração dinâmica de PDFs (ASO e Encaminhamento).
*   **Central de Evidências (`/referrals`):** Registro histórico de todos os encaminhamentos, com suporte a reemissão fiel ao documento original.
*   **Gestão de Abono Salarial (`/abono`):** Controle de vigência, renovação encadeada e indicadores de vencimento.
*   **BI & Analytics (`/analytics`):** Monitoramento de produtividade por operador, secretaria e horário de pico.
*   **Gestão de Acessos (`/users`):** Pré-autorização de e-mails corporativos e controle de níveis de acesso.

## 4. Arquitetura Técnica Validada
*   **Framework:** Next.js 16 (App Router).
*   **Backend:** Supabase (PostgreSQL, Auth, RLS).
*   **Persistência Local:** LocalStorage (`pending_aso_history`) como backup para falhas de rede.
*   **Autenticação:** Supabase Auth integrada a perfis (`profiles`) com roles específicas.
*   **UI/UX:** Tailwind CSS 4, Lucide React, Design Institucional (#1A3351, #E31E24).
*   **Documentos:** jsPDF (PDF), docx-js (Word).

## 5. Módulos e Rotas Validadas
| Caminho | Finalidade | Módulo | Access Role |
| :--- | :--- | :--- | :--- |
| `/` | Geração de ASO/Encaminhamento | Operacional | All (exceto Social Assistant) |
| `/referrals` | Central de Evidências | Operacional | Admin, Nurse, Operator |
| `/abono` | Gestão de Abono Salarial | Benefícios | Admin, Social Assistant |
| `/abono/portarias` | Ledger de Portarias | Benefícios | Admin, Social Assistant |
| `/abono/lei` | Legislação Municipal | Benefícios | All |
| `/abono/analytics` | BI Abono | Dashboard | Admin, Social Assistant, Analytic Manager |
| `/analytics` | Dashboard Central BI | Dashboard | Admin, Nurse, Analytic Manager |
| `/users` | Gestão de Operadores | Admin | Admin Only |

## 6. Auditoria de Módulos Críticos

### 6.0. Módulo CID Analytics (Governança e Arquitetura)
*   **Rota:** `/afastamentos/cid-analytics`.
*   **Documento canônico:** `docs/CID_ANALYTICS_MODULO_GOVERNANCA_E_ARQUITETURA.md`.
*   **Escopo:** arquitetura funcional em abas, pipeline analítico dual-layer, camada gerencial, governança visual aplicada e checklist de manutenção.

### 6.0.1. Programa Unificado de Inteligência em Absenteísmo Ocupacional
*   **Status:** FASE 0 (Governança) — EM EXECUÇÃO
*   **Objetivo:** Integrar análise epidemiológica clássica, avaliação clínica-ocupacional, risco psicossocial e ergonomia numa arquitetura unificada de dados e visualização.
*   **Fundação:** CID Analytics (FASE 10) é núcleo preservado e ampliado. Novo programa NÃO substitui, apenas estende.
*   **Documentação canônica:** `docs/ABSENTEISMO_INTELIGENTE_GOVERNANCA_E_PLANO_DIRETOR.md`.
*   **Documentação de execução:** `docs/ABSENTEISMO_INTELIGENTE_BACKLOG_MACRO.md`, `docs/ABSENTEISMO_INTELIGENTE_TEMPLATE_EXECUCAO_DE_FASE.md`, `docs/ABSENTEISMO_INTELIGENTE_TEMPLATE_RETORNO_AGENTE.md`.
*   **Trilha planejada:** FASE 0 (Governança) → FASE 1-2 (Requisitos + Schema) → FASE 3-4 (ETL + Validação) → FASE 5-6 (Epidemiologia) → FASE 7-10 (Ergonomia + Psicossocial) → FASE 11-12 (Relatórios + Prevention Board).
*   **Metodologia:** Protocolo de Belém para indicadores epidemiológicos (TAD, IFL, DML, IG). NR-1, NR-5, NR-7, NR-17 para integração normativa.
*   **Preservação expressa:** CID Analytics é read-only para novas camadas. Qualquer alteração em CID Analytics requer aprovação documentada.
*   **Regra de investigação:** CID F e CID M tratados como sinais sentinela, não causalidade automática. Investigação técnica obrigatória para concentrações ≥20%.

### 6.1. Abono Salarial
*   **Tabela:** `abono_salarial`.
*   **Regra de Vigência:** 12 meses (Início + 1 ano).
*   **Mecanismo de Renovação:** Campo `renovado_por_id` vincula o registro antigo ao novo, mantendo a cadeia histórica.
*   **Auditoria:** Logs automáticos em `abono_salarial_logs` para cada alteração manual.

### 6.2. Gerador de PDFs (Aso/Encaminhamento)
*   **Engine:** `src/lib/pdf-generator.ts`.
*   **Fidelidade:** Utiliza regex e dados históricos persistentes em `aso_history` para garantir que reemissões sejam idênticas aos originais.
*   **Resiliência:** Quando a inserção no banco de dados falha, o sistema salva o payload em `localStorage` e sinaliza sincronização pendente na Sidebar.

### 6.3. Sincronização de Dados
*   **Scripts:** Localizados no diretório raiz, permitem importar massivamente servidores, funções de GHE e exames a partir de arquivos Excel.
*   **Tabelas de Apoio:** `servidores`, `funcoes`, `exames_config`, `ghe_conj`.

## 7. Perfis e Permissões (RBAC)
*   `admin`: Acesso total e gestão de usuários.
*   `nurse`: Focado em ASO, Central de Evidências e BI Ocupacional.
*   `social_assistant`: Focado exclusivamente em Abono Salarial e sua legislação.
*   `analytic_manager`: Apenas visualização de dados e dashboards.
*   `operator`: Emissão de documentos e consulta básica.
*   `viewer`: Acesso somente leitura limitado.

## 8. Maturidade e Riscos
O sistema está **Operacional (95%)**.
*   **Pontos Fortes:** Resiliência offline, rastreabilidade de abono, geração de documentos fiel.
*   **Fragilidades:** Proteção de rotas client-side (redirecionamento via useEffect), carência de testes automatizados E2E.

## 9. Programa Unificado de Inteligencia em Absenteismo Ocupacional

A governanca canonica do programa unificado foi formalizada na FASE 0 com escopo exclusivamente documental.

Documentos oficiais:
*   `docs/ABSENTEISMO_INTELIGENTE_GOVERNANCA_E_PLANO_DIRETOR.md`
*   `docs/ABSENTEISMO_INTELIGENTE_BACKLOG_MACRO.md`
*   `docs/ABSENTEISMO_INTELIGENTE_TEMPLATE_EXECUCAO_DE_FASE.md`
*   `docs/ABSENTEISMO_INTELIGENTE_TEMPLATE_RETORNO_AGENTE.md`

Diretrizes centrais registradas:
*   Preservacao explicita do modulo `/afastamentos/cid-analytics` como nucleo clinico-ocupacional.
*   CID F e CID M como sinal sentinela e hipotese de vinculo ocupacional, sem causalidade automatica.
*   Regra de sequenciamento: dado e denominador antes de tela.
*   Trilha formal de evolucao FASE 0 a FASE 12 com dependencias e criterios de entrada/saida.

Documentos tecnicos da FASE 1 (auditoria base/schema):
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_1_AUDITORIA_BASE_E_SCHEMA.md`
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_1_MATRIZ_DE_CAMPOS.md`

Documentos tecnicos da FASE 2 (modelo relacional + migrations):
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_2_MODELO_RELACIONAL_E_MIGRATIONS.md`
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_2_DICIONARIO_DE_DADOS.md`
*   `database/migrations/004_create_absenteeism_intelligence_dimensions.sql`
*   `database/migrations/005_create_absenteeism_intelligence_facts.sql`
*   `database/migrations/006_create_absenteeism_risk_structures.sql`

Documentos tecnicos da FASE 3 (ETL e populacao controlada):
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3_ETL_E_POPULACAO_CONTROLADA.md` — status de bloqueio da fase e referencia de quarentena
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_2_5_BLINDAGEM_PRE_FASE_3.md` — blindagem oficial pre-FASE 3 e criterios de liberacao
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3D_CONSOLIDACAO_OFFLINE.md` — consolidacao final da trilha offline validada e baseline para continuidade segura
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3E_PLANO_DE_INGESTAO_CONTROLADA.md` — plano de isolamento, gates de aprovacao e rollback para futura ingestao controlada
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3F_PREPARACAO_AMBIENTE_ISOLADO.md` — preparacao formal do ambiente isolado de homologacao com checklist, gates e nao interferencia
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3G_PRECHECK_OPERACIONAL_HOMOLOGACAO.md` — pre-check operacional da criacao do ambiente de homologacao com inventario, gate e bloqueios
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3H_CRIACAO_PROJETO_HOMOLOGACAO.md` — tentativa de criacao controlada com bloqueio por ausencia de credencial de autenticacao
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3R_REABERTURA_GOVERNANCA.md` — reabertura formal da governanca da FASE 3 e reorganizacao para isolamento interno no projeto atual por restricao real de infraestrutura
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3S_DESENHO_ISOLAMENTO_INTERNO.md` — desenho tecnico do isolamento interno no projeto atual com fronteiras, naming, gates e contratos de nao interferencia
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3T_AUDITORIA_DE_IMPACTO_NO_PROJETO_ATUAL.md` — auditoria tecnica de impacto no legado com inventario de risco, dependencias cruzadas e checklist de nao interferencia para 3U
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3U_MIGRATIONS_ADDITIVE_ONLY.md` — package de migrations additive-only do dominio isolado `abs_intel`, com staging dedicado e sem toque no legado
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3V_APLICACAO_CONTROLADA_MIGRATIONS.md` — aplicacao controlada das migrations 007/008/009 no schema `abs_intel` com validacao estrutural e legado intocado
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3W_ETL_CONTROLADO_ABS_INTEL.md` — ETL controlado executado no schema `abs_intel` com cobertura, residuos, consistencia e evidencia de nao interferencia no legado
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3X_VALIDACAO_FINAL_DA_CARGA.md` — validacao final da carga no `abs_intel`: cobertura, consistencia, residuos e nao interferencia; APROVADO COM RESSALVAS (faixas demograficas NAO_INFORMADO por serial Excel nao tratado no ETL)
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3W_1_CORRECAO_SERIAL_EXCEL_ETL.md` — correcao do ETL para datas em serial Excel, recarga idempotente concluida e restauracao das faixas demograficas; FASE 4 segue bloqueada ate revalidacao final
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_3X_1_REVALIDACAO_FINAL_POS_CORRECAO.md` — revalidacao final apos correcao de datas: ressalva da 3X eliminada, integridade preservada e FASE 3 encerrada sem pendencias
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_4_0_AUTORIZACAO_DE_ABERTURA.md` — abertura formal da FASE 4 com criterios de entrada, escopo permitido/proibido e gate para 4.1 sem implementacao do motor nesta microfase
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_4_1_MOTOR_EPIDEMIOLOGICO.md` — implementacao do motor epidemiologico classico (TAD, IFL, DML/MDL, IG), recortes minimos e validacao metodologica auditavel no dominio `abs_intel`
*   `src/lib/afastamentos-epidemiologia.ts` — camada analitica dedicada do motor epidemiologico classico com formulas, agregacoes por recorte e utilitarios de validacao/reconciliacao
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_4_2_CONTRATO_DE_CONSUMO_ANALITICO.md` — contrato de consumo analitico versionado para exposicao controlada do motor epidemiologico, com metadados de auditoria, regras de arredondamento e validacao de consistencia
*   `src/lib/afastamentos-epidemiologia-contrato.ts` — camada de consumo/control plane do motor epidemiologico com DTOs estaveis, flags de validade, comportamento para ausencia de denominador e validador de contrato
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_4_3_INTEGRACAO_E_TESTES_DE_CONSUMO.md` — integracao do contrato na camada de aplicacao com adapter de repositorio e testes de consumo cobrindo estrutura, casos-limite e reconciliacao
*   `src/lib/afastamentos-epidemiologia-application.ts` — camada de aplicacao/orquestracao para carregar dataset do dominio `abs_intel` e montar contrato de consumo epidemiologico
*   `src/lib/tests/afastamentos-epidemiologia-consumo.test.ts` — testes de consumo da FASE 4.3 (payload, tipos, arredondamento, sem denominador, populacao insuficiente, coerencia e residual CID)
*   `database/etl/001_abs_intel_controlled_etl.sql` — script de carga controlada do dominio isolado (leitura em `public`, escrita apenas em `abs_intel`)
*   `scripts/phase3-etl-absenteeism.mjs` — stub deprecated (fora do fluxo operacional)
*   `scripts/_quarantine/phase3-etl-absenteeism.experimental.mjs` — artefato experimental offline-only (sem escrita em banco)
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_4_4_PRONTIDAO_EXPOSICAO_CONTROLADA.md` — auditoria de prontidao funcional, tecnica e de governanca para futura exposicao controlada; 1 ajuste minimo realizado (correcao de padrao .schema() no Supabase JS v2)
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_4_5_ENDPOINT_INTERNO_CONTROLADO.md` — implementacao do endpoint interno controlado para entrega do contrato epidemiologico, com validacao de parametros, erro controlado e testes dedicados
*   `src/app/api/absenteismo/epidemiologia/route.ts` — rota interna GET para exposicao controlada do contrato epidemiologico no dominio `abs_intel`
*   `src/lib/afastamentos-epidemiologia-endpoint.ts` — handler endurecido na FASE 4.6 com governanca de acesso interno por token, validacao adicional, observabilidade basica e diferenciacao clara de erros cliente/servidor
*   `src/lib/tests/afastamentos-epidemiologia-endpoint.test.ts` — testes de endpoint expandidos na FASE 4.6 (metodo, parametros obrigatorios, intervalo invalido, minPopulation invalido, falha simulada da camada de aplicacao, resposta interna consistente e regressao de contrato)
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_4_6_HARDENING_ENDPOINT_INTERNO.md` — hardening operacional do endpoint interno com governanca de acesso, observabilidade, robustez de erro, auditoria de package.json e garantias de nao interferencia
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_4_7_CONSOLIDACAO_OPERACIONAL.md` — consolidacao operacional da FASE 4 com readiness interno, playbook minimo de operacao, monitoramento, sinais de falha, limites de uso seguro e decisao de encerramento da fase
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_5_0_AUTORIZACAO_DE_ABERTURA.md` — abertura formal da FASE 5 com criterios de entrada, escopo permitido/proibido, dependencias e gate para a futura camada psicossocial NR-1, sem implementacao tecnica nesta microfase
*   `src/lib/afastamentos-psychosocial.ts` — camada analitica psicossocial NR-1 com leitura de fatores ativos, agrupamento de avaliacoes, score explicavel e sinais por grupo analitico sem alterar frontend
*   `src/lib/tests/afastamentos-psychosocial.test.ts` — testes da FASE 5.1 cobrindo fatores ativos, agrupamento de avaliacoes, score/criticidade, recortes minimos e validacao metodologica
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_5_1_CAMADA_PSICOSSOCIAL_NR1.md` — implementacao da camada psicossocial NR-1 com logica de score, criterios de explicabilidade, limitacoes e exemplos de leitura
*   `src/lib/afastamentos-psychosocial-contrato.ts` — contrato de consumo psicossocial com visao geral, recortes minimos, politica de arredondamento, flags de validade e comportamento controlado para casos-limite
*   `src/lib/tests/afastamentos-psychosocial-consumo.test.ts` — testes da FASE 5.2 cobrindo estrutura de payload, tipos, criticidade, casos-limite, justificativa auditavel e linguagem nao causal
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_5_2_CONTRATO_DE_CONSUMO_PSICOSSOCIAL.md` — contrato de consumo psicossocial, campos/tipos, arredondamento, validacao, exemplos de payload e prontidao para exposicao interna futura
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_5_3_PRONTIDAO_EXPOSICAO_INTERNA_PSICOSSOCIAL.md` — auditoria de prontidao funcional, tecnica, metodologica e de governanca da camada psicossocial para futura exposicao interna controlada, sem abrir endpoint nesta microfase
*   `src/lib/afastamentos-psychosocial-endpoint.ts` — handler interno da FASE 5.4 com validacao de parametros, controle de acesso interno, respostas auditaveis e exposicao segura do contrato psicossocial
*   `src/app/api/absenteismo/psicossocial/route.ts` — rota interna GET para consumo controlado do contrato psicossocial sem religar frontend ou legado
*   `src/lib/tests/afastamentos-psychosocial-endpoint.test.ts` — testes da FASE 5.4 cobrindo sucesso, erros controlados, edge cases, nao causalidade e estabilidade do contrato exposto
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_5_4_ENDPOINT_INTERNO_PSICOSSOCIAL.md` — implementacao da exposicao interna controlada da camada psicossocial com validacoes, salvaguardas, testes e nao interferencia
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_5_5_HARDENING_ENDPOINT_PSICOSSOCIAL.md` — hardening operacional do endpoint psicossocial com reforco de validacoes, observabilidade basica, guarda nao causal explicita, testes complementares e auditoria de package.json
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_5_6_CONSOLIDACAO_OPERACIONAL_PSICOSSOCIAL.md` — consolidacao operacional final da FASE 5 com readiness interno, playbook minimo, monitoramento, resposta a falhas e decisao de encerramento do eixo psicossocial
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_6_0_AUTORIZACAO_DE_ABERTURA.md` — abertura formal da FASE 6 com criterios de entrada, escopo permitido/proibido, dependencias e gate de implementacao da camada ergonomica NR-17, sem execucao tecnica nesta microfase
*   `src/lib/afastamentos-ergonomia.ts` — camada analitica ergonomica NR-17 com catalogo de fatores ativos, agrupamento de avaliacoes/exposicoes/acoes e criticidade explicavel por contexto ocupacional
*   `src/lib/tests/afastamentos-ergonomia.test.ts` — testes da FASE 6.1 cobrindo coerencia entre fatores, avaliacoes, exposicoes e acoes, consistencia de recortes e explicabilidade da criticidade
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_6_1_CAMADA_ERGONOMICA_NR17.md` — implementacao da camada ergonomica NR-17 com logica de score, criterios de explicabilidade, limitacoes e exemplos de leitura
*   `src/lib/afastamentos-ergonomia-contrato.ts` — contrato de consumo ergonomico NR-17 com visao geral, recortes minimos, metadados de auditoria, casos-limite e validacao de consistencia
*   `src/lib/tests/afastamentos-ergonomia-consumo.test.ts` — testes da FASE 6.2 cobrindo estrutura de payload, tipos, criticidade, edge cases e linguagem nao causal/deterministica
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_6_2_CONTRATO_DE_CONSUMO_ERGONOMICO.md` — contrato de consumo ergonomico com campos/tipos, arredondamento, validacao, casos-limite, explicabilidade e exemplos
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_6_3_PRONTIDAO_EXPOSICAO_INTERNA_ERGONOMICA.md` — auditoria de prontidao funcional, tecnica, metodologica e de governanca da camada ergonomica para futura exposicao interna controlada, sem abrir endpoint nesta microfase
*   `src/lib/afastamentos-ergonomia-endpoint.ts` — handler interno da FASE 6.4 com validacao de parametros, controle de acesso interno, respostas auditaveis e guarda de linguagem nao causal/nao deterministica para contrato ergonomico
*   `src/app/api/absenteismo/ergonomia/route.ts` — rota interna GET para consumo controlado do contrato ergonomico sem religacao de frontend ou legado
*   `src/lib/tests/afastamentos-ergonomia-endpoint.test.ts` — testes da FASE 6.4 cobrindo sucesso, erros controlados, edge cases, nao causalidade e estabilidade do contrato ergonomico exposto
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_6_4_ENDPOINT_INTERNO_ERGONOMICO.md` — implementacao da exposicao interna controlada da camada ergonomica com validacoes, salvaguardas, testes e garantias de nao interferencia
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_6_5_HARDENING_ENDPOINT_ERGONOMICO.md` — hardening operacional do endpoint ergonomico com reforco de limites de seguranca, governanca de acesso, observabilidade basica e testes complementares
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_6_6_CONSOLIDACAO_OPERACIONAL_ERGONOMICA.md` — consolidacao operacional da FASE 6 com readiness interno, playbook minimo de operacao, monitoramento, sinais de falha, limites de uso seguro e decisao formal de encerramento
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_7_0_AUTORIZACAO_DE_ABERTURA.md` — abertura formal da FASE 7 com criterios de entrada, escopo permitido/proibido, dependencias e gate para futura implementacao da Tela Epidemiologica Geral, sem execucao visual nesta microfase
*   `src/app/afastamentos/epidemiologia/page.tsx` — tela epidemiologica geral com cards TAD/IFL/DML/IG, resumo do periodo, recortes por sexo/faixa etaria/tempo servico/secretaria/cargo/local de trabalho, consumo via rota view autenticada, read-only
*   `src/app/api/absenteismo/epidemiologia-view/route.ts` — rota view com autenticacao por sessao Bearer do usuario, sem exposicao da chave interna ao browser, valida token via Supabase anon client
*   `src/lib/afastamentos-epidemiologia-page-utils.ts` — utilitarios de apresentacao da tela epidemiologica: buildEpidemiologyPageModel, buildLoadingPageModel, buildFetchError com tipos EpidemiologyCardModel, EpidemiologySummaryModel, EpidemiologyCutRow
*   `src/lib/tests/afastamentos-epidemiologia-page-utils.test.ts` — 14 testes cobrindo estado de loading, estados de erro, renderizacao dos 4 cards, consumo do payload completo, recortes e nao-regressao
*   Status: FASE 7.1 ENTREGUE — tela epidemiologica geral disponivel em /afastamentos/epidemiologia; suite de testes 89/89 pass
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_7_1_1_VALIDACAO_FUNCIONAL_TELA_EPIDEMIOLOGICA.md` — validacao funcional estatica da tela epidemiologica (FASE 7.1.1 ENCERRADA): typecheck zero erros, 89/89 pass, correcao do erro pre-existente psychosocial.ts:538 (string->literal union), limitacoes registradas, decisao formal de prontidao para FASE 7.2
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_7_2_REFINAMENTO_TELA_EPIDEMIOLOGICA.md` — refinamento visual e funcional da tela epidemiologica (FASE 7.2 ENTREGUE): labels descritivos nos cards, icones contextuais, opacidade para N/D, glossario nas tabelas de recorte, cor DML corrigida, datas em pt-BR, banner de reload, retry no erro, bloco tendencia como roadmap; decisao CID diferida para FASE 7.3+; serie temporal diferida para FASE 8+; 90/90 testes pass
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_7_2_1_BLOCO_DE_TENDENCIA.md` — bloco de tendencia real (FASE 7.2.1 ENTREGUE): janelas mensais sobre dataset ja carregado (zero I/O adicional), EpidemiologyTrend/EpidemiologyTrendPoint no contrato v4.3.0, TrendTable com barras proporcionais, 6 novos testes, 96/96 pass; FASE 7 formalmente ENCERRADA
*   `docs/ABSENTEISMO_INTELIGENTE_FASE_7_R_CORRECAO_ERRO_INTERNO_EPIDEMIOLOGIA.md` — fase corretiva (FASE 7.R CONCLUIDA): causa raiz do INTERNAL_ERROR confirmada como schema abs_intel nao exposto no PostgREST (PGRST106) + ausencia de GRANTs; correcoes: fetchRows enriquecido com error.code, migration 010_abs_intel_postgrest_grants.sql criada, instrucoes de configuracao do Dashboard documentadas; 96/96 testes pass sem alteracao
*   `database/migrations/010_abs_intel_postgrest_grants.sql` — GRANT USAGE ON SCHEMA abs_intel + GRANT SELECT nas 5 tabelas para service_role + REVOKE de anon/authenticated + NOTIFY pgrst reload config

---
*Atualizado em: 08 de Junho de 2026 (FASE 7.R — correcao INTERNAL_ERROR epidemiologia)*
*Auditado por: GitHub Copilot (Claude Sonnet 4.6)*
