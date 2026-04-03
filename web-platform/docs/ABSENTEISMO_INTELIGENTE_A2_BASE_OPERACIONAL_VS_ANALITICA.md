# A2 — Política Oficial de Base Operacional vs. Base Analítica

**Versão:** 1.0  
**Status:** Implementado  
**Escopo:** Programa Unificado de Inteligência em Absenteísmo Ocupacional — SESMT-SYSTEM  
**Pré-requisito:** A1 (Política de Elegibilidade — conclusão commit `18b5b58`)

---

## A. Objetivo da Microfase

Eliminar a ambiguidade metodológica existente entre `public.afastamentos` e `abs_intel.*`, definindo formalmente o papel de cada base de dados no programa de absenteísmo, estabelecendo:

- qual é a **fonte oficial para analytics e dashboards**;
- qual é a **fonte oficial para auditoria, drill-down e investigação nominal**;
- como interpretar e classificar divergências entre as duas bases;
- os riscos metodológicos de não respeitar essa distinção.

---

## B. Uso Atual das Bases — Auditoria

### B.1 `public.afastamentos` — leitores e operações identificadas

| Arquivo | Tipo de acesso | Operações |
|---|---|---|
| `src/app/afastamentos/page.tsx` | Listagem + mutações | SELECT (lista, status ATIVO), UPDATE (situacao, alta médica), trigger auto-repair |
| `src/app/afastamentos/new/page.tsx` | Formulário de cadastro | INSERT, UPDATE (prorrogação, edição) |
| `src/app/afastamentos/cid-analytics/page.tsx` | Analytics de CID | SELECT `*, afastamento_cids(*)` (sem paginação) |
| `src/app/afastamentos/analytics/page.tsx` | Dashboard legado | SELECT `*` com filtros client-side |
| `public.afastamentos_logs` | Audit trail operacional | INSERT por ações nas telas operacionais |

**Característica estrutural:** acesso direto via Supabase client sem schema explícito (schema `public` implícito).

### B.2 `abs_intel.*` — leitores e operações identificadas

| Arquivo / Módulo | Tabelas lidas | Acesso via |
|---|---|---|
| `src/lib/afastamentos-epidemiologia-application.ts` | `abs_fact_afastamento_evento`, `abs_fact_afastamento_cid`, `abs_dim_servidor`, `abs_dim_vinculo_servidor`, `abs_fact_population_snapshot` | `.schema("abs_intel")` |
| `src/lib/afastamentos-ergonomia.ts` | `abs_dim_ergonomic_factor`, `abs_fact_ergonomic_assessment`, `abs_fact_ergonomic_exposure`, `abs_fact_ergonomic_action_plan`, `abs_fact_afastamento_evento`, `abs_fact_afastamento_cid`, `abs_dim_vinculo_servidor`, `abs_dim_tempo` | `.schema("abs_intel")` |
| `src/lib/afastamentos-psychosocial.ts` | `abs_dim_psychosocial_factor`, `abs_fact_psychosocial_assessment`, `abs_fact_psychosocial_signal`, `abs_fact_afastamento_evento`, `abs_fact_afastamento_cid`, `abs_dim_vinculo_servidor`, `abs_dim_tempo` | `.schema("abs_intel")` |

**API routes que consomem abs_intel:**

| Rota | Módulo de aplicação |
|---|---|
| `/api/absenteismo/epidemiologia` | `afastamentos-epidemiologia-application` |
| `/api/absenteismo/epidemiologia-view` | `afastamentos-epidemiologia-application` |
| `/api/absenteismo/ergonomia` | `afastamentos-ergonomia` |
| `/api/absenteismo/psicossocial` | `afastamentos-psychosocial` |

**Telas que consomem abs_intel (indiretamente via API routes):**

| Tela | API consumida |
|---|---|
| `/afastamentos/epidemiologia` | `/api/absenteismo/epidemiologia` |

**Telas analíticas que ainda NÃO usam abs_intel:**

| Tela | Base atual | Observação |
|---|---|---|
| `/afastamentos/cid-analytics` | `public.afastamentos` | Gap arquitetural conhecido |
| `/afastamentos/analytics` | `public.afastamentos` | Tela legado — sem roadmap imediato |

### B.3 Módulos puramente analíticos (sem acesso a banco)

