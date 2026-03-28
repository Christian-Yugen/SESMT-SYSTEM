# FASE 5 — GOVERNANÇA FINAL DO PADRÃO DE FILTROS E HEADER

> **SESMT SYSTEM** — Branch: `standardized-filter-header`
> Data de consolidação: 27/03/2026
> Status: **PADRÃO OFICIAL FINALIZADO**

---

## 1. Estrutura oficial do header

Toda tela do sistema deve seguir a estrutura abaixo **sem exceções**:

```
┌──────────────────────────────────────────────────────────────────┐
│  [ícone] TÍTULO         [CompactFilterBar]         [ActionIconButton(s)] │
│  subtítulo institucional                                          │
├──────────────────────────────────────────────────────────────────┤
│  [FilterChips — exibidos apenas quando há filtros ativos]        │
└──────────────────────────────────────────────────────────────────┘
```

### Regras estruturais

| Posição | Elemento | Obrigatório |
|---|---|---|
| Esquerda | Título + subtítulo institucional com ícone | Sim |
| Centro | `CompactFilterBar` (busca principal + filtros contextuais) | Sim |
| Direita | Bloco de `ActionIconButton` para ações primárias | Condicional |
| Abaixo | `FilterChips` para filtros ativos | Condicional |

- **Proibido**: subheader residual separado para ações ou filtros.
- **Proibido**: input de busca solto fora do `CompactFilterBar`.
- **Proibido**: botão de "ZERAR FILTROS" fora do ecossistema do `CompactFilterBar`.
- **Proibido**: filtros em blocos externos ao header.

---

## 2. Componentes obrigatórios

| Componente / Utilitário | Localização | Responsabilidade |
|---|---|---|
| `CompactFilterBar` | `src/components/filters/CompactFilterBar.tsx` | Container da busca e filtros no header |
| `ActionIconButton` | `src/components/filters/ActionIconButton.tsx` | Ações compactas h-9 w-9 à direita do header |
| `FilterChips` | `src/components/filters/FilterChips.tsx` | Chips visuais dos filtros ativos abaixo do header |
| `countActiveFilters` | `src/components/filters/filtersUtils.ts` | Contagem global dos filtros ativos |
| `clearAllFilters` | Local em cada página | Função que reseta todos os filtros ao estado padrão |
| `matchesUnifiedNameCpfSearch` | `src/components/filters/filtersUtils.ts` | Busca unificada Nome + CPF |
| `normalizeSearchTerm` | `src/components/filters/filtersUtils.ts` | Normalização do termo de busca |
| `normalizeCpfDigits` | `src/components/filters/filtersUtils.ts` | Normalização de dígitos de CPF para comparação |

---

## 3. Regras oficiais do design system

### 3.1 Busca

- Busca Nome + CPF unificada em campo único.
- Implementada com `matchesUnifiedNameCpfSearch`.
- Normalização via `normalizeSearchTerm` e `normalizeCpfDigits`.
- Debounce de **180ms** para evitar render excessivo durante digitação.

### 3.2 Botão global de limpar filtros

- Renderizado **apenas quando `activeCount > 0`**.
- Deve resetar todos os filtros e fechar todos os popovers abertos.
- Usa variante `danger` do `ActionIconButton`.
- Ícone: `X` (lucide-react).
- Tooltip: `"Limpar filtros ativos"`.
- `clearAllFilters` deve ser implementado em cada página e cobrir **todos** os filtros da tela.

### 3.3 Cards de ação / filtro

- Tamanho padrão: `h-9 w-9`.
- Bordas quadradas (`rounded-none`).
- Tooltip escuro padronizado: fundo `#1A3351`, texto branco, uppercase, tracking-wider, delay 150ms.
- Animação: `hover:scale-110 active:scale-95`.

### 3.4 Variantes oficiais do ActionIconButton

| Variante | Uso | Aparência |
|---|---|---|
| `filter` | Filtros contextuais no header | Branco/slate inativo, azul marinho ativo |
| `primary` | Ações principais (ex.: buscar) | Azul marinho (`#1A3351`) |
| `success` | Ações de criação | Verde esmeralda |
| `danger` | Limpar filtros, excluir | Vermelho (`#E31E24`) |
| `contextual` | Filtros de alerta / situacionais | Âmbar inativo, marrom escuro ativo |

---

## 4. Filtros contextuais

