# PROGRESSO MIGRAÇÃO FILTROS — FASE 5
**Última atualização:** 27 de março de 2026  
**Status:** Pausa para snapshot — Pronto para retomada

---

## 1. FASES COMPLETAS (1-5 Parcial)

### Fase 1 — Regressão Cruzada & History Validation
- ✅ **Status:** Concluída
- **Data:** 26-27 de março de 2026
- **Commit:** 9d09f62 `feat(history): adopt compact filter toolbar pattern`
- **Validação:** Build + Lint verde, regressão cruzada em EVIDÊNCIAS + history
- **Resultado:** Componentes compartilhados estáveis, history migration aprovada

### Fase 2 — Preparação para Abono
- ✅ **Status:** Concluída
- **Data:** 27 de março de 2026 (manhã)
- **Ação:** Validação de contrato, confirmação de padrão, autorização para iniciar abono
- **Validação:** Regressão cruzada mínima (EVIDÊNCIAS + history com novo padrão)
- **Resultado:** Componentes compartilhados certificados como reutilizáveis

### Fase 3 — Migração Abono
- ✅ **Status:** Concluída
- **Data:** 27 de março de 2026 (tarde)
- **Commit:** b28a715 `feat(abono): adopt compact filter toolbar pattern`
- **Validação:** 
  - Build: ✓ Compiled successfully in 10.5s
  - TypeScript: ✓ Strict type check passed
  - Lint: ✓ Exit code 0
  - Type guards: ✓ Arrays filtrados corretamente
- **Resultado:** Abono operacionalmente funcional com padrão de filtros consolidado

### Fase 4 — Regularização de Governança & Regressão Cruzada
- ✅ **Status:** Concluída
- **Data:** 27 de março de 2026 (tarde, após commit b28a715)
- **Ações:**
  1. Correção de nomenclatura: "Fase 4: Abono" → "Fase 5 — Migração gradual"
  2. Validação de escopo: 2 arquivos alterados, 1415 insertions = 100% migração
  3. Mapeamento contrato Fase 4: 6/6 cláusulas aplicadas em abono
  4. Regressão cruzada: EVIDÊNCIAS + history + abono (3 telas): PASS em todas
- **Resultado:** Abono formalmente aprovada, zero regressões detectadas

### Fase 5 — Migração Gradual (EM ANDAMENTO)
- ⏳ **Status:** Iniciada, pausa para snapshot
- **Telas Completadas:** referrals (EVIDÊNCIAS), history, abono
- **Próxima Tela:** afastamentos
- **Fases Restantes:** 4 telas pendentes (afastamentos, acidente_trabalho, relatórios, configurações)

---

## 2. TELAS MIGRADAS

### ✅ EVIDÊNCIAS (referrals)
- **Arquivo:** `web-platform/src/app/referrals/page.tsx`
- **Tipo:** Piloto original
- **Padrão:** CompactFilterBar (com user filter) + FilterChips
- **Filtros:** searchTerm, startDate, endDate, filterUser, filterSecretaria, filterAsoType
- **Status:** Operacional, piloto reference para outras telas
- **Commit Original:** Anterior a esta sessão

### ✅ HISTORY
- **Arquivo:** `web-platform/src/app/history/page.tsx`
- **Tipo:** Segunda tela migrada (após validação cruzada)
- **Padrão:** CompactFilterBar (com user filter) + FilterChips + estado estendido (filterShift, selectedAsoSubtypes)
- **Filtros:** searchTerm, startDate, endDate, filterUser, filterSecretaria, filterAsoType + filterShift + selectedAsoSubtypes
- **Status:** Estável pós-migração
- **Commit:** 9d09f62 (26 de março)

### ✅ ABONO
- **Arquivo:** `web-platform/src/app/abono/page.tsx`
- **Tipo:** Terceira tela migrada
- **Padrão:** CompactFilterBar (SEM user filter — `showUserFilter={false}`) + FilterChips (com `extraChips` para status)
- **Filtros:** searchTerm, startDate, endDate, filterSecretaria, filterAsoType + statusFilter (local, não em FilterState)
- **Adaptações:** 
  - User filter hidden (abono não filtra por operador)
  - Status chip adicionado dinamicamente em FilterChips
  - asoTypeLabelDefault = "NATUREZA CARGO" (campo específico da tela)
