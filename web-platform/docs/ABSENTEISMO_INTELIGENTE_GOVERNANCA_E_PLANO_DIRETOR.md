# PROGRAMA UNIFICADO DE INTELIGÊNCIA EM ABSENTEÍSMO OCUPACIONAL

**Status:** ATIVO — FASE 0 (Governança)  
**Versão:** 1.0.0  
**Data de aprovação:** 31 de março de 2026  
**Autoridade:** Governança de Programa Institucional  
**Abrangência:** SESMT-SYSTEM — Vigilância, Epidemiologia e Prevenção

---

## 1. OBJETIVO INSTITUCIONAL DO PROGRAMA

Construir uma **plataforma unificada de inteligência em absenteísmo ocupacional** que integre análise epidemiológica clássica, avaliação clínica-ocupacional, risco psicossocial e ergonomia em uma arquitetura de dados e visualização coerente, permitindo ao SESMT evoluir de "reação a afastamentos" para "antecipação inteligente de riscos".

A inteligência é construída em camadas progressivas de sofisticação analítica, desde magnitude bruta até priorização preventiva multidimensional, e é sempre auditável em cada camada.

---

## 2. FUNDAMENTAÇÃO E UNIFICAÇÃO DO MODELO

### 2.1 Dois modelos que se complementam

O programa integra dois paradigmas historicamente separados:

**Modelo Epidemiológico Clássico:**
- Foco: Qual doença, quantas vezes, em qual população.
- Método: Contagem, distribuição, denominadores, taxas.
- Indicadores: TAD (Taxa de Absenteísmo por Doença), IFL (Incidência de Faltas Longas), DML (Duração Média de Licença), IG (Índice de Gravidade).
- Fundamentação: Estudos de epidemiologia ocupacional, incluindo metodologia de Belém para vigilância epidemiológica de agravos ocupacionais.
- Pergunta central: "Quais agravos concentram a carga de absenteísmo?"

**Modelo Normativo-Preventivo:**
- Foco: Por que falta, o que previne, como priorizar ação.
- Método: Análise de causalidade ocupacional, risco psicossocial, ergonomia.
- Indicadores: Scores de prioridade, correlação com contexto do trabalho, risco identifi cado.
- Fundamentação: NR-1, NR-17, NR-5, PGR (Programa de Gerenciamento de Riscos), AET (Análise Ergonômica do Trabalho), metodologia de avaliação psicossocial.
- Pergunta central: "Qual o vínculo ocupacional e o potencial de prevenção?"

**Unificação:**
O programa trata ambos os modelos como **complementares e inseparáveis**. A análise epidemiológica sem contexto ocupacional é miopia. A procura por causalidade sem rigor epidemiológico é viés. A construção do sistema avança ambos simultaneamente, validando um contra o outro.

### 2.2 Posição sobre CID F (Transtornos Mentais) e CID M (Doenças Musculoesqueléticas)

Estes dois grupos de CID concentram tipicamente 40-60% do absenteísmo ocupacional e são frequentemente sobre-interpretados como "diretos" da organização. Este programa estabelece:

**Regra Expressa:**
- CID F e CID M são **sinais sentinela**, não causalidade automática.
- Concentração alta de CID F/M é **hipótese de vínculo ocupacional**, não diagnóstico.
- Toda análise de CID F/M deve ser acompanhada de **investigação técnica de contexto**: entrevistas estruturadas, avaliação ergonômica, inventários de risco psicossocial (ex: LIPT-69).
- Nenhuma comunicação gerencial pode afirmar "o trabalho causa F32" sem investigação técnica validada.
- Dados e contexto ocupacional sempre vêm primeiro; causalidade vem depois.

---

## 3. ESTADO ATUAL DO MÓDULO `/afastamentos/cid-analytics`

### 3.1 O que já está consolidado e funcional

O módulo CID Analytics (FASE 10 concluída) oferece hoje:

**Camada de leitura epidemiológica básica:**
- Contagem de afastamentos por capítulo CID e CID específico.
- Dias perdidos agregados e distribuídos por agravo (shared-days allocation).
- Duração média e mediana de afastamento.
- Padrões de recorrência em janelas de 90, 180 e 365 dias.
- Tendência temporal (série por competência mensal).

