# BACKLOG MACRO RASTREÁVEL — PROGRAMA UNIFICADO DE INTELIGÊNCIA EM ABSENTEÍSMO

**Versão:** 1.0.0  
**Status:** PLANEJADO  
**Data de criação:** 31 de março de 2026  
**Autoridade:** Governo de Programa  

---

## FORMATO E ESTRUTURA

Cada fase está documentada com:
- **Nome da fase**
- **Objetivo**
- **Duração estimada**
- **Entregáveis esperados** (artefatos, código, dados)
- **Testes/validações esperados**
- **Dependências** (bloqueadores)
- **Status atual**
- **Observações críticas**

---

## FASE 0 — GOVERNANÇA E PLANO DIRETOR

| Campo | Conteúdo |
|-------|----------|
| **Status Atual** | EM EXECUÇÃO |
| **% Completo** | 60% (doc canônico criado, backlog em progresso) |
| **Data Estimada de Conclusão** | 31 de março de 2026 |
| **Responsável** | Agente de Governança + Especialista SESMT |

### Objetivo
Congelar escopo oficial, formalizar trilha de fases, padronizar método de execução com agente.

### Entregáveis Esperados
- [ ] `docs/ABSENTEISMO_INTELIGENTE_GOVERNANCA_E_PLANO_DIRETOR.md` ✓ (criado)
- [ ] `docs/ABSENTEISMO_INTELIGENTE_BACKLOG_MACRO.md` (este arquivo, em progresso)
- [ ] `docs/ABSENTEISMO_INTELIGENTE_TEMPLATE_EXECUCAO_DE_FASE.md`
- [ ] `docs/ABSENTEISMO_INTELIGENTE_TEMPLATE_RETORNO_AGENTE.md`
- [ ] Atualização de `SESMT_SYSTEM_DOCUMENTATION.md` para referenciar novo programa
- [ ] Atualização de `ARCHITECTURE.md` para referenciar novo programa

### Artefatos Esperados
- Documentação de governança (4 arquivos, todos .md)
- Nenhuma migração, schema, ETL ou tela nesta fase

### Testes/Validações Esperados
- [ ] Documento canônico lido por 2+ técnicos independentes (sem dúvidas)
- [ ] Trilha de fases validada (sem gargalos óbvios)
- [ ] Método de trabalho com agente documentado e testável
- [ ] Nenhuma regressão em código existente

### Dependências
- Nenhuma bloqueadora (FASE 0 é fundação)

### Observações Críticas
- **CRIAÇÃO DE DOCS:** Já iniciado com sucesso
- **PRÓXIMO:** Templates de operação de fase
- **RISCO:** Se documentação não for clara, próximas fases terão ambiguidade
- **MITIGAÇÃO:** Levar documentação a código, usar exemplos concretos

---

## FASE 1 — DEFINIÇÃO TÉCNICA DE REQUISITOS

| Campo | Conteúdo |
|-------|----------|
| **Status Atual** | NÃO INICIADA |
| **% Completo** | 0% |
| **Data Estimada** | 12-18 de abril de 2026 |
| **Responsável** | Especialista de Dados + DBA |

### Objetivo
Detalhar schema, campos, normalização, integridade referencial, políticas de RLS, garantias de qualidade.

### Entregáveis Esperados
- [ ] Especificação detalhada de `dim_servidor` enriquecida (sexo, idade, tempo_servico, categoria)
- [ ] Especificação detalhada de `dim_tempo` com calendário, dias úteis
- [ ] Especificação de relacionamentos (FK, constraints, índices)
- [ ] Plano de enriquecimento (tabelas novas vs alteração de existentes)
- [ ] Políticas de RLS para tabelas sensíveis
- [ ] Estratégia de validação de dados de entrada

### Artefatos Esperados
- Documento `.md` com todas as especificações acima
- Diagramas ER (se aplicável)
- Scripts de validação (pseudo-código)

### Testes/Validações Esperados
- [ ] Spec revisada por 2+ DBA
- [ ] Zero ambiguidades em tipos de dado, ranges, regras
- [ ] Validação de compatibilidade com Supabase PostgreSQL
- [ ] Arquivo de rejeição de dados (exemplos do que NÃO é incluído)