- **Status:** Operacional, padrão adaptativo validado
- **Commit:** b28a715 (27 de março)

---

## 3. PADRÃO APLICADO

### 3.1 Componentes Reutilizáveis

**CompactFilterBar** (`web-platform/src/components/filters/CompactFilterBar.tsx`)
- Props:
  - `searchTerm: string` / `setSearchTerm: (v: string) => void` — busca principal
  - `startDate: string` / `setStartDate: (v: string) => void` — data início
  - `endDate: string` / `setEndDate: (v: string) => void` — data fim
  - `isDateFilterOpen: boolean` / `setIsDateFilterOpen: (v: boolean) => void` — popover de período
  - `filterUser: string` / `setFilterUser: (v: string) => void` — filtro de operador
  - `filterSecretaria: string` / `setFilterSecretaria: (v: string) => void` — filtro de secretaria
  - `filterAsoType: string` / `setFilterAsoType: (v: string) => void` — filtro de tipo ASO/natureza
  - `uniqueUsersList: string[]` — lista de operadores únicos
  - `uniqueSecretarias: string[]` — lista de secretarias únicas
  - `referrals: ReferralOperatorEntry[]` — dados de referência para operadores
  - `operatorsMap: Record<string, string>` — mapa nome→operador
  - `clearAllFilters: () => void` — callback de reset
  - `searchPlaceholder?: string` — customizar placeholder (default "BUSCAR...")
  - `userLabelDefault?: string` — label do filtro de user (default "OPERADORES")
  - `secretariaLabelDefault?: string` — label do filtro de secretaria (default "SECRETARIAS")
  - `asoTypeLabelDefault?: string` — label do filtro de tipo/natureza (default "ASO TYPE")
  - `asoTypeOptions?: string[]` — opções de tipo/natureza (default derivado de dados)
  - **`showUserFilter?: boolean`** — NOVO em Phase 5: mostrar/esconder filtro de user (default true)
- Renderização: Linha única com ícones de filtro (date, user*, secretaria, asoType), popover de período, clearAll botão
- Compatibilidade: Regressivamente compatível com referrals/history (showUserFilter implícito true)

**FilterChips** (`web-platform/src/components/filters/FilterChips.tsx`)
- Props:
  - `searchTerm: string` — busca normalizada
  - `startDate: string` — data início
  - `endDate: string` — data fim
  - `filterUser: string` — filtro de operador
  - `filterSecretaria: string` — filtro de secretaria
  - `filterAsoType: string` — filtro de tipo/natureza
  - `referrals: ReferralOperatorEntry[]` — dados
  - `operatorsMap: Record<string, string>` — mapa de nomes
  - **`extraChips?: Array<{ key: string; label: string }>`** — NOVO: chips adicionais customizados
- Renderização: Chips dinâmicos de filtros ativos (busca, período, operador, secretaria, tipo) + extraChips
- Comportamento: Chips desaparecem quando filtro é resetado, aparecem ao aplicar

**filtersUtils** (`web-platform/src/components/filters/filtersUtils.ts`)
- Tipos:
  - `FilterState` — interface base: searchTerm, startDate, endDate, filterUser, filterSecretaria, filterAsoType
- Funções:
  - `matchesUnifiedNameCpfSearch(nome: string, cpf: string, searchTerm: string): boolean` — busca unified (nome + CPF normalizado)
  - `normalizeSearchTerm(term: string): string` — normalização para exibição

### 3.2 Padrão de Estado (FilterState)

```typescript
interface FilterState {
  searchTerm: string;
  startDate: string;
  endDate: string;
  filterUser: string;
  filterSecretaria: string;
  filterAsoType: string;
}

// Cada tela inicia com:
const INITIAL_FILTERS: FilterState = {
  searchTerm: "",
  startDate: "",
  endDate: "",
  filterUser: "all",
  filterSecretaria: "all",
  filterAsoType: "all",
};

const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

// Setters para cada campo:
const setSearchTerm = (value: string) => {
  setFilters((prev) => ({ ...prev, searchTerm: value }));
};
// ... idem para outros campos

// Extrair valores:
const { searchTerm, startDate, endDate, filterSecretaria, filterAsoType } = filters;
```

### 3.3 Pipeline de Busca Normalizado

