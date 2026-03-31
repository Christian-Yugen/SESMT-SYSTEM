# DESIGN SYSTEM SESMT - Governanca Visual Unificada (Canonica)

Status: ATIVO
Versao: 2.0.0
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
- Novas alteracoes nesses modulos devem preservar a anatomia canonica de item de registro do item 9.

## 9) Padrao canonico de item de registro

A anatomia canonica dos itens de registro passa a integrar oficialmente a governanca visual do SESMT-SYSTEM e deve ser observada em todos os registros existentes e futuros, salvo impossibilidade tecnica real e justificada.

### 9.1) Finalidade

Este padrao existe para:
- Acelerar a leitura operacional dos registros administrativos.
- Manter previsibilidade visual entre modulos.
- Garantir consistencia entre encaminhamentos, ASOs, afastamentos, abonos, portarias e historico.
- Permitir escalabilidade para novos tipos de registro sem improvisacao visual.
- Preservar a identidade institucional do sistema.

### 9.2) Anatomia obrigatoria do bloco central (3 linhas)

Todo item de registro administrativo deve conter um bloco central com exatamente 3 linhas de informacao:

Linha 1 — Identificacao:
- Nome do servidor (destaque principal).
- CPF mascarado (xxx.xxx.xxx-xx).

Linha 2 — Vinculo funcional:
- Cargo.
- Matricula.
- Natureza do cargo.

Linha 3 — Lotacao e contexto:
- Secretaria.
- Contrato.
- Badges especificas do modulo (tipo de ASO, tipo de afastamento, etc.).

Regras:
- As 3 linhas sao obrigatorias em todos os modulos.
- Nao pode haver implementacao parcial (ex: omitir linha 2).
- Nao pode haver omissao arbitraria dos campos base quando disponiveis no banco de dados.
- Campos indisponiveis devem exibir "Nao informado" como fallback padrao.
- Campos separados por divisor visual sutil (·).

### 9.3) Hierarquia tipografica oficial

Regras obrigatorias:
- Somente o nome do servidor deve ficar em negrito (font-bold).
- O nome usa tamanho maior (text-base/text-lg) com cor institucional #1A3351.
- Todas as demais informacoes do item usam peso normal (font-normal).
- Linha 2 e linha 3 devem usar a mesma linguagem tipografica: text-[12px] md:text-[13px], font-normal, text-slate-600, uppercase.
- CPF acompanha a linguagem textual dos metadados (mesmo tamanho e peso da linha 2/3).
- A leitura deve ser institucional, limpa e rapida.
- Nao usar hierarquias tipograficas diferentes por modulo.

### 9.4) Formatacao textual padrao

Regras obrigatorias de exibicao:
- CPF sempre mascarado no formato xxx.xxx.xxx-xx.
- Matricula por extenso (ex: "30077").
- Contrato por extenso (ex: "1").
- Natureza do cargo por extenso (ex: "Temporario", "Efetivo").
- Secretaria com nome institucional completo.
- Caixa alta (uppercase) em todas as linhas.

Proibido:
- Abreviacoes como "M", "C", "C." para matricula ou contrato.
- Truncamento arbitrario de campos sem justificativa tecnica.

### 9.5) Elementos visuais do corpo do item

O padrao canonico atual do item de registro:
- Nao usa icone grande no bloco esquerdo.
- Nao usa icone antes dos campos de metadados (secretaria, cargo, etc.).
- Prioriza leitura textual limpa e direta.
- Usa borda lateral esquerda de 6px como unico elemento decorativo estrutural.
- Transicao visual suave ao expandir (escala, sombra, borda institucional).

Proibido:
- Adicionar icones decorativos dentro do corpo do item.
- Reintroduzir icones removidos sem justificativa de sistema.
- Poluicao visual que comprometa a leitura operacional.

### 9.6) Bloco direito padronizado (metadados temporais)

O bloco direito do item de registro possui duas familias oficiais:

Familia 1 — Data unica (RecordDateSingle):
- Aplicavel a: referrals, ASOs, portarias, history e registros equivalentes.
- Exibe label descritivo + data formatada.
- Componente canonico: RecordDateSingle.

Familia 2 — Periodo (RecordDatePeriod):
- Aplicavel a: afastamentos, abono e registros equivalentes.
- Exibe data de inicio e data de fim.
- Componente canonico: RecordDatePeriod.

Regras:
- Data unica e periodo devem seguir layout visual consistente entre si.
- Afastamentos e abono devem compartilhar a mesma estrutura visual no bloco direito.
- Acoes contextuais (relatorio, expansao, alertas) devem integrar-se ao bloco direito sem quebrar a anatomia principal.

### 9.7) Acoes contextuais no item

Acoes contextuais do registro:
- Devem ficar integradas ao bloco direito.
- Devem manter a semantica funcional do modulo.
- Devem seguir o mesmo padrao de encaixe visual.

Exemplos de acoes permitidas no bloco direito:
- Botao de relatorio/impressao.
- Chevron de expansao/recolhimento.
- Indicador de estado especial (alerta de exclusao pendente, etc.).

### 9.8) Consistencia entre modulos

Os seguintes modulos devem parecer membros da mesma familia visual:
- Evidencias (/referrals)
- ASOs (/history)
- Afastamentos (/afastamentos)
- Abono (/abono)
- Portarias (/abono/portarias)