### Dependências
- FASE 0 governança ✓

### Observações Críticas
- **CRÍTICO:** Sexo e identidade de gênero: consultar LGPD. Se usar, certificar que com opt-in informado.
- **CRÍTICO:** Tempo de serviço precisa de data de admissão clara no schema
- **OPT-IN:** Categoria funcional pode não estar no SIAPE; confirmar fonte com RH

---

## FASE 2 — SCHEMA E MIGRATIONS

| Campo | Conteúdo |
|-------|----------|
| **Status Atual** | NÃO INICIADA |
| **% Completo** | 0% |
| **Data Estimada** | 19-26 de abril de 2026 |
| **Responsável** | DBA + DevOps |

### Objetivo
Criar ou alterar tabelas no Supabase respeitando especificação de FASE 1.

### Entregáveis Esperados
- [ ] `database/migrations/YYYYMM_alter_servidores_enrich.sql` (adicionar sexo, idade, tempo_servico, categoria)
- [ ] `database/migrations/YYYYMM_create_dim_tempo.sql`
- [ ] `database/migrations/YYYYMM_create_dim_risco_psicossocial_stub.sql` (placeholder para FASE 9)
- [ ] `database/migrations/YYYYMM_create_dim_risco_ergonomico_stub.sql` (placeholder para FASE 8)
- [ ] `database/migrations/YYYYMM_create_fact_population_snapshot.sql`
- [ ] `database/migrations/YYYYMM_rls_policies.sql`
- [ ] `database/migrations/README_migrations.md` (instruções de aplicação e rollback)

### Artefatos Esperados
- 7 arquivos SQL de migração
- Scripts de rollback (inclusos nos migrations)
- Índices para performance (FK, busca, ordenação)

### Testes/Validações Esperados
- [ ] Todas as migrations executám sem erro
- [ ] Rollback reversa schema ao estado anterior
- [ ] Zero regressões em dados existentes (afastamentos, CID analytics)
- [ ] RLS políticas bloqueiam acesso não autorizado
- [ ] Índices são criados corretamente

### Dependências
- FASE 1 especificação ✓

### Observações Críticas
- **REVERSIBILIDADE:** Toda migration tem rollback testado
- **BACKUP:** Snapshot do banco ANTES de qualquer migration
- **COMUNICAÇÃO:** Avisar stakeholders de downtime se necessário (tipicamente 0, mas validar)
- **PERFORMANCE:** Índices em FK críticas para não travarem CID Analytics

---

## FASE 3 — ETL E MASTERDATA

| Campo | Conteúdo |
|-------|----------|
| **Status Atual** | NÃO INICIADA |
| **% Completo** | 0% |
| **Data Estimada** | 27 de abril - 10 de maio de 2026 |
| **Responsável** | Engenheiro de Dados + Especialista SESMT |

### Objetivo
Popular dimensões com dados reais, criar pipelines de sincronização, validar integridade.

### Entregáveis Esperados
- [ ] Script de bulk load de `dim_servidor` (enriquecida com sexo, idade, tempo_servico, categoria)
- [ ] Script de snapshot mensal de `fact_population_snapshot`
- [ ] Lib `src/lib/afastamentos-masterdata.ts` com funções de sincronização
- [ ] Documento de log de qualidade (linhas rejeitadas, motivos, evidência)
- [ ] Plan de sincronização periódica (agendado, como?)

### Artefatos Esperados
- 1 arquivo TS (lib)
- 2-3 scripts SQL (load, snapshot, validação)
- 1 documento de log de carga
- Configuração de agendador (Supabase Functions, cron, etc)

### Testes/Validações Esperados
- [ ] 100% da base de servidores carregada sem erro
- [ ] Validação de integridade referencial (nenhum FK órfão)
- [ ] Teste de snapshot: população ativa bate com SIAPE ±2%
- [ ] Teste de idempotência: rodar load 2x não cria duplicatas
- [ ] Performance: load completo em <5 min

### Dependências
- FASE 2 schema ✓
- Dados de servidor disponíveis em SIAPE ou equivalente

