# ABSENTEISMO_INTELIGENTE — FASE 3X
## Validação Final da Carga no Domínio Isolado

**Data de execução:** 02 de Abril de 2026  
**Projeto:** SESMT-System  
**Ref Supabase:** `wybzkkejyraadabznjqg` | Região: sa-east-1 | PostgreSQL 17 | Status: ACTIVE_HEALTHY  
**Branch Git:** `feat/unified-absenteeism-intelligence-program`  
**Schema validado:** `abs_intel` (isolado)  
**Schema legado:** `public` (somente leitura, não alterado)

---

## A. Objetivo da Microfase

Executar exclusivamente a validação final da carga realizada no FASE 3W no schema `abs_intel`, confirmando:

- **Qualidade estrutural** — integridade referencial de todas as tabelas populadas
- **Cobertura** — contagem e consistência entre staging, dimensões e fatos
- **Consistência lógica** — deduplicação, pesos CID, dias alocados, faixas derivadas
- **Resíduos silenciosos** — qualquer anomalia não capturada na FASE 3W
- **Não interferência** — legado `public` inalterado, sem new FKs cruzadas, sem impacto em frontend

Sem alterações de dados, sem novas migrations, sem acesso a frontend ou FASE 4.

---

## B. Escopo Validado

Tabelas inspecionadas no schema `abs_intel`:

| Tabela | Tipo |
|---|---|
| `abs_dim_servidor` | Dimensão — servidores |
| `abs_dim_vinculo_servidor` | Dimensão — vínculos operacionais |
| `abs_dim_tempo` | Dimensão — calendário |
| `abs_fact_afastamento_evento` | Fato — evento de afastamento |
| `abs_fact_afastamento_cid` | Fato — CID por evento |
| `abs_fact_population_snapshot` | Fato — snapshot populacional dimensional |
| `stg_abs_evento` | Staging — eventos carregados |
| `stg_abs_evento_cid` | Staging — CIDs do staging |

Tabelas de origem inspecionadas (somente leitura):

- `public.servidores` — fonte de servidores e vínculos
- `public.afastamentos` — fonte de eventos de afastamento
- `public.afastamento_cids` — fonte de CIDs por afastamento

---

## C. Métricas de Cobertura

### C.1 — Contagem final por tabela

| Tabela | Registros |
|---|---|
| `abs_intel.abs_dim_servidor` | **5.037** |
| `abs_intel.abs_dim_vinculo_servidor` | **5.443** |
| `abs_intel.abs_dim_tempo` | **366** |
| `abs_intel.abs_fact_afastamento_evento` | **257** |
| `abs_intel.abs_fact_afastamento_cid` | **378** |
| `abs_intel.abs_fact_population_snapshot` | **9.386** |
| `abs_intel.stg_abs_evento` | **257** |
| `abs_intel.stg_abs_evento_cid` | **0** (esperado — CIDs intermediários sem staging dedicado) |

### C.2 — Unicidade e coerência de chaves

| Indicador | Valor | Status |
|---|---|---|
| Servidores únicos (`servidor_id`) | 5.037 | ✅ sem duplicatas |
| Servidores com ao menos um vínculo | 5.037 | ✅ 100% com vínculo |
| Servidores com ao menos um evento | 211 | ✅ esperado (4,19% da base) |
| Hashes únicos de evento (`source_event_hash`) | 257 | ✅ = total de eventos (sem duplicatas) |
| Total de eventos | 257 | ✅ |
| Staging eventos processados (`status='PROCESSED'`) | 257 | ✅ 100% processados |
| Competências únicas em `abs_dim_tempo` | 13 | ✅ |
| Competências únicas em `abs_fact_population_snapshot` | 13 | ✅ consistente |
| Range temporal (`abs_dim_tempo`) | 2025-09-26 a 2026-09-26 | ✅ |

### C.3 — Métricas derivadas do ETL (já reportadas na FASE 3W e confirmadas)

| Indicador | Valor |
|---|---|
| Eventos brutos na fonte | 258 |
| Eventos deduplicados | 257 |
| Hash collapses (duplicatas eliminadas) | 1 |
| Eventos multi-CID | 77 |
| CIDs máximos por evento | 8 |
| CIDs mínimos por evento | 1 |
| População total acumulada (snapshots) | 70.759 |
| Total de dias de afastamento | 23.929 |
| Média de dias por afastamento | 93,11 |