**Camada de leitura ocupacional:**
- Concentração de agravos por secretaria, cargo e natureza de vínculo.
- Cruzamento capítulo CID × secretaria (matriz de risco combinado).
- Impacto por grupo ocupacional.

**Camada de leitura investigativa:**
- Episódios por servidor com acumulado de dias.
- Intervalo entre episódios.
- Número sequencial de episódios (recorrência por servidor).

**Camada gerencial executiva:**
- Score de prioridade composto (35% volume + 35% dias + 20% recorrência + 10% tendência).
- Classificação em faixas de criticidade (prioridade-crítica, atenção-alta, atenção-moderada).
- Alertas automáticos por padrão detectado (7 tipos).
- Rankings prioritários por dimensão (secretaria, cargo, capítulo, CID).

**Garantias de qualidade:**
- Exclusão de maternidade com auditoria zerada.
- Sanitização de legado (SEM CID, NÃO INFORMADO, placeholders) com residual zerado.
- Pipeline dual-layer para múltiplos CIDs por evento com alocação proporcional de dias.
- Todas as métricas auditáveis linha a linha.

### 3.2 Limites atuais e o que NÃO está em CID Analytics

**CID Analytics NÃO pode responder:**

1. **Indicadores epidemiológicos formais:**
   - TAD: Taxa de Absenteísmo por Doença = (dias afastados por doença / dias úteis da população) × 100.
   - IFL: Incidência de Faltas Longas = (nº faltas > 15 dias / população ativa no período) × 100.
   - DML: Duração Média de Licença = dias totais / nº eventos.
   - IG: Índice de Gravidade = dias perdidos / nº eventos.
   - Razão: Faltam denominadores (população ativa, dias úteis calibrados).

2. **Análise por características sociodemográficas:**
   - Não há dimensão de sexo no schema atual (seria necessário enriquecimento da tabela `servidores`).
   - Não há dimensão de faixa etária (idem).
   - Não há dimensão de tempo de serviço (idem).

3. **Análise de vínculo ocupacional:**
   - A concentração de CID F numa secretaria é um sinal, não uma prova de causalidade ocupacional.
   - Não há dados de risco psicossocial (inventários, avaliações).
   - Não há integração com PGR ou AET.

4. **Análise ergonômica:**
   - Não há dados de posturas, repetitividade ou altura de bancada.
   - Não há diagnósticos de AET.
   - Não há priorização ergonômica baseada em CID M.

5. **Relatórios formais:**
   - Não há relatório executivo estruturado para diretoria.
   - Não há relatório técnico estruturado para SESMT.
   - Não há relatório médico para discussão em clínica.

---

## 4. ARQUITETURA-ALVO DE ALTO NÍVEL

### 4.1 Camadas autorizadas do programa

O programa será construído em **5 camadas progressivas**, cada uma dependente das anteriores:

```
┌─────────────────────────────────────────────────────┐
│ CAMADA 5: Executiva de Prevenção (FASE 11-12)       │
│ Relatórios, dashboards, recomendações prioritárias  │
├─────────────────────────────────────────────────────┤
│ CAMADA 4: Integração Risco Psicossocial (FASE 9-10) │
│ Indicadores NR-1, LIPT-69, priorização mental       │
├─────────────────────────────────────────────────────┤
│ CAMADA 3: Integração Ergonômica (FASE 7-8)          │
│ Indicadores NR-17, AET, priorização musculoesquelética
├─────────────────────────────────────────────────────┤
│ CAMADA 2: Motor Epidemiológico (FASE 5-6)           │
│ TAD, IFL, DML, IG, análise por sexo/idade/tempo srv │
├─────────────────────────────────────────────────────┤
│ CAMADA 1: Base de Dados Enriquecida (FASE 2-4)      │
│ Schema, ETL, masterdata de servidor, tempo, vínculo │
├─────────────────────────────────────────────────────┤
│ ALICERCE: Governança e Arquitetura (FASE 0-1)       │
│ Documentação, decisões metodológicas, trilha oficial │
└─────────────────────────────────────────────────────┘
```

Acima de todas as camadas fica a **preservação do CID Analytics** como núcleo clínico-ocupacional. O CID Analytics NÃO será refatorado, apenas incrementado e consumido pelasCamadas 2, 3 e 4.

### 4.2 Tabelas de dimensão e fato planejadas

