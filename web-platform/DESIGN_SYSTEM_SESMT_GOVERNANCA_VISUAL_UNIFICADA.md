# DESIGN SYSTEM SESMT - Governanca Visual Unificada (Canonica)

Status: ATIVO
Versao: 1.0.0
Ultima atualizacao: 2026-03-30
Abrangencia: Web Platform SESMT

## 1) Autoridade e precedencia

Este arquivo e a fonte unica de verdade para UI/UX visual do sistema.

Ordem de precedencia obrigatoria:
1. Este documento.
2. Implementacao dos componentes base.
3. Documentos historicos:
   - FASE5_GOVERNANCA_FINAL_FILTROS.md
   - FASE7_GOVERNANCA_FINAL_CARDS.md

Se houver conflito entre documentos, prevalece este documento.

## 2) Objetivo de produto

Padronizar experiencia visual e reduzir divergencias entre modulos.
O sistema deve manter:
- Alta legibilidade operacional.
- Densidade informacional controlada.
- Consistencia entre modulos de listagem e analytics.
- Responsividade previsivel em mobile e desktop.

## 3) Linguagem visual oficial

Direcao visual oficial:
- Base de superficie: cinzas neutros (estrutura e contraste).
- Cor institucional: azul profundo #1A3351.
- Cor de alerta/acao critica: vermelho #E31E24.
- Sem arredondamento ornamental: preferir rounded-none.
- Sombras contidas: shadow-sm ate shadow-xl somente quando houver hierarquia real.
- Tipografia utilitaria com caixa alta em titulos de controle e labels curtos.

Nao permitido:
- Reintroduzir barras pesadas de controle em titulo de lista.
- Misturar estilos de card fora dos componentes base.
- Criar novos padroes de filtro fora do ecossistema CompactFilterBar + ActionIconButton + FilterChips.

## 4) Header e filtros (governanca obrigatoria)

Componente canonico de header de filtros:
- CompactFilterBar

Componente canonico de acoes iconicas:
- ActionIconButton

Componente canonico de estado de filtros ativos:
- FilterChips

Regras:
1. Header deve concentrar busca e filtros estruturais.
2. Filtros contextuais devem entrar em extraActions do CompactFilterBar.
3. FilterChips deve refletir filtros ativos reais (incluindo extras contextuais).
4. Filtro global deve ter mecanismo claro de limpar (clearAllFilters).
5. Em mobile, filtros colapsam e expandem pelo controle do proprio CompactFilterBar.

## 5) Cards de estatistica (design system oficial)

Componentes canonicos:
- StatisticCard
- StatisticCardRow
- StatisticCardsSection

Variantes oficiais de card:
- informative
- interactive
- analytic

Acentos semanticos oficiais:
- neutral
- primary
- success
- warning
- danger
- info

Regras:
1. Nao criar card estatistico fora de StatisticCard.
2. Status operacional deve ser representado prioritariamente por cards interativos.
3. Valores numericos devem manter leitura forte e consistente.
4. Usar helper/subtitle somente quando agrega contexto real.

## 6) Responsividade canonica

Regra de grid dos cards (M2 consolidado):
- Base: 1 coluna.
- A partir de 390px: maximo 2 colunas nos blocos multi-card.
- Grade ampla em telas grandes: progressao em lg conforme contexto.

Implementacao de referencia:
- columns=2 -> grid-cols-1 min-[390px]:grid-cols-2
- columns=3 -> grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-3
- columns=4 -> grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-4
- columns=5 -> grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-5
- columns=6 -> grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-6

Nao permitido:
- Forcar 3+ colunas em largura mobile estreita.
- Quebrar consistencia de breakpoint sem justificativa de negocio.

## 7) Arquitetura de responsabilidade UX em listagens

Distribuicao oficial de responsabilidades:
1. Status macro da lista -> cards estatisticos.
2. Filtros estruturais/contextuais -> header de filtros.
3. Ordenacao rapida da lista -> barra de titulo da lista.

Regras de barra de titulo da lista:
- Deve conter titulo da secao + SortAlphaToggle + contador.
- Nao deve concentrar selects volumosos de filtro.
- Deve manter leitura imediata e foco no conteudo.

Componente canonico de ordenacao rapida:
- SortAlphaToggle

## 8) Padrao aplicado nos modulos criticos

Padrao ja aplicado e obrigatorio de manter:
- Evidencias (/referrals)
- Historico (/history)
- Afastamentos (/afastamentos)
- Abono (/abono)
- Portarias de Abono (/abono/portarias)

Regra de manutencao:
- Novas alteracoes nesses modulos devem preservar a divisao de responsabilidade do item 7.

## 9) Diretrizes de implementacao para novos modulos

Ao criar modulo novo com listagem:
1. Reutilizar CompactFilterBar no header.
2. Declarar filtros contextuais via extraActions com ActionIconButton.
3. Exibir FilterChips para estado ativo.
4. Usar StatisticCardRow + StatisticCard para sumario e/ou status.
5. Usar SortAlphaToggle na barra de titulo da lista.
6. Garantir comportamento responsivo canonico (item 6).

## 10) Antipadroes proibidos

1. Duplicar controle de status no header e na barra da lista sem necessidade.
2. Colocar filtros complexos fora do fluxo de filtros do header.
3. Criar variante visual de card sem extensao dos tipos oficiais.
4. Quebrar nomenclatura de acento/variant sem atualizar sistema central.
5. Alterar comportamento visual para resolver problema de logica de negocio.

## 11) Processo de mudanca desta governanca

Mudancas neste documento exigem:
1. Justificativa tecnica e de UX.
2. Lista de arquivos impactados.
3. Validacao em telas mobile e desktop.
4. Confirmacao de que nao houve alteracao de regra de negocio.

Checklist minimo por mudanca:
- Lint
- Typecheck
- Build
- Revisao visual das paginas impactadas

## 12) Mapa de referencia tecnica

Componentes centrais:
- src/components/filters/CompactFilterBar.tsx
- src/components/filters/ActionIconButton.tsx
- src/components/filters/FilterChips.tsx
- src/components/filters/SortAlphaToggle.tsx
- src/components/statistics/StatisticCard.tsx
- src/components/statistics/StatisticCardRow.tsx
- src/components/statistics/StatisticCardsSection.tsx

Paginas de referencia do padrao de listagem:
- src/app/history/page.tsx
- src/app/referrals/page.tsx
- src/app/afastamentos/page.tsx
- src/app/abono/page.tsx
- src/app/abono/portarias/page.tsx

Documentos historicos:
- FASE5_GOVERNANCA_FINAL_FILTROS.md
- FASE7_GOVERNANCA_FINAL_CARDS.md

---

## Clausula operacional para agentes futuros

Qualquer agente (humano ou IA) deve tratar este documento como contrato visual obrigatorio.
Quando houver duvida de implementacao, priorizar reuso de componente canonico em vez de criar nova variacao local.