Filtros contextuais **devem sempre estar integrados ao header** como ícones compactos. Nunca em subheader separado.

### Regras

- Ativados via `ActionIconButton` com variante `filter` ou `contextual`.
- Conteúdo exibido em **popover** (dropdown vinculado ao botão).
- Devem fechar ao clicar fora do popover.
- Devem gerar **chip no `FilterChips`** quando ativos (valor diferente de padrão/`"all"`).
- Devem ser incluídos na contagem do `countActiveFilters` ou no `headerActiveFilterCount` quando contextuais à tela.

### Exemplos aprovados

| Filtro | Tela | Variante |
|---|---|---|
| Turno | Evidências | `filter` |
| Natureza do cargo | Afastamentos Analytics | `contextual` |
| Tipo de afastamento | Afastamentos | `filter` |
| Status de solicitação | Deletion Requests | `contextual` |
| Modo Nome / CPF | Archive | `filter` |
| Tipo de documento | History | `filter` |
| Subtipos de ASO | History | `filter` (dependente) |

---

## 5. Filtros dependentes

Quando um filtro depende da seleção de outro, o comportamento **aprovado** é:

1. O filtro derivado **abre automaticamente** após a seleção do filtro pai.
2. **Não exigir clique extra** do usuário para acessar o filtro derivado.
3. O popover pai deve **fechar antes** do popover filho abrir, sem sobreposição visual.
4. O delay padrão para a transição é de **150–200ms**.

### Exemplo canônico (History)

```
Tipo de Documento → seleciona "ASO"
  └─ Popover pai fecha (150ms)
     └─ Popover de Subtipos de ASO abre automaticamente (200ms)
```

### Implementação de referência

```typescript
// CompactFilterBar.tsx — fecha popover pai após seleção
useEffect(() => {
  if (openPopover === "asoType" && filterAsoType !== "all") {
    const timer = setTimeout(() => setOpenPopover(null), 150);
    return () => clearTimeout(timer);
  }
}, [filterAsoType, openPopover]);

// history/page.tsx — abre popover filho com delay
useEffect(() => {
  if (filterType === "ASO") {
    const timer = setTimeout(() => setIsAsoSubtypeOpen(true), 200);
    return () => clearTimeout(timer);
  } else {
    setIsAsoSubtypeOpen(false);
    setFilterAsoSubtype("all");
  }
}, [filterType]);
```

---

## 6. Padrão de multi-seleção

Quando um filtro admite múltiplos valores simultâneos, o padrão aprovado é:

- Popover com **checkboxes** para cada opção disponível.
- `FilterChips` deve refletir **cada item selecionado** individualmente.
- `clearAllFilters` deve resetar o array de seleção para o estado vazio/padrão.
- A contagem do `countActiveFilters` deve incrementar **1 por item selecionado** ou **1 pelo grupo** conforme semântica da tela.
- Nenhum bloco de multi-seleção pode existir fora do ecossistema do header.

---

## 7. Exceções permitidas

### 7.1 Ocultação de filtros via props

Telas que não utilizam determinados filtros padrão do `CompactFilterBar` devem ocultá-los usando props opcionais:

```tsx
<CompactFilterBar
  showDateFilter={false}
  showSecretariaFilter={false}
  showAsoTypeFilter={false}
  showUserFilter={false}
  ...
/>
```

**Nunca** remover o `CompactFilterBar`; apenas ocultar o que não se aplica.

### 7.2 Ações específicas

Ações específicas da tela são permitidas como `ActionIconButton` no bloco direito do header, desde que:
- Usem variante adequada (`success` para criar, `primary` para ações neutras).
- Mantenham o tamanho `h-9 w-9`.
- Preservem tooltip padronizado.

### 7.3 Telas sem filtros reais

Telas que possuem apenas busca (sem filtros contextuais adicionais) devem manter a estrutura visual completa do header. O `CompactFilterBar` fica em modo busca-only, com todos os demais filtros desativados via props.

---

## 8. Checklist oficial para futuras migrações

Use este checklist ao migrar qualquer nova tela para o padrão do design system de header:

### Fase 1 — Mapeamento
- [ ] Listar todos os filtros existentes na tela
- [ ] Listar todas as ações do header/toolbar atual
- [ ] Classificar cada elemento:
  - `busca principal` — vai para o `CompactFilterBar`
  - `filtro contextual` — vira `ActionIconButton + popover`
  - `ação` — vira `ActionIconButton` no bloco direito
  - `multi-select` — segue padrão de seção 6
  - `dependente` — segue padrão de seção 5