---

## D. Métricas de Consistência

### D.1 — Integridade referencial

| Verificação | Resultado | Status |
|---|---|---|
| Eventos sem `source_event_hash` | 0 | ✅ |
| Eventos com `vinculo_id` NULL sem flag pendente | 0 | ✅ |
| Eventos `pendente_resolucao_vinculo = true` | 0 | ✅ |
| Eventos com `vinculo_id` apontando para vínculo inexistente | 0 | ✅ |
| Eventos com `servidor_id` apontando para servidor inexistente | 0 | ✅ |
| CIDs sem evento pai | 0 | ✅ |
| CIDs com `cid_codigo` vazio ou nulo | 0 | ✅ |
| Snapshots com `tempo_id` sem correspondente em `abs_dim_tempo` | 0 | ✅ |
| Vínculos com `servidor_id` sem correspondente em `abs_dim_servidor` | 0 | ✅ |
| FKs cruzadas `abs_intel ↔ public` | 0 | ✅ isolamento total |

### D.2 — Consistência matemática dos CIDs

| Verificação | Resultado | Status |
|---|---|---|
| Eventos com `dias_afastado` ≤ 0 ou nulo | 0 | ✅ |
| Inconsistências entre `dias_afastado` e soma de `allocated_days` (tolerância 0,01) | 0 | ✅ |
| Inconsistências entre soma de `occurrence_weight` e 1,0 (tolerância 0,001) | 0 | ✅ |
| Eventos sem nenhum CID associado | 0 | ✅ |
| Data de início nula | 0 | ✅ |
| Data de fim anterior à data de início | 0 | ✅ |

### D.3 — Consistência temporal e de dimensão de tempo

| Verificação | Resultado | Status |
|---|---|---|
| Registros de `abs_dim_tempo` com campos nulos (dia_semana, semestre, trimestre, competencia_yyyymm) | 0 | ✅ |
| Coerência entre competências em `abs_dim_tempo` e `abs_fact_population_snapshot` | 13 = 13 | ✅ |
| Snapshots com `qtd_populacao_ativa` negativa ou nula | 0 | ✅ |
| Snapshots com `tempo_id` nulo | 0 | ✅ |

### D.4 — CIDs com formato não-padrão

46 registros em `abs_fact_afastamento_cid` não correspondem ao padrão `^[A-Z][0-9]`:

| Código | Ocorrências | Classificação |
|---|---|---|
| `LICENAMATERNIDADE` | 37 | Sentinela funcional (licença maternidade sem CID clínico) |
| `CID_NAO_INFORMADO` | 8 | Sentinela de dado ausente na fonte |
| `S.82` | 1 | Variante tipográfica de `S82` (fratura de perna) |

**Avaliação:** Todos os 46 são casos conhecidos e esperados. O código `S.82` é uma anomalia tipográfica de origem na fonte (`public.afastamento_cids`), herdada no ETL sem transformação — não é erro estrutural do domínio `abs_intel`.

---

## E. Resíduos e Pendências

### E.1 — Resíduo identificado: faixas demográficas 100% NAO_INFORMADO

**Tabelas afetadas:**
- `abs_fact_population_snapshot.faixa_etaria` — 9.386/9.386 = 100% `NAO_INFORMADO`
- `abs_fact_population_snapshot.faixa_tempo_servico` — 9.386/9.386 = 100% `NAO_INFORMADO`
- `abs_dim_servidor.data_nascimento` — 5.037/5.037 = 100% NULL
- `abs_dim_vinculo_servidor.data_admissao` — 5.443/5.443 = 100% NULL

**Causa raiz identificada:**

Os campos `nascimento` e `admissao` em `public.servidores` estão armazenados como **strings numéricas de serial Excel** (ex.: `"31196"`, `"44627"`).

O ETL em `database/etl/001_abs_intel_controlled_etl.sql` trata apenas dois formatos:
1. ISO: `YYYY-MM-DD`
2. Brasileiro: `DD/MM/YYYY`

Nenhum dos dois padrões corresponde ao formato encontrado na fonte. A cláusula `ELSE NULL` do CASE foi sempre ativada, zerando todos os valores de data.