**Dimensões (Dim):**
- `dim_servidor` — Servidor com sexo, idade, tempo de serviço, categoria funcional.
- `dim_vinculo_servidor` — Vínculo, secretaria, cargo, natureza, local de trabalho.
- `dim_tempo` — Calendário, feriados, dias úteis por mês.
- `dim_cid` — CID-10 com capítulo, descrição clínica, risco ocupacional estimado.
- `dim_risco_psicossocial` — Fator de risco psicossocial (burnout, assédio, etc).
- `dim_risco_ergonomico` — Fator de risco ergonômico (postura, repetitividade, etc).

**Fatos (Fact):**
- `fact_afastamento_evento` — Um registro por episódio de afastamento (preservada, apenas enriquecida).
- `fact_afastamento_cid` — Um registro por CID dentro de um evento (preservado, dual-layer).
- `fact_afastamento_epidemiologico` — Indicadores TAD/IFL/DML/IG por período, grupo ocupacional.
- `fact_avaliacao_psicossocial` — Inventário de risco psicossocial por servidor/secretaria.
- `fact_avaliacao_ergonomica` — AET por local de trabalho/cargo, CIDs associados.
- `fact_population_snapshot` — Snapshot mensal de população ativa por categoria (serve como denominador).

### 4.3 Libraries futuras planejadas

```typescript
// FASE 2-4: Base de dados enriquecida
src/lib/afastamentos-masterdata.ts
  ├── updateServerRichProfile()
  ├── enrichWorkbindingContext()
  └── syncPopulationSnapshot()

// FASE 5-6: Motor epidemiológico
src/lib/afastamentos-epidemiologia.ts
  ├── computeTAD()
  ├── computeIFL()
  ├── computeDML()
  ├── computeIG()
  ├── groupByDemographic()
  └── validateDenominators()

// PRESERVADO: CID Analytics (núcleo clínico)
src/lib/afastamentos-cid-analytics.ts (sem mudança)
src/lib/afastamentos-cid-managerial.ts (sem mudança)

// FASE 7-8: Psicossocial  
src/lib/afastamentos-psychosocial.ts
  ├── integrateRiskProfile()
  ├── labelZoneCID_F()
  ├── investigateOccupationalVicinage()
  └── reportPsychoRiskSignals()

// FASE 9-10: Ergonomia
src/lib/afastamentos-ergonomia.ts
  ├── integrateAETFindings()
  ├── labelZoneCID_M()
  ├── prioritizeErgonomicIntervention()
  └── reportMSEMusculoRisks()

// FASE 11-12: Prevenção unificada
src/lib/afastamentos-prevention-priority.ts
  ├── unifyAllRisks()
  ├── computePreventionROI()
  ├── generateExecutiveRecommendations()
  └── trackInterventionResults()

src/lib/afastamentos-reporting.ts
  ├── reportExecutive()
  ├── reportTechnical()
  ├── reportMedical()
  └── reportPopulationSnapshot()
```

### 4.4 Rotas futuras planejadas

```
/afastamentos/cid-analytics      ← ATUAL (PRESERVADO)
/afastamentos/epidemiologia      ← FASE 6
/afastamentos/psychosocial-analytics  ← FASE 10
/afastamentos/ergonomia-analytics     ← FASE 8
/afastamentos/reports                 ← FASE 11 (central unificada de relatórios e priorização)
```

---

## 5. TRILHA OFICIAL FASE 0 A FASE 12

### 5.1 Mapa de Fases com objetivos, entradas, saídas

#### **FASE 0: Governança e Plano Diretor**
- **Objetivo:** Congelar escopo oficial, formalizar trilha, padronizar método de execução.
- **Duração estimada:** 2 dias.
- **Entradas:** Estudo de caso (referência Belém), CID Analytics consolidado.
- **Entregáveis:** 
  - Documento canônico de governança do programa.
  - Backlog macro rastreável.
  - Templates operacionais para próximas fases.
- **Critérios de saída:** Documento aprovado, trilha formalizada, método documentado.
- **Status:** EM EXECUÇÃO.