### Observações Críticas
- **FONTE DE DADOS:** Confirmar com RH qual é a source of truth para servidor (SIAPE? Planilha?)
- **FREQUÊNCIA:** Snapshot de pop. ativa: diária? Semanal? Mensal? Documentar
- **QUALIDADE:** Linhas rejeitadas por motivos (CPF invalid, data incoerente, etc): todas documentadas

---

## FASE 4 — VERIFICAÇÃO DE DENOMINADORES

| Campo | Conteúdo |
|-------|----------|
| **Status Atual** | NÃO INICIADA |
| **% Completo** | 0% |
| **Data Estimada** | 11-17 de maio de 2026 |
| **Responsável** | Epidemiologista + Analista de Qualidade |

### Objetivo
Validar que denominadores (população ativa, dias úteis) estão corretos e auditáveis.

### Entregáveis Esperados
- [ ] Relatório de população ativa por: período (YYYY-MM), secretaria, categoria, sexo
- [ ] Relatório de benchmarking contra SIAPE (discrepâncias <2%)
- [ ] Calendário de dias úteis validado (feriados nacionais + municipais inclusos)
- [ ] Documento de validação de qualidade assinado por epidemiologista
- [ ] Plan de sincronização contínua de denominador (alertas se discrepância >5%)

### Artefatos Esperados
- 3-4 relatórios (análise)
- 1 documento de validação
- Query SQL para computar denominador (idempotente)

### Testes/Validações Esperados
- [ ] População ativa em FASE 3 ≈ população SIAPE (diff <2%, documentado motivo se >2%)
- [ ] Dias úteis por mês calculados corretamente (feriados inclusos)
- [ ] Teste: TAD calculado com denominador é razoável (nem 0%, nem 500%)
- [ ] Auditoria: usuário consegue reproduzir denominador via SQL direto

### Dependências
- FASE 3 ETL ✓
- Acesso a dados de população ativa (SIAPE ou fonte oficial)

### Observações Críticas
- **CRÍTICO:** Denominador errado = indicadores inválidos. Não avançar sem validação 100% clara
- **FERIADOS:** Calendário de feriados municipais deve ser mantido (muda anualmente)
- **ALERTAS:** Sistema deve avisar se pop. ativa cai/sobe > threshold (sinal de problema nos dados)

---

## FASE 5-6 — MOTOR EPIDEMIOLÓGICO

| Campo | Conteúdo |
|-------|----------|
| **Status Atual** | NÃO INICIADA |
| **% Completo** | 0% |
| **Data Estimada** | 18 de maio - 7 de junho de 2026 |
| **Responsável** | Epidemiologista + Engenheiro de Dados |

### Objetivo
Implementar cálculo formal de TAD, IFL, DML, IG com validação contra protocolo de Belém.

### Entregáveis Esperados
- [ ] Lib `src/lib/afastamentos-epidemiologia.ts` com:
  - `computeTAD(periodo, secretaria, categoria)` → numero %
  - `computeIFL(periodo, secretaria, categoria)` → numero %
  - `computeDML(periodo, secretaria, categoria)` → numero dias
  - `computeIG(periodo, secretaria, categoria)` → numero dias
  - `groupByDemographic(grupo: 'sexo' | 'idade' | 'tempo_servico')` → distribuição
  - `validateDenominators()` → booleano + log de alertas
- [ ] Página `/afastamentos/epidemiologia` com:
  - Tabela de indicadores TAD/IFL/DML/IG por secretaria, categoria
  - Gráficos de distribuição demográfica (sexo, idade, tempo de serviço)
  - Comparativo período a período (tendência)
- [ ] Integração read-only com dados de CID Analytics (sem alteração)
- [ ] Documentação de fórmulas (como cada indicador é calculado)

### Artefatos Esperados
- 1 lib TS (epidemiologia)
- 1 página Next.js (`/afastamentos/epidemiologia`)
- Componentes de visualização (tabelas, gráficos)
- Documento de validação de fórmulas contra protocolo Belém

