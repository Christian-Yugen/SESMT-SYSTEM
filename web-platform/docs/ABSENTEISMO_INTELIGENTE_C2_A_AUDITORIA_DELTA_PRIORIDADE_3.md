# MICROFASE C2.A — Auditoria de Delta e Validação de Fechamento da Prioridade 3

**Programa Unificado de Inteligência em Absenteísmo Ocupacional — SESMT**
**Data:** 03/04/2026
**Branch:** `feat/unified-absenteeism-intelligence-program`
**Baseline auditado:** `6a284bc` (docs(b2)) → `46c597e` (HEAD)
**Microfases referenciadas:** B2 → C1 → C2 → C2.A

---

## A. Objetivo da Microfase C2.A

Realizar auditoria formal do delta acumulado desde o fechamento da microfase B2, verificar conformidade de todos os commits com o escopo da Prioridade 3 (Integração Epidemiologia ↔ CID Analytics), classificar cada arquivo e cada commit como dentro do escopo, fora do escopo (neutro) ou desvio (requer remediação), e emitir decisão formal sobre o fechamento da Prioridade 3.

---

## B. Escopo da Prioridade 3

A Prioridade 3 tinha três objetivos funcionais formalizados:

| # | Objetivo | Microfase responsável |
|---|----------|----------------------|
| P3-O1 | Integração funcional entre Epidemiologia Geral e CID Analytics via cabeçalho contextual | C1 |
| P3-O2 | Padronização semântica visual e metodológica entre as duas telas | C2 |
| P3-O3 | Convergência de cálculo de dias perdidos e alinhamento de terminologia | C2 + fixes |

**Restrições ativas durante toda a prioridade:**
- Zero alterações em psicossocial, ergonomia, autenticação ou arquitetura
- Não abrir nova tela de módulo analítico
- Não alterar `/cid-analytics` ou `/epidemiologia` salvo necessidade direta da trilha

---

## C. Inventário Completo do Delta (B2 → HEAD)

### C.1 Commits em ordem cronológica

| Hash | Data | Tipo | Descrição resumida |
|------|------|------|-------------------|
| `519ba5e` | 02/04 22:46 | feat | C1: cabeçalho epidemiológico contextual no CID Analytics |
| `42c7e83` | 02/04 (noite) | docs | Registro da microfase C1 |
| `2bdd94a` | 02/04 23:02 | feat | C2: padronização semântica visual e metodológica |
| `8e80fb3` | 02/04 (noite) | docs | Registro da microfase C2 |
| `9c55940` | 02/04 23:15 | fix | C2: substituir subtextos longos por ícone Info com tooltip |
| `0fadda3` | 03/04 00:30 | fix | C1/C2: remover KPIs numéricos do cabeçalho contextual |
| `5e3f8d9` | 03/04 10:08 | fix | Convergência de dias entre CID Analytics e Epidemiologia |
| `e75c0d8` | 03/04 10:29 | fix | Alinhar terminologia entre CID Analytics e Epidemiologia |
| `46c597e` | 03/04 15:13 | feat | Submenu Lic. Maternidade, UX form afastamentos, limpeza |

### C.2 Arquivos alterados no delta

| Arquivo | Commits que o tocam | Classificação |
|---------|--------------------|---------—-----|
| `docs/ABSENTEISMO_INTELIGENTE_C1_*.md` | `42c7e83` | Escopo — documentação |
| `docs/ABSENTEISMO_INTELIGENTE_C2_*.md` | `8e80fb3` | Escopo — documentação |
| `src/app/afastamentos/cid-analytics/page.tsx` | `519ba5e`, `2bdd94a`, `9c55940`, `0fadda3`, `5e3f8d9`, `e75c0d8`, `46c597e` | **Escopo — núcleo** |
| `src/app/afastamentos/epidemiologia/page.tsx` | `519ba5e`, `2bdd94a`, `9c55940`, `0fadda3`, `e75c0d8`, `46c597e` | **Escopo — núcleo** |
| `src/lib/afastamentos-cid-analytics.ts` | `5e3f8d9` | **Escopo — biblioteca de métricas** |
| `src/components/analytics/cid/CidChapterRankingPanel.tsx` | `e75c0d8` | **Escopo — componente da trilha** |
| `src/components/analytics/cid/CidRecurrenceInvestigativeTable.tsx` | `46c597e` | **Escopo — bug fix na trilha** |
| `src/app/afastamentos/maternidade/page.tsx` | `46c597e` | Fora do escopo — neutro¹ |
| `src/app/afastamentos/new/page.tsx` | `46c597e` | Fora do escopo — neutro¹ |
| `src/app/afastamentos/page.tsx` | `46c597e` | Fora do escopo — neutro¹ |
| `src/components/layout/Sidebar.tsx` | `46c597e` | Fora do escopo — neutro¹ |

