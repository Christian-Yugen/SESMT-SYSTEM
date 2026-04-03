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

---

**Atualização D1.B (03/04/2026)**

- Sinalização UX mínima aplicada: tooltip do header do `CID Analytics` agora informa que o recorte exclui licenças de maternidade.
- Testes unitários adicionados: `src/lib/tests/afastamentos-cid-analytics.test.ts` cobrindo `safeDate`, `calcInclusiveDays` e `buildCidAnalyticsMetrics`.

---

**MICROFASE D1.Z — Fechamento Formal da Trilha D1 (03/04/2026)**

Este bloco registra o encerramento formal da trilha D1 — Validação Cruzada Epidemiologia ↔ CID Analytics.

- Escopo consolidado:
	- Validação funcional e metodológica da integração entre `/afastamentos/epidemiologia` e `/afastamentos/cid-analytics`.
	- Implementação de sinalização UX mínima (tooltip de exclusão de maternidade) e adição de testes de blindagem na microfase D1.B.
	- Decisão metodológica D1.C: manter critério temporal por `startDate` (inclusão se `event.startDate` estiver entre `startDate` e `endDate`).

- Decisões canônicas preservadas:
	- Regra temporal canônica vigente: inclusão por `startDate`.
	- Política de exclusão de maternidade mantida no destino (CID Analytics).
	- Identidade funcional e objetivo distinto das duas telas preservados: `Epidemiologia` (leitura padronizada por população) vs `CID Analytics` (leitura investigativa — volume bruto).

- Garantias de não interferência:
	- Nenhuma alteração de código funcional foi realizada nesta microfase (D1.Z).
	- Não houve mudanças em rotas, endpoints ou em motor epidemiológico (`epidemiologia-view`, `buildEpidemiologyEngine`).
	- A política de exclusão de maternidade não foi alterada.

- Pontos explicitamente fora da trilha D1 (e que exigirão nova trilha, se necessário):
	- Migração para critério de sobreposição de intervalo (event.startDate <= endDate && event.endDate >= startDate) — trata-se de evolução metodológica, requer coordenação e testes de reconciliação entre numeradores/denominadores.
	- Mudanças estruturais no motor epidemiológico ou migração de fontes (ex.: mover CID Analytics para `abs_intel.*`).
	- Ampliação de UX que introduza novos KPIs na navegação entre telas — alterações desse tipo exigem escopo próprio.

- Observação sobre risco residual técnico:
	- Foi identificado risco não bloqueante relacionado a parsing/UTC em funções que usam `T00:00:00` + getters UTC; isso não impede o fechamento da trilha D1 e está registrado como evolução técnica para trilha futura se necessário.

- Decisão final de estabilidade da integração:
	- A integração é considerada estável para o contrato atual; a regra temporal por `startDate` está formalizada e testada conforme D1.C.

---

RETOMAR_TRILHA_GERAL_ABSENTEISMO_INTELIGENTE

**Decisão D1.C (03/04/2026)**

- Regra temporal auditada: verificado que tanto a `Epidemiologia` (via `buildEpidemiologyEngine` em `src/lib/afastamentos-epidemiologia.ts`) quanto o `CID Analytics` (filtro no cliente em `src/app/afastamentos/cid-analytics/page.tsx`) aplicam atualmente inclusão por *data de início* do afastamento (`startDate`).

- Alternativas comparadas:
	- Inclusão por início do afastamento (`startDate`): já implementada; simples de explicar e consistente com a construção atual do contrato epidemiológico.
	- Inclusão por sobreposição do intervalo (event.startDate <= endDate && event.endDate >= startDate): mais abrangente do ponto de vista epidemiológico (inclui episódios que atravessam o período), porém exige mudança metodológica e alinhamento entre as duas superfícies.

- Decisão metodológica: manter a regra canônica atual — *inclusão por `startDate`*.

- Justificativa da decisão:
	- Consistência entre telas: a `Epidemiologia` já retorna um contrato padronizado baseado em `startDate`; manter o mesmo critério evita surpresas ao navegar entre as telas e preserva o princípio de menor surpresa para usuários investigativos.
	- Escopo mínimo: alterar para sobreposição implicaria mudanças no motor epidemiológico e na forma como denominadores/numeradores são reconciliados (impacto maior que a correção mínima permitida nesta microfase).
	- Risco interpretativo menor: mudança unilateral no destino (`CID Analytics`) causaria divergências imediatas com a tela de origem, aumentando risco de interpretações erradas sem coordenação metodológica.
	- A opção de sobreposição é válida do ponto de vista epidemiológico e ficará documentada como alternativa para revisão posterior coordenada.

- Testes criados:
	- `src/lib/tests/afastamentos-cid-analytics-temporal.test.ts` — suite Vitest adicionada que valida explicitamente o comportamento de inclusão/exclusão quando a filtragem do cliente é aplicada por `startDate`.

- Cenários cobertos pelos testes:
	- Afastamento totalmente dentro do intervalo — incluído.
	- Afastamento iniciado dentro e encerrado depois — incluído.
	- Afastamento iniciado antes e encerrado dentro — **excluído** (pela regra startDate).
	- Afastamento iniciado antes e encerrado depois de todo o intervalo — **excluído** (pela regra startDate).
	- Afastamento totalmente fora do intervalo — excluído.
	- Datas inválidas ou ausentes — tratadas como excluídas quando filtro aplicado (comportamento atual do cliente).

- Correções aplicadas: nenhuma alteração funcional de produção; apenas adição de testes e atualização de documentação.

- Garantias de não interferência:
	- Política de exclusão de maternidade **não** foi alterada.
	- Não foram alteradas rotas, telas ou contratos do endpoint `epidemiologia-view`.
	- Mudanças limitadas a testes e documentação; nada em produção foi modificado.

- Mudanças na documentação: atualização deste arquivo (`docs/ABSENTEISMO_INTELIGENTE_D1_VALIDACAO_CRUZADA_INTEGRACAO.md`) com decisão D1.C e referência ao novo arquivo de testes.

- Problemas encontrados: potencial risco de fuso/serialização de datas em funções internas que usam `T00:00:00` — recomendação de adicionar mais testes e, se necessário, migrar parsing para construção explícita `Date.UTC(...)` ou equivalente.

- Pendências:
	- Revisão metodológica com stakeholders para avaliar se, em futuro coordenado, migrar para critério de sobreposição (impacto nas métricas e necessidade de reconciliar denominadores).
	- Caso se opte por migração futura, executar patch coordenado em `buildEpidemiologyEngine` e nos pontos de construção de `cidOccurrences` para manter reconciliação.

- Status da microfase: concluída — decisão registrada e testes adicionados para fixar contrato temporal atual.

- Próximo passo seguro recomendado: comunicar decisão à equipe metodológica e, se houver acordo para mudança futura, planejar microfase dedicada para aplicar sobreposição com testes de reconciliação (escopo ampliado).