### Testes/Validações Esperados
- [ ] TAD/IFL/DML/IG calculados corretamente (validação manual em 3+ casos)
- [ ] Distribuição demográfica valida (soma = 100%, sem valores negativos)
- [ ] Integração com CID Analytics: CID Analytics funciona normalmente, zero regressão
- [ ] Performance: página carrega em <3s mesmo com 5 anos de dados
- [ ] Teste de snapshot: indicadores congelados de período conhecido batem com cálculo

### Dependências
- FASE 4 denominadores ✓
- CID Analytics funcional (preservado)

### Observações Críticas
- **VALIDAÇÃO:** Protocolo de Belém deve estar documentado nas fórmulas
- **DENOMINADOR:** TAD usa denominador de FASE 4, não recalcula
- **CID ANALYTICS:** Este é read-only, consume fact_afastamento_evento e fact_afastamento_cid de lá
- **PERFORMANCE:** Não duplicar dados; usar view/computed fields se possível

---

## FASE 7-8 — INTEGRAÇÃO ERGONÔMICA

| Campo | Conteúdo |
|-------|----------|
| **Status Atual** | NÃO INICIADA |
| **% Completo** | 0% |
| **Data Estimada** | 8 de junho - 29 de junho de 2026 |
| **Responsável** | Engenheiro de Segurança + Ergonomista SESMT |

### Objetivo
Incorporar avaliação ergonômica (AET/NR-17), priorizar CID M, vincular com contexto de trabalho.

### Entregáveis Esperados
- [ ] Schema para `fact_avaliacao_ergonomica` (cargos avaliados, achados, recomendações, data AET)
- [ ] Lib `src/lib/afastamentos-ergonomia.ts` com:
  - `integrateAETFindings()` — vincula cargo/local de trabalho com achados ergonômicos
  - `labelZoneCID_M()` — classifica CID M por zona de risco (postura, repetitividade, biomecânica)
  - `prioritizeErgonomicIntervention()` — ordena por ROI esperado de intervenção
  - `reportMSEMusculoRisks()` — relatório de risco musculoesquelético por local
- [ ] Página `/afastamentos/ergonomia-analytics` com:
  - Ranking de cargos/locais por concentração de CID M
  - Achados de AET associados
  - Recomendações de intervenção
  - Acompanhamento de melhorias
- [ ] Documentação de vínculo ocupacional para CID M (como foi validado)

### Artefatos Esperados
- 1 tabela SQL (fact_avaliacao_ergonomica)
- 1 lib TS (ergonomia)
- 1 página Next.js (`/afastamentos/ergonomia-analytics`)
- Componentes de visualização

### Testes/Validações Esperados
- [ ] Cargos com AET realizada aparecem na página
- [ ] CID M distribuído por zona de risco sem erro
- [ ] Priorização ergonômica: cargo com 50% CID M + achado NR-17 crítico aparece no topo
- [ ] Recomendações de intervenção são acionáveis (ex: "Adequar altura de mesa em Secretaria X")
- [ ] Acompanhamento de execução de melhorias funciona (booleano "implementado"?)

### Dependências
- FASE 5-6 epidemiologia OK
- Dados de AET disponíveis (realizada em quais cargos?)

### Observações Críticas
- **PRÉ-REQUISITO:** SESMT deve ter realizado ou planejado AET em cargos críticos
- **CAUTELA:** CID M não é sinonimo de problema ergonômico; investigação técnica obrigatória
- **LGPD:** Proteger informação de que "Servidor X em cargo Y com CID M"; agregar sempre

---

## FASE 9-10 — INTEGRAÇÃO PSICOSSOCIAL

| Campo | Conteúdo |
|-------|----------|
| **Status Atual** | NÃO INICIADA |
| **% Completo** | 0% |
| **Data Estimada** | 30 de junho - 21 de julho de 2026 |
| **Responsável** | Psicólogo do Trabalho + Especialista SESMT |

### Objetivo
Incorporar avaliação psicossocial (LIPT-69, NR-1, PGR), priorizar CID F, vincular com contexto de risco psicossocial.