> ¹ *Neutro*: alterações sem interação com a lógica analítica da trilha Epidemiologia ↔ CID Analytics. Não constituem desvio. Foram agrupadas no mesmo commit por afinidade operacional.

---

## D. Classificação Detalhada por Objetivo

### P3-O1 — Integração funcional via cabeçalho contextual ✅

**Commits:** `519ba5e`, `0fadda3`

**Análise:**
- `519ba5e`: implementa o cabeçalho contextual no CID Analytics com KPIs passados via query params (`epiLic`, `epiDias`, `epiDml`, `epiPct`) a partir do `handleRowClick` da Epidemiologia.
- `0fadda3`: detecta e corrige problema de fontes heterogêneas: KPIs numéricos comparados lado a lado produziam aparente discrepância (abs_intel allocated_days ponderados vs. public.afastamentos contagem inteira). Solução: cabeçalho contextual passa a funcionar como breadcrumb de navegação sem KPIs numéricos conflitantes.

**Resultado:** Integração funcional estabelecida e correctamente calibrada. A tela CID Analytics reconhece o contexto de origem (capítulo CID + período) quando ativada a partir da Epidemiologia. Sem KPIs falso-comparáveis. **Objetivo cumprido.**

---

### P3-O2 — Padronização semântica visual e metodológica ✅

**Commits:** `2bdd94a`, `9c55940`

**Análise:**
- `2bdd94a`: formaliza os papéis distintos das duas telas nos subtítulos dos headers e em um banner metodológico:
  - Epidemiologia: "Leitura Principal · Indicadores Padronizados por População · SESMT"
  - CID Analytics: "Leitura Investigativa · Volume Bruto · sem padronização por população"
  - Nota gerencial explícita: TAD/IFL/IG não calculáveis no CID Analytics (referência Epidemiologia)
- `9c55940`: substitui subtextos longos nos headers por ícone `ⓘ` com tooltip — reduz ruído visual sem perda de informação metodológica.

**Resultado:** Identidade semântica de cada tela claramente definida. Hierarquia Epidemiologia (leitura principal) ↔ CID Analytics (aprofundamento investigativo) visível para o usuário. **Objetivo cumprido.**

---

### P3-O3 — Convergência de dias e alinhamento de terminologia ✅

**Commits:** `5e3f8d9`, `e75c0d8`

**Análise:**
- `5e3f8d9`: corrige a divergência de dias com filtro de capítulo ativo.
  - *Causa raiz*: `totalDiasPerdidos` em `buildCidAnalyticsMetrics` somava `daysAway` do evento inteiro quando um filtro de capítulo estava ativo, enquanto a Epidemiologia usa `allocatedDays` proporcionais.
  - *Fix*: `totalDiasPerdidos` passa a somar `allocatedDays` das `cidOccurrences` já filtradas. Sem filtro ativo, o resultado é idêntico ao anterior (soma de todas as ocorrências = `daysAway` total do evento).
  - Também corrige o erro de build `useSearchParams() should be wrapped in a Suspense boundary` adicionando `export const dynamic = 'force-dynamic'`.
