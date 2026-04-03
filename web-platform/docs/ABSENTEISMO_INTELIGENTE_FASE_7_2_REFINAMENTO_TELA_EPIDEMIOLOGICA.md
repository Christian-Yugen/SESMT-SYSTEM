# FASE 7.2 — Refinamento Funcional e Visual da Tela Epidemiológica Geral

**Programa:** Inteligência Unificada em Absenteísmo Ocupacional — SESMT-SYSTEM
**Microfase:** 7.2
**Status:** ENTREGUE
**Data:** 2026-04-02
**Pré-requisito cumprido:** FASE 7.1.1 ENCERRADA (validação funcional + correção psychosocial.ts)

---

## A. Objetivo da microfase

Refinar funcionalmente e visualmente a Tela Epidemiológica Geral já entregue na FASE 7.1,
melhorando legibilidade, consistência de apresentação, UX e clareza analítica.

Nenhuma nova tela foi criada. Nenhum módulo legado foi alterado.
As decisões sobre recorte CID e bloco de tendência estão formalizadas neste documento.

---

## B. Pontos auditados

| Área | Problema identificado |
|---|---|
| Cards executivos | Labels eram apenas siglas (TAD/IFL/DML/IG) sem semântica imediata |
| Cards executivos | Sem ícone visual associado a cada indicador |
| Cards executivos | Cards com `available: false` (N/D) não tinham distinção visual de opacidade |
| Recortes — coluna DML | Cor `text-amber-700` sugeria warning, mas DML é o indicador mais estável |
| Recortes — glossário | Colunas TAD/IFL/DML/IG sem nenhuma legenda próxima à tabela |
| Bloco de tendência | Visual idêntico ao de "erro" (border slate, ícone Info cinza) |
| Reload da consulta | Sem feedback visual durante reconsulta (dados prévios visíveis sem indicador) |
| Bloco de erro | Sem botão "Tentar novamente" no estado de erro |
| Datas na UI | `periodLabel` exibia formato ISO (2026-01-01) em vez de pt-BR (01/01/2026) |

---

## C. Refinamentos aplicados

### C.1 — Cards executivos: labels mais descritivos

**Antes:**
- label: "TAD" / "IFL" / "DML" / "IG"
- helperText: "Taxa de Absenteísmo por Doença" (sem referência à sigla)

**Depois:**
- label: "Absenteísmo" / "Freq. Licenças" / "Dur. Média" / "Gravidade"
- helperText: "TAD — Taxa de Absenteísmo por Doença" / "IFL — ..." / "DML — ..." / "IG — ..."

O card agora exibe o significado diretamente no título e mantém a sigla como referência no helperText.

### C.2 — Cards executivos: ícones contextuais

Adicionado `icon` a cada card usando ícones já importados no arquivo:

| Card | Ícone |
|---|---|
| Absenteísmo (TAD) | `TrendingUp` |
| Freq. Licenças (IFL) | `Activity` |
| Dur. Média (DML) | `Clock` |
| Gravidade (IG) | `AlertTriangle` |

Função `getCardIcon(id)` adicionada como helper de módulo (antes do componente `CutTable`).

### C.3 — Cards executivos: opacidade para estado N/D

Cards com `available: false` recebem `className="opacity-60"`, tornando visualmente
claro que o indicador não é calculável (denominador insuficiente). Antes, apenas o
valor "N/D" indicava o problema.

### C.4 — Tabelas de recorte: glossário de colunas

Adicionada linha de glossário abaixo do título de cada tabela de recorte:

```
TAD·Absenteísmo  IFL·Freq.  DML·Dur.Média  IG·Gravidade
```

Estilizada como `text-[9px] font-medium text-slate-400 uppercase tracking-wide`.

### C.5 — Tabelas de recorte: cor DML corrigida

**Antes:** `text-amber-700` (conotação de alerta/aviso)
**Depois:** `font-semibold text-[#1A3351]` (destaque institucional neutro)

DML é o único indicador sempre disponível — não faz sentido marcá-lo com cor de aviso.

### C.6 — Formatação de datas em pt-BR

Adicionado helper `formatDateBR(isoDate)` em `afastamentos-epidemiologia-page-utils.ts`.

`periodLabel` passa de `"2026-01-01 a 2026-01-31"` para `"01/01/2026 a 31/01/2026"`.

### C.7 — Banner de atualização durante reconsulta

Quando o usuário clica "Consultar" com dados prévios já carregados (`loading && hasLoaded`),
exibe banner azul institucional com ícone de refresh animado:

> `Atualizando indicadores...`

Antes só havia animação nos valores dos cards, sem contexto claro para o usuário.

### C.8 — Botão "Tentar novamente" no estado de erro

Adicionado botão inline no bloco de erro que chama `fetchContract(startDate, endDate)`.
O botão fica desabilitado durante o loading e usa o mesmo visual de link sublinhado vermelho.

### C.9 — Bloco de tendência: visual de roadmap planejado

