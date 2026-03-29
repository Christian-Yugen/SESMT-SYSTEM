# FASE 7 — GOVERNANÇA FINAL: DESIGN SYSTEM DE CARDS ESTATÍSTICOS

> **Status:** ✅ Concluída  
> **Branch:** `feat/statistics-card-design-system`  
> **Data de conclusão:** 29 de março de 2026  
> **Repositório:** `Christian-Yugen/SESMT-SYSTEM`

---

## 1. Estrutura Oficial dos Cards Estatísticos

O design system de cards estatísticos é composto por três primitivos canônicos:

### `StatisticCard`
Componente folha. Renderiza um único card com valor, título e acento visual.

```tsx
import { StatisticCard } from "@/components/statistics/StatisticCard";

<StatisticCard
  title="Total de Registros"
  value={stats.total}
  subtitle="itens"
  icon={<FileText className="h-3.5 w-3.5" />}
  accent="primary"
  variant="informative"
/>
```

### `StatisticCardRow`
Wrapper de grid responsivo. Aceita `columns` de 2 a 6 e distribui os cards em CSS Grid com breakpoints padronizados.

```tsx
import { StatisticCardRow } from "@/components/statistics/StatisticCardRow";

<StatisticCardRow columns={4} className="shrink-0">
  {/* StatisticCard components */}
</StatisticCardRow>
```

**Mapa de colunas responsivo (`COLUMN_CLASS_MAP`):**

| `columns` | Classe Tailwind |
|-----------|-----------------|
| 2 | `grid-cols-1 sm:grid-cols-2` |
| 3 | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| 4 | `grid-cols-2 lg:grid-cols-4` |
| 5 | `grid-cols-2 lg:grid-cols-5` |
| 6 | `grid-cols-2 lg:grid-cols-6` |

### `StatisticCardsSection`
Wrapper semântico de seção, quando necessário para separação de contexto visual dentro de uma mesma tela.

### ⛔ Proibição de blocos inline antigos

A partir da Fase 7, **é proibido** criar novos cards estatísticos com blocos inline que incluam qualquer um dos padrões abaixo:

```tsx
// ❌ PROIBIDO — blocos inline legados
<div className="shadow-lg rounded-xl border-l-4 border-primary ...">
<div className="hover:scale-105 ...">
<div className="min-h-[80px] ...">
<div className="bg-white rounded-none ...">
```

Todo novo card deve usar exclusivamente `StatisticCard` + `StatisticCardRow`.

---

## 2. Variantes Oficiais

| Variante | Uso | Background |
|----------|-----|------------|
| `informative` | Telas administrativas e operacionais sem interação nos cards | `bg-white` |
| `analytic` | Telas de análise, dashboards e relatórios | `bg-[#FCFCFC]` |
| `interactive` | Cards clicáveis que atuam como filtro ou seleção | `bg-white` com `hover` e estado `active` |

```tsx
// Tela administrativa
<StatisticCard variant="informative" ... />

// Dashboard analítico
<StatisticCard variant="analytic" ... />

// Card com clique (filtro ativo)
<StatisticCard variant="interactive" active={activeFilter === "asos"} onClick={() => setFilter("asos")} ... />
```

---

## 3. Acentos Oficiais

O acento controla a cor da borda lateral (`border-l-4`) e a cor do ícone/valor.

| Acento | Cor Principal | Uso Recomendado |
|--------|--------------|-----------------|
| `neutral` | `slate-400/600` | Cards sem destaque semântico |
| `primary` | `#1A3351` (azul institucional) | Totais gerais e métricas primárias |
| `success` | `emerald-500/700` | Indicadores positivos |
| `warning` | `amber-500/700` | Indicadores de atenção |
| `danger` | `#E31E24` (vermelho institucional) | Indicadores críticos ou negativos |
| `info` | `blue-600/700` | Métricas informativas secundárias |

```tsx
<StatisticCard accent="primary" title="Total" value={stats.total} ... />
<StatisticCard accent="success" title="Aprovadas" value={approvedCount} ... />
<StatisticCard accent="warning" title="Pendentes" value={pendingCount} ... />
<StatisticCard accent="danger"  title="Rejeitadas" value={rejectedCount} ... />
```

---

## 4. Regras Visuais Oficiais

