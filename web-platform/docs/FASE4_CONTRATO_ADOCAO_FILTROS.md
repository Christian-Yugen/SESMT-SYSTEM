# Fase 4 - Contrato de Adocao de Filtros (Padrao Plataforma)

## 1. Objetivo da Fase
Definir um contrato tecnico replicavel para adocao do padrao de filtros da tela piloto (Evidencias) nas demais telas, sem executar migracao nesta fase.

## 2. Escopo e limites
- Nao modifica comportamento da tela piloto.
- Nao modifica outras telas nesta fase.
- Nao inicia migracao global.
- Foco exclusivo em padrao de adocao, contrato e mapeamento.

## 3. Modelo padrao de filtros (referencia)
Tela de referencia: `src/app/referrals/page.tsx`

Camadas do padrao:
1. Estado consolidado (`FilterState`) por tela.
2. Barra compacta (`CompactFilterBar`) para busca principal e filtros rapidos por icone.
3. Chips de estado (`FilterChips`) para visibilidade dos filtros ativos.
4. Helpers de logica (`filtersUtils`) para normalizacao, busca unificada e contagem.

## 4. Contrato tecnico de adocao

### 4.1 Contrato de estado
Cada tela deve manter um estado unico de filtros (objeto), com shape explicito e defaults estaveis.

Exemplo base:
```ts
export type FilterState = {
  searchTerm: string;
  startDate: string;
  endDate: string;
  filterUser: string;
  filterSecretaria: string;
  filterAsoType: string;
};
```

Regras:
- Defaults padrao: strings vazias para busca/data, `all` para selects.
- `clearAllFilters` deve restaurar exatamente os defaults.
- Evitar estado duplicado para o mesmo filtro.

### 4.2 Contrato de aplicacao (pipeline)
Pipeline recomendado (ordem fixa para previsibilidade):
1. Busca principal (nome/cpf ou texto principal da tela).
2. Filtros por icone (selects/data/rapidos).
3. Filtros de painel avancado (quando aplicavel).
4. Ordenacao (sempre apos filtrar).
5. Agregacoes/metricas em cima do conjunto filtrado.

Regras:
- Predicados acumulativos com `AND`.
- Busca nome/cpf via helper padronizado (`matchesUnifiedNameCpfSearch`).
- Datas sempre comparadas com limites consistentes de inicio/fim.

### 4.3 Contrato de componentes
Uso esperado por tela:
- `CompactFilterBar`
  - Busca principal sempre visivel.
  - Filtros rapidos em icones (date/selects principais).
  - Botao de limpar filtros.
- `FilterChips`
  - Exibe resumo de filtros ativos aplicados.
- `filtersUtils`
  - `normalizeSearchTerm`
  - `normalizeCpfDigits`
  - `matchesUnifiedNameCpfSearch`
  - `countActiveFilters`

### 4.4 Contrato de comportamento
- Debounce:
  - Busca local em lista: 150ms a 250ms (padrao recomendado: 180ms).
  - Busca remota (query no banco): 400ms a 600ms (padrao recomendado: 500ms).
- Contagem de filtros:
  - Reflete somente filtros realmente aplicaveis (ignorando `all` e vazio).
- Limpeza de filtros:
  - Um unico comando de reset total.
- Normalizacao:
  - CPF sempre sem mascara para comparacao.
  - Busca textual com trim e case-insensitive.

## 5. Classificacao padrao de filtros

### 5.1 Busca principal
- Campo de maior frequencia de uso.
- Sempre visivel.
- Debounce aplicado quando for filtro local em lista grande.

### 5.2 Filtros por icone
- Filtros de uso recorrente e de alto impacto.
- Ex.: periodo, secretaria, operador, tipo.
- Exibidos em popover no `CompactFilterBar`.

### 5.3 Filtros de painel avancado
- Filtros de menor frequencia ou alto volume de opcoes.
- Ex.: cargo, natureza, subtipos multiplos, status compostos.
- Exibir em painel secundario (drawer/accordion/area expandida).

## 6. Mapeamento por tela (estado atual e adocao)

### 6.1 `src/app/referrals/page.tsx` (Evidencias)
- Estado atual: padrao completo.
- Busca principal: nome + cpf unificado.
- Icones: periodo, operador, secretaria, tipo aso.
- Painel avancado: nao necessario no momento.
- Adoacao: referencia oficial.

