# MICROFASE D1 — Validação Cruzada Funcional da Integração Epidemiologia ↔ CID Analytics

**Programa Unificado de Inteligência em Absenteísmo Ocupacional — SESMT**
**Data:** 03/04/2026
**Branch:** `feat/unified-absenteeism-intelligence-program`

---

- objetivo da microfase

Validar funcional e metodologicamente o fluxo ponta a ponta entre a Tela Epidemiologia Geral e o CID Analytics, confirmando coerência de contexto (capítulo + período), consistência de leitura (bruta vs. padronizada), ausência de bugs de integração e detecção/classificação de diferenças. Corrigir somente bugs ou ruídos que prejudiquem interpretação.

---

- arquivos alterados

- `docs/ABSENTEISMO_INTELIGENTE_D1_VALIDACAO_CRUZADA_INTEGRACAO.md` — criação deste documento.

(Nenhuma alteração de código aplicada nesta microfase; apenas análise estática e documentação.)

---

- fluxo auditado

1. Na Tela `Epidemiologia Geral` (componente `CidChapterExecutiveBlock`) o usuário seleciona período e clica em um capítulo CID na tabela "Agravos Dominantes do Período".
2. `handleRowClick` constrói `URLSearchParams` com `chapter`, `startDate` e `endDate` e executa `router.push('/afastamentos/cid-analytics?chapter=...&startDate=...&endDate=...')`.
3. Em `CID Analytics` (`src/app/afastamentos/cid-analytics/page.tsx`) a página lê `searchParams.get('chapter')`, `startDate`, `endDate` e inicializa os estados `filterCidChapter`, `startDate`, `endDate` com esses valores.
4. `CID Analytics` carrega o dataset analítico do Supabase (query `.from('afastamentos').select('*, afastamento_cids (*)').not('tipo_afastamento','ilike','%MATERNIDADE%')...`) e constrói `events` e `cidOccurrences` via `buildCidAnalyticsDataset`.
5. Os filtros iniciais aplicam-se ao dataset (comparação por `event.event.startDate` e filtragem por `occ.cidChapter`/`occ.cidCode`), gerando `filtered.events` e `filtered.cidOccurrences`.
6. Componentes de destino (panels, ranking, tabela investigativa) consomem `filtered.*` e exibem leitura investigativa; a tabela investigativa recebe `cidOccurrences` para mostrar o CID relevante por evento.

---

- validações realizadas

1. Conferi a passagem de parâmetros: `Epidemiologia` envia `chapter`, `startDate`, `endDate`; `CID Analytics` lê exatamente estes keys. (Código: `CidChapterExecutiveBlock.handleRowClick` e `CidAnalyticsPage` inicialização de `startDate`, `endDate`, `filterCidChapter`).
2. Verifiquei que `CID Analytics` aplica o filtro de maternidade na query Supabase: `.not('tipo_afastamento','ilike','%MATERNIDADE%')` (código em `cid-analytics/page.tsx`).
3. Confirmei que `buildCidAnalyticsDataset` e `buildCidAnalyticsMetrics` usam `cidOccurrences.allocatedDays` ao calcular `totalDiasPerdidos` quando `cidOccurrences` está presente — garante proporcionalidade quando há filtro por capítulo (`src/lib/afastamentos-cid-analytics.ts`).
4. Validei a exibição correta do CID relevante na tabela investigativa: `CidRecurrenceInvestigativeTable` constrói `relevantCidByEventId` a partir de `cidOccurrences` e exibe o CID referente ao filtro ativo quando disponível (`src/components/analytics/cid/CidRecurrenceInvestigativeTable.tsx`).
5. Inspecionei tratamento de datas: os componentes trocam datas como strings `YYYY-MM-DD`; filtragem no cliente compara `event.event.startDate` com `startDate`/`endDate` (comparação lexicográfica segura para ISO date strings). Funções de agregação usam `safeDate` / `toDateOnly` para derivar temporalidades.
6. Verifiquei a identidade das telas: `Epidemiologia` mantém leitura padronizada por população; `CID Analytics` está explicitamente marcado como "Leitura Investigativa · Volume Bruto" (tooltips e textos no header).

---

- diferenças encontradas

1. O `Epidemiologia` não envia mais KPIs numéricos (epiLic/ epiDias / epiDml / epiPct) ao abrir `CID Analytics` — apenas `chapter`, `startDate` e `endDate` são transmitidos.
2. `CID Analytics` aplica exclusão de maternidade diretamente na query Supabase (`.not(...MATERNIDADE...)`), enquanto a `Epidemiologia` mantém o conceito de `excludedMaternityCount` no modelo mas não exibe banners informativos (banner removido). Resultado: a presença/ausência de registros de maternidade pode gerar diferenças nas contagens visíveis entre as telas sem indicação explícita no header do destino.
3. Filtragem temporal no `CID Analytics` compara apenas `event.event.startDate` com `startDate`/`endDate` (i.e., baseia-se no início do episódio). Dependendo da regra epidemiológica (se o critério de inclusão for "evento que *sobrepõe* o período" vs "evento com início no período"), isso pode gerar divergências de contagem entre as duas telas.
4. Parsers de data internamente usam `safeDate(new Date(`${value}T00:00:00`))` e `getUTCFullYear()/getUTCMonth()` em algumas funções de dimensão temporal; há potencial risco de distorção por fuso/serialização em ambientes com fusos diferentes (já corrigido em `afastamentos/new/page.tsx` para o formulário, mas merece verificação nas bibliotecas). 

