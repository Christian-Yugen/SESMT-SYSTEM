# Relatório de Correção - Alinhamento de Header (abono/portarias)

## Objetivo
Alinhar a tela `abono/portarias` ao design system consolidado do cabeçalho, mantendo regras de negócio e fluxos funcionais originais.

## Arquivos alterados
- `src/app/abono/portarias/page.tsx`

## Enquadramento aplicado no design system
- Título institucional mantido à esquerda com identidade visual existente da tela.
- Busca principal migrada para o padrão compacto com `CompactFilterBar`.
- Ação primária de criação (`Nova Portaria`) migrada para ação compacta com `ActionIconButton` (desktop), preservando botão mobile já existente.
- Chips de filtro adicionados via `FilterChips`, exibindo apenas filtro real de busca ativo.
- Botão de limpar filtros passou a seguir comportamento global do `CompactFilterBar` (apenas quando há filtro ativo).
- Não foram criados filtros artificiais (data/usuário/secretaria/tipo foram explicitamente desativados nesta tela).

## Regras preservadas
- Nenhuma regra de negócio foi alterada.
- Nenhum fluxo funcional de geração, edição, listagem ou exportação de portarias foi alterado.
- A lógica de permissões (ex.: `analytic_manager` sem ação de criação) foi preservada.

## Validação executada
- Build: `npm run build` ✅
- Typecheck: validado no build do Next.js ✅
- Lint no escopo alterado: `npx eslint src/app/abono/portarias/page.tsx` ⚠️
  - Resultado: sem novos erros relacionados ao header.
  - Permanecem pendências legadas pré-existentes no arquivo (ex.: `no-explicit-any`, `prefer-const`, imports não usados, `exhaustive-deps`).

## Consistência visual e regressão
- Header da tela ficou consistente com o padrão aplicado nas demais telas da Fase 5.
- Estrutura final: título à esquerda, busca compacta central, ações compactas à direita, chips condicionais e clear condicional.
- Não foram identificadas regressões funcionais durante validação de build e revisão da interação de busca/ações.