#### **FASE 1: Definição Técnica de Requisitos**
- **Objetivo:** Detalhar schema, campos, normalização, garantias de qualidade.
- **Duração estimada:** 3-5 dias.
- **Entradas:** Documento de FASE 0.
- **Entregáveis:** 
  - Especificação de dim_servidor com sexo/idade/tempo_servico/categoria.
  - Especificação de dim_tempo com calendário, dias úteis.
  - Plano de enriquecimento de tabelas existentes vs novas.
  - Políticas de RLS e controle de acesso para dimensões sensíveis.
- **Critérios de saída:** Spec revisado, não há ambiguidade.
- **Bloqueadores:** Nenhum. Esta fase é paralela.

#### **FASE 2: Schema e Migrations**
- **Objetivo:** Criar ou alterar tabelas e campos no Supabase.
- **Duração estimada:** 1 semana.
- **Entradas:** Especificação de FASE 1.
- **Entregáveis:**
  - Migrations SQL para dim_servidor enriquecida.
  - Migrations SQL para dim_tempo.
  - Migrations SQL para dim_risco_psicossocial (placeholder).
  - Migrations SQL para dim_risco_ergonomico (placeholder).
  - Migrations SQL para fact_population_snapshot.
  - Politicas de RLS.
- **Critérios de saída:** Schema criado, rollback testado, zero regressões.
- **Dependências:** FASE 0 arquitetural OK, FASE 1 técnica OK.

#### **FASE 3: ETL e Masterdata**
- **Objetivo:** Popular dimensões e criar pipelines de sincronização.
- **Duração estimada:** 2 semanas.
- **Entradas:** Schema de FASE 2.
- **Entregáveis:**
  - Script de carga bulk de dim_servidor (enriquecida).
  - Script de snapshot mensal de população ativa.
  - Lib `afastamentos-masterdata.ts` com funções de sincronização.
  - Documentação de integridade referencial.
- **Critérios de saída:** Dados carregados, qualidade validada, scripts idempotentes.
- **Dependências:** FASE 2 schema OK.

#### **FASE 4: Verificação de Denominadores**
- **Objetivo:** Validar que denominadores estão corretos e auditáveis.
- **Duração estimada:** 1 semana.
- **Entradas:** Dados de FASE 3.
- **Entregáveis:**
  - Relatório de população ativa por período, secretaria, categoria.
  - Benchmarking contra SIAPE ou fonte oficial.
  - Plan de ajuste se houver discrepâncias.
- **Critérios de saída:** Denominadores audita dos, confiáveis.
- **Dependências:** FASE 3 ETL OK.

#### **FASE 5-6: Motor Epidemiológico**
- **Objetivo:** Implementar TAD, IFL, DML, IG, análise demográfica.
- **Duração estimada:** 3 semanas.
- **Entradas:** Dados validados de FASE 3-4.
- **Entregáveis:**
  - Lib `afastamentos-epidemiologia.ts` com indicadores formais.
  - Página `/afastamentos/epidemiologia` com tabelas e gráficos de indicadores.
  - Integração com CID Analytics (sem alteração).
  - Análise cruzada por sexo, idade, tempo de serviço.
- **Critérios de saída:** TAD/IFL/DML/IG calculados, validados contra protocolo Belém.
- **Dependências:** FASE 4 denominadores OK.

#### **FASE 7-8: Integração Ergonômica**
- **Objetivo:** Incorporar avaliação ergonômica, priorizar CID M.
- **Duração estimada:** 4 semanas.
- **Entradas:** FASE 6 epidemiologia, AET ou inventário ergonômico.
- **Entregáveis:**
  - Schema para `fact_avaliacao_ergonomica`.
  - Lib `afastamentos-ergonomia.ts`.
  - Página `/afastamentos/ergonomia-analytics` com CID M priorizado.
  - Documentação de vínculo ergonômico por CID M.
- **Critérios de saída:** Ergonomia integrada, recomendações acionáveis.
- **Dependências:** FASE 6 epidemiologia OK, dados de AET disponíveis.

#### **FASE 9-10: Integração Psicossocial**
- **Objetivo:** Incorporar risco psicossocial, priorizar CID F.
- **Duração estimada:** 4 semanas.
- **Entradas:** FASE 6 epidemiologia, inventário psicossocial (LIPT-69 ou similar).
- **Entregáveis:**
  - Schema para `fact_avaliacao_psicossocial`.
  - Lib `afastamentos-psychosocial.ts`.
  - Página `/afastamentos/psychosocial-analytics` com CID F priorizado.
  - Documentação de investigação técnica para CID F.