**Exemplo de conversão correta (não aplicada nesta fase):**
```sql
WHEN COALESCE(s.nascimento, '') ~ '^\d{4,5}$'
  THEN (DATE '1899-12-30' + s.nascimento::integer * INTERVAL '1 day')::date
```

**Impacto efetivo:**
- A estrutura de dados está íntegra — todas as FKs, hashes e contagens são consistentes
- A derivação das faixas demográficas (etária e tempo de serviço) está degradada
- As análises epidemiológicas de eventos (CID, dias, tipo de licença) **não são afetadas**
- O impacto é restrito a análises demográficas estratificadas por faixa etária ou tempo de serviço

**Classificação do resíduo:** Resíduo de mapeamento de formato de data — não bloqueia estrutura, não corrompe fatos, requer correção antes de análises demográficas.

### E.2 — Outros resíduos

| Resíduo | Status |
|---|---|
| Eventos sem dimensão de servidor | 0 — nenhum |
| Vínculos sem dimensão de servidor | 0 — nenhum |
| Eventos com vínculo pendente | 0 — nenhum |
| Snapshots com referência temporal inválida | 0 — nenhum |
| Staging com eventos não processados | 0 — nenhum |
| `stg_abs_evento_cid` populado (não esperado) | 0 — tabela vazia, comportamento esperado |

---

## F. Evidências de Não Interferência

### F.1 — Baseline do schema público inalterado

| Métrica | Baseline 3V | Atual (3X) | Status |
|---|---|---|---|
| `public` — tabelas (`BASE TABLE`) | 21 | 21 | ✅ inalterado |
| `public` — triggers | 2 | 2 | ✅ inalterado |

### F.2 — Schema abs_intel inalterado desde FASE 3V

| Métrica | FASE 3V | FASE 3X | Status |
|---|---|---|---|
| Tabelas em `abs_intel` | 15 | 15 | ✅ |
| Índices em `abs_intel` | 57 | 57 | ✅ |
| Constraints em `abs_intel` (information_schema) | 144 | 144 (CHECK 101 + FK 23 + PK 15 + UNIQUE 5) | ✅ |
| Triggers em `abs_intel` | 15 | 15 | ✅ |
| Routines em `abs_intel` | 1 | 1 | ✅ |

### F.3 — Isolamento de schema confirmado

- **FKs cruzadas `abs_intel → public`:** 0 — nenhuma referência do novo domínio ao legado
- **FKs cruzadas `public → abs_intel`:** 0 — o legado não depende do novo domínio
- **Nenhuma view, trigger ou função** do schema `public` foi criada ou alterada

### F.4 — Não interferência no frontend e contratos de API

- Zero arquivos `.ts`/`.tsx` do frontend contêm referências a `abs_intel` (verificado na FASE 3W e confirmado sem alterações nesta fase)
- Nenhum contrato de API, tipo ou rota do Next.js foi modificado
- O módulo `/afastamentos/cid-analytics` permanece intocado
- Sem alterações em `auth`, `shared` ou qualquer módulo de frontend

---

## G. Distribuição Analítica (Contexto para FASE 4)

### G.1 — Top 10 CIDs por ocorrência

| CID | Ocorrências | Categoria |
|---|---|---|
| `LICENAMATERNIDADE` | 37 | Sentinela — licença maternidade |
| `F41.1` | 17 | CID F — Transtorno de ansiedade generalizada |
| `F32.2` | 15 | CID F — Episódio depressivo grave |
| `F41.2` | 11 | CID F — Transtorno misto ansiedade/depressão |
| `F32.1` | 11 | CID F — Episódio depressivo moderado |
| `Z54.0` | 9 | CID Z — Convalescença pós-cirurgia |
| `F33.2` | 8 | CID F — Depressão recorrente grave |
| `CID_NAO_INFORMADO` | 8 | Sentinela — dado ausente |
| `F41.0` | 6 | CID F — Transtorno de pânico |
| `F43.1` | 6 | CID F — Estresse pós-traumático |

**Observação:** Concentração de CID F (transtornos mentais e comportamentais) predominante nos dados, validando a relevância epidemiológica do domínio para análises de saúde mental ocupacional na FASE 4.

---

## H. Conclusão da Validação

### H.1 — Síntese executiva

A carga realizada na FASE 3W foi confirmada estruturalmente íntegra e funcionalmente consistente. Todos os testes de integridade referencial, deduplicação, consistência matemática CID/pesos e não interferência no legado foram aprovados com índice de conformidade **100%** nos indicadores estruturais críticos.