### Entregáveis Esperados
- [ ] Schema para `fact_avaliacao_psicossocial` (secretaria/cargo, LIPT-69 score, fatores identificados, data, interventor)
- [ ] Lib `src/lib/afastamentos-psychosocial.ts` com:
  - `integrateRiskProfile()` — vincula CID F com fatores psicossociais de risco (LIPT-69)
  - `labelZoneCID_F()` — classifica CID F por múltiplas hipóteses (trabalho, extra-ocupacional, ambíguo)
  - `investigateOccupationalVicinage()` — busca evidência técnica de vínculo ocupacional
  - `reportPsychoRiskSignals()` — relatório de sinais de risco psicossocial por secretaria/cargo
- [ ] Página `/afastamentos/psychosocial-analytics` com:
  - Ranking de secretarias/cargos por concentração de CID F
  - Fatores psicossociais de risco identificados (LIPT-69)
  - Matriz de cruzamento CID F × fator de risco
  - Documentação de investigação técnica (não conclusão automática)
  - Plano de ação recomendado (melhorias de organização do trabalho, etc)
- [ ] Documentação de regra de investigação técnica obrigatória para CID F

### Artefatos Esperados
- 1 tabela SQL (fact_avaliacao_psicossocial)
- 1 lib TS (psychosocial)
- 1 página Next.js (`/afastamentos/psychosocial-analytics`)
- Componentes de visualização
- Documento de protocolo de investigação de CID F

### Testes/Validações Esperados
- [ ] Secretarias com LIPT-69 realizada aparecem na página
- [ ] CID F distribuído por hipótese de vínculo (trabalho, extra-ocupacional, ambíguo)
- [ ] Priorização psicossocial: secretaria com 40% CID F + LIPT-69 score elevado aparece no topo
- [ ] Recomendações de ação são documentadas (não é "culpa do trabalho", mas "fatores de risco identificados")
- [ ] Zero linguagem de causalidade automática (proibido "casos de depressão causados"; permitido "sinais de risco psicossocial elevado")

### Dependências
- FASE 5-6 epidemiologia OK
- Dados de avaliação psicossocial (LIPT-69 ou equivalente) disponíveis

### Observações Críticas
- **PRÉ-REQUISITO:** SESMT deve ter realizado ou planejado avaliação psicossocial
- **CAUTELA CRÍTICA:** CID F é multifatorial. Proposta de vínculo ocupacional exige investigação técnica rigorosa.
- **LINGUAGEM:** Documentação deve usar "sinais de risco psicossocial" e "hipótese de vínculo ocupacional", nunca "casos causados pelo trabalho"
- **LGPD:** Zero exposição de nomes em dados de saúde mental

---

## FASE 11 — RELATÓRIOS FORMAIS

| Campo | Conteúdo |
|-------|----------|
| **Status Atual** | EM EXECUÇÃO |
| **% Completo** | 10% |
| **Data Estimada** | 6 de abril de 2026 |
| **Responsável** | Especialista em Relatórios + Comunicação SESMT |

### Objetivo
Gerar relatórios estruturados (executivo, técnico, médico) com linguagem apropriada para cada público.

### Entregáveis Esperados
- [ ] Lib `src/lib/afastamentos-reporting.ts` com:
  - `reportExecutive(periodo, secretaria?)` → PDF/HTML com resumo, indicadores-chave, recomendações prioritárias
  - `reportTechnical(periodo, secretaria?)` → PDF/HTML com detalhamento de métodos, análises cruzadas, evidências
  - `reportMedical(periodo, secretaria?)` → PDF/HTML voltado a discussão clínica (CID, recorrência, investigação)
  - `reportPopulationSnapshot(periodo?)` → PDF/HTML de denominador e população estudada
- [ ] Página `/afastamentos/reports` com interface para gerar relatórios
- [ ] Templates LaTeX/HTML de formato (cabeçalho institucional, rodapé, assinaturas)
- [ ] Documentação de público-alvo e linguagem apropriada para cada relatório

### Artefatos Esperados
- 1 lib TS (reporting)
- 1 página Next.js (`/afastamentos/reports`)
- Templates de design (HTML/CSS ou LaTeX)
- Documento de style guide por tipo de relatório

