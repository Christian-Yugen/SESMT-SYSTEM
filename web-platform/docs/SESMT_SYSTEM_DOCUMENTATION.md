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
*   `scripts/phase3-etl-absenteeism.mjs` — stub deprecated (fora do fluxo operacional)
*   `scripts/_quarantine/phase3-etl-absenteeism.experimental.mjs` — artefato experimental offline-only (sem escrita em banco)
*   Status: BLOQUEADA — FASE 3 NAO AUTORIZADA na microfase 2.5

---
*Atualizado em: 31 de Marco de 2026*
*Auditado por: Antigravity AI*