O design system de cards segue princípios de **compactação vertical** e **baixo ruído visual**:

### Altura compacta
- Cards devem ter baixa altura. Nenhum `min-h` fixo deve ser aplicado.
- Padding: `px-3 py-2 sm:px-3.5 sm:py-2.5` — compacto e responsivo.

### Borda lateral de acento
- Sempre presente via `border-l-4` com cor definida pelo `accent`.
- A borda lateral é o único elemento de destaque cromático forte no card.

### Tipografia compacta
- Label do título: `text-[10px] font-semibold uppercase tracking-widest text-slate-500`
- Valor principal: `tabular-nums` para estabilidade durante atualizações de valor.
- Subtítulo: `text-[9px]` ou `text-[10px]` em tom suavizado.

### `tabular-nums`
Obrigatório no elemento de valor para evitar jitter horizontal em atualizações numéricas.

### Hover sem jitter
- `transition-all duration-150` no container do card.
- Sem `scale` ou `transform` em variantes `informative` e `analytic`.
- Variante `interactive` usa escala mínima (`hover:scale-[1.01]` se necessário) com `will-change: transform`.

### Estado ativo discreto
- Variante `interactive` com `active={true}` aplica cor de borda reforçada e fundo levemente tingido.
- Sem outline externo ou box-shadow pesada.

### Uso reduzido de sombra
- `shadow-sm` máximo em repouso.
- Nenhum `shadow-lg` ou `shadow-xl` nos cards.

### Foco em compactação vertical
- O conjunto de cards deve ocupar o mínimo de espaço vertical possível para deixar espaço ao conteúdo principal da tela.
- `gap-2 lg:gap-3` entre cards (definido em `StatisticCardRow`).

---

## 5. Regras de Semântica

### Cards não devem alterar cálculos
O valor exibido no card deve derivar **exclusivamente** de estado ou cálculo já existente na tela. Nenhuma lógica de derivação nova deve ser introduzida no ato de migração.

### Cards não devem alterar filtros
A migração visual não deve alterar como os dados são filtrados, paginados ou ordenados. O dataset exposto ao card deve ser idêntico ao da implementação anterior.

### Cards clicáveis devem apenas refletir comportamento já existente
A variante `interactive` só deve ser usada quando a tela **já possuía** alguma interação no card (ex.: clique que ativa filtro). Não deve ser usada para introduzir nova lógica de interação.

### Telas analíticas devem preferir `variant="analytic"`
Telas cujo propósito primário é exibir métricas e gráficos (ex.: `/analytics`, `/abono/analytics`, `/afastamentos/analytics`, `/referrals`) devem usar `variant="analytic"`.

### Telas administrativas devem preferir `variant="informative"`
Telas de gerenciamento e operação (ex.: `/history`, `/abono/portarias`, `/deletion-requests`) devem usar `variant="informative"`.

### Telas operacionais com clique real podem usar `variant="interactive"`
Quando o card possui clique funcional que já existia na tela (ex.: `/afastamentos`, `/abono`), usar `variant="interactive"` com `active` e `onClick` devidamente mapeados.

---

## 6. Checklist para Futuras Migrações

Use este checklist ao migrar cards de qualquer nova tela para o design system:

```
[ ] 1. Mapear todos os cards existentes na tela (nome, valor, posição)
[ ] 2. Identificar se cada card é: informativo, analítico ou clicável
[ ] 3. Confirmar que os cálculos/fontes de dados existentes serão preservados integralmente
[ ] 4. Escolher variant correta (informative / analytic / interactive)
[ ] 5. Escolher accent correto para cada card (semântica de cor)
[ ] 6. Migrar apenas a camada visual — zero alteração em lógica, filtros ou estado
[ ] 7. Preservar comportamentos responsivos especiais (col-span, hidden sm:block, etc.)
[ ] 8. Adicionar className="shrink-0" no StatisticCardRow
[ ] 9. Executar eslint → sem warnings ou erros novos
[ ] 10. Executar tsc --noEmit → clean
[ ] 11. Executar next build → todas as rotas compilando sem erros
[ ] 12. Confirmar redução de espaço vertical em relação ao bloco anterior
[ ] 13. Commit isolado com escopo feat(statistics) ou refactor(statistics)
```

---

## 7. Telas Migradas na Fase 7