1. **Debounce Local (180ms):**
   ```typescript
   useEffect(() => {
     const timer = setTimeout(() => {
       setDebouncedSearchTerm(filters.searchTerm);
     }, 180);
     return () => clearTimeout(timer);
   }, [filters.searchTerm]);
   ```

2. **Filtro Unificado:**
   ```typescript
   const filteredRecords = useMemo(() => {
     return records.filter((record) => {
       const matchesSearch = matchesUnifiedNameCpfSearch(
         record.nome,
         record.cpf,
         debouncedSearchTerm,
       );
       const matchesSecretaria = secretariaFilter === "all" || record.secretaria === secretariaFilter;
       const matchesAsoType = asoTypeFilter === "all" || record.aso_type === asoTypeFilter;
       let matchesPeriod = true;
       if (startDate || endDate) {
         const recDate = record.data_field ? new Date(record.data_field + "T00:00:00") : null;
         if (recDate) {
           if (startDate && recDate < new Date(startDate + "T00:00:00")) matchesPeriod = false;
           if (endDate && recDate > new Date(endDate + "T00:00:00")) matchesPeriod = false;
         } else {
           matchesPeriod = false;
         }
       }
       return matchesSearch && matchesSecretaria && matchesAsoType && matchesPeriod;
     });
   }, [records, debouncedSearchTerm, secretariaFilter, asoTypeFilter, startDate, endDate]);
   ```

### 3.4 Busca Unificada: Nome + CPF

```typescript
// Em filtersUtils.ts:
export function matchesUnifiedNameCpfSearch(
  nome: string,
  cpf: string,
  searchTerm: string,
): boolean {
  if (!searchTerm) return true;
  const normalized = normalizeSearchTerm(searchTerm);
  const nomeLower = (nome || "").toLowerCase();
  const cpfCleaned = cpf.replace(/\D/g, "");
  return nomeLower.includes(normalized) || cpfCleaned.includes(normalized);
}

export function normalizeSearchTerm(term: string): string {
  return term.toLowerCase().replace(/\s+/g, " ").trim();
}
```

### 3.5 Type Guards para Arrays

```typescript
// Exemplo de filtro seguro em abono:
const secretarias = useMemo(() => {
  const unique = new Set(
    records
      .map((r) => r.secretaria)
      .filter((value): value is string => Boolean(value)),
  );
  return Array.from(unique).sort();
}, [records]);
```

---

## 4. REGRAS DE GOVERNANÇA EM USO

### 4.1 Protocolo de Migração
- **Uma tela por commit:** Cada tela é migrada em um commit atômico isolado
- **Contrato estrita:** Seguir exatamente o padrão Fase 4 (FilterState + debounce + search unified + CompactFilterBar + FilterChips)
- **Adaptações permitidas:** Props customizados (`showUserFilter`, labels, opciones), não alteração de componentes base
- **Variação indevida proibida:** Nenhuma alteração a design system, estrutura ou named exports
- **Validação pré-commit:** Build (strict TypeScript) + Lint (exit 0) obrigatórios

### 4.2 Nomenclatura Oficial
- **Fase 5 — Migração gradual:** Logo migração de múltiplas telas (referrals/history/abono/...)
- **Tela concluída X:** Cada merge é registrado como "tela concluída X"
- **Regressão cruzada:** Após cada tela nova, validar zero impacto em telas anteriores

### 4.3 Escopo de Alteração
- **Permitido:** Consolidação de estado → CompactFilterBar/FilterChips → type guards → imports limpos
- **Proibido:** Mudanças a regras de negócio, alteração a lógica de dados, novas colunas, mudanças de schema

### 4.4 Checklist de Aprovação
- ✅ FilterState consolidado (INITIAL_FILTERS + [filters, setFilters])
- ✅ Debounce 180ms implementado
- ✅ matchesUnifiedNameCpfSearch integrado
- ✅ CompactFilterBar renderizado com props corretos
- ✅ FilterChips renderizado com chips dinâmicos
- ✅ Build: `npm run build` (compile success, TypeScript strict)
- ✅ Lint: `npm run lint` (exit 0)
- ✅ Regressão cruzada: Zero impacto em telas anteriores
- ✅ Commit atômico: Mensagem "feat(tela): adopt compact filter toolbar pattern"

---

## 5. ORDEM DE EXECUÇÃO RESTANTE

