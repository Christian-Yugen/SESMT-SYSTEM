# FASE 7.2.1 — Bloco de Tendência Real da Tela Epidemiológica

**Programa:** Inteligência Unificada em Absenteísmo Ocupacional — SESMT-SYSTEM
**Microfase:** 7.2.1
**Status:** ENTREGUE
**Data:** 2026-04-02
**Pré-requisito cumprido:** FASE 7.2 ENTREGUE (tela refinada, decisão sobre tendência documentada)

---

## A. Objetivo da microfase

Implementar o bloco funcional de tendência temporal na Tela Epidemiológica Geral
(`/afastamentos/epidemiologia`), substituindo o marcador de roadmap visual por dados reais.

O bloco exibe a evolução mensal de todos os indicadores epidemiológicos (TAD, IFL, DML, IG,
licenças e dias perdidos) para cada mês contido no período consultado, usando o mesmo dataset
já carregado pela requisição principal — sem custo adicional de I/O ao banco de dados.

---

## B. Estratégia de tendência adotada

**Janelas mensais sobre o dataset já carregado.**

O motor epidemiológico (`buildEpidemiologyEngine`) recebe um `EpidemiologyDataset` e um
`EpidemiologyPeriod`, e filtra os eventos cujo `data_inicio` cai dentro do período.
Portanto, é possível reutilizar o dataset inteiro e invocar o motor N vezes — uma por mês —
sem nenhuma chamada adicional ao Supabase.

**Algoritmo:**
1. A função `generateMonthlyWindows(startDate, endDate)` divide o período em janelas mensais
   (1º ao último dia de cada mês, com truncamento no primeiro e último mês se o período não
   coincidir com o início/fim do mês de calendário).
2. Para cada janela, `buildTrendPoint(window, dataset, policy)` invoca
   `buildEpidemiologyEngine(dataset, monthPeriod)` e extrai os indicadores `overall`.
3. O resultado é um `EpidemiologyTrend` com N pontos `EpidemiologyTrendPoint[]`.

**Critério de série suficiente:** mínimo de 2 meses de dados para considerar tendência
analisável (`MINIMUM_TREND_POINTS = 2`).

---

## C. Fonte de dados consumida

O dataset é carregado **uma única vez** pela camada de aplicação
(`createSupabaseEpidemiologyRepository.loadDataset()`), que carrega as tabelas:
- `abs_fact_afastamento_evento`
- `abs_fact_afastamento_cid`
- `abs_dim_servidor`
- `abs_dim_vinculo_servidor`
- `abs_fact_population_snapshot`

A tendência é computada **em memória**, com o mesmo dataset do contrato principal.
Custo adicional de banco de dados: **zero**.

---

## D. Blocos/indicadores exibidos

### D.1 — Tabela de evolução mensal

Colunas: **Mês · Licenças · Dias · DML · TAD · IFL · IG**

| Campo | Descrição |
|---|---|
| Mês | Label pt-BR (ex: "Jan/26") |
| Licenças | Total de licenças abertas naquele mês |
| Dias | Total de dias perdidos naquele mês |
| DML | Duração Média da Licença (sempre disponível) |
| TAD | Taxa de Absenteísmo por Doença (N/D se sem denominador) |
| IFL | Índice de Frequência de Licenças (N/D se sem denominador) |
| IG | Índice de Gravidade (N/D se sem denominador) |

### D.2 — Indicadores visuais relativos

Colunas de Licenças e Dias incluem uma mini-barra horizontal proporcional ao máximo da
série, permitindo comparação visual imediata entre meses sem necessidade de gráfico.
As barras são renderizadas via `style={{ width: '{relLicencas}%' }}` — sem dependência
de biblioteca de gráficos.

### D.3 — Estado de série insuficiente

Quando o período contém menos de 2 meses, o componente `TrendTable` exibe mensagem
contextualizada:
- 0 meses: "Nenhum mês foi identificado no período."
- 1 mês: "Apenas 1 mês identificado. São necessários ao menos 2 meses para análise."

### D.4 — Linhas com dados inválidos

Meses sem denominador populacional válido (`isValid: false`) recebem `opacity-60` e
as colunas TAD/IFL/IG exibem "N/D" em itálico/faded. DML permanece visível (não depende
de denominador).

---

## E. Limitações conhecidas

1. **Granularidade somente mensal:** não é possível análise semanal com o motor atual
   (filtro por `data_inicio`). Análise quinzenal ou semanal seria possível, mas poluiria
   a tabela para períodos longos.

2. **Meses parciais no início/fim:** o primeiro e último mês podem ser meses incompletos
   (ex: período de 15/03 a 15/04 gera janelas "15/03–31/03" e "01/04–15/04"). O engine
   filtra corretamente pelos limites exatos.

3. **Série temporal ≠ análise de ciclos:** esta implementação mostra evolução, não modelagem
   estatística de sazonalidade ou predição. Análise preditiva é FASE 8+.

4. **Ausência de gráfico de linha:** a visualização usa barra proporcional. Gráfico de
   linha/área requereria `recharts` (já disponível como dependência) e seria adequado para
   FASE 7.3+ se desejado.

5. **Custo computacional:** para períodos de 12 meses com dataset grande, o motor é invocado
   12 vezes. Para datasets de até ~50.000 eventos (escala municipal típica), o tempo total
   permanece imperceptível (< 500ms est.). Para datasets maiores, avaliar caching.

---

## F. Garantias de não interferência