| Tela | Rota | Variante | Cards | Status | Commit |
|------|------|----------|-------|--------|--------|
| Afastamentos (lista) | `/afastamentos` | `interactive` | 4 | ✅ | `aedd9a1` |
| Abono (lista) | `/abono` | `interactive` | 4 | ✅ | `2f0a0d0` |
| Afastamentos Analytics | `/afastamentos/analytics` | `analytic` | 4 | ✅ | `384b917` |
| Referrals | `/referrals` | `analytic` | 3 | ✅ | `5ede44f` |
| Abono Analytics | `/abono/analytics` | `analytic` | 4 | ✅ | `ef34bf6` |
| Abono Portarias | `/abono/portarias` | `informative` | 3 | ✅ | `53a2f1d` |
| History | `/history` | `informative` | 4 | ✅ | `c4d236d` |
| Analytics | `/analytics` | `analytic` | 6 | ✅ | `3fa9de0` |
| Deletion Requests | `/deletion-requests` | `informative` | 3 | ✅ | `746fcd7` |
| Revisão de consistência | — | — | 3 arquivos | ✅ | `86b72c9` |

**Total de cards migrados:** 35 cards em 9 telas.

### Detalhes de migração por tela

**`/afastamentos`** — 4 cards interativos (Total Registros, Afastamentos Ativos, Mês Atual, Servidores). Cards substituem bloco com `hover:scale-105` e `shadow-lg`. Comportamento de clique preservado.

**`/abono`** — 4 cards interativos. Comportamento de clique preservado; `active` estado corretamente mapeado para filtro existente.

**`/afastamentos/analytics`** — 4 cards analíticos (Total de Registros, Afastamentos Ativos, Total Dias Afastados, Servidores Diferentes). `shrink-0` adicionado na revisão 7.12.

**`/referrals`** — 3 cards analíticos (Registros, Sustentabilidade, Auditores). `shrink-0` adicionado na revisão 7.12.

**`/abono/analytics`** — 4 cards analíticos (Total de Benefícios, Abonos Ativos, Servidores Diferentes, Secretarias). `shrink-0` adicionado na revisão 7.12.

**`/abono/portarias`** — 3 cards informativos. Card "Sustentabilidade" preserva `col-span-2 lg:col-span-1` para comportamento mobile correto.

**`/history`** — 4 cards informativos (Total Registros, ASOs Emitidos, ENC Emitidos, Operadores).

**`/analytics`** — 6 cards analíticos (Documentos, ASOs, Encaminhamentos, Secretarias, Período Manhã, Período Tarde). Maior grid da aplicação: `columns={6}`.

**`/deletion-requests`** — 3 cards informativos (Pendentes, Aprovadas, Rejeitadas). Card "Rejeitadas" preserva `hidden sm:block` (oculto em mobile, conforme comportamento original).

---

## 8. Conclusão Executiva

A **Fase 7** do projeto SESMT-SYSTEM foi concluída integralmente em 29 de março de 2026.

### O que foi realizado

- Implementação do design system de cards estatísticos (`StatisticCard`, `StatisticCardRow`) como primitivos reutilizáveis e padronizados.
- Migração de **35 cards** distribuídos em **9 telas** da aplicação para o novo sistema visual.
- Estabelecimento de regras formais de variantes, acentos, semântica e tipografia.
- Revisão global de consistência com correção de 3 arquivos na subfase 7.12.

### O que não foi alterado

- **Nenhuma lógica de negócio foi modificada.**
- **Nenhum cálculo, derivação ou transformação de dados foi alterado.**
- **Nenhum filtro, estado ou comportamento de interação foi introduzido ou removido.**
- **Nenhuma rota, endpoint ou estrutura de dados foi afetada.**

A migração foi estritamente visual: apenas a camada de renderização de cards foi substituída, preservando integralmente toda a lógica das telas.

### Estado pronto para expansão

O design system de cards está consolidado e pode ser aplicado a novas telas sem ambiguidade. As regras de variante, acento e comportamento responsivo estão documentadas e testadas em produção via build verificado (`next build` limpo em todas as subfases).

A branch `feat/statistics-card-design-system` está pronta para revisão e merge via Pull Request.

---

*Documento gerado como encerramento formal da Fase 7 — Design System de Cards Estatísticos.*