### Telas a Migrar (4 remaining)

1. **AFASTAMENTOS** (`web-platform/src/app/afastamentos/page.tsx`)
   - Tipo: Gestão de afastamentos (licenças, faltas, afastamentos diversos)
   - Padrão a aplicar: FilterState + CompactFilterBar (full) + FilterChips
   - Filtros esperados: searchTerm, startDate, endDate, filterUser, filterSecretaria, filterAsoType
   - Considerações: Pode ter filtros adicionais de status de afastamento (tipo de afastamento)
   - Estimado: 1 commit

2. **ACIDENTE TRABALHO** (`web-platform/src/app/acidente_trabalho/page.tsx` ou similar)
   - Tipo: Registro de acidentes e incidentes de trabalho
   - Padrão a aplicar: FilterState + CompactFilterBar (full) + FilterChips
   - Filtros esperados: searchTerm, startDate, endDate, filterUser, filterSecretaria, filterAsoType
   - Considerações: Pode requerir chips adicionais para status de acidente
   - Estimado: 1 commit

3. **RELATÓRIOS** (`web-platform/src/app/relatorios/page.tsx` ou similar)
   - Tipo: Geração e visualização de relatórios
   - Padrão a aplicar: FilterState + CompactFilterBar (possível sem user filter) + FilterChips
   - Filtros esperados: searchTerm, startDate, endDate, filterSecretaria, filterAsoType (± filterUser)
   - Considerações: Pode ter filtros específicos de tipo de relatório
   - Estimado: 1 commit

4. **CONFIGURAÇÕES** (`web-platform/src/app/configuracoes/page.tsx` ou similar)
   - Tipo: Painel de administração/configuração do sistema
   - Padrão a aplicar: FilterState + CompactFilterBar (SEM user filter normalmente) + FilterChips
   - Filtros esperados: Possível sem filtros complexos; validar escopo
   - Considerações: Pode ser tela de settings sem filtros; avaliar se aplica padrão
   - Estimado: 1 commit (ou skip se padrão não aplicável)

### Sequência Recomendada de Migração
1. afastamentos (mais crítica, segue padrão full)
2. acidente_trabalho (médica prioridade)
3. relatórios (setup de relatórios)
4. configurações (se aplicável)

**Importante:** Após cada migração, executar regressão cruzada com telas anteriores antes de aprovar.

---

## 6. INSTRUÇÕES DE RETOMADA

### 6.1 Contexto de Retomada
Este arquivo foi criado em: **27 de março de 2026 14:30 (UTC-3)**

Último commit realizado:
- Commit: b28a715
- Mensagem: `feat(abono): adopt compact filter toolbar pattern`
- Data: 27 de março de 2026

Último estado de regressão cruzada: ✅ PASS (referrals + history + abono)

### 6.2 Passos para Retomada

1. **Verificar Estado do Git**
   ```powershell
   cd c:\Users\Usuário\Desktop\SESMT
   git log --oneline | head -5
   git branch
   ```
   Esperado: branch `standardized-filter-header`, último commit `b28a715`

2. **Verificar Build Atual**
   ```powershell
   cd web-platform
   npm run build
   # Esperado: compile success
   ```

3. **Iniciar Próxima Tela**
   - Abrir `web-platform/src/app/afastamentos/page.tsx`
   - Seguir exactly o checklist de aprovação (seção 4.4)
   - Aplicar CompactFilterBar + FilterChips
   - Executar build + lint antes de commit
   - Commit atômico: `git commit -m "feat(afastamentos): adopt compact filter toolbar pattern"`
   - Regressão cruzada: Validar EVIDÊNCIAS + history + abono + afastamentos

4. **Após Cada Nova Tela**
   - Update arquivo PROGRESSO_FILTROS_FASE5.md (adicionar tela à seção 2)
   - Confirmar zero regressões
   - Aprovar formalmente
   - Commit snapshot: `git commit -m "docs: update migration progress (tela concluída)"`

### 6.3 Troubleshooting

**Se build falhar:**
- Verificar TypeScript errors: `npm run build` output
- Type guards em arrays são comuns; usar `filter((value): value is Type => Boolean(value))`
- Remover imports não utilizados

**Se lint falhar com exit 1:**
- Verificar `npm run lint 2>&1 | head -50`
- Warnings legados (any types, complexity) são OK; erros bloqueadores não
- Se necessário, revisar componente e limpar imports/tipos

