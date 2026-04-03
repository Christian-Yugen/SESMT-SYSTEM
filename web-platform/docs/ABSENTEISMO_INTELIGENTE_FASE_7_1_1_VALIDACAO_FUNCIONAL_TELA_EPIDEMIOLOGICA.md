# FASE 7.1.1 — Validação Funcional da Tela Epidemiológica Geral

**Programa:** Inteligência Unificada em Absenteísmo Ocupacional — SESMT-SYSTEM
**Microfase:** 7.1.1
**Status:** ENCERRADA
**Data:** 2026-04-03
**Pré-requisito cumprido:** FASE 7.1 ENTREGUE (89/89 testes, tela disponível em `/afastamentos/epidemiologia`)

---

## A. Objetivo da microfase

Validar funcionalmente a tela epidemiológica implementada na FASE 7.1 por análise estática de código,
verificação formal de tipos e execução da suíte de testes, dado que a validação com dados reais em
navegador não é disponível no ambiente de desenvolvimento do agente.

Objetivos secundários:
- Registrar limitações funcionais observadas para orientar ciclos futuros de melhoria.
- Analisar e decidir sobre o erro TypeScript pré-existente em `afastamentos-psychosocial.ts:528`,
  que era independente da tela epidemiológica, mas bloqueava `next build`.
- Produzir decisão formal sobre prontidão para abertura da FASE 7.2.

---

## B. Escopo validado

| Artefato | Resultado |
|---|---|
| `src/app/afastamentos/epidemiologia/page.tsx` | ✅ Revisão estática — sem erros TS, lógica correta |
| `src/app/api/absenteismo/epidemiologia-view/route.ts` | ✅ Revisão estática — autenticação Bearer, validação de datas correta |
| `src/lib/afastamentos-epidemiologia-page-utils.ts` | ✅ Revisão estática — todos os utilitários corretos |
| `src/lib/tests/afastamentos-epidemiologia-page-utils.test.ts` | ✅ 14/14 testes passando |
| `src/components/layout/Sidebar.tsx` | ✅ Link Epidemiologia presente e correto (linhas 256–266) |
| `package.json` | ✅ Todos os 9 scripts `test:absenteismo-*` presentes |
| `src/lib/afastamentos-psychosocial.ts` | ✅ Erro pré-existente corrigido (linha 538) |

---

## C. Comportamento observado (validação estática)

### C.1 — Estado de carregamento

A página inicializa via `buildLoadingPageModel()` — todos os 4 cards exibem `"—"` com
`available: false`, impedindo que dados parciais sejam renderizados antes da resposta da API.
A flag `hasLoaded` controla a transição do estado de loading para o estado de dados.

### C.2 — Tratamento de erro

Quando `fetchContract()` falha (HTTP 4xx/5xx ou erro de rede), o estado é populado via
`buildFetchError(message)`, que seta `available: false` e propagando a mensagem de erro
para o usuário. O componente `EpidemiologyErrorCard` é renderizado condicionalmente.

### C.3 — Cards executivos

Quatro `StatisticCard` com valores TAD, IFL, DML e IG são renderizados após
`buildEpidemiologyPageModel(contract)` — cobre 14 cenários de teste incluindo
payload completo, payload vazio e valores de borda.

### C.4 — Seção de resumo

`EpidemiologySummarySection` exibe a contagem de ocorrências, dias totais e
período formatado conforme `EpidemiologySummaryModel`.

### C.5 — Recortes

`CutTable` é renderizado para cada um dos 6 recortes disponíveis:
sexo, faixa etária, tempo de serviço, secretaria/órgão, cargo/função e local de trabalho.
O componente é reutilizável e internamente correto.

### C.6 — Rota view API

A rota `/api/absenteismo/epidemiologia-view` implementa o padrão dual-client:
- `authClient` (anon key) para validar o token Bearer da sessão do browser
- `dataClient` (service role) para executar as queries no Supabase sem RLS do usuário

A validação de datas rejeita range inválido com HTTP 400. Token ausente ou inválido
retorna HTTP 401. Erro interno retorna HTTP 500 com mensagem genérica (sem vazar stack).

---

## D. Limitações registradas

### D.1 — Recorte CID ausente na UI

O contrato epidemiológico (`EpidemiologyContract`) inclui o campo `byDisease`
(recorte por CID/doença), mas a tela não o exibe. Esta lacuna **não é um bug** —
foi decisão intencional da FASE 7.1 de priorizar os recortes mais utilizados.
O recorte por CID pode ser incorporado em ciclo futuro de melhoria visual.

### D.2 — Sem série temporal na tela