**Antes:** `border-l-slate-300` + ícone `Info` cinza — visual de limitação/aviso.

**Depois:** `border-l-[#1A3351]/30` + ícone `TrendingUp` azul institucional + título
"Análise de Tendência Temporal · Previsto para versão futura" em azul suave.

O bloco agora comunica claramente que é uma funcionalidade planejada, não uma falha.

---

## D. Decisão sobre recorte CID

**Decisão: NÃO incluir recorte CID na UI epidemiológica nesta fase.**

**Justificativas:**

1. **Volume:** CID por capítulo pode conter 20–30 linhas. A tabela de recorte atual não tem
   capacidade de search/filter — exibir CID neste formato degradaria a legibilidade.

2. **Dado disponível mas sem UX adequada:** O contrato já inclui `cidCapitulo` no campo
   `contract.cuts.cidCapitulo`, mas a apresentação correta de CIDs requer no mínimo:
   - Descrição legível do código (ex: "CAP_A" → "Capítulo A — Doenças Infecciosas")
   - Mecanismo de busca/filtro
   - Possível colapso por relevância clínica

3. **Próximo ciclo adequado:** O recorte CID pertence a uma sub-tela dedicada com interação
   (FASE 7.3+), não a uma tabela flat dentro da tela epidemiológica geral.

**Status:** `FORA DO ESCOPO VISUAL — diferido para FASE 7.3+`

---

## E. Decisão sobre bloco de tendência

**Decisão: MANTER o bloco de tendência como aviso de funcionalidade planejada.**

**Justificativas:**

1. **Contrato atual é agregado por período** — não possui granularidade temporal para série.

2. **Tendência requer múltiplas janelas** — a análise necessita de N consultas consecutivas
   com janelas mensais/trimestrais, o que exige mudância no motor de consulta (FASE 8+).

3. **Comunicar explicitamente ao usuário** que a ausência de gráfico de tendência é
   um limite de versão, não erro de dados — evita ambiguidade operacional.

**Refinamento aplicado:** O bloco foi estilizado como "roadmap planejado" (azul institucional)
em vez de "limitação/erro" (cinza/aviso). A mensagem foi reescrita para deixar claro
que é funcionalidade prevista para o próximo ciclo do programa.

**Status:** `MANTIDO COM VISUAL CORRIGIDO — série temporal diferida para FASE 8+`

---

## F. Garantias de não interferência

| Escopo proibido | Tocado? |
|---|---|
| `/afastamentos/cid-analytics` | ❌ Não |
| Tela psicossocial | ❌ Não |
| Tela ergonômica | ❌ Não |
| Legado operacional (afastamentos, ASO, abono) | ❌ Não |
| `afastamentos-epidemiologia-contrato.ts` | ❌ Não |
| `afastamentos-epidemiologia-application.ts` | ❌ Não |
| Rota `epidemiologia-view/route.ts` | ❌ Não |

---

## G. Testes executados

### G.1 — Novo teste adicionado

**Arquivo:** `src/lib/tests/afastamentos-epidemiologia-page-utils.test.ts`

```
"buildEpidemiologyPageModel: summary.periodLabel formata datas no padrao pt-BR DD/MM/AAAA"
→ Verifica que "2026-01-01 a 2026-01-31" vira "01/01/2026 a 31/01/2026"
```

### G.2 — Resultado da suíte

```
npm run test:absenteismo
→ tests 90 | pass 90 | fail 0
```

Incremento de 89 → 90 (1 teste novo, zero regressão).

### G.3 — Typecheck

```
npx tsc --noEmit | grep "epidemiolog|page-utils"
→ (sem saída) → zero erros novos
```

---

## H. Limitações remanescentes

1. **Recorte CID:** disponível no contrato mas não exposto na UI — diferido para FASE 7.3+.
2. **Série temporal:** requer motor multi-janela — diferida para FASE 8+.
3. **Validação com dados reais em navegador:** não executada nesta microfase (ambiente sem browser).
4. **Labels de CID:** `cidCapitulo[*].key` retorna códigos técnicos (ex: "CAP_A") sem
   descrição legível — precisará de dicionário de tradução antes de exibição.

---

## I. Próximo passo seguro

A FASE 7.2 está encerrada. O estado atual é:

`FASE 7.1 ENTREGUE | FASE 7.1.1 ENCERRADA | FASE 7.2 ENTREGUE | AGUARDANDO PRÓXIMA FASE`

Próximo passo sugerido (NÃO automático — aguarda prompt explícito do usuário):

**FASE 7.3** — Sub-tela de Recorte por CID/Capítulo
- Requer: dicionário de capítulos CID-10 em pt-BR
- Requer: componente de tabela com busca inline
- Pode ser implementada como sub-rota `/afastamentos/epidemiologia/cid` ou como modal
- Gate: deve ser autorizada por prompt explícito com escopo e proibições definidos

Alternativa: avançar para outra dimensão visual do Programa (painel integrado, comparativo
de períodos, etc.) antes de CID — a ser definido pelo usuário.