### Fase 2 — Migração
- [ ] Importar `CompactFilterBar`, `ActionIconButton`, `FilterChips`
- [ ] Importar `countActiveFilters`, `normalizeSearchTerm` de `filtersUtils`
- [ ] Implementar `clearAllFilters` cobrindo todos os filtros da tela
- [ ] Implementar `headerActiveFilterCount` com `countActiveFilters` + filtros contextuais extras
- [ ] Substituir header antigo pela estrutura oficial (título + filtros + ações)
- [ ] Integrar `FilterChips` abaixo do header com todos os filtros ativos
- [ ] Usar `activeFilterCount={headerActiveFilterCount}` no `CompactFilterBar`

### Fase 3 — Validação
- [ ] `npm run build` — build e typecheck passando
- [ ] `npx eslint [arquivo]` — sem novos erros no escopo alterado
- [ ] Confirmar que clear button aparece apenas com filtros ativos
- [ ] Confirmar que chips aparecem apenas com filtros ativos
- [ ] Confirmar ausência de regressão funcional
- [ ] Confirmar consistência visual com demais telas

### Fase 4 — Entrega
- [ ] Commit isolado por tela ou etapa relacionada
- [ ] Mensagem de commit no padrão: `refactor(<tela>): align header with design system`

---

## 9. Telas migradas — registro final

| Tela | Rota | Status | Commit principal |
|---|---|---|---|
| Evidências | `/` (home) — aba evidências | ✅ Migrada | `bdb4ee8` |
| Histórico | `/history` | ✅ Migrada | `9d09f62` |
| Abono | `/abono` | ✅ Migrada | `b28a715` |
| Afastamentos | `/afastamentos` | ✅ Migrada | `bbb8412` |
| Analytics | `/analytics` | ✅ Migrada | `f16f87d` |
| Consolidação Fase 5B | — | ✅ Concluída | `42fb6b9` |
| Fase 5B.1 — subheaders contextuais | — | ✅ Concluída | `680ecf8` |
| Fase 5B.2 — unificação ação/clear | — | ✅ Concluída | `707ae81` |
| Fase 5B.3 — ícones semânticos e tooltips | — | ✅ Concluída | `ab9d911` |
| Fase 5B.4 — subtipo ASO automático | `/history` | ✅ Concluída | `886eaf7` |
| Fase 5B.5 — transição popover ASO | `/history` | ✅ Concluída | `3fc3914` |
| Fase 5B.6 — clear button afastamentos analytics | `/afastamentos/analytics` | ✅ Concluída | `1da8ef4` |
| Archive | `/archive` | ✅ Migrada | `3396e9f` |
| Users | `/users` | ✅ Migrada | `9e41cc7` |
| Deletion Requests | `/deletion-requests` | ✅ Migrada | `9e41cc7` |
| Home | `/` | ✅ Migrada | `9e41cc7` |
| Abono Portarias | `/abono/portarias` | ✅ Migrada | `c7d6448` |

---

## 10. Referências de implementação

### Componentes do design system

```
src/components/filters/
├── CompactFilterBar.tsx     # Container de busca + filtros compactos
├── ActionIconButton.tsx     # Botão de ação h-9 w-9 com tooltip e variantes
├── FilterChips.tsx          # Chips visuais de filtros ativos
├── SearchField.tsx          # Campo de busca padronizado (usado pelo CompactFilterBar)
├── SelectFilter.tsx         # Select estilizado para filtros em popover
└── filtersUtils.ts          # Utilitários: countActiveFilters, normalizeSearchTerm, etc.
```

### Paleta de cores oficial

| Token | Valor | Uso |
|---|---|---|
| Azul institucional | `#1A3351` | Fundo do header, títulos, filtros ativos |
| Vermelho | `#E31E24` | Borda inferior do header, ações de danger |
| Cinza header | `#B0B0B0` | Background do header |
| Cinza página | `#D3D3D3` | Background da página |
| Âmbar contextual (ativo) | `#7C2D12` | Filtros contextuais ativos |
| Âmbar contextual (inativo) | `#FDE68A / #F59E0B` | Filtros contextuais inativos |

---

*Documento gerado como parte do encerramento da Fase 5 do projeto de padronização do design system de filtros e headers do SESMT SYSTEM.*