A tela exibe agregados do período completo (janela de 12 meses padrão) mas não
possui gráfico ou tabela de evolução mensal/trimestral. Esta limitação é esperada
nesta versão inicial e consta no backlog da FASE 7 como funcionalidade futura.

### D.3 — Validação com dados reais não executada

Não foi possível abrir o navegador para validar a renderização com dados reais do
banco de desenvolvimento. A validação foi integralmente estática (análise de código,
typecheck, testes unitários). Testes de integração com dados reais ficam indicados
para ambiente de staging com revisão humana.

---

## E. Erro pré-existente em `afastamentos-psychosocial.ts:528` — análise e decisão

### E.1 — Natureza do erro

**Arquivo:** `src/lib/afastamentos-psychosocial.ts`
**Função:** `getActivePsychosocialFactors`
**Linha original (bug):**
```ts
status: factor.is_active ? "ATIVO" : "INATIVO",
```
**Causa:** TypeScript infere o tipo do ternário como `string` (tipo amplo) em vez da
union literal `"ATIVO" | "INATIVO"` exigida pela interface `PsychosocialFactorCatalogEntry`.

### E.2 — Independência do domínio

O erro está no domínio psicossocial (NR-1) e é completamente independente
da tela epidemiológica. Nenhum arquivo da FASE 7.1 referencia ou é referenciado
por `getActivePsychosocialFactors`.

### E.3 — Impacto no build

Apesar de ser independente da tela epidemiológica, o erro é verificado durante
`next build` (typecheck global) e bloqueia a produção. Portanto, **precisa ser
sanado antes da abertura de qualquer nova fase visual**.

### E.4 — Correção aplicada

**Linha corrigida:**
```ts
status: (factor.is_active ? "ATIVO" : "INATIVO") as "ATIVO" | "INATIVO",
```

A correção é mínima (cast explícito), não altera lógica, não modifica
nenhuma interface, não altera comportamento em runtime.

### E.5 — Verificação pós-correção

```
npx tsc --noEmit | grep "epidemiolog|psychosocial|error TS"
→ (sem saída) → zero erros nos arquivos alvo

npm run test:absenteismo
→ tests 89 | pass 89 | fail 0
```

---

## F. Decisão formal — prontidão para FASE 7.2

### F.1 — Critérios de entrada verificados

| Critério | Status |
|---|---|
| FASE 7.1 entregue (tela + rota + testes) | ✅ Confirmado |
| 89/89 testes passando sem regressão | ✅ Confirmado |
| Zero erros TypeScript nos arquivos FASE 7.1 | ✅ Confirmado (typecheck executado) |
| Erro pré-existente que bloqueia build corrigido | ✅ Corrigido em psychosocial.ts:538 |
| Limitações funcionais registradas formalmente | ✅ Seção D |
| Escopo proibido intacto (cid-analytics, legado) | ✅ Nenhum arquivo tocado |

### F.2 — Decisão

> **A FASE 7.2 está AUTORIZADA a ser aberta mediante prompt explícito do usuário.**

A tela epidemiológica está funcionalmente correta dentro dos limites validados.
O erro que bloqueava o build foi corrigido e verificado. Nenhum artefato legado
foi alterado. A suíte de testes permanece íntegra.

**Condição:** A abertura da FASE 7.2 só ocorre mediante instrução explícita do usuário.
Este documento não autoriza execução automática da próxima fase.

---

## G. Próximo passo seguro

O usuário deve emitir o prompt formal de abertura da FASE 7.2 quando decidir avançar.

O prompt deve conter:
- Identificação da microfase (7.2 — Tela Psicossocial ou 7.2 — outra funcionalidade)
- Escopo permitido e escopo proibido
- Pré-requisitos e gate de entrada
- Formato de entrega esperado

Até que esse prompt seja emitido, o sistema permanece no estado:
`FASE 7.1 ENTREGUE | FASE 7.1.1 ENCERRADA | AGUARDANDO 7.2`

---

## H. Artefatos modificados nesta microfase

| Artefato | Tipo de modificação |
|---|---|
| `src/lib/afastamentos-psychosocial.ts` | Correção de tipo (linha 538) — 1 linha |
| `docs/ABSENTEISMO_INTELIGENTE_FASE_7_1_1_VALIDACAO_FUNCIONAL_TELA_EPIDEMIOLOGICA.md` | Criado (este documento) |
| `docs/SESMT_SYSTEM_DOCUMENTATION.md` | Atualizado — entrada de índice adicionada |

Nenhum outro arquivo foi criado ou modificado nesta microfase.