---

- classificação das diferenças

1. (Envio de KPIs removido) — Classificação: *Divergência metodológica esperada*. Justificativa: mudança intencional (commit `0fadda3`) para evitar comparações de fontes heterogêneas; o cabeçalho funciona como breadcrumb, não como KPI numérico. Não é correção necessária.

2. (Exclusão de maternidade aplicada apenas no destino) — Classificação: *Ruído de UX / comunicação*. Justificativa: a exclusão existe (implementada no CID Analytics) mas o cabeçalho/tooltip atual não menciona explicitamente a exclusão de maternidade; isso pode confundir usuários que esperam ver a mesma base de eventos entre telas.

3. (Critério temporal baseado em startDate) — Classificação: *Incerteza metodológica / possível problema de consistência*. Justificativa: comportamento depende da regra epidemiológica esperada (incluir eventos que *sobrepõem* o período vs. eventos com início dentro do período). Requer decisão de política de inclusão para decidir se é bug ou divergência esperada.

4. (Potencial fuso/serialização de datas nas bibliotecas) — Classificação: *Ruído técnico / possível bug sutil*. Justificativa: parsing com `T00:00:00` e uso de `getUTC*` pode produzir diferenças em alguns runtimes; precisa validação por teste unitário.

---

- correções aplicadas

Nenhuma correção de código aplicada nesta microfase; apenas análise e documentação. Recomendações concretas (aplicáveis como correções mínimas):

- RQ1 (melhoria UX): adicionar nota/tooltip no header do `CID Analytics` explicando explicitamente que a tela exclui maternidade por política (ou que o recorte pode diferir da leitura principal), para evitar interpretações errôneas. (Classificado como ruído de UX — correção recomendada.)

- RQ2 (verificação temporal): confirmar com equipe metodológica se a inclusão temporal deve considerar *sobreposição de período* ou *início no período*. Se for sobreposição, ajustar filtro do `CID Analytics` para incluir eventos cujo intervalo intersecte o período consultado (comparar event.startDate <= endDate && event.endDate >= startDate).

- RQ3 (datas/fuso): adicionar testes unitários para `safeDate`, `calcInclusiveDays` e `buildTemporalDimension` com amostras em diferentes fusos para garantir estabilidade (ou mudar parsing para `new Date(y,m-1,d)` quando a origem é uma data local sem timezone).

---

- garantias de não interferência

- Não foi feito nenhum commit de código nesta microfase além da criação deste documento.
- Não foram alteradas dependências (`package.json` sem mudanças).
- Não houve alteração de telas, fluxos nem de rotas. Todas as recomendações acima são propostas; correções propostas foram limitadas a ruídos de UX, regras de filtragem temporal e testes (pequenas, localizadas).

---

- mudanças na documentação

- Criado: `docs/ABSENTEISMO_INTELIGENTE_D1_VALIDACAO_CRUZADA_INTEGRACAO.md` (este arquivo) com inventário, validações e recomendações.

---

- problemas encontrados

- Pendente: decisão de política sobre inclusão temporal (sobreposição vs início no período) — pode causar diferenças de contagem.
- Pendente: confirmação sobre exibição/registro de exclusão de maternidade entre telas (atualmente a tela investigativa exclui, mas não há sinalização explícita no header).
- Técnico: potencial risco de fuso/serialização em funções que usam `T00:00:00` + `getUTC*` — requer testes.

---

- pendências

1. Confirmação metodológica com área técnica: regra temporal esperada (incluir por início do evento ou por sobreposição). Prazo sugerido: 1 dia útil.
2. Decisão de UX: manter status atual (sem KPIs numéricos no cabeçalho) e adicionar tooltip explicativa sobre exclusão de maternidade, ou reintroduzir banner informativo na Epidemiologia com contador explícito. Prazo sugerido: 1-2 dias úteis (corrigir tooltip é ação pequena).
3. Implementar testes unitários para `safeDate`, `calcInclusiveDays`, `buildCidAnalyticsMetrics` com casos de amostra (incluindo múltiplas CIDs por evento) — Prazo sugerido: 1-2 dias úteis.

---

- status da microfase

Concluída (validação estática e relatório). Nenhuma correção de código aplicada — microfase avaliativa finalizada com recomendações concretas para pequenas ações subsequentes.

---

- próximo passo seguro recomendado

1. Tomar decisão metodológica sobre regra de inclusão temporal (sobreposição vs início). Se for sobreposição, aplicar correção no filtro do `CID Analytics` (pequeno patch no ponto de filtragem do `filtered` ou antes dos eventos serem construídos).
2. Aplicar correção UX mínima: adicionar tooltip claro no header do `CID Analytics` informando que a tela exclui maternidade por política e clarificando diferença com a leitura principal (Epidemiologia).
3. Implementar testes unitários para as funções de datas e métricas (ver pendências) antes de encerrar a priorização 4.

---

RETOMAR_TRILHA_GERAL_ABSENTEISMO_INTELIGENTE