Os módulos abaixo operam exclusivamente sobre dados em memória recebidos do repositório:

- `afastamentos-eligibilidade.ts` — política de elegibilidade
- `afastamentos-epidemiologia.ts` — motor epidemiológico
- `afastamentos-epidemiologia-contrato.ts` — construtor de contrato
- `afastamentos-epidemiologia-page-utils.ts` — modelo de página
- `afastamentos-cid-analytics.ts` — transformações de CID
- `afastamentos-cid-managerial.ts` — inteligência gerencial de CID
- `afastamentos-ergonomia-contrato.ts` — contrato ergonômico
- `afastamentos-psychosocial-contrato.ts` — contrato psicossocial

---

## C. Definição Formal da Base Operacional

**Base operacional = `public.afastamentos` (e tabelas correlatas no schema `public`)**

### Tabelas principais

- `public.afastamentos`
- `public.afastamento_cids`
- `public.afastamentos_logs`
- `public.portarias_afastamento`

### Caracterização

A base operacional é o **sistema de registro transacional** do SESMT. Ela recebe:

- cadastros de novos afastamentos (formulário `/afastamentos/new`);
- edições, prorrogações e fechamentos via interface;
- alterações de situação (`ATIVO`, `PRORROGADO`, `FINALIZADO`);
- registros de CID vinculados manualmente ou importados;
- audit log de operações humanas (`afastamentos_logs`).

### Responsabilidades

| Responsabilidade | Está em public? |
|---|---|
| Fonte primária de dados brutos | ✅ Sim |
| Registro de data/hora de operações | ✅ Sim |
| Vinculação de CIDs individuais por afastamento | ✅ Sim |
| Portarias associadas | ✅ Sim |
| Rastreabilidade nominal por ID de afastamento | ✅ Sim |
| Cálculo de indicadores epidemiológicos | ❌ Não (responsabilidade de abs_intel) |
| Análise estatística de populações | ❌ Não |

### Garantias

- **Completude bruta maior:** todos os registros existem aqui antes de serem ETL-processados para abs_intel.
- **Mutabilidade:** esta base aceita INSERTs, UPDATEs e DELETEs das telas operacionais.
- **Latência = zero:** o registro está disponível imediatamente após criação.

---

## D. Definição Formal da Base Analítica

**Base analítica = `abs_intel.*` (schema isolado de inteligência em absenteísmo)**

### Tabelas de fatos

- `abs_intel.abs_fact_afastamento_evento` — evento atômico de afastamento com dimensão calculada (`tipo_licenca`, `dias_afastado`)
- `abs_intel.abs_fact_afastamento_cid` — CID por evento com alocação de peso e dias
- `abs_intel.abs_fact_population_snapshot` — snapshot de denominador populacional por mês
- `abs_intel.abs_fact_psychosocial_assessment` — avaliações psicossociais estruturadas
- `abs_intel.abs_fact_psychosocial_signal` — sinais de risco psicossocial por afastamento
- `abs_intel.abs_fact_ergonomic_assessment` — avaliações ergonômicas estruturadas
- `abs_intel.abs_fact_ergonomic_exposure` — exposição ergonômica por servidor
- `abs_intel.abs_fact_ergonomic_action_plan` — planos de ação ergonômica

### Tabelas de dimensão

- `abs_intel.abs_dim_servidor` — dimensão servidor com `sexo`, `data_nascimento`
- `abs_intel.abs_dim_vinculo_servidor` — dimensão vínculo com `secretaria`, `cargo`, `local_trabalho`, `tempo_servico`
- `abs_intel.abs_dim_tempo` — dimensão de tempo para cruzamentos psicossociais e ergonômicos
- `abs_intel.abs_dim_psychosocial_factor` — catálogo de fatores psicossociais
- `abs_intel.abs_dim_ergonomic_factor` — catálogo de fatores ergonômicos

### Caracterização

A base analítica é o **data warehouse em miniatura** do SESMT. Ela é:

- **populated por ETL** a partir de `public.afastamentos` (e, no caso de avaliações, por entrada direta de dados especializados);
- **read-only** para as telas analíticas — nenhuma tela escreve neste schema diretamente;
- **pré-calculada** com campos derivados (`tipo_licenca`, `allocated_days`, `occurrence_weight`);
- **dimensionada** com dados demográficos e funcionais de cada servidor/vínculo;
- **alinhada com o esquema dimensional** (fatos + dimensões, sem joins operacionais complexos).