- **Critérios de saída:** Psicossocial integrado, investigação documentada, zero viés de causalidade.
- **Dependências:** FASE 6 epidemiologia OK, dados de avaliação psicossocial disponíveis.

#### **FASE 11: Relatórios Formais**
- **Objetivo:** Gerar relatórios executivo, técnico e médico estruturados.
- **Duração estimada:** 2 semanas.
- **Entradas:** Todas as fases anteriores.
- **Entregáveis:**
  - Lib `afastamentos-reporting.ts`.
  - Página `/afastamentos/reports` com múltiplas versões de relatório.
  - Templates estruturados para cada público (executivo, SESMT, médico).
- **Critérios de saída:** Relatórios aprovados por stakeholders, zero exposição sensível (LGPD).
- **Dependências:** FASE 7-10 análises OK.

#### **FASE 12: Prevenção Unificada e Dashboard de Priorização**
- **Objetivo:** Consolidar todas as análises numa visão única de prevenção, com recomendações prioritárias.
- **Duração estimada:** 2 semanas.
- **Entradas:** Todas as fases anteriores.
- **Entregáveis:**
  - Lib `afastamentos-prevention-priority.ts`.
  - Dashboard `/afastamentos/prevention-board` unificado com:
    - Score composto de risco (epidemiologia + ergonomia + psicossocial).
    - Rank de recomendações por ROI esperado.
    - Histórico de execução de ações preventivas.
  - Documentação de metodologia de priorização.
- **Critérios de saída:** Dashboard validado, recomendações iniciais geradas.
- **Dependências:** FASE 11 relatórios OK.

### 5.2 Dependências entre fases (DAG)

```
FASE 0 (Governança)
    ↓
FASE 1 (Requisitos técnicos)
    ↓
FASE 2 (Schema)
    ↓ ┌─────────────────┐
    └→ FASE 3 (ETL)   │
        ↓             │ (paralelas)
        FASE 4 (Validação de denominadores)
        ↓
        FASE 5-6 (Epidemiologia)
        ↓
        ├→ FASE 7-8 (Ergonomia) ┐
        ├→ FASE 9-10 (Psicossocial) ├→ FASE 11 (Relatórios e Priorização)
```

**Caminho crítico:** FASE 0 → 1 → 2 → 3 → 4 → 5-6 → 11 → 12.  
**Caminho paralelo acelerável:** 7-8 e 9-10 podem correr em paralelo com 5-6 se houver dados.  
**Crítico:** Dados e denominador vêm ANTES de tela. Nenhuma fase de tela começa without validação de FASE 4.

---

## 6. CRITÉRIOS DE ENTRADA E SAÍDA POR FASE

### 6.1 Critério de entrada universal

Toda fase deve ter:
1. Documento de governança da fase anterior aprovado.
2. Entregáveis da fase anterior assinados off.
3. Repositório em estado limpo (branch dedicado, sem pendências).
4. Testes de sanidade passando na fase anterior.

### 6.2 Critério de saída por categoria de fase

**Fases de governança (0, 1):**
- Documento aprovado, sem ambiguidades.
- Método documentado, novo agente consegue prosseguir sem dúvidas.

**Fases de infraestrutura (2, 3, 4):**
- Schema criado/alterado, migrations reversíveis.
- Dados carregados, integridade validada.
- Zero regressões em testes existentes.
- Auditoria realizada e documentada.

**Fases analíticas (5-12):**
- Feature funcional, integrada, testada.
- Documentação técnica embutida no código.
- Sem regressão em CID Analytics ou outras análises.
- Relatório de aceitação técnica assinado.

---

## 7. REGRAS METODOLÓGICAS OBRIGATÓRIAS

### 7.1 Dado e denominador SEMPRE vêm antes de tela

Nenhuma visualização pode ser construída sem que os dados estejam:
- Carregados no Supabase.
- Validados em integridade.
- Denominadores calibrados e auditados.

Se não há população ativa confiável, não pode haver TAD. Se não há inventário psicossocial, não pode haver associação com CID F.

### 7.2 CID F e CID M: Regra de Investigação Obrigatória