- `e75c0d8`: alinha terminologia explicitamente confusa:
  - "afastamento" (CID Analytics) → "licença" (consistente com Epidemiologia, mesmo conceito)
  - "ocorrências" para capítulos → "entradas CID" (métrica bruta, distinta de "lic. prop.")
  - `CidChapterRankingPanel.tsx`: colunas renomeadas + subtítulo explicativo da diferença
  - Epidemiologia: "Lic." → "Lic. prop." com tooltip explicativo da contagem proporcional

**Resultado:** Números convergem entre as telas quando o mesmo filtro de capítulo está ativo. Terminologia não induz comparação incorreta. **Objetivo cumprido.**

---

### Bug fix adicional (na trilha, sem objetivo numerado) ✅

**Commit:** `46c597e` (parcial — `CidRecurrenceInvestigativeTable.tsx`)

**Análise:** A tabela investigativa "Episódios por Servidor" exibia o CID primário (índice 0) do evento mesmo quando o filtro de capítulo ativo foi satisfeito por um CID secundário. O fix passa `cidOccurrences` já filtradas como prop para a tabela, que constrói um mapa `eventId → cidRelevante` e exibe o CID correto para o filtro de capítulo ativo.

**Classificação:** Corretivo dentro da trilha. Não constitui novo objetivo — é qualidade da P3-O1/P3-O3 (garantir que a investigação mostre a raiz correta do capítulo selecionado).

---

### Alterações fora do escopo presentes no commit `46c597e`

| Bloco de mudança | Arquivo(s) | Justificativa de neutralidade |
|------------------|-----------|-------------------------------|
| Página `/afastamentos/maternidade` criada | `maternidade/page.tsx` | Módulo independente; não acessa APIs analíticas |
| Sidebar com "Lic. Maternidade" | `Sidebar.tsx` | Navegação; não interfere em lógica de métricas |
| `/afastamentos` exclui maternidade via query | `page.tsx` | Listagem operacional; sem relação com pipeline analítico |
| UX do formulário `/afastamentos/new` | `new/page.tsx` | Formulário CRUD; não lê nem escreve no pipeline analítico |
| Limpeza de maternidade no CID Analytics | `cid-analytics/page.tsx` | O filtro `.not(ilike MATERNIDADE)` movido para Supabase é neutro — já deveria estar na query; não altera lógica analítica nem métricas da trilha |
| Limpeza de maternidade na Epidemiologia | `epidemiologia/page.tsx` | Remoção de banners e imports mortos; não altera nenhuma métrica |

**Conclusão sobre `46c597e`:** O commit mistura alterações de escopo diferente por afinidade operacional (sessão única), mas nenhum bloco fora-do-escopo interfere com a trilha Epidemiologia ↔ CID Analytics. Não há desvio técnico; há apenas expansão de escopo de commit — aceitável em projeto de equipe pequena.

---

## E. Verificação de Restrições Ativas

| Restrição | Status |
|-----------|--------|
| Zero alterações em psicossocial | ✅ Confirmado (`git diff 6a284bc HEAD` — zero arquivos psicossocial/ergonomia) |
| Zero alterações em ergonomia | ✅ Confirmado (idem) |
| Zero alterações em autenticação/auth | ✅ Confirmado |
| Nenhuma nova tela de módulo analítico | ✅ Confirmado — maternidade é operacional, não analítica |
| Nenhuma dependência nova (package.json) | ✅ Confirmado (`git diff 6a284bc HEAD -- package.json` = vazio) |
| TypeScript sem erros | ✅ Confirmado (tsc --noEmit limpo após cada commit) |
| Build Next.js válido | ✅ Confirmado |

---

## F. Inventário de Problemas Identificados

| # | Problema | Classificação | Status |
|---|----------|---------------|--------|
| F1 | KPIs numéricos no cabeçalho contextual comparavam fontes heterogêneas | Desvio de C1 | **Remediado em `0fadda3`** |
| F2 | `totalDiasPerdidos` com filtro de capítulo somava dias do evento inteiro | Bug lógico | **Remediado em `5e3f8d9`** |
| F3 | "afastamentos" vs "licenças" / "ocorrências" vs "entradas CID" — confusão comparativa | Desvio de C2 | **Remediado em `e75c0d8`** |
| F4 | `CidRecurrenceInvestigativeTable` exibia CID primário independente do capítulo filtrado | Bug de exibição | **Remediado em `46c597e`** |
| F5 | `data_fim` calculada com UTC causava off-by-one em UTC-3/UTC-4 | Bug de UX (fora da trilha) | **Remediado em `46c597e`** |
| F6 | Build error: `useSearchParams()` sem Suspense boundary | Bug de infraestrutura | **Remediado em `5e3f8d9`** |