### Responsabilidades

| Responsabilidade | Está em abs_intel? |
|---|---|
| Cálculo de indicadores (TAD, IFL, DML, IG) | ✅ Sim |
| Análise de distribuição por sexo/faixa etária/secretaria | ✅ Sim |
| Análise de tendência temporal (série mensal) | ✅ Sim |
| Correlação CID × perfil demográfico | ✅ Sim |
| Avaliação de risco psicossocial estruturada | ✅ Sim |
| Avaliação de risco ergonômico estruturada | ✅ Sim |
| Denominador populacional para taxas | ✅ Sim |
| Rastreamento nominal em tempo real | ❌ Não (use public.afastamentos) |
| Fonte de dados de formulários | ❌ Não |

---

## E. Decisão Oficial — Analytics e Dashboards

> **`abs_intel.*` é a fonte oficial e exclusiva para analytics, dashboards, indicadores epidemiológicos e relatórios de absenteísmo-doença.**

### Justificativa

1. **Qualidade:** os dados em abs_intel passam por ETL que resolve campos derivados, normaliza CIDs, calcula pesos de ocorrência e alocação de dias. Os dados brutos em `public.afastamentos` podem conter campos nulos, formatos inconsistentes ou `dias_afastado` calculado de forma ad hoc.

2. **Denominador controlado:** `abs_fact_population_snapshot` provê o denominador populacional necessário para cálculo correto de TAD, IFL e IG. Esse denominador não existe em `public.afastamentos`.

3. **Modelo dimensional:** as dimensões `abs_dim_servidor` e `abs_dim_vinculo_servidor` permitem recortes populacionais por sexo, faixa etária, secretaria, cargo e local de trabalho — estrutura que `public.afastamentos` não oferece nativamente.

4. **Comparabilidade:** análises produzidas sobre a mesma base ETL são comparáveis entre períodos. Consultas diretas a `public.afastamentos` introduzem variação dependente das regras de filtro aplicadas pelo cliente.

5. **Isolamento de falhas ETL:** quando o ETL não é executado, abs_intel fica desatualizado mas os dados brutos operacionais permanecem íntegros em public. O usuário pode ser informado da desatualização sem impacto nos registros.

---

## F. Decisão Oficial — Auditoria, Drill-down e Investigação Nominal

> **`public.afastamentos` é a fonte oficial para auditoria transacional, drill-down nominal e investigação caso-a-caso.**

### Justificativa

1. **Completude:** todo afastamento existe em `public.afastamentos` desde o momento de cadastro, independentemente do estado do ETL.

2. **Rastreabilidade nominal:** `public.afastamentos` mantém o `id` definitivo do registro, a portaria associada, o log de ações (`afastamentos_logs`), CIDs individuais com metadados completos e a situação operacional atual.

3. **Mutabilidade:** correções feitas por operadores (edição, prorrogação, alta médica) são refletidas imediatamente nesta base. Em abs_intel, a atualização depende de re-execução do ETL.

4. **Identificação única:** o `afastamento_id` em abs_intel referencia o `id` de `public.afastamentos`. A cadeia de auditoria começa sempre no registro operacional.

---

## G. Diferenças Esperadas entre as Bases

As seguintes divergências são **esperadas e aceitáveis**:

| Tipo de divergência | Causa | Classificação |
|---|---|---|
| Registros em `public` sem correspondência em abs_intel | ETL ainda não executado para o período | **Normal — latência de ETL** |
| `dias_afastado` diferente entre as bases | public usa cálculo ad hoc; abs_intel usa lógica ETL padronizada | **Normal — diferença metodológica** |
| `data_fim` nula em public / afastamento sem entry em abs_intel | Afastamento em curso | **Normal** |
| Contagem de CIDs por afastamento diferente | public armazena CIDs brutos; abs_intel aplica `occurrence_weight` (fracionamento por CID múltiplo) | **Normal — modelo diferente** |
| Maternidade presente em public, ausente de abs_intel | Filtro de elegibilidade A1 aplicado apenas no contrato analítico | **Normal — política A1** |
| Registros com `tipo_licenca` nula em abs_intel | ETL com campo nulo em `tipo_afastamento` na origem | **Normal — dado incompleto na origem** |
| `populacaoMedia` diferente de contagem de servidores em public | abs_intel usa snapshot de denominador; public usa contagem de registros ativos | **Normal — metodologia diferente** |