### 6.2 `src/app/history/page.tsx`
- Estado atual: filtros complexos e dispersos.
- Busca principal: nome/cpf.
- Icones candidatos: operador, tipo aso, secretaria, periodo, turno.
- Painel avancado: subtipos de aso e filtros multi-valor.
- Adoacao: alta prioridade na Fase 5.

### 6.3 `src/app/abono/page.tsx`
- Estado atual: filtros inline e sem contrato unico.
- Busca principal: nome/cpf.
- Icones candidatos: status, secretaria, natureza, periodo, ordenacao.
- Painel avancado: regras adicionais de renovacao.
- Adoacao: alta prioridade na Fase 5.

### 6.4 `src/app/afastamentos/page.tsx`
- Estado atual: filtros extensos, parte com debounce remoto.
- Busca principal: nome/cpf.
- Icones candidatos: status, secretaria, natureza, tipo afastamento, periodo.
- Painel avancado: cargo e filtros de suporte com carga remota.
- Adoacao: alta prioridade na Fase 5.

### 6.5 `src/app/analytics/page.tsx`
- Estado atual: filtros por select.
- Busca principal: nao obrigatoria.
- Icones candidatos: secretaria, operador, tipo, turno.
- Painel avancado: nao necessario inicialmente.
- Adoacao: media prioridade.

### 6.6 `src/app/abono/analytics/page.tsx`
- Estado atual: selects e periodo.
- Busca principal: opcional.
- Icones candidatos: secretaria, status, natureza, periodo.
- Painel avancado: nao necessario inicialmente.
- Adoacao: media prioridade.

### 6.7 `src/app/afastamentos/analytics/page.tsx`
- Estado atual: filtro simples de secretaria.
- Busca principal: nao obrigatoria.
- Icones candidatos: secretaria.
- Painel avancado: nao necessario.
- Adoacao: baixa prioridade.

### 6.8 `src/app/archive/page.tsx`
- Estado atual: busca simples com tipo de busca.
- Busca principal: nome/cpf (unificar no padrao da plataforma).
- Icones candidatos: tipo de busca (se permanecer), periodo (se aplicavel).
- Painel avancado: nao necessario inicialmente.
- Adoacao: media prioridade.

### 6.9 `src/app/users/page.tsx`
- Estado atual: busca simples por nome/email.
- Busca principal: nome/email.
- Icones candidatos: papel/perfil (quando existir).
- Painel avancado: nao necessario.
- Adoacao: baixa prioridade.

### 6.10 `src/app/deletion-requests/page.tsx`
- Estado atual: filtro por status.
- Busca principal: opcional (pode ser adicionada no futuro).
- Icones candidatos: status.
- Painel avancado: nao necessario.
- Adoacao: baixa prioridade.

### 6.11 `src/app/abono/portarias/page.tsx`
- Estado atual: busca + ordenacao.
- Busca principal: termo unico.
- Icones candidatos: ordenacao e status (se houver).
- Painel avancado: nao necessario inicialmente.
- Adoacao: media prioridade.

### 6.12 `src/app/afastamentos/portarias/page.tsx`
- Estado atual: busca simples por nome/numero.
- Busca principal: termo unico.
- Icones candidatos: tipo/periodo (se houver necessidade).
- Painel avancado: nao necessario inicialmente.
- Adoacao: media prioridade.

## 7. Matriz de adocao (fase 5)
Prioridade sugerida de migracao (sem executar nesta fase):
1. History
2. Abono
3. Afastamentos
4. Analytics
5. Archive
6. Users
7. Deletion Requests
8. Abono Portarias
9. Afastamentos Portarias

## 8. Checklist de implementacao por tela (para Fase 5)
1. Definir `INITIAL_FILTERS` e `FilterState` local.
2. Migrar busca principal para pipeline padronizado.
3. Aplicar `CompactFilterBar` com filtros por icone essenciais.
4. Exibir `FilterChips` conforme estado ativo.
5. Usar `countActiveFilters` para badge/estado visual.
6. Implementar `clearAllFilters` unico.
7. Aplicar debounce conforme tipo de busca (local vs remota).
8. Validar normalizacao (cpf/texto/data).
9. Garantir ordenacao apos filtros.
10. Validar regressao funcional da tela.

## 9. Criterios de pronto desta fase
- Mapeamento por tela definido.
- Contrato de uso de estado/componentes/helpers definido.
- Padrao visual e comportamental definido.
- Sem ambiguidade para execucao da Fase 5.

## 10. Resultado da Fase 4
Fase 4 concluida: padrao replicavel definido e base pronta para iniciar migracao gradual na Fase 5, mediante aprovacao.
