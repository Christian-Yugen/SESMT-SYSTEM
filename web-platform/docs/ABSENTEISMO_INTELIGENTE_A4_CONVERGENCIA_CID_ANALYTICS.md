# ABSENTEISMO_INTELIGENTE_A4 — CONVERGÊNCIA MÍNIMA DO CID ANALYTICS

**Programa:** Inteligência Unificada em Absenteísmo Ocupacional  
**Microfase:** A4  
**Status:** CONCLUÍDA  
**Commit:** ver marcador de trilha ao final  
**Branch:** feat/unified-absenteeism-intelligence-program

---

## A. OBJETIVO DA MICROFASE

Adequar minimamente o módulo `/afastamentos/cid-analytics` à nova governança metodológica estabelecida nas Microfases A1, A2 e A3, preservando integralmente seu papel clínico-investigativo, mas tornando explícita para o usuário:

1. a relação do módulo com a base operacional (`public.afastamentos`)
2. o caráter de leitura bruta de todos os seus indicadores
3. a aderência à política unificada de exclusão de licença-maternidade
4. a distinção de papel em relação ao módulo Epidemiologia Geral (base analítica / leitura padronizada)

**Não foi objetivo desta microfase** migrar o módulo para `abs_intel.*`, reescrever sua arquitetura, criar novas telas ou integrar outras camadas.

---

## B. PAPEL PRESERVADO DO CID ANALYTICS

O módulo CID Analytics permanece como o **núcleo clínico-investigativo** do sistema de absenteísmo, responsável por:

- análise de capítulos e códigos CID-10 com foco ocupacional
- rankink de agravos por frequência, impacto e recorrência
- inteligência gerencial por secretaria, cargo, natureza e CID dominante
- investigação de recorrência por janelas temporais controladas
- priorização auditável de agravos para suporte à prevenção técnica

**Esse papel não foi alterado nem enfraquecido pela A4.** Os painéis, filtros, rankings, lógicas de score e estrutura de abas permanecem intactos.

---

## C. AJUSTES DE CONVERGÊNCIA APLICADOS

### C.1 — Header subtitle (1 alteração)

**Arquivo:** `src/app/afastamentos/cid-analytics/page.tsx`

**Antes:**
```
Vigilância Epidemiológica Ocupacional • Camada Executiva
```

**Depois:**
```
Vigilância Epidemiológica Ocupacional • Camada Executiva • Base Operacional • Leitura Bruta
```

**Objetivo:** tornar perceptível ao usuário, no próprio cabeçalho da tela, que o módulo opera em base operacional com leitura bruta — cobrindo A2 e A3 na camada de identidade visual.

---

### C.2 — Banner de identidade metodológica permanente (1 inserção)

**Arquivo:** `src/app/afastamentos/cid-analytics/page.tsx`  
**Posição:** área de conteúdo principal, abaixo do aviso de maternidade (quando presente), acima do container de abas — visível independentemente da aba ativa.

**Conteúdo do banner:**

| Rótulo | Valor |
|---|---|
| Módulo Clínico-Investigativo | — |
| Base Operacional | public.afastamentos |
| Leitura Bruta | sem denominador padronizado |
| Maternidade | excluída por política A1 |
| Indicadores padronizados | ver Epidemiologia Geral |

**Estilo:** `bg-white border border-slate-200 border-l-4 border-l-[#1A3351]` — segue o padrão de blocos informativos já em uso no sistema, conforme governança visual SESMT.

**Objetivo:** cobrir A2 (base operacional explícita) e A3 (leitura bruta explícita) de forma persistente em qualquer tab do módulo.

---

## D. O QUE CONTINUA SENDO LEITURA BRUTA

Todos os indicadores calculados no CID Analytics operam sobre contagem absoluta de eventos sem divisão por denominador populaciona:

- `totalAfastamentos` — contagem bruta de afastamentos no período/filtro
- `totalDiasPerdidos` — soma bruta de dias perdidos
- `duracaoMedia` / `duracaoMediana` — média/mediana dos dias por evento
- `totalServidoresAfastados` — contagem de servidores únicos afastados
- `percentualRecorrencia` — percentual sobre o próprio dataset (não sobre a população)
- todos os rankings por volume, dias, score gerencial — ordenados por concentração no dataset filtrado, não por taxa padronizada

**Esses valores não são comparáveis entre grupos de tamanho diferente sem normalização.** Essa limitação já estava documentada no bloco "Regra de Prioridade Gerencial" (adicionado na Microfase A3, linha ~1465) e foi reforçada pelo banner da A4.

---

## E. O QUE PASSA A SER CONTEXTUALIZADO PELA POLÍTICA OFICIAL

Com a A4, os seguintes elementos passam a ser referenciais explícitos da política nova:

| Elemento | Antes (implícito) | Depois (explícito) |
|---|---|---|
| Base de dados | `public.afastamentos` sem rótulo | "Base Operacional • public.afastamentos" no header e no banner |
| Tipo de leitura | sem rótulo | "Leitura Bruta • sem denominador padronizado" no header e no banner |
| Exclusão de maternidade | aplicada via código, sem referência à política | "excluída por política A1" no banner |
| Diferenciação vs Epidemiologia | não declarada | "indicadores padronizados: ver Epidemiologia Geral" no banner |