---

## H. Interpretação Segura das Divergências

### Protocolo de interpretação

1. **Diferença quantitativa pequena (< 5%)** entre total de afastamentos em public e em abs_intel → verificar data do último ETL. Se ETL recente, é latência aceitável.

2. **Diferença qualitativa em indicadores** (TAD, IFL, DML, IG) em relação a valores esperados → sempre investigar pela base analítica, nunca replicar cálculos diretamente sobre public.

3. **Registro encontrado em public mas não em abs_intel** → confirmar se ETL foi executado para o período correspondente. Não é ausência de dado — é ausência de processamento.

4. **Registro em abs_intel sem match em public** → sinal de problema grave. Indica corrupção referencial no ETL. Deve ser investigado via `afastamento_id` (FK entre as bases).

5. **`dias_afastado` divergente** → usar sempre o valor de abs_intel para indicadores. O valor de public é operacional e pode ter sido calculado manualmente.

---

## I. Riscos Metodológicos se a Distinção não for Respeitada

| Risco | Origem | Consequência |
|---|---|---|
| Calcular TAD/IFL/IG sobre public.afastamentos | Ausência de denominador populacional | Taxas 0 ou erradas; impossibilidade de comparação |
| Drill-down nominal via abs_intel sem FK para public | Perda de rastreabilidade | Impossibilidade de auditar o registro original |
| Comparar contagens brutas entre telas (public vs abs_intel) | Denominadores e filtros diferentes | Confusão metodológica e relatórios contraditórios |
| Usar public como fonte para recortes por sexo/secretaria | Campos podem estar nulos ou inconsistentes | Segmentações incorretas ou impossíveis |
| Misturar maternidade em analytics | Política A1 aplicada apenas no contrato | Distorção de indicadores (já resolvido em A1) |
| Exibir dados de abs_intel desatualizado sem aviso ao usuário | ETL não executado recentemente | Usuário toma decisão sobre dado obsoleto |

---

## J. Gap Arquitetural Identificado

A tela `/afastamentos/cid-analytics` é a única tela analítica que ainda lê `public.afastamentos` em vez de `abs_intel.*`.

Este gap **não é resolvido nesta microfase** (A2). A solução é escopo de microfase futura.

Impacto atual do gap:
- CID Analytics não tem acesso a `abs_fact_population_snapshot` → não pode calcular TAD, IFL, IG por CID
- CID Analytics não usa `occurrence_weight` → contagem de CIDs é bruta (1 ocorrência = 1 evento, mesmo que haja múltiplos CIDs por afastamento)
- CID Analytics aplica política de elegibilidade A1 via funções sobre public (`isMaternityAfastamentoRecord`), enquanto Epidemiologia aplica via `isMaternitySignal` sobre abs_intel — resultado equivalente, base diferente

---

## K. Ajustes de Documentação / Help Text

Nenhum ajuste de código ou UX foi necessário nesta microfase. A política definida aqui é documental e metodológica. A microfase A1 já havia registrado a assimetria de bases no código (`src/lib/afastamentos-elegibilidade.ts`) e o gap arquitetural de CID Analytics já estava documentado implicitamente nos comentários do módulo.

---

## L. Próximo Passo Seguro

A microfase A3 pode tratar a migração de CID Analytics para abs_intel, alinhando a base de dados da tela ao padrão analítico oficial. Isso requer:

1. Confirmar que `abs_fact_afastamento_cid` expõe os campos necessários para CID Analytics (`cid_codigo`, `cid_descricao`, `cid_capitulo`, `occurrence_weight`)
2. Criar repositório abs_intel específico para CID Analytics
3. Adaptar `buildCidAnalyticsDataset()` para aceitar os tipos da base analítica
4. Remover a consulta direta a `public.afastamentos` da tela CID Analytics
5. Garantir que os filtros de período e secretaria existentes continuem funcionando

**A2 não abre A3 automaticamente.** A ordem de execução continua sob decisão do usuário.

---

_Documento canônico — qualquer decisão futura sobre uso das bases deve referenciar este documento e, se necessário, propor uma revisão formal da política aqui definida._
