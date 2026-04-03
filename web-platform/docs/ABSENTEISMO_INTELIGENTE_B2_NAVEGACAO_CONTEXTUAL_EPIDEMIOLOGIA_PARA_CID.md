# Microfase B2 — Navegação Contextual: Epidemiologia → CID Analytics

**Commit:** `da8a290`  
**Branch:** `feat/unified-absenteeism-intelligence-program`  
**Status:** ✅ Concluída

---

## Objetivo

Permitir que o analista clique em um capítulo CID no bloco executivo "Agravos Dominantes do Período"
(Epidemiologia Geral) e seja direcionado ao CID Analytics **já com o filtro de capítulo pré-selecionado**
e **mantendo o período da consulta de origem**.

---

## Estratégia técnica

**Mecanismo:** query params via `router.push` do Next.js App Router.

**URL gerada:**
```
/afastamentos/cid-analytics?chapter=DOENÇAS+DO+APARELHO+CIRCULATÓRIO&startDate=2024-01-01&endDate=2024-12-31
```

**Parâmetros:**
| Param | Origem | Destino |
|---|---|---|
| `chapter` | `row.key` (capítulo CID) | `filterCidChapter` state |
| `startDate` | `startDate` state da página Epidemiologia | `startDate` state |
| `endDate` | `endDate` state da página Epidemiologia | `endDate` state |

---

## Mudanças implementadas

### 1. `src/app/afastamentos/cid-analytics/page.tsx` (receptor)

- `useSearchParams` importado de `next/navigation`
- `const searchParams = useSearchParams()` adicionado após `useRouter`
- `startDate` e `endDate` inicializados a partir de `searchParams.get("startDate") ?? ""`
- `filterCidChapter` inicializado a partir de `searchParams.get("chapter") ?? "all"`
- **Banner de contexto de origem**: exibido quando `chapter` ou `startDate` estão presentes na URL:
  - Label "Contexto de origem — Epidemiologia Geral"
  - Exibe o capítulo selecionado e o período da consulta
- **Wrapper `Suspense`**: `CidAnalyticsPage` renomeada para função interna; `CidAnalyticsPageWrapper` é
  o novo `export default`, envolvendo o componente em `<Suspense>` (obrigatório no App Router para
  `useSearchParams`)

### 2. `src/app/afastamentos/epidemiologia/page.tsx` (emissor)

- `ExternalLink` importado de `lucide-react`
- `CidChapterExecutiveBlock` atualizado para aceitar `startDate: string` e `endDate: string` como props
- `useRouter()` chamado **dentro** do componente para construir a URL de destino
- `handleRowClick(chapter)` monta a URL com `URLSearchParams` e chama `router.push`
- Cada `<tr>` dos capítulos CID ganha:
  - `onClick={() => handleRowClick(row.key)}`
  - `cursor-pointer` na classe CSS
  - Ícone `ExternalLink` (16 × 16, slate-300) ao final da célula do capítulo
- Rodapé atualizado: "clique no capítulo para abrir CID Analytics filtrado"
- Call site atualizado: `<CidChapterExecutiveBlock rows={cuts.cidCapitulo} startDate={startDate} endDate={endDate} />`

---

## Validação

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Sem erros |
| `npx next build` | ✅ Build limpo |
| `useSearchParams` com Suspense | ✅ Correto |
| Filtro `filterCidChapter` no CID Analytics | ✅ Já existia, inicializa do param |

---

## Comportamento esperado

1. Analista abre Epidemiologia, define período (ex: Jan–Dez 2024), visualiza "Agravos Dominantes"
2. Clica na linha "Doenças do Aparelho Circulatório"
3. Navega para `/afastamentos/cid-analytics?chapter=Doenças+do+Aparelho+Circulatório&startDate=2024-01-01&endDate=2024-12-31`
4. CID Analytics abre com:
   - Filtro de capítulo pré-selecionado para "Doenças do Aparelho Circulatório"
   - Datas já preenchidas
   - Banner azul indicando "Contexto de origem — Epidemiologia Geral" com o capítulo e o período
5. Analista pode modificar os filtros livremente após a navegação

---

## Notas de implementação

- `startDate`/`endDate` são `string` (ex: `"2024-01-01"`); passados como está no param sem transformação
- Se o período não estiver definido em Epidemiologia, os params são omitidos (`URLSearchParams` não
  adiciona params vazios graças ao `if (startDate)` guard)
- O `useRouter()` dentro de `CidChapterExecutiveBlock` é válido; o componente é sempre renderizado como
  parte de uma Client Component tree