**Nenhum problema aberto identificado na trilha analítica.**

---

## G. Avaliação dos Objetivos da Prioridade 3

| Objetivo | Critério de completude | Evidência | Decisão |
|----------|----------------------|-----------|---------|
| P3-O1 | Navegação Epidemiologia → CID Analytics preserva contexto (capítulo + período) | `519ba5e` + `0fadda3`: cabeçalho contextual como breadcrumb funcional | **CUMPRIDO** |
| P3-O2 | Papéis das telas distinguíveis semanticamente pelo usuário | `2bdd94a` + `9c55940`: subtítulos + tooltips + banner metodológico | **CUMPRIDO** |
| P3-O3 | Dias convergem com filtro de capítulo ativo; terminologia não induz comparação incorreta | `5e3f8d9` + `e75c0d8`: cálculo corrigido, rótulos alinhados | **CUMPRIDO** |
| P3-extra | Investigação por capítulo exibe CID correto (relevante ao filtro) | `46c597e` (`CidRecurrenceInvestigativeTable`) | **CUMPRIDO** |

---

## H. Decisão Formal — Prioridade 3

**PRIORIDADE 3 ENCERRADA.**

Todos os objetivos da Prioridade 3 foram cumpridos. Nenhum problema aberto foi identificado na trilha analítica. Todas as restrições ativas foram respeitadas. O conjunto de commits entre `519ba5e` e `46c597e` constitui a implementação completa e validada da integração Epidemiologia ↔ CID Analytics no Programa Unificado de Inteligência em Absenteísmo Ocupacional.

---

## I. Registro de Artefatos Produzidos pela Prioridade 3

| Artefato | Tipo | Localização |
|----------|------|-------------|
| Cabeçalho contextual no CID Analytics | Funcionalidade | `cid-analytics/page.tsx` |
| Padronização semântica (subtítulos + tooltips) | Visual/metodológico | `cid-analytics/page.tsx`, `epidemiologia/page.tsx` |
| Convergência de cálculo de dias | Biblioteca | `lib/afastamentos-cid-analytics.ts` |
| Alinhamento de terminologia | Componentes | `CidChapterRankingPanel.tsx`, `cid-analytics/page.tsx`, `epidemiologia/page.tsx` |
| Fix exibição de CID por capítulo | Componente | `CidRecurrenceInvestigativeTable.tsx` |
| Documentação C1 | Registro | `docs/ABSENTEISMO_INTELIGENTE_C1_*.md` |
| Documentação C2 | Registro | `docs/ABSENTEISMO_INTELIGENTE_C2_*.md` |
| Este documento (C2.A) | Auditoria | `docs/ABSENTEISMO_INTELIGENTE_C2_A_AUDITORIA_DELTA_PRIORIDADE_3.md` |

---

## J. Instrução ao Próximo Agente

A Prioridade 3 está formalmente encerrada. O estado atual do repositório é limpo e estável.

**O próximo agente NÃO deve:**
- Reabrir qualquer objetivo da Prioridade 3
- Alterar `/cid-analytics` ou `/epidemiologia` sem nova instrução explícita
- Iniciar automaticamente a Prioridade 4 ou qualquer nova microfase
- Tocar psicossocial, ergonomia ou autenticação

**O próximo agente deve:**
- Aguardar instrução explícita do usuário sobre a próxima prioridade
- Ler este documento antes de qualquer trabalho na trilha analítica
- Respeitar a hierarquia documental do `AGENTS.md` e do documento canônico de governança visual

---

*Auditoria concluída em 03/04/2026. Branch: `feat/unified-absenteeism-intelligence-program`. HEAD: `46c597e`.*