Toda concentração ≥20% em CID F ou CID M exige:
1. Relatório técnico de investigação com entrevistas estruturadas.
2. Análise de contexto ocupacional (PGR, AET se disponível).
3. Documento de "vínculo hipotético" (não fato) com documentação de evidência técnica.
4. Sempre comunicar como "sinal e hipótese", nunca como "causa".

### 7.3 LGPD: Proteção de Identidade e Sensibilidade

- Dados de saúde (CID, diagnóstico, avaliação psicossocial) são sensíveis e requerem cuidado máximo.
- Qualquer painel que exiba nomes de servidores exige role `admin` ou `nurse`.
- Relatórios executivos usam agregações, nunca nomes.
- CPF é mascarado em tabelas investigativas (implementado em CID Analytics, manter padrão).

### 7.4 Preservação e imutabilidade de CID Analytics

- CID Analytics (`/afastamentos/cid-analytics`) é **núcleo preservado** do programa.
- Nenhuma alteração de schema, pipeline ou lógica de CID Analytics em fases futuras sem aprovação documentada e reversibilidade garantida.
- Novas camadas (epidemiologia, psicossocial, etc) CONSOMEM dados de CID Analytics, não alteram.
- Qualquer bug fix em CID Analytics deve ser retroativo e testado em todas as novas rotas.

### 7.5 Auditoria obrigatória

Todas as métricas, especialmente indicadores formais (TAD, IFL, DML, IG), devem ser auditáveis:
- Usuário consegue reproduzir cálculo linha a linha navegando tela → função → SQL.
- Denominador é explícito (população ativa YYYY-MM-DD).
- Qualquer exclusão de dado (maternidade, legado) é documentada e versioning zero-residual.

### 7.6 Versionamento de indicadores

TAD, IFL, DML, IG precisam ser versionados por mudança de metodologia:
- `TAD_v1` (período, secretaria, categoria).
- `TAD_v2` (se em futuro houver mudança de forma de cálculo).
- Histórico conservado para rastreabilidade.

---

## 8. PRESERVAÇÃO EXPRESSA DO MÓDULO CID ANALYTICS

### 8.1 Declaração de imutabilidade

O módulo `/afastamentos/cid-analytics` (FASE 10) fica **congelado em funcionalidade** e é elevado a **alicerce do programa**.

**Seu papel:**
- Fornece análise clínica-ocupacional de CIDs com recorrência, impacto e contexto.
- Oferece investigação de episódios por servidor.
- Base para priorização gerencial inicial.

**Alterações PERMITIDAS:**
- Bug fixes que não alterem lógica.
- Otimizações de performance.
- Enriquecimento visual respeitando design system.
- Expansão de funcionalidades DENTRO do escopo analítico (ex: filtro adicional).

**Alterações PROIBIDAS:**
- Mudança no pipeline dual-layer sem doc formal.
- Alteração de regras de recorrência.
- Mudança de politicas de alocação de dias (shared-days).
- Qualquer refactor que afete reprodutibilidade de número.

### 8.2 Consumo de CID Analytics por próximas camadas

As próximas fases consomem CID Analytics assim:

- **FASE 5-6 (Epidemiologia):** Usar `fact_afastamento_evento` e `fact_afastamento_cid` de CID Analytics para calcular TAD/IFL/DML/IG. Não alterar origem.
  
- **FASE 7-8 (Ergonomia):** Usar rótulos CID M de CID Analytics como entry point para priorização ergonômica. Cruzar com AET. Não alterar CID Analytics.
  
- **FASE 9-10 (Psicossocial):** Usar rótulos CID F de CID Analytics como entry point para investigação. Cruzar com inventário psicossocial. Não alterar CID Analytics.

---

## 9. RISCOS DO PROGRAMA E CAUTELAS DE EXECUÇÃO

### 9.1 Risco 1: Interpretação de causalidade em CID F e CID M

**Risco:** Equipes concentram-se em contagem e perdem contexto técnico. Comunicam como "fato" que CID F é "culpa do ambiente".

**Mitigação:**
- Documentação obrigatória de investigação.
- Alertas automáticos em dashboard: "Este é um sinal, não uma causa identificada".
- Auditoria de linguagem em relatórios (proibido "número de casos de depressão causados").

### 9.2 Risco 2: Denominadores incorretos