**Se regressão detectada:**
- Não commitar; revisar mudanças
- Possíveis causas: Props incompatíveis, mudança de interface, import incorreto
- Voltar para last good commit e revisar padrão

### 6.4 Contato de Referência

- CompactFilterBar: `web-platform/src/components/filters/CompactFilterBar.tsx`
- FilterChips: `web-platform/src/components/filters/FilterChips.tsx`
- filtersUtils: `web-platform/src/components/filters/filtersUtils.ts`
- Exemplos de migração já feita: referrals, history, abono (todas em `web-platform/src/app/`)

---

## 7. DECISÕES TÉCNICAS REGISTRADAS

### 7.1 Busca Unificada: Nome + CPF (OFICIAL)
- **Decisão:** Normalizar busca em campo "Nome" E "CPF" como padrão
- **Implementação:** `matchesUnifiedNameCpfSearch(nome, cpf, searchTerm)`
- **Pipeline:** Nome em minúsculas + CPF com apenas dígitos
- **Aplicação:** Todas as telas (referrals, history, abono, next)
- **Razão:** Usuários podem buscar por nome OU CPF; unificar reduz confusão

### 7.2 Debounce: 180ms Local / 500ms Remoto (PADRÃO)
- **Debounce Local:** 180ms para normalizar termo de busca antes de filtrar dados em memória
- **Debounce Remoto:** 500ms para queries ao banco (se aplicável em futuro)
- **Implementação:** useEffect com setTimeout
- **Validação:** Já testada em referrals/history/abono
- **Razão:** Balance entre UX (responsivo) e performance (sem spam)

### 7.3 FilterState Centralizado (OBRIGATÓRIO)
- **Decisão:** State único `FilterState` para todoOS filtros, não useState's individuais
- **Benefício:** Consolidação, clareza, facilitação de reset
- **Estrutura:**
  ```typescript
  interface FilterState {
    searchTerm: string;
    startDate: string;
    endDate: string;
    filterUser: string;
    filterSecretaria: string;
    filterAsoType: string;
  }
  ```
- **Extensão:** Telas com filtros adicionais estendem FilterState (ex: history com filterShift + selectedAsoSubtypes)
- **Razão:** Compatibilidade com CompactFilterBar + FilterChips que esperam esse contrato

### 7.4 Componentes Agnósticos (DESIGN SYSTEM)
- **CompactFilterBar:** Não contém lógica de negócio; apenas renderiza filtros e popover
- **FilterChips:** Não contém lógica de negócio; apenas renderiza chips ativos
- **Adaptabilidade:** Props customizáveis (labels, opciones, showUserFilter, extraChips)
- **Razão:** Reutilização máxima; zero duplicação de código

### 7.5 Type Guards em Arrays Dinâmicos
- **Padrão:** `filter((value): value is string => Boolean(value))`
- **Aplicação:** Ao gerar listas únicas (secretarias, operadores, tipos)
- **Razão:** TypeScript strict mode exige garantia de tipo não undefined
- **Validação:** Já testada em abono (secretarias/naturezas)

### 7.6 Regressão Cruzada Obrigatória Pós-Merge
- **Checklist:**
  - ✅ EVIDÊNCIAS: busca, chips, ícones, limpar, stats, visual
  - ✅ History: busca, chips, ícones, limpar, stats, visual
  - ✅ Abono: busca, chips, ícones, limpar, stats, visual
  - ✅ Next: similar
- **Crítico:** Zero impacto em telas anteriores; se detectado, rollback e debug

---

## 8. NOTAS FINAIS

Este arquivo documenta o **estado estável** após concluir 3 telas (referrals/EVIDÊNCIAS, history, abono) em Fase 5.

**Pronto para retomada em:** Qualquer momento
**Sem perda de contexto:** Todas as decisões, padrões, e próximas ações registradas
**Garantia:** Desenvolvimento pode ser resumido identicamente ao estado atual sem retrabalho

Próximo agente que retomar deve:
1. Ler este arquivo completamente
2. Verificar git log (confirm commit b28a715)
3. Executar `npm run build` para validar ambiente
4. Iniciar migração de afastamentos seguindo seção 6.2

---

**Fim de snapshot. Estado: PRESERVADO ✅**