Nao permitido:
- Criar anatomia propria por modulo.
- Mudar arbitrariamente a ordem das linhas.
- Usar tipografia diferente entre modulos.
- Reposicionar badges sem criterio.
- Reintroduzir icones removidos.
- Exibir conjuntos parciais de dados sem justificativa tecnica real.

### 9.9) Responsividade do item de registro

O item canonico deve permanecer legivel em todas as faixas de largura:
- 320px, 360px, 390px, 430px (mobile).
- 768px (tablet).
- 1024px+ (desktop).

Regras:
- As 3 linhas devem continuar compreensiveis no mobile.
- Em mobile, o layout empilha bloco central + bloco direito verticalmente.
- Em desktop, bloco central e bloco direito ficam lado a lado.
- O bloco direito pode reorganizar de forma responsiva se necessario.
- A responsividade nao pode destruir a anatomia nem ocultar informacao essencial.
- Legibilidade tem prioridade sobre densidade.
- Campos usam flex-wrap para acomodar telas estreitas sem truncamento.

### 9.10) Enriquecimento de dados do servidor

Quando a tabela primaria do modulo nao possui todos os campos canonicos (matricula, natureza_cargo, contrato, secretaria), o modulo deve:
- Buscar os dados complementares na tabela servidores por CPF.
- Fazer a busca em lotes (batch de 300 CPFs) para evitar limites do Supabase.
- Priorizar o dado da tabela primaria quando existir; usar servidores como fallback.
- Campos ausentes em ambas as fontes exibem "Nao informado".

### 9.11) Processo para novos registros futuros

Sempre que um novo tipo de registro administrativo for criado no SESMT-SYSTEM, ele deve:
1. Primeiro tentar usar o padrao canonico de item de registro ja existente.
2. Reutilizar o componente RecordItem e os slots ja consolidados.
3. Escolher a familia de bloco direito adequada (RecordDateSingle ou RecordDatePeriod).
4. Enriquecer dados via tabela servidores quando a tabela primaria for incompleta.
5. So criar excecao se houver impossibilidade tecnica real e devidamente justificada.
6. Manter a mesma anatomia de 3 linhas sempre que o dominio permitir.

### 9.12) Checklist operacional de item de registro

Antes de concluir qualquer implementacao de registro, verificar:

- [ ] O item segue a anatomia de 3 linhas?
- [ ] Nome e CPF estao na linha 1?
- [ ] Cargo, matricula e natureza estao na linha 2?
- [ ] Secretaria, contrato e badges estao na linha 3?
- [ ] Somente o nome esta em negrito?
- [ ] Linha 2 e linha 3 usam a mesma tipografia?
- [ ] O item esta sem icones nao canonicos no corpo?
- [ ] O bloco direito segue a familia correta (data unica ou periodo)?
- [ ] Acoes contextuais estao no bloco direito?
- [ ] O item e coerente visualmente com referrals, afastamentos, abono, portarias e history?
- [ ] O item e legivel no mobile (320px) e no desktop?
- [ ] Campos ausentes exibem "Nao informado"?
- [ ] Dados foram enriquecidos via tabela servidores quando necessario?

## 10) Diretrizes de implementacao para novos modulos

Ao criar modulo novo com listagem:
1. Reutilizar CompactFilterBar no header.
2. Declarar filtros contextuais via extraActions com ActionIconButton.
3. Exibir FilterChips para estado ativo.
4. Usar StatisticCardRow + StatisticCard para sumario e/ou status.
5. Usar SortAlphaToggle na barra de titulo da lista.
6. Garantir comportamento responsivo canonico (item 6).
7. Usar RecordItem como componente base dos itens de registro (item 9).
8. Escolher RecordDateSingle ou RecordDatePeriod para o bloco direito.
9. Enriquecer dados via tabela servidores quando necessario.

## 11) Antipadroes proibidos

### Antipadroes gerais
1. Duplicar controle de status no header e na barra da lista sem necessidade.
2. Colocar filtros complexos fora do fluxo de filtros do header.
3. Criar variante visual de card sem extensao dos tipos oficiais.
4. Quebrar nomenclatura de acento/variant sem atualizar sistema central.
5. Alterar comportamento visual para resolver problema de logica de negocio.

### Antipadroes de item de registro
6. Criar novo layout de item por modulo fora do RecordItem.
7. Omitir campos base do registro (cargo, matricula, natureza, secretaria, contrato) quando disponiveis.
8. Usar abreviacoes antigas (M, C, C.) para matricula ou contrato.
9. Reintroduzir icones removidos no corpo do item.
10. Usar tamanhos tipograficos diferentes entre linha 2 e linha 3.
11. Tirar badges da terceira linha sem justificativa de sistema.
12. Quebrar a familia visual entre registros administrativos de modulos diferentes.

## 12) Processo de mudanca desta governanca

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

## 13) Mapa de referencia tecnica

Componentes centrais de filtros e estatisticas:
- src/components/filters/CompactFilterBar.tsx
- src/components/filters/ActionIconButton.tsx
- src/components/filters/FilterChips.tsx
- src/components/filters/SortAlphaToggle.tsx
- src/components/statistics/StatisticCard.tsx
- src/components/statistics/StatisticCardRow.tsx
- src/components/statistics/StatisticCardsSection.tsx

Componentes canonicos de item de registro:
- src/components/records/RecordItem.tsx
- src/components/records/RecordDateSingle.tsx
- src/components/records/RecordDatePeriod.tsx
- src/lib/record-utils.ts

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