O único resíduo relevante identificado é o **mapeamento incompleto de datas de nascimento e admissão** (formato serial Excel não tratado no ETL), o que impacta exclusivamente a derivação das faixas demográficas (`faixa_etaria`, `faixa_tempo_servico`), sem comprometer os fatos epidemiológicos centrais (eventos, CIDs, dias alocados, pesos).

### H.2 — Quadro-resumo da validação

| Dimensão | Resultado |
|---|---|
| Cobertura (contagens e unicidade) | ✅ Íntegra |
| Integridade referencial (FKs, orphans) | ✅ Zero resíduos |
| Consistência matemática CIDs | ✅ Zero inconsistências |
| Consistência temporal | ✅ Zero anomalias |
| Faixas demográficas derivadas | ⚠️ 100% NAO_INFORMADO (serial Excel não tratado) |
| Staging | ✅ 100% processado |
| Não interferência no legado | ✅ Confirmada |
| Isolamento de schema | ✅ Zero FKs cruzadas |
| Frontend / contratos de API | ✅ Nenhum impacto |

---

## I. Decisão Final da Validação

### ⚠️ APROVADO COM RESSALVAS

**Fundamento da aprovação:**
- Estrutura relacional do domínio `abs_intel` íntegra em 100% dos indicadores críticos
- Integridade referencial de 100% (zero orphans em todas as FKs)
- Deduplicação de eventos correta (257 eventos únicos, 1 colisão de hash tratada)
- Consistência matemática dos pesos CID e allocated_days validada
- Staging completamente processado
- Legado `public` inalterado (21 tabelas, 2 triggers)
- Isolamento total: zero FKs cruzadas entre `abs_intel` e `public`

**Fundamento da ressalva:**
- `data_nascimento` (100% NULL) e `data_admissao` (100% NULL) em `abs_dim_servidor` e `abs_dim_vinculo_servidor` respectivamente, causados pelo formato de serial Excel dos campos `nascimento` e `admissao` em `public.servidores`
- Consequência: `faixa_etaria` e `faixa_tempo_servico` gerados como 100% `NAO_INFORMADO` nos 9.386 snapshots populacionais
- **A ressalva NÃO bloqueia a progressão** — os fatos epidemiológicos (eventos, CIDs, dias, tipos de licença) são estruturalmente corretos e habilitam a FASE 4
- **A correção é obrigatória antes** de análises demográficas estratificadas (faixa etária, tempo de serviço)

---

## J. Bloqueios Ainda Mantidos

| Bloqueio | Status |
|---|---|
| ETL sobre indicadores epidemiológicos (TAD/IFL/DML/IG) | 🔒 BLOQUEADO |
| Conexão de telas frontend ao domínio `abs_intel` | 🔒 BLOQUEADO |
| Alteração do módulo `/afastamentos/cid-analytics` | 🔒 BLOQUEADO |
| Alterações em `public.*` (legado) | 🔒 BLOQUEADO |
| FASE 4 — análise epidemiológica | 🔓 **DESBLOQUEADA** (condicionada à ressalva documentada) |

---

## K. Próximo Passo Seguro

**Opção A (recomendada antes de FASE 4 estratificada):**
Executar **FASE 3W.1 — Correção do Mapeamento de Datas Serial Excel**, re-rodando o ETL idempotente (`TRUNCATE + RESTART IDENTITY`) com a adição do terceiro CASE para serial Excel:
```sql
WHEN COALESCE(s.nascimento, '') ~ '^\d{4,5}$'
  THEN (DATE '1899-12-30' + s.nascimento::integer * INTERVAL '1 day')::date
```
Esta correção não requer migration nova — apenas atualização do script ETL já existente.

**Opção B (se FASE 4 não depender de estratificação demográfica nesta iteração):**
Avançar diretamente para **FASE 4 — Análise Epidemiológica**, com a ressalva registrada e com ciência de que análises por faixa etária e faixa de tempo de serviço não estarão disponíveis até a correção do ETL.

---

*Data de criação: 02 de Abril de 2026 (FASE 3X)*  
*Próxima ação recomendada: FASE 3W.1 (correção ETL datas serial Excel) ou FASE 4 (se análise demográfica não for imediata)*