### Testes/Validações Esperados
- [ ] Relatório executivo gerado em <5s, sem erro
- [ ] Linguagem apropriada para cada público (jargão técnico no técnico, síntese no executivo)
- [ ] Zero exposição sensível (LGPD) em nenhum relatório (sem nomes de servidores)
- [ ] Gráficos e tabelas legíveis em PDF
- [ ] Assinatura digital ou campo para assinatura manual

### Dependências
- FASE 7-10 análises todas OK

### Observações Críticas
- **PUBLICO:** Diferentes públicos entendem diferente. Testar compreensão com 2+ pessoas por público
- **RESPONSABILIDADE:** Relatório com recomendações vai ser usado. Validar que recomendações são acionáveis
- **ASSINATURA:** Determinar se precisa de assinatura digital (Supabase Auth?) ou campo para assinatura

---

## FASE 12 — [DESCONTINUADA COMO TELA / INTEGRADA À FASE 11]

| Campo | Conteúdo |
|-------|----------|
| **Status Atual** | DESCONTINUADA |
| **Decisão** | Produto/Arquitetura: Redundância com telas analíticas. |
| **Observação** | O valor de integração de score SPI foi absorvido pela Central de Relatórios (FASE 11). |

---

---

## FASE 12 — [FUSIONADA COM FASE 11]

| Campo | Conteúdo |
|-------|----------|
| **Status Atual** | DESCONTINUADA |
| **Ponto de Integração** | A lógica de ROI de Prevenção e Score SPI foi integrada à Central de Relatórios (FASE 11). |

---

---

## RESUMO DE ENTREGAS POR FASE

| Fase | Docs | Libs | Páginas | TablesSQL | Status |
|------|------|------|---------|-----------|--------|
| 0 | 4 | — | — | — | CONCLUÍDA |
| 1 | 1 | — | — | — | CONCLUÍDA |
| 2 | — | — | — | 7 | CONCLUÍDA |
| 3 | — | 1 | — | — | CONCLUÍDA |
| 4 | 1 | — | — | — | CONCLUÍDA |
| 5-6 | 1 | 1 | 1 | — | CONCLUÍDA |
| 7-8 | 1 | 1 | 1 | 1 | PARCIAL (Epi OK) |
| 9-10 | 1 | 1 | 1 | 1 | PARCIAL (Psy OK) |
| 11 | — | 1 | 1 | — | EM EXECUÇÃO |
| 12 | 1 | 1 | 1 | 1 | DESCONTINUADA |

---

## DEPENDÊNCIAS CRÍTICAS E CAMINHO CRÍTICO

```
[FASE 0] ✓
    ↓
[FASE 1-2] Requisitos + Schema (PARALELOS)
    ↓
[FASE 3-4] ETL + Validação Denominador (SEQUENCIAL)
    ↓
[FASE 5-6] Motor Epidemiológico
    ↓
├→ [FASE 7-8] Ergonomia (PARALELO com 9-10) ─┐
└→ [FASE 9-10] Psicossocial (PARALELO com 7-8)─┤
                                                ↓
                                            [FASE 11] Relatórios
                                                ↓
                                            [FASE 12] Prevention Board
```

**Caminho crítico:** 0 → 1 → 2 → 3 → 4 → 5-6 → 11 → 12 (≈5 meses com dedicação integral)  
**Paralelos aceleradores:** 1-2, 7-8 com 9-10

---

## PRÓXIMAS AÇÕES ANTES DE FASE 1

1. [ ] Aprovação formal de todos os documentos de FASE 0
2. [ ] Briefing com SESMT: "Quais dados temos hoje? Qual a fonte de verdade?"
3. [ ] Briefing com RH: "Quando pode disponibilizar dados de servidores enriquecidos?"
4. [ ] Levantamento: Qual é o status atual de AET? LIPT-69? Quando estarão disponíveis?
5. [ ] Confirmação de recursos: Quem faz FASE 1-2? DBA? Engenheiro?
6. [ ] Agendamento: Data de início oficial de FASE 1

---

**Documento consolidado em:** 31 de março de 2026  
**Mantido por:** Programa de Inteligência em Absenteísmo Ocupacional