**Risco:** População ativa não é atualizada. TAD é calculado com denominador errado. Indicadores perdem validade.

**Mitigação:**
- FASE 4 dedicada 100% à validação de denominador.
- Sync automático de população ativa com SIAPE ou equivalente.
- Auditoria mensal de discrepância.

### 9.3 Risco 3: Bloqueio por falta de dados de risco (psicossocial, ergonomia)

**Risco:** Fases 7-10 ficam presas porque SESMT não tem inventário psicossocial ou AET realizado.

**Mitigação:**
- FASE 0 já documenta pre-requisitos externos (dados necessários de SESMT/RH).
- Plano B: Começar com dados parciais, ir enriquecendo incrementalmente.
- Não bloquear FASE 12 se dados de risco faltarem; priorização começa só com epidemiologia.

### 9.4 Risco 4: Regressão em CID Analytics durante integração

**Risco:** Nova fase altera algo em CID Analytics sem saber. Números mudam.

**Mitigação:**
- CID Analytics é read-only para outras camadas.
- Testes de snapshot: estado de CID Analytics é congelado no início do programa, verificado no final.
- Alerta: qualquer mudança em CID Analytics requer re-assinação de FASE 0.

### 9.5 Risco 5: Complexidade crescente, falta de documentação

**Risco:** Programa cresce, documentação não acompanha. No final, ninguém sabe como funciona.

**Mitigação:**
- Documentação é entregável obrigatório de CADA fase.
- Templates padronizados (ver seção 10-11).
- Revisão de documentação a cada fase como parte de critério de saída.

---

## 10. PRÓXIMOS PASSOS OFICIAIS APÓS APROVAÇÃO DE FASE 0

1. **Aprovação formal de FASE 0** (11 de abril).
2. **Briefing sobre FASE 1-2** com SESMT/RH:
   - O que dados são precisos (servidor, vínculo, tempo de serviço, denográficos)?
   - Qual fonte oficial de população ativa (SIAPE, planilha externa)?
   - Qual cronograma tem de disponibilizar inventários (psicossocial, ergonômico)?
3. **Iniciar FASE 1** (12 de abril) — Detalhamento técnico.
4. **Recursos confirmados:** Quem vai executar FASE 2-4 (schema, ETL, validação)?
5. **Data objetivo de conclusão da trilha (FASE 12):** Estimativa: 4-5 meses com recursos dedicados.

---

## 11. AUTORIDADE E GOVERNANÇA DESTE DOCUMENTO

**Documento canônico:** `docs/ABSENTEISMO_INTELIGENTE_GOVERNANCA_E_PLANO_DIRETOR.md`

**Precedência:** Este documento é a fonte única de verdade para:
- Escopo do programa.
- Trilha de fases.
- Regras metodológicas.
- Regras de preservação de CID Analytics.
- Regras de investigação de CID F e CID M.

**Alterações:** Qualquer mudança a este documento requer documentação de decisão e re-aprovação.

**Vigência:** Ativo até conclusão de FASE 12 ou documentação de pivot formal.

---

## APÊNDICE A — REFERÊNCIAS METODOLÓGICAS

1. **Estudos de epidemiologia ocupacional:**
   - Estudo de Belém (referência de vigilância epidemiológica de agravos ocupacionais).
   - Protocolos OMS para TAD/IFL/DML/IG.

2. **Normativas:**
   - NR-1: Disposições Gerais e Gerenciamento de Riscos.
   - NR-5: Comissão Interna de Prevenção de Acidentes.
   - NR-7: Programa de Controle Médico de Saúde Ocupacional.
   - NR-17: Ergonomia.

3. **Instrumentos de avaliação:**
   - LIPT-69 (Likert para Investigação de Pressão no Trabalho).
   - AET (Análise Ergonômica do Trabalho).
   - PGR (Programa de Gerenciamento de Riscos).

4. **Legislação:**
   - Lei 13.709/2018 (LGPD).
   - Portarias Municipais de Saúde (se aplicável).

---

**Documento aprovado em:** 31 de março de 2026  
**Próxima revisão programada:** Após conclusão de FASE 1  
**Mantido por:** Programa de Inteligência em Absenteísmo Ocupacional do SESMT-SYSTEM

```
GOVERNANCA_FASE_0_CONSOLIDADA ✓
```