| Escopo proibido | Tocado? |
|---|---|
| `/afastamentos/cid-analytics` | ❌ Não |
| Tela psicossocial | ❌ Não |
| Tela ergonômica | ❌ Não |
| Legado operacional (afastamentos, ASO, abono) | ❌ Não |
| `afastamentos-epidemiologia-application.ts` | ❌ Não (camada de I/O intocada) |
| Rota `epidemiologia-view/route.ts` | ❌ Não |
| `afastamentos-epidemiologia.ts` (motor) | ❌ Não |

Módulos alterados: exclusivamente no domínio epidemiológico interno (contrato + page-utils + UI)
e nos testes correspondentes.

---

## G. Testes implementados

### G.1 — Novos testes em `afastamentos-epidemiologia-page-utils.test.ts`

| Teste | O que valida |
|---|---|
| `buildLoadingPageModel: trend vazio com hasSufficientData=false` | Estado de carregamento inicial sem tendência |
| `buildEpidemiologyPageModel: trend com dados suficientes retorna hasSufficientData=true` | 2 pontos → série válida |
| `buildEpidemiologyPageModel: trend points mapeiam label corretamente` | Labels "Jan/26" / "Fev/26" |
| `buildEpidemiologyPageModel: trend sem dados suficientes retorna hasSufficientData=false` | 1 ponto → série insuficiente |
| `buildEpidemiologyPageModel: relLicencas do ponto maximo e 100` | Normalização proporcional correta |
| `buildEpidemiologyPageModel: trend point isValid=false resulta em tad=N/D` | N/D correto para indicadores sem denominador |

### G.2 — Testes de versão do contrato atualizados

3 arquivos de teste que verificavam `contractVersion === "4.2.0"` foram atualizados para
`"4.3.0"` (bump por adição do campo `trend`):
- `afastamentos-epidemiologia-consumo.test.ts`
- `afastamentos-epidemiologia-endpoint.test.ts` (2 ocorrências)

### G.3 — Resultado da suíte

```
npm run test:absenteismo
→ tests 96 | pass 96 | fail 0
```

Incremento de 90 → 96 (+6 testes novos, zero regressão).

### G.4 — Typecheck

```
npx tsc --noEmit → (sem saída) → zero erros
```

---

## H. Decisão sobre encerramento da FASE 7

### H.1 — O que o plano original da FASE 7 previa

Conforme definição inicial do Programa Unificado:
> "FASE 7 — Telas visuais do programa: Tela Epidemiológica Geral com indicadores e tendências"

### H.2 — O que foi entregue

| Subitem | Status |
|---|---|
| Tela epidemiológica geral (`/afastamentos/epidemiologia`) | ✅ FASE 7.1 |
| Cards TAD/IFL/DML/IG | ✅ FASE 7.1 |
| Resumo do período | ✅ FASE 7.1 |
| Recortes por 6 dimensões | ✅ FASE 7.1 |
| Refinamentos visuais e de UX | ✅ FASE 7.2 |
| Bloco de tendência temporal real | ✅ FASE 7.2.1 |

### H.3 — Decisão

> **A FASE 7 está formalmente ENCERRADA após entrega da FASE 7.2.1.**

Todos os itens do escopo original foram entregues. A tela psicossocial e a tela ergonômica
**não integram a FASE 7** — são escopos da FASE 8, condicionados a prompt explícito do usuário.

---

## I. Próximo passo seguro

Estado atual: `FASE 7 ENCERRADA | AGUARDANDO ABERTURA DA FASE 8`

A FASE 8 (painel integrado de inteligência / telas psicossocial e ergonômica) está **bloqueada**
até que o usuário emita prompt formal de abertura com escopo, proibições e critérios de aceite.

Possibilidades antes da FASE 8 (não automáticas):
- **FASE 7.3** — Sub-tela de Recorte por CID (`/afastamentos/epidemiologia/cid`)
- **FASE 7.4** — Exportação do relatório epidemiológico (PDF/Excel)
- Outros refinamentos pontuais indicados pelo usuário

Nenhuma dessas fases se abre automaticamente. O usuário decide o próximo prompt.

---

## J. Artefatos modificados nesta microfase

| Artefato | Tipo de modificação |
|---|---|
| `src/lib/afastamentos-epidemiologia-contrato.ts` | Adição de tipos `EpidemiologyTrendPoint`, `EpidemiologyTrend`; campo `trend`; funções `generateMonthlyWindows`, `buildTrendPoint`, `buildTrend`; versão 4.3.0 |
| `src/lib/afastamentos-epidemiologia-page-utils.ts` | Import `EpidemiologyTrend`; tipos `EpidemiologyTrendPointModel`, `EpidemiologyTrendModel`; campo `trend` em `EpidemiologyPageModel`; função `buildTrendModel`; atualização de `buildEpidemiologyPageModel` e `buildLoadingPageModel` |
| `src/app/afastamentos/epidemiologia/page.tsx` | Import `EpidemiologyTrendModel`; componente `TrendTable`; destructuring com `trend`; substituição do bloco roadmap |
| `src/lib/tests/afastamentos-epidemiologia-page-utils.test.ts` | Import `EpidemiologyTrend`; fixture `buildMinimalTrend`; campo `trend` em `buildMinimalContract`; 6 novos testes |
| `src/lib/tests/afastamentos-epidemiologia-consumo.test.ts` | Atualização `contractVersion` 4.2.0 → 4.3.0 |
| `src/lib/tests/afastamentos-epidemiologia-endpoint.test.ts` | Atualização `contractVersion` 4.2.0 → 4.3.0 (2 ocorrências) |
| `docs/ABSENTEISMO_INTELIGENTE_FASE_7_2_1_BLOCO_DE_TENDENCIA.md` | Criado (este documento) |
| `docs/SESMT_SYSTEM_DOCUMENTATION.md` | Atualizado — entrada FASE 7.2.1 + encerramento FASE 7 |