---

## F. ADERÊNCIA À EXCLUSÃO DE MATERNIDADE (A1)

### O que estava presente antes da A4:

1. Importação de `isMaternityAfastamentoRecord` de `@/lib/afastamentos-elegibilidade` ✅
2. Uso em `loadData`: `filteredRecords = loadedRecords.filter((record) => !isMaternityAfastamentoRecord(record))` ✅
3. Contagem via `setExcludedMaternityCount(loadedRecords.length - filteredRecords.length)` ✅
4. Exibição de aviso amber quando `excludedMaternityCount > 0` ✅
5. Importação de `buildMaternityExclusionAuditMessage` para compor o aviso ✅
6. Mensagem de estado vazio adaptada quando `records.length === 0 && excludedMaternityCount > 0` ✅

### O que a A4 acrescentou:

7. Referência explícita à política A1 no banner permanente ("Maternidade — excluída por política A1") — identifica a origem da regra para o usuário institucional

**Conclusão A1:** PLENA ADERÊNCIA. A A4 apenas acrescentou referência nominal à política; a implementação técnica já estava completa.

---

## G. ADERÊNCIA À DISTINÇÃO BASE OPERACIONAL VS ANALÍTICA (A2)

### O que estava presente antes da A4:

- Módulo lê exclusivamente de `public.afastamentos` (fonte correta para base operacional) ✅
- Nenhum uso de `abs_intel.*` (correto — CID Analytics não deve usar base analítica nesta fase) ✅

### Gaps identificados na auditoria A4:

- Nenhum rótulo na UX indicando que o módulo opera em base operacional — gap de comunicação
- Usuário não conseguia distinguir na tela se estava em base analítica ou operacional

### O que a A4 corrigiu:

- Header subtitle: `• Base Operacional` explícito
- Banner: `Base Operacional — public.afastamentos` com referência cruzada para Epidemiologia Geral

**Conclusão A2:** GAP de comunicação corrigido. Implementação técnica já estava correta; A4 tornou explícita a distinção na UX.

---

## H. ADERÊNCIA À REGRA BRUTO VS PADRONIZADO (A3)

### O que estava presente antes da A4 (adicionado na A3):

- Bloco "Regra de Prioridade Gerencial" no tab visão-geral com nota: "Leitura de volume bruto. Rankings ordenados por concentracao de eventos no dataset filtrado. Nao equivalem a taxas padronizadas por populacao. Grupos maiores tendem a pontuar mais alto." ✅

### Gaps identificados na auditoria A4:

- O disclaimer A3 era visível apenas no tab `visao-geral` — os outros 3 tabs (CID Capítulos, Visão Ocupacional, Casos e Recorrência) não tinham nenhum indicativo de leitura bruta
- Sem banner persistente para usuários que navegam diretamente para outros tabs

### O que a A4 corrigiu:

- Banner permanente `Leitura Bruta — sem denominador padronizado` visível em qualquer tab
- O bloco "Regra de Prioridade Gerencial" (A3) permanece intacto no tab visão-geral como aprofundamento

**Conclusão A3:** GAP de persistência corrigido. A combinação banner-A4 + bloco-A3 cobre todos os tabs.

---

## I. GARANTIAS DE NÃO SUBSTITUIÇÃO DO MÓDULO

Esta microfase garantiu explicitamente:

1. **Nenhuma linha de lógica foi alterada** — apenas markup textual e UI labels
2. **Nenhum painel foi removido ou substituído** — todos os 8+ painéis de analytics CID permanecem
3. **Nenhum filtro foi alterado** — a estrutura de filtros, chips e dropdowns não foi tocada
4. **Nenhuma migração para `abs_intel.*` foi iniciada** — CID Analytics permanece lendo exclusivamente de `public.afastamentos`
5. **Nenhuma nova tela foi criada** — as alterações foram cirúrgicas dentro do arquivo existente
6. **A Epidemiologia Geral não foi alterada** nesta microfase
7. **As camadas psicossocial e ergonômica não foram tocadas**

---

## J. PRÓXIMO PASSO SEGURO

**Microfase A5 (proposta):** Auditoria de consistência entre as telas do módulo de absenteísmo (verificar se Epidemiologia Geral, CID Analytics e eventuais painéis de gestão usam linguagem, labels e disclaimers coerentes entre si, sem dissonância de comunicação para o usuário final).

**Alternativa A5:** Migração gradual e controlada do CID Analytics para `abs_intel.*` — permitindo indicadores padronizados (TAD, IFL, DML, IG) também no núcleo clínico, com manutenção paralela do papel investigativo existente. Requer autorização explícita de abertura de escopo.

---

## Checklist de Critérios de Aceite

| Critério | Status |
|---|---|
| Papel do CID Analytics preservado | ✅ |
| Convergência com política A1 (maternidade) clara | ✅ |
| Convergência com política A2 (base operacional) clara | ✅ |
| Convergência com política A3 (leitura bruta) clara | ✅ |
| Sem refactor desnecessário | ✅ |
| Sem alterações fora do escopo | ✅ |
| Typecheck limpo (`npx tsc --noEmit`) | ✅ |

---

`RETOMAR_TRILHA_GERAL_ABSENTEISMO_INTELIGENTE`
