# RELATÓRIO TÉCNICO COMPLETO — PÁGINA /afastamentos/cid-analytics

Status: DOCUMENTO DE ANÁLISE E REFERÊNCIA  
Data de elaboração: 30 de março de 2026  
Escopo: Análise técnica, funcional e interpretativa completa da página CID Analytics  
Objetivo: Descrever em profundidade tudo que a página mostra, como calcula, de onde vem e como deve ser lida  

---

## 1. VISÃO GERAL DA PÁGINA

### 1.1 Finalidade institucional

A página `/afastamentos/cid-analytics` é o módulo de **Gestão Analítica de Afastamentos por CID** do SESMT-SYSTEM. Sua finalidade institucional é fornecer leitura epidemiológica ocupacional com foco nos agravos classificados pela CID-10 (Classificação Internacional de Doenças), impacto operacional em dias perdidos e padrões de recorrência. O objetivo maior é apoiar priorização técnica, decisão gerencial e ação preventiva.

### 1.2 Diferença entre as rotas do domínio de afastamentos

O SESMT-SYSTEM possui três rotas distintas no domínio de afastamentos, cada uma com papel diferente:

**`/afastamentos`** — Operação e gestão transacional. Foco em cadastro, status de cada afastamento e acompanhamento administrativo individual. Aqui o gestor acompanha cada registro de forma operacional.

**`/afastamentos/analytics`** — Leitura analítica operacional ampla. Foco em acompanhamento gerencial geral, indicadores de volume e status consolidados, sem aprofundamento epidemiológico por CID.

**`/afastamentos/cid-analytics`** — Leitura epidemiológica especializada por CID e capítulo CID, recorrência e impacto ocupacional. Foco em concentração clínica, persistência de agravos, cruzamentos ocupacionais, inteligência gerencial auditável e investigação de episódios de saúde por servidor. É a camada analítica mais profunda do sistema.

### 1.3 Papel dentro do SESMT-SYSTEM

Esta página é a ferramenta principal para vigilância epidemiológica ocupacional do SESMT. Ela permite que a equipe técnica (medicina do trabalho, enfermagem, segurança) e a gestão executiva:

- Identifiquem quais doenças mais afastam servidores.
- Quantifiquem o impacto em dias perdidos por agravo, secretaria e cargo.
- Detectem padrões de recorrência — servidores que se afastam repetidamente.
- Priorizem ações preventivas com base em evidência analítica auditável.
- Monitorem tendências temporais de agravos.

### 1.4 Camadas de leitura oferecidas

A página foi projetada para oferecer três níveis de leitura simultâneos:

1. **Executiva**: Cards de magnitude, impacto consolidado, alertas gerenciais e rankings prioritários que sintetizam o cenário atual em números-chave. O gestor obtém leitura rápida sem precisar navegar tabelas extensas.

2. **Técnica**: Rankings detalhados por capítulo CID, código CID específico, secretaria, cargo e natureza. Permite que o SESMT técnico identifique onde e por que os afastamentos se concentram.

3. **Investigativa**: Tabela de episódios por servidor, análise de recorrência por janelas temporais, acumulado de dias e intervalo entre episódios. Permite que medicina do trabalho e enfermagem investiguem casos individualmente.

---

## 2. ESTRUTURA GERAL DA PÁGINA

### 2.1 Composição visual e funcional

A página é composta pelos seguintes blocos estruturais, nesta ordem:

1. **Sidebar institucional** — Menu lateral do sistema (componente `Sidebar`), compartilhado com todo o SESMT-SYSTEM.

2. **Header analítico** — Barra superior contendo:
   - Título da página ("Gestão Analítica de Afastamentos por CID")
   - Subtítulo ("Vigilância Epidemiológica Ocupacional • Camada Executiva")
   - Campo de busca por nome/CPF
   - Filtro de período (datas)
   - Filtro de secretaria
   - Filtro de capítulo CID
   - Botões de filtros contextuais adicionais (cargo, natureza, CID, situação, faixa de duração, recorrência)
   - Chips indicadores de filtros ativos

3. **Banner de exclusão de maternidade** — Aviso permanente indicando quantos registros de licença maternidade foram removidos desta análise epidemiológica.

4. **Container de abas** — Bloco principal com quatro abas:
   - Visão Geral
   - CID e Capítulos
   - Visão Ocupacional
   - Casos e Recorrência

5. **Conteúdo da aba ativa** — Direciona para o conjunto de cards, tabelas, rankings e painéis correspondentes à aba selecionada.

### 2.2 Estados especiais

- **Loading**: Tela inteira cinza com spinner e texto "Carregando inteligência CID..." enquanto os dados são buscados.
- **Erro**: Card vermelho com mensagem descritiva caso a consulta ao banco falhe.
- **Sem dados (pré-filtro)**: Mensagem informando que não há afastamentos elegíveis, indicando se a remoção de maternidade foi o motivo.
- **Sem dados (pós-filtro)**: Mensagem "Sem resultados para os filtros aplicados" quando a combinação de filtros não retorna registros.
- **Sem dados em painéis individuais**: Cada painel exibe seu próprio estado vazio quando não existe dado para aquele recorte.

### 2.3 Ordem de leitura ideal

A leitura recomendada é macro → intermediária → detalhada:

1. Header analítico e banner de exclusão → entender o contexto e a regra de exclusão de maternidade.
2. Aba "Visão Geral" → absorver magnitude, alertas e rankings prioritários.
3. Aba "CID e Capítulos" → aprofundar onde estão os agravos e qual o impacto de cada CID.
4. Aba "Visão Ocupacional" → cruzar agravos com a estrutura administrativa.
5. Aba "Casos e Recorrência" → investigar episódios individuais e padrões de persistência.

---

## 3. EXPLICAÇÃO DE CADA ABA

### 3.1 Aba: Visão Geral

**Nome**: Visão Geral  
**Objetivo**: Leitura executiva de magnitude, impacto e sinais gerenciais consolidados.  
**O que mostra**: Os principais indicadores numéricos do recorte (cards executivos), alertas gerenciais automáticos, quatro rankings prioritários (secretaria, cargo, capítulo, CID) e explicação da regra de prioridade.  
**Perguntas que responde**:
- Quantos afastamentos existem no recorte atual?
- Quantos servidores estão afastados?
- Quantos dias foram perdidos?
- Qual a duração média e mediana dos afastamentos?
- Qual o percentual de recorrência?
- Quais são os alertas gerenciais ativos?
- Quais secretarias, cargos, capítulos e CIDs são mais críticos?

**Para quem é mais útil**: Gestão executiva, coordenação SESMT, decisores que precisam de leitura rápida e priorizada.

**Componentes presentes nesta aba**:
- `StatisticCardRow` com 6 `StatisticCard` (total de afastamentos, servidores, dias perdidos, duração média, mediana, recorrência)
- `CidManagerialAlertsPanel` (alertas gerenciais)
- 4x `CidPriorityRankingPanel` (secretarias, cargos, capítulos, CIDs mais críticos)
- Bloco explicativo da regra de prioridade

### 3.2 Aba: CID e Capítulos

**Nome**: CID e Capítulos  
**Objetivo**: Núcleo epidemiológico com concentração, impacto e distribuição clínica por agravo.  
**O que mostra**: Cards contextuais (capítulos e CIDs no recorte, capítulo líder, CID de maior impacto), ranking de capítulos CID, ranking de CIDs específicos com drill-down por capítulo, e gráfico de tendência clínica temporal.  
**Perguntas que responde**:
- Quais capítulos CID concentram mais afastamentos?
- Qual capítulo tem mais dias perdidos?
- Dentro de um capítulo, quais CIDs específicos dominam?
- Como a tendência de ocorrências e dias perdidos se comporta ao longo do tempo para um capítulo?

**Para quem é mais útil**: SESMT técnico, medicina do trabalho, equipe de segurança.

**Componentes presentes nesta aba**:
- `StatisticCardRow` com 4 `StatisticCard`
- `CidChapterRankingPanel` (tabela ranking por capítulo)
- `CidCodeRankingPanel` (tabela ranking por CID)
- `CidClinicalTrendPanel` (gráfico de área temporal)

### 3.3 Aba: Visão Ocupacional

**Nome**: Visão Ocupacional  
**Objetivo**: Cruzar agravos com estrutura administrativa e ocupacional para ação preventiva.  
**O que mostra**: Cards contextuais (secretarias e cargos no recorte, secretaria e natureza de maior impacto), ranking por secretaria, ranking por cargo, distribuição por natureza do cargo e cruzamento capítulo CID x secretaria.  
**Perguntas que responde**:
- Qual secretaria tem mais afastamentos e dias perdidos?
- Qual cargo concentra mais carga de afastamento?
- A natureza do vínculo influencia o padrão?
- Onde agravos específicos se cruzam com locais de trabalho?

**Para quem é mais útil**: Gestão administrativa, SESMT técnico, segurança do trabalho.

**Componentes presentes nesta aba**:
- `StatisticCardRow` com 4 `StatisticCard`
- 2x `CidOccupationalRankingPanel` (secretaria e cargo)
- `CidNatureImpactPanel` (natureza do cargo)
- `CidOccupationalCrossPanel` (cruzamento capítulo x secretaria)

### 3.4 Aba: Casos e Recorrência

**Nome**: Casos e Recorrência  
**Objetivo**: Leitura investigativa por episódio, persistência de afastamentos e acumulado de dias por servidor.  
**O que mostra**: Cards de contexto (afastamentos no recorte, recorrentes, dias em recorrentes, servidores), painel de distribuição de recorrência por janela (90/180/365 dias) e tabela investigativa com todos os episódios detalhados por servidor.  
**Perguntas que responde**:
- Quantos afastamentos são recorrentes?
- Qual a proporção de recorrência em cada janela temporal?
- Quais servidores tiveram múltiplos episódios?
- Qual o acumulado de dias de cada servidor?
- Quanto tempo decorreu entre episódios consecutivos?

**Para quem é mais útil**: Medicina do trabalho, enfermagem, SESMT investigativo.

**Componentes presentes nesta aba**:
- `StatisticCardRow` com 4 `StatisticCard`
- `CidRecurrenceSummaryPanel` (comparativo 90/180/365 dias)
- `CidRecurrenceInvestigativeTable` (tabela detalhada por servidor/episódio)

---

## 4. EXPLICAÇÃO DETALHADA DE CADA BLOCO/PAINEL

### 4.1 Cards Executivos (Visão Geral)

São 6 cards na aba Visão Geral:

**Total de Afastamentos**: Conta o número de eventos no recorte filtrado. Cada afastamento é um evento, independente de quantos CIDs ele contenha. Calculado como `filteredMetrics.magnitude.totalAfastamentos`, que é simplesmente `events.length`.

**Servidores Afastados**: Conta o número de CPFs distintos no recorte. Calculado como tamanho do `Set` de `servidorCpf` dos eventos. Um servidor com múltiplos afastamentos conta apenas uma vez.

**Dias Perdidos**: Soma total de `daysAway` de todos os eventos filtrados. Representa a carga operacional total em dias calendário perdidos por afastamento.

**Duração Média**: Média aritmética de `daysAway` de todos os eventos. Calculado como `totalDiasPerdidos / totalAfastamentos`. Indica a duração típica de um afastamento.

**Duração Mediana**: Valor central da distribuição de dias, calculado pela função `median()`. Mais resistente a outliers que a média — se metade dos afastamentos dura 5 dias e um dura 300, a mediana não será distorcida como a média. É o indicador mais confiável de "duração típica".

**Recorrência (180d)**: Percentual de eventos classificados como recorrentes na janela principal de 180 dias. Calculado como `(totalEventosRecorrentesPrimaryWindow / totalAfastamentos) * 100`. O subtítulo mostra a contagem absoluta.

### 4.2 CidChapterRankingPanel — Ranking por Capítulo

**Arquivo**: `src/components/analytics/cid/CidChapterRankingPanel.tsx`  
**Aba**: CID e Capítulos

**O que mostra**: Tabela interativa com ranking dos capítulos CID por frequência ou impacto. Cada linha mostra: nome do capítulo, ocorrências, afastamentos distintos, participação percentual, dias perdidos e barra de impacto relativo.

**Como funciona**:
- Os dados são derivados da camada de ocorrências CID (`CidOccurrenceFact`), não de eventos.
- A função `toChapterRanking()` agrupa todas as ocorrências CID por capítulo.
- "Ocorrências" é a contagem de linhas CID agrupadas por capítulo.
- "Afastamentos" é o número de eventos distintos (`eventIds.size`).
- "Dias Perdidos" é a soma dos `allocatedDays` (dias proporcionais) de cada ocorrência.
- "Participação" é `ocorrências deste capítulo / total de ocorrências * 100`.
- A barra de impacto relativo compara os dias deste capítulo contra o capítulo de maior impacto.

**Interatividade**: Permite alternar entre ordenação por Frequência ou Impacto. Permite clicar em um capítulo para fazer drill-down no ranking de CIDs específicos.

**Interpretação prática**: Identifica quais grupos de doenças são mais prevalentes e quais geram mais carga de dias perdidos. O capítulo no topo por frequência nem sempre é o mesmo no topo por impacto.

### 4.3 CidCodeRankingPanel — Ranking por CID Específico

**Arquivo**: `src/components/analytics/cid/CidCodeRankingPanel.tsx`  
**Aba**: CID e Capítulos

**O que mostra**: Tabela com ranking de CIDs individuais (ex: M54.5 — Dor lombar baixa). Mostra código, descrição clínica, capítulo, ocorrências, afastamentos, dias perdidos e participação.

**Como funciona**:
- Usa a função `toCidRanking()` que agrupa ocorrências CID por `cidCode + cidChapter`.
- Se um capítulo estiver selecionado no drill-down, filtra apenas as ocorrências daquele capítulo.
- Se nenhum capítulo estiver selecionado, mostra todos os CIDs.
- A participação percentual é calculada como `ocorrências deste CID / total de ocorrências no contexto * 100`.

**Interpretação prática**: Permite identificar exatamente qual doença específica mais afasta servidores ou mais gera dias perdidos. O botão "Capítulo ativo" permite limpar o drill-down.

### 4.4 CidClinicalTrendPanel — Tendência Clínica

**Arquivo**: `src/components/analytics/cid/CidClinicalTrendPanel.tsx`  
**Aba**: CID e Capítulos

**O que mostra**: Gráfico de área temporal com duas séries: ocorrências e dias perdidos por competência (mês), para o capítulo em foco.

**Como funciona**:
- Se houver um capítulo selecionado via drill-down, foca nele.
- Caso contrário, foca no capítulo líder do ranking.
- Agrupa ocorrências CID da camada `cidOccurrences` por competência (`YYYY-MM`) para o capítulo em foco.
- Só renderiza quando existe mais de 1 ponto temporal.

**Interpretação prática**: Revela se um agravo está em crescimento, estável ou declínio ao longo dos meses. Permite detectar sazonalidade e tendências emergentes.

### 4.5 CidOccupationalRankingPanel — Ranking Ocupacional

**Arquivo**: `src/components/analytics/cid/CidOccupationalRankingPanel.tsx`  
**Aba**: Visão Ocupacional (usado 2x: para secretaria e para cargo)

**O que mostra**: Tabela com ranking por secretaria ou cargo. Mostra: grupo, afastamentos, dias perdidos, duração média, participação e agravo dominante (CID mais frequente no grupo).

**Como funciona**:
- Agrupa eventos por campo ocupacional (secretaria ou cargo).
- Para cada grupo, conta afastamentos, soma dias e calcula média.
- Cruza com ocorrências CID para determinar o capítulo e CID dominantes.
- Alternar entre Frequência e Impacto muda a ordenação.

**Interpretação prática**: Identifica quais secretarias/cargos têm a maior carga de afastamento e qual doença predomina em cada local/função.

### 4.6 CidNatureImpactPanel — Impacto por Natureza do Cargo

**Arquivo**: `src/components/analytics/cid/CidNatureImpactPanel.tsx`  
**Aba**: Visão Ocupacional

**O que mostra**: Cards compactos para cada tipo de natureza do cargo (ex: efetivo, comissionado, temporário). Para cada natureza: afastamentos, dias perdidos, duração média, participação.

**Como funciona**:
- Agrupa eventos filtrados por `naturezaCargo`.
- Calcula métricas por grupo.
- Ordena por dias perdidos decrescente.

**Interpretação prática**: Revela se o tipo de vínculo funcional influencia a carga de afastamentos, permitindo direcionar ações preventivas por perfil de servidor.

### 4.7 CidOccupationalCrossPanel — Cruzamento Capítulo x Secretaria

**Arquivo**: `src/components/analytics/cid/CidOccupationalCrossPanel.tsx`  
**Aba**: Visão Ocupacional

**O que mostra**: Matriz que cruza os top 8 capítulos CID de maior impacto em dias com as top 6 secretarias de maior carga. Cada célula mostra "ocorrências / dias perdidos alocados".

**Como funciona**:
- Seleciona os top 6 secretarias do ranking (por dias perdidos).
- Seleciona os top 8 capítulos por total de `allocatedDays`.
- Cria uma matriz cruzando ambas dimensões.
- Para cada célula, soma ocorrências e dias das ocorrências CID que pertencem àquele capítulo e àquela secretaria.

**Interpretação prática**: Permite identificar combinações específicas de alto risco — ex: doenças musculoesqueléticas concentradas na Secretaria X. Essas combinações são alvos prioritários para intervenção.

### 4.8 CidRecurrenceSummaryPanel — Distribuição de Recorrência

**Arquivo**: `src/components/analytics/cid/CidRecurrenceSummaryPanel.tsx`  
**Aba**: Casos e Recorrência

**O que mostra**: Tabela comparativa das três janelas de recorrência (90, 180, 365 dias). Para cada janela: contagem de recorrentes, percentual e barra de proporção visual. Identifica qual janela é a principal.

**Como funciona**:
- Conta eventos com `isRecurrent90`, `isRecurrent180` e `isRecurrent365` verdadeiros.
- Calcula percentual de cada janela sobre o total de eventos.
- A janela principal (180 dias por padrão) é destacada visualmente.
- Mostra totais: afastamentos no recorte e dias acumulados dos recorrentes.

**Interpretação prática**: Permite entender quão rápido os servidores voltam a se afastar. Se a janela de 90 dias já é alta, significa que afastamentos estão acontecendo em rápida sucessão.

### 4.9 CidRecurrenceInvestigativeTable — Tabela Investigativa

**Arquivo**: `src/components/analytics/cid/CidRecurrenceInvestigativeTable.tsx`  
**Aba**: Casos e Recorrência

**O que mostra**: Tabela detalhada com todos os episódios de afastamento, um por linha. Colunas: servidor/CPF mascarado, matrícula, secretaria, cargo, capítulo CID, CID/descrição, data início, data fim, dias, número do episódio, intervalo (dias desde episódio anterior), acumulado de dias e indicador de recorrência.

**Como funciona**:
- Recebe os eventos filtrados e ordena por CPF + data de início.
- O CPF é mascarado (protocolo de privacidade) mostrando apenas primeiros 3 dígitos e últimos 2.
- O número do episódio é sequencial por servidor (1º, 2º, 3º...).
- O intervalo é calculado como dias entre o fim do episódio anterior e o início do atual.
- O acumulado é a soma total de dias de todos os episódios daquele servidor.
- Linhas de episódios recorrentes (isRecurrentPrimary = true) são destacadas em fundo laranja.

**Interpretação prática**: É a ferramenta central para investigação de casos. Permite que a medicina do trabalho identifique servidores com padrão de afastamentos repetidos, entenda os intervalos entre episódios e quantifique a carga acumulada.

### 4.10 CidManagerialAlertsPanel — Alertas Gerenciais

**Arquivo**: `src/components/analytics/cid/CidManagerialAlertsPanel.tsx`  
**Aba**: Visão Geral

**O que mostra**: Cards de alerta gerencial automáticos, cada um com título, resumo, evidência factual e nível de severidade (prioridade crítica, atenção alta, atenção moderada). Cada alerta tem borda lateral colorida por severidade e ícone correspondente.

**Como funciona**: Será explicado em detalhe na seção 9 (Alertas Gerenciais e Rankings).

### 4.11 CidPriorityRankingPanel — Rankings Prioritários

**Arquivo**: `src/components/analytics/cid/CidPriorityRankingPanel.tsx`  
**Aba**: Visão Geral (4 instâncias: secretaria, cargo, capítulo, CID)

**O que mostra**: Tabela com os top 6 itens mais críticos de cada dimensão, com score de prioridade, faixa (prioridade crítica / atenção alta / moderada), volume, dias perdidos, recorrência e tendência.

**Como funciona**: Será explicado em detalhe na seção 9 (Alertas Gerenciais e Rankings).

---

## 5. EXPLICAÇÃO DOS FILTROS GLOBAIS

### 5.1 Arquitetura dos filtros

Todos os filtros ficam no header analítico. Eles são compostos por:
- **CompactFilterBar**: campo de busca, filtro de período (datas), filtro de secretaria e filtro de capítulo CID.
- **ActionIconButton** (extraActions): botões icônicos para filtros contextuais de cargo, natureza, CID, situação, faixa de duração e recorrência. Cada um abre um dropdown com select.
- **FilterChips**: indicadores visuais dos filtros ativos.
- **Botão de limpar**: Remove todos os filtros de uma vez.

### 5.2 Descrição individual de cada filtro

**Busca por nome/CPF**: Campo de texto livre com debounce de 180ms. Busca por correspondência parcial (contém) no CPF do servidor ou no nome. Converte para maiúsculas e remove acentos antes de comparar.

**Período (data início / data fim)**: Filtra afastamentos cuja `data_inicio` caia dentro do intervalo informado. Se apenas data início for informada, filtra registros desde aquela data. Se apenas data fim, filtra até aquela data.

**Secretaria**: Dropdown com todas as secretarias presentes no dataset. Filtra eventos cujo `secretaria` corresponda exatamente ao valor selecionado.

**Capítulo CID**: Dropdown com todos os capítulos CID presentes no dataset. Este filtro é especial porque atua em duas camadas simultaneamente:
- No filtro de eventos, verifica se alguma das ocorrências CID do evento pertence àquele capítulo.
- No filtro de ocorrências CID, exclui ocorrências que não pertencem ao capítulo.

**Cargo**: Dropdown contextual (ActionIconButton). Filtra eventos cujo `cargo` corresponda ao selecionado.

**Natureza do Cargo**: Dropdown contextual. Filtra eventos pela `naturezaCargo` (ex: efetivo, comissionado).

**CID**: Dropdown com todos os códigos CID presentes. Similar ao capítulo: atua tanto no nível de evento (verifica se alguma ocorrência tem aquele código) quanto no nível de ocorrência (exclui ocorrências de outros códigos).

**Situação/Status**: Filtra pela `situacao` do evento (ex: ativo, encerrado).

**Faixa de Duração**: Filtra pela classificação da duração do afastamento em faixas predefinidas: 1-3 dias, 4-7 dias, 8-14 dias, 15-30 dias, 31-90 dias, 91+ dias.

**Recorrência**: Filtra por recorrência na janela principal (180 dias):
- "Recorrente": somente eventos com `isRecurrentPrimary = true`.
- "Não Recorrente": somente eventos com `isRecurrentPrimary = false`.

### 5.3 Como filtros se combinam

Todos os filtros são combinados com lógica **AND** (conjuntiva). Isso significa que cada filtro adicionado restringe ainda mais o recorte. Um evento deve satisfazer todos os filtros ativos simultaneamente para ser incluído.

### 5.4 Efeito de filtros amplos vs restritivos

**Filtros amplos (todos em "all")**: A página mostra o cenário completo do dataset, exceto maternidade. Todos os cards, rankings e tabelas refletem a totalidade dos dados.

**Filtros muito restritivos**: Podem resultar em poucos ou nenhum registro. Quando não há resultados, a página exibe "Sem resultados para os filtros aplicados". Painéis individuais com dados vazios mostram seus próprios estados vazios.

### 5.5 Impacto dos filtros nos resultados

Todos os painéis, cards, rankings, alertas e tabelas da página são recalculados reativamente quando qualquer filtro muda. Isso significa que:
- Os cards executivos mostram métricas do recorte filtrado.
- Os rankings refletem apenas os dados que passaram pelos filtros.
- Os alertas gerenciais são gerados a partir do subconjunto filtrado.
- A tabela investigativa mostra apenas episódios do recorte.

---

## 6. EXPLICAÇÃO DOS CARDS EXECUTIVOS

### 6.1 Total de Afastamentos

**O que significa**: Número absoluto de registros de afastamento no recorte atual (já excluindo maternidade e aplicando filtros).  
**Como é calculado**: `events.length` — contagem simples dos eventos que passaram por todos os filtros.  
**Camada**: Eventos (AfastamentoEventFact).  
**Leitura gerencial**: Indica o volume total de ocorrências de afastamento no período/recorte analisado. Um número alto pode indicar necessidade de investigação. Comparando entre períodos revela tendência.  
**Efeito dos filtros**: Qualquer filtro reduz este número ao excluir eventos.

### 6.2 Servidores Afastados

**O que significa**: Número de servidores distintos (por CPF) que tiveram ao menos um afastamento no recorte.  
**Como é calculado**: `new Set(events.map(e => e.event.servidorCpf)).size` — conta CPFs únicos.  
**Camada**: Eventos.  
**Leitura gerencial**: Quando o número de servidores é significativamente menor que o total de afastamentos, indica que os mesmos servidores estão se afastando repetidamente (recorrência). Se forem iguais, cada servidor se afastou uma única vez.  
**Efeito dos filtros**: Afeta diretamente — um filtro por secretaria, por exemplo, mostra apenas os servidores daquela secretaria.

### 6.3 Dias Perdidos

**O que significa**: Soma total de dias de afastamento no recorte. Cada evento contribui com seus dias (`daysAway`).  
**Como é calculado**: `allDays.reduce((acc, days) => acc + days, 0)`.  
**Camada**: Eventos.  
**Leitura gerencial**: É a métrica central de impacto operacional. Representa a carga total de ausência por doença. Quanto maior, mais a organização foi impactada por afastamentos naquele recorte.  
**Efeito dos filtros**: Reduz conforme eventos são excluídos.

### 6.4 Duração Média

**O que significa**: Média aritmética da duração de cada afastamento em dias.  
**Como é calculado**: `totalDiasPerdidos / totalAfastamentos`.  
**Camada**: Derivada de eventos.  
**Leitura gerencial**: Indica a duração típica de um afastamento. Valores altos (ex: >30 dias) sugerem preponderância de casos graves ou cirúrgicos. Valores baixos (ex: 3-5 dias) sugerem afastamentos leves e recorrentes.  
**Cuidado importante**: A média é sensível a outliers. Um único afastamento de 300 dias eleva significativamente a média. Por isso a mediana é um complemento essencial.

### 6.5 Duração Mediana

**O que significa**: Valor central da distribuição de dias — metade dos afastamentos duraram menos e metade duraram mais que este valor.  
**Como é calculado**: Ordena todos os valores de `daysAway`, pega o elemento central. Se par, faz média dos dois centrais.  
**Camada**: Derivada de eventos.  
**Leitura gerencial**: Mais confiável que a média para entender a duração "típica". Se a mediana é 7 e a média é 25, significa que a maioria dos afastamentos é curta, mas alguns muito longos distorcem a média.

### 6.6 Recorrência (180d)

**O que significa**: Percentual de afastamentos classificados como recorrentes na janela principal de 180 dias. Um afastamento é recorrente quando o servidor teve um episódio anterior que terminou há no máximo 180 dias antes do início do novo episódio.  
**Como é calculado**: `(totalEventosRecorrentesPrimaryWindow / totalAfastamentos) * 100`.  
**Camada**: Derivada de eventos + dimensão de recorrência.  
**Leitura gerencial**: Altos percentuais (>20%) indicam padrão de reincidência. Isso é sinal de que tratamentos não estão sendo efetivos, condições de trabalho não foram corrigidas, ou há fatores crônicos atuando. O subtítulo mostra a contagem absoluta.

---

## 7. EXPLICAÇÃO DA CAMADA ANALÍTICA

### 7.1 Estratégia Dual-Layer

A página opera com uma estratégia analítica chamada **dual-layer** ("camada dupla"), declarada no tipo do pipeline como `multiCidMode: "dual-layer"`. A essência desta estratégia é que um afastamento pode ter múltiplos CIDs associados, e cada CID deve ser analisado individualmente.

As duas camadas são:

**Camada por Evento (AfastamentoEventFact)**: Uma linha por afastamento. Contém informações do evento (datas, dias, status), dimensão ocupacional (secretaria, cargo, matrícula), dimensão clínica principal (primeiro CID), dimensão temporal e dimensão de recorrência. Esta camada é usada para contagens de magnitude, análise ocupacional e cálculo de recorrência.

**Camada por Ocorrência CID (CidOccurrenceFact)**: Uma ou mais linhas por afastamento (uma para cada CID associado). Contém o código CID, descrição, capítulo, peso da ocorrência e dias alocados proporcionalmente. Esta camada é usada para rankings por capítulo CID, rankings por CID específico, cruzamentos e tendências clínicas.

### 7.2 Por que isso é importante

Um afastamento pode ter 1, 2, 3 ou mais CIDs registrados. Se um servidor é afastado com diagnóstico de M54 (dorsalgia) e F32 (depressão), o sistema precisa registrar ambos para que análises epidemiológicas sejam fiéis. Se contássemos apenas o primeiro CID, perderíamos a informação do segundo agravo.

### 7.3 Como múltiplos CIDs são tratados

Quando um afastamento tem N CIDs, o pipeline gera:
- 1 evento (na camada de eventos) usando o primeiro CID como primário.
- N ocorrências CID (na camada de ocorrências) com peso proporcional.

O peso (`occurrenceWeight`) de cada ocorrência é `1 / N`. Se o afastamento tem 2 CIDs, cada ocorrência recebe peso 0.5.

### 7.4 Como dias são distribuídos (shared-days)

O sistema usa a política `daysAllocationMode: "shared-days"`. Isso significa que os dias de um afastamento são distribuídos proporcionalmente entre seus CIDs. Se um afastamento de 30 dias tem 2 CIDs, cada ocorrência CID recebe `30 * 0.5 = 15 dias alocados`.

Isso evita dupla contagem de dias. Se somássemos os dias cheios para cada CID, um afastamento de 30 dias com 2 CIDs contaria como 60 dias nos rankings de CID — inflando artificialmente o impacto.

### 7.5 Como a recorrência é calculada

A recorrência é calculada na camada de eventos, no pipeline `buildCidAnalyticsDataset()`:

1. Os registros são ordenados por CPF do servidor e data de início.
2. Para cada servidor, um acumulador rastreia: data de fim do último episódio, contagem de episódios e dias acumulados.
3. Ao processar um novo evento do mesmo servidor, calcula-se `daysSincePreviousEpisode` como o número de dias entre o fim do episódio anterior e o início do novo.
4. Se `daysSincePreviousEpisode <= 90`, marca `isRecurrent90 = true`.
5. Se `daysSincePreviousEpisode <= 180`, marca `isRecurrent180 = true`.
6. Se `daysSincePreviousEpisode <= 365`, marca `isRecurrent365 = true`.
7. O flag `isRecurrentPrimary` é definido pela janela principal configurada (180 dias por padrão).
8. O primeiro episódio de cada servidor nunca é recorrente (não tem episódio anterior).

### 7.6 Como faixas de duração são calculadas

O sistema classifica cada afastamento em uma faixa baseada em seus dias:
- 1-3 dias (afastamentos curtos)
- 4-7 dias
- 8-14 dias
- 15-30 dias
- 31-90 dias
- 91+ dias (afastamentos muito longos)

A classificação é feita pela função `getDurationBand()` que percorre as faixas e retorna aquela cujo intervalo inclui o número de dias do evento.

### 7.7 Como métricas e rankings são derivados

As métricas são computadas pela função `buildCidAnalyticsMetrics()` que recebe eventos e ocorrências CID e calcula:
- **Magnitude**: totais por contagem e soma simples.
- **Persistência**: filtragem por flag de recorrência e soma.
- **Distribuição**: agrupamento por `sumByKey()` com diferentes chaves (capítulo, CID, secretaria, cargo).
- **Tendência**: agrupamento por competência (YYYY-MM) com acumulação de contagens e dias.

---

## 8. EXPLICAÇÃO DAS REGRAS DE DADOS E ENRIQUECIMENTO

### 8.1 Fluxo de entrada dos dados

1. A página faz `supabase.from("afastamentos").select("*, afastamento_cids (*)")` — busca todos os afastamentos com seus CIDs associados.
2. Os registros passam pelo filtro de exclusão de maternidade.
3. Os registros restantes alimentam o pipeline analítico.

### 8.2 Exclusão de maternidade

A função `isMaternityRecord()` verifica:
- Se `tipo_afastamento` contém "MATERNIDADE".
- Se algum dos CIDs tem código, descrição ou capítulo contendo "MATERNIDADE".

Todos os registros que satisfaçam qualquer dessas condições são excluídos antes de qualquer análise. A contagem de excluídos é mostrada no banner amarelo.

**Motivo**: Licença maternidade não é agravo de saúde/doença. Incluí-la distorceria rankings, médias e concentrações por capítulo, pois é um tipo de afastamento com natureza completamente diferente.

### 8.3 Enriquecimento do CID

O enriquecimento de CID segue uma cascata de fontes:

**Nível 1 — Dados da tabela afastamento_cids**: O campo original vem do banco (`cid_codigo`, `cid_descricao`, `cid_capitulo`).

**Nível 2 — Lookup no banco de dados (tabela cid10)**: A página busca no Supabase a tabela `cid10` para obter descrição e capítulo de cada código CID. Essa busca é feita em chunks de 250 códigos para performance.

**Nível 3 — Catálogo local JSON (cid10-data.json)**: A lib `cid-utils.ts` importa um arquivo JSON local com categorias CID e capítulos. Cada código é buscado neste catálogo através de `getCIDDetails()`.

**Nível 4 — Resolução por range de capítulo**: Se o catálogo não tem a categoria exata, `getCIDChapter()` percorre as faixas alfanuméricas dos capítulos para determinar a qual capítulo o código pertence.

**Cascata de resolução**: Para cada campo (código, descrição, capítulo), o sistema:
1. Usa o valor do banco se não for placeholder (SEM CID, NAO INFORMADO, etc.).
2. Se for placeholder, tenta o lookup na tabela cid10.
3. Se ainda for placeholder, tenta o catálogo local JSON.
4. Se nenhuma fonte resolver, mantém o fallback (DESCRICAO NAO INFORMADA / CAPITULO NAO INFORMADO).

### 8.4 Sanitização de legado

Valores como "SEM CID", "NAO INFORMADO", "DESCRICAO NAO INFORMADA", "CAPITULO NAO INFORMADO", "N/A" e strings vazias são classificados como placeholders pela função `isPlaceholderCidValue()` / `isPlaceholderCidLabel()`. Esses valores são substituídos pelo melhor dado disponível na cascata de enriquecimento.

### 8.5 Auditoria

O arquivo `tmp/cid_analytics_audit_report.json` comprova que os mecanismos de exclusão e sanitização funcionam:

```json
{
  "totals": {
    "totalAfastamentos": 215,
    "totalAfastamentosExcluidosRegraMaternidade": 44,
    "totalAfastamentosRestantesAnalise": 171
  },
  "detections": {
    "ocorrenciasCidComMaternidadePosFiltro": 0,
    "ocorrenciasCidComLegadoAposSanitizacao": 0
  }
}
```

Significa:
- 44 registros de maternidade excluídos.
- **Zero** vazamento de maternidade após filtro.
- **Zero** resíduo de legado após sanitização.

---

## 9. EXPLICAÇÃO DOS ALERTAS GERENCIAIS E RANKINGS

### 9.1 Que são os alertas gerenciais

Os alertas gerenciais são mensagens interpretativas automáticas geradas pela camada `buildCidManagerialIntelligence()` (arquivo `src/lib/afastamentos-cid-managerial.ts`). Eles traduzem padrões numéricos em sinais gerenciais compreensíveis, com título, resumo, evidência factual e nível de severidade.

### 9.2 Tipos de alerta

O sistema gera até 6 alertas, priorizados por severidade. Os tipos possíveis são:

1. **Crescimento recente por capítulo**: Disparado quando um capítulo CID tem tendência positiva ≥25% entre as duas competências mais recentes E pelo menos 3 ocorrências. Indica que um grupo de doenças está acelerando.

2. **CID com aumento recente**: Similar ao anterior, mas no nível de código CID individual. Exige tendência ≥25% e pelo menos 2 ocorrências.

3. **Secretaria com maior carga combinada**: Disparado quando a secretaria de maior score tem score ≥55. Resume a criticidade gerencial da secretaria líder.

4. **Cargo com maior carga combinada**: Análogo ao anterior para cargos.

5. **Recorrência concentrada**: Disparado quando algum grupo (cargo ou capítulo) apresenta recorrência ≥35% com pelo menos 3 registros. Indica persistência concentrada.

6. **Concentração de dias perdidos**: Disparado quando um capítulo concentra ≥30% dos dias perdidos totais. Indica que um único grupo de doenças domina o impacto.

7. **Combinação crítica de frequência e duração**: Disparado quando um cargo tem volume ≥3, duração média ≥35% acima da média geral E recorrência ≥20%.

### 9.3 Níveis de severidade

- **Prioridade Crítica** (vermelho): Score ≥75 ou condições muito graves.
- **Atenção Alta** (âmbar): Score ≥55 ou condições moderadamente graves.
- **Atenção Moderada** (azul): Demais alertas relevantes.

### 9.4 Rankings prioritários — Fórmula do Score

Os quatro rankings prioritários (secretaria, cargo, capítulo CID, CID) usam uma fórmula composta documentada transparentemente na interface:

**Score = 35% volume relativo + 35% dias perdidos relativos + 20% recorrência relativa + 10% tendência positiva recente**

Detalhamento do cálculo (função `buildPriorityRanking()`):

1. Para cada dimensão (ex: cada secretaria), calcula-se:
   - Volume: número de afastamentos ou ocorrências.
   - Dias perdidos: soma de dias.
   - Recorrência: percentual de eventos recorrentes no grupo.
   - Tendência: variação percentual entre a penúltima e a última competência.

2. Todos os valores são normalizados para 0-100 em relação ao máximo do grupo:
   - `volumeScore = (volume / maxVolume) * 100`
   - `daysLostScore = (daysLost / maxDaysLost) * 100`
   - Similar para recorrência e tendência (tendência considera apenas valores positivos).

3. O score final é a média ponderada: `0.35 * volumeScore + 0.35 * daysLostScore + 0.20 * recurrenceScore + 0.10 * trendScore`.

4. A faixa é determinada pelo score: ≥75 = prioridade-critica, ≥55 = atencao-alta, demais = atencao-moderada.

### 9.5 Diferença entre rankings da aba CID e rankings da Visão Geral

- **Rankings da aba CID e Capítulos** (CidChapterRankingPanel, CidCodeRankingPanel): Ordenam por frequência ou impacto simples. Mostram dados brutos.
- **Rankings da Visão Geral** (CidPriorityRankingPanel): Usam score composto multi-fator. São rankings GERENCIAIS que combinam volume, impacto, recorrência e tendência.

### 9.6 Tendência — Como é calculada nos rankings

A tendência compara o volume da competência mais recente com o da penúltima competência:
- `computeTrendDeltaPct(currentVolume, previousVolume)`.
- Se ambos forem 0: `null` (sem base comparativa).
- Se previousVolume for 0: `+100%` (surgimento novo).
- Caso contrário: `((currentVolume - previousVolume) / previousVolume) * 100`.

---

## 10. EXPLICAÇÃO DA ABA DE CASOS E RECORRÊNCIA

### 10.1 Conceito de Episódio

Um episódio é um evento de afastamento de um servidor. Cada registro de afastamento no banco é um episódio. Quando um servidor tem múltiplos afastamentos, seus episódios são numerados sequencialmente por ordem cronológica. O primeiro afastamento é o episódio 1, o segundo é o episódio 2, e assim por diante.

### 10.2 Conceito de Recorrência

Recorrência ocorre quando um servidor inicia um novo afastamento dentro de uma janela temporal contada a partir do fim do seu episódio anterior. Existem três janelas paralelas:

- **90 dias**: Recorrência de curto prazo. Se o servidor voltou a se afastar em até 90 dias após terminar o afastamento anterior, é recorrente nesta janela. Indica retorno rápido ao estado de afastamento.
  
- **180 dias**: Janela principal do sistema. Representa uma recorrência de médio prazo. É o padrão usado para o indicador principal de recorrência.

- **365 dias**: Recorrência anual. Captura padrões mais longos, incluindo sazonalidade e condições crônicas com intervalos maiores.

### 10.3 Dias Acumulados

O campo "Acum." na tabela investigativa mostra `cumulativeDaysByServidor` — a soma total de dias de afastamento que aquele servidor acumulou até aquele episódio. Por exemplo, se o servidor teve episódio 1 (10 dias) e episódio 2 (15 dias), no episódio 2 o acumulado mostra 25.

### 10.4 Intervalo desde Episódio Anterior

O campo "Intervalo" mostra `daysSincePreviousEpisode` — quantos dias se passaram entre o fim do episódio anterior e o início do episódio atual. Se o episódio anterior terminou em 15/jan e o novo começou em 10/fev, o intervalo é 26 dias. Para o primeiro episódio de cada servidor, este campo aparece como "—".

### 10.5 Como ler a tabela investigativa

A leitura recomendada é:

1. **Identificar servidores com múltiplos episódios**: Observe o número do episódio (Ep.). Servidores com Ep. 3, 4, 5+ são reincidentes.
2. **Verificar intervalos curtos**: Intervalos de poucos dias entre episódios merecem investigação clínica.
3. **Analisar acumulado**: Servidores com acumulado alto (centenas de dias) representam carga crônica para a organização.
4. **Cruzar com CID**: Verificar se os episódios têm sempre o mesmo CID (condição crônica) ou CIDs diferentes (múltiplas condições).
5. **Observar o flag de recorrência**: Linhas destacadas em laranja são as que o sistema classificou como recorrentes.

### 10.6 Utilidade para equipe de saúde

- **Medicina do Trabalho**: Permite a identificação de servidores que necessitam de acompanhamento mais próximo, avaliação de aptidão ou encaminhamento para tratamento especializado.
- **Enfermagem**: Auxilia no monitoramento de servidores crônicos e na programação de contatos preventivos.
- **SESMT**: Fornece base técnica para elaboração de programas de prevenção focalizados nos agravos e perfis mais recorrentes.

---

## 11. EXPLICAÇÃO DA LEITURA GERENCIAL DA PÁGINA

### 11.1 Como um gestor deve ler esta página

O gestor deve começar pela aba **Visão Geral**:

1. **Ler os 6 cards executivos**: Absorver o cenário geral — volume de afastamentos, servidores impactados, dias perdidos, duração típica e nível de recorrência.

2. **Verificar alertas gerenciais**: Ler os alertas automáticos que sintetizam os sinais mais preocupantes no recorte.

3. **Analisar os 4 rankings prioritários**: Identificar quais secretarias, cargos, capítulos CID e códigos CID são mais críticos de acordo com a fórmula multi-fator.

4. **Usar filtros para investigar**: Se uma secretaria aparecer como crítica, filtrar por ela para ver os detalhes.

A leitura do gestor é orientada a **priorização e ação**: onde concentrar esforço, onde investir em prevenção, quais áreas demandam atenção imediata.

### 11.2 Como um técnico do SESMT deve ler

O técnico deve usar todas as abas, com ênfase em **CID e Capítulos** e **Visão Ocupacional**:

1. **Identificar agravos dominantes**: Quais capítulos e CIDs mais contribuem.
2. **Cruzar com dimensão ocupacional**: Onde esses agravos se concentram (secretaria, cargo, natureza).
3. **Detectar padrões ocupacionais**: Certos cargos ou locais têm padrões diferentes?
4. **Validar com tendência temporal**: Os agravos estão crescendo ou diminuindo?

O técnico busca **evidência para planejamento de ações preventivas**.

### 11.3 Como a página ajuda prevenção

A página permite:
- Identificar que 40% dos dias perdidos vêm de um único capítulo CID → direcionar programa preventivo.
- Detectar que determinado cargo tem recorrência de 50% → investigar condições de trabalho.
- Observar que uma secretaria concentra a maioria dos afastamentos por doença musculoesquelética → intervir ergonomicamente.
- Monitorar se ações preventivas estão surtindo efeito via tendência temporal.

### 11.4 Como a página ajuda vigilância ocupacional

A aba Visão Ocupacional permite cruzar agravos com a estrutura administrativa. O cruzamento Capítulo CID x Secretaria revela combinações específicas de alto risco que seriam invisíveis em análises unidimensionais.

### 11.5 Como a página ajuda ciência de dados

O pipeline dual-layer com políticas declarativas, métricas auditáveis e separação clara entre camadas permite:
- Reproduzir qualquer número exibido seguindo o código.
- Auditar a qualidade dos dados.
- Propor refinamentos analíticos com base em evidência.

---

## 12. MAPA DE ORIGEM DOS RESULTADOS

### 12.1 Mapa de rastreabilidade

| Resultado exibido | Componente que renderiza | Função/seletor que alimenta | Camada de dados | Métricas/campos |
|---|---|---|---|---|
| Total de Afastamentos | `StatisticCard` (Visão Geral) | `buildCidAnalyticsMetrics()` → `magnitude.totalAfastamentos` | Eventos | `events.length` |
| Servidores Afastados | `StatisticCard` | `buildCidAnalyticsMetrics()` → `magnitude.totalServidoresAfastados` | Eventos | `Set(servidorCpf).size` |
| Dias Perdidos | `StatisticCard` | `buildCidAnalyticsMetrics()` → `magnitude.totalDiasPerdidos` | Eventos | `sum(daysAway)` |
| Duração Média | `StatisticCard` | `buildCidAnalyticsMetrics()` → `magnitude.duracaoMedia` | Eventos | `totalDias / totalAfastamentos` |
| Duração Mediana | `StatisticCard` | `buildCidAnalyticsMetrics()` → `magnitude.duracaoMediana` | Eventos | `median(daysAway[])` |
| Recorrência 180d | `StatisticCard` | `buildCidAnalyticsMetrics()` → `persistence.*` | Eventos | `isRecurrentPrimary` |
| Ranking por Capítulo | `CidChapterRankingPanel` | `toChapterRanking()` + `sortChapterRanking()` | Ocorrências CID | `cidChapter`, `allocatedDays`, `eventId` |
| Ranking por CID | `CidCodeRankingPanel` | `toCidRanking()` + `sortCidRanking()` | Ocorrências CID | `cidCode`, `cidDesc`, `allocatedDays` |
| Tendência Clínica | `CidClinicalTrendPanel` | `chapterTrendPoints` (useMemo) | Ocorrências CID | `competency`, `allocatedDays` |
| Ranking Secretaria | `CidOccupationalRankingPanel` | `secretariaRanking` (useMemo) | Eventos + Ocorrências | `secretaria`, `daysAway`, `cidChapter` |
| Ranking Cargo | `CidOccupationalRankingPanel` | `cargoRanking` (useMemo) | Eventos + Ocorrências | `cargo`, `daysAway`, `cidCode` |
| Impacto Natureza | `CidNatureImpactPanel` | `naturezaImpact` (useMemo) | Eventos | `naturezaCargo`, `daysAway` |
| Cruzamento Cap x Sec | `CidOccupationalCrossPanel` | `occupationalCross` (useMemo) | Eventos + Ocorrências | `cidChapter`, `secretaria`, `allocatedDays` |
| Recorrência por janela | `CidRecurrenceSummaryPanel` | `recurrenceWindowSummary` (useMemo) | Eventos | `isRecurrent90/180/365` |
| Tabela investigativa | `CidRecurrenceInvestigativeTable` | `filtered.events` direto | Eventos | Todas as dimensões do evento |
| Alertas Gerenciais | `CidManagerialAlertsPanel` | `buildCidManagerialIntelligence()` → `.alerts` | Eventos + Ocorrências | Rankings gerenciais integrados |
| Rankings Prioritários | `CidPriorityRankingPanel` | `buildCidManagerialIntelligence()` → `.secretariaRanking` etc. | Eventos + Ocorrências | Score composto multi-fator |

### 12.2 Fluxo "dado bruto → enriquecimento → métrica → painel"

```
SUPABASE (afastamentos + afastamento_cids)
    │
    ▼
Exclusão de maternidade (isMaternityRecord)
    │
    ▼
Lookup CID no banco (tabela cid10, chunks de 250)
    │
    ▼
buildCidAnalyticsDataset(records)
    ├── Gera AfastamentoEventFact[] (camada de eventos)
    │     ├── Recorrência calculada (90/180/365)
    │     ├── Dimensão temporal (competência)
    │     └── Dimensão ocupacional
    │
    └── Gera CidOccurrenceFact[] (camada de ocorrências CID)
          ├── Peso proporcional (shared-days)
          └── Enriquecimento CID via catálogo

    │
    ▼
Enriquecimento adicional via cidCatalogByCode (resolveCidFromCatalog)
    │
    ▼
Filtragem global (todos os filtros aplicados em useMemo)
    │
    ▼
buildCidAnalyticsMetrics(filteredEvents, filteredOccurrences)
    │     ├── Magnitude (totais, média, mediana)
    │     ├── Persistência (recorrência)
    │     ├── Distribuição (por capítulo, CID, secretaria, cargo)
    │     └── Tendência (por competência)
    │
    ▼
buildCidManagerialIntelligence(filteredEvents, filteredOccurrences)
    │     ├── Rankings prioritários (score composto)
    │     └── Alertas gerenciais automáticos
    │
    ▼
useMemo derivados (rankings, cruzamentos, drill-downs)
    │
    ▼
Componentes React renderizam os painéis
```

---

## 13. GLOSSÁRIO DOS TERMOS DA PÁGINA

**CID (Classificação Internacional de Doenças)**: Sistema internacional de codificação de doenças mantido pela OMS (Organização Mundial da Saúde). Versão 10 (CID-10). Cada doença ou condição de saúde recebe um código alfanumérico (ex: M54.5 = Dor lombar baixa).

**Capítulo CID**: Agrupamento de nível superior da CID-10. Cada capítulo cobre uma faixa de doenças (ex: Capítulo XIII = Doenças do sistema osteomuscular e conjuntivo, códigos M00-M99).

**Ocorrência CID**: Uma linha na camada de ocorrências. Um afastamento com 2 CIDs gera 2 ocorrências CID.

**Evento**: Um registro de afastamento. Equivale a um episódio de afastamento.

**Dias Perdidos**: Total de dias calendário em que o servidor esteve afastado. Representa a carga operacional.

**Dias Alocados (allocatedDays)**: Na camada de ocorrências, os dias são distribuídos proporcionalmente entre CIDs. Se um afastamento de 30 dias tem 2 CIDs, cada ocorrência recebe 15 dias alocados.

**Duração Média**: Média aritmética de dias de todos os afastamentos do recorte.

**Duração Mediana**: Valor central da distribuição de dias. Mais resistente a outliers.

**Recorrência**: Ocorrência de um novo afastamento do mesmo servidor dentro de uma janela temporal (90, 180 ou 365 dias) após o fim do episódio anterior.

**Janela de Recorrência**: Período em dias dentro do qual um novo afastamento é classificado como recorrente. A janela principal é 180 dias.

**Episódio**: Contador sequencial de afastamentos de um servidor. Episódio 1 é o primeiro, episódio 2 é o segundo, e assim por diante.

**Intervalo entre episódios**: Dias entre o fim do episódio anterior e o início do novo. Intervalos curtos indicam persistência.

**Acumulado**: Soma total de dias de afastamento de um servidor até aquele episódio.

**Camada Gerencial**: Camada de inteligência que gera alertas automáticos e rankings compostos multi-fator.

**Score de Prioridade**: Pontuação composta de 0 a 100 que combina volume, dias perdidos, recorrência e tendência para classificar criticidade.

**Criticidade**: Classificação em faixas: prioridade-critica (≥75), atencao-alta (≥55), atencao-moderada (<55).

**Tendência**: Variação percentual do volume de um grupo entre a penúltima e a última competência (mês).

**Impacto Ocupacional**: Relação entre agravos de saúde e estrutura administrativa/funcional (secretaria, cargo, natureza).

**Peso de Ocorrência (occurrenceWeight)**: Fração que cada CID representa dentro de um afastamento. Para 2 CIDs: 0.5 cada.

**Competência**: Período mensal no formato YYYY-MM. Derivada da data de início do afastamento.

**Shared-days**: Política de alocação de dias onde cada ocorrência CID recebe fração proporcional dos dias do evento.

**Dual-layer**: Estratégia analítica com duas camadas: eventos e ocorrências CID.

---

## 14. LIMITES E CUIDADOS DE INTERPRETAÇÃO

### 14.1 O que a página mostra muito bem

- Concentração de agravos por CID e capítulo (epidemiologia ocupacional).
- Impacto operacional em dias perdidos por diversas dimensões.
- Padrões de recorrência por servidor.
- Cruzamentos ocupacionais (agravo x local de trabalho).
- Tendências temporais.
- Rankings gerenciais auditáveis com fórmula transparente.

### 14.2 O que deve ser interpretado com cautela

**Ranking não é causalidade**: O fato de uma secretaria liderar o ranking de dias perdidos não significa que aquela secretaria "causa" mais adoecimento. Pode ser a maior em número de servidores, ou ter perfil demográfico diferente.

**Correlação por CID não implica diagnóstico ocupacional**: A concentração de um CID em um local não prova que o ambiente de trabalho é a causa. Fatores externos (comorbidades, idade, condições sociais) influenciam.

**Tendência curta pode ser volátil**: Comparar apenas duas competências (meses) para calcular tendência pode gerar sinais instáveis. Um mês com 3 afastamentos a mais que o anterior pode parecer "tendência de +100%" sem ser estatisticamente expressivo.

**Dados dependem da qualidade do registro**: Se um afastamento foi registrado sem CID ou com CID genérico, o enriquecimento tenta resolver, mas a qualidade da análise depende da qualidade da entrada.

**Mediana e média divergentes**: Quando divergem muito, a distribuição é assimétrica. Nesse caso, a mediana é mais representativa do "caso típico".

### 14.3 LGPD e exposição nominal

- O CPF é **mascarado** na tabela investigativa (apenas 3 primeiros + 2 últimos dígitos visíveis).
- O nome do servidor é exibido na tabela investigativa para fins de investigação clínica legítima.
- A página é acessível apenas a perfis de admin e nurse (controle de acesso verificado no carregamento).
- A documentação do módulo prevê **refinamento futuro** de visibilidade por perfil LGPD para o drill-down investigativo, ainda não implementado.

### 14.4 Limitações atuais

- Não há exportação analítica (CSV, PDF) implementada.
- Não há cache/materialização: todas as métricas são calculadas em tempo real no navegador.
- A tendência compara apenas as duas competências mais recentes, sem janela deslizante mais ampla.
- Alertas gerenciais seguem regras fixas de threshold (≥25% tendência, ≥35% recorrência, etc.), sem calibração adaptativa.

---

## 15. CONCLUSÃO FINAL

### 15.1 Valor institucional da página

A página `/afastamentos/cid-analytics` é a ferramenta analítica mais completa do SESMT-SYSTEM para vigilância epidemiológica ocupacional. Ela transforma dados transacionais de afastamentos em inteligência gerencial estruturada através de três camadas complementares: leitura executiva rápida, análise técnica intermediária e investigação de casos.

### 15.2 Por que é útil

1. **Visibilidade antes inexistente**: Antes deste módulo, a relação entre CIDs, recorrência e estrutura ocupacional só seria acessível através de análises manuais em planilhas.

2. **Priorização auditável**: Os rankings gerenciais usam fórmula transparente e documentada, permitindo que qualquer técnico reproduza e compreenda o resultado.

3. **Estrutura dual-layer**: O tratamento correto de múltiplos CIDs por afastamento, com distribuição proporcional de dias, evita as duplas-contagens que distorceriam rankings convencionais.

4. **Qualidade de dados garantida**: O mecanismo de enriquecimento e sanitização, auditado com taxa zero de residual, garante que as análises operam sobre dados limpos.

### 15.3 Decisões que ela suporta

- Onde concentrar recursos de prevenção (quais secretarias, cargos, agravos).
- Quais servidores precisam de acompanhamento clínico mais próximo.
- Se programas preventivos estão surtindo efeito (via tendência temporal).
- Como priorizar investimentos em saúde ocupacional.
- Onde intervir com ações ergonômicas, psicossociais ou de segurança.

### 15.4 Conexão com o SESMT-SYSTEM

A página se integra ao ecossistema do SESMT-SYSTEM através de:
- Banco de dados compartilhado (Supabase) com as tabelas `afastamentos` e `afastamento_cids`.
- Sidebar e sistema de autenticação institucional.
- Catálogo de CID compartilhado (tabela `cid10` + JSON local).
- Governança visual unificada (design system institucional).
- O módulo complementa, sem substituir, as rotas `/afastamentos` (operacional) e `/afastamentos/analytics` (analítica geral).

---

## APÊNDICE A — LISTA DE ARQUIVOS ANALISADOS

### Documentação de governança e arquitetura
- `AGENTS.md`
- `web-platform/DESIGN_SYSTEM_SESMT_GOVERNANCA_VISUAL_UNIFICADA.md`
- `web-platform/docs/CID_ANALYTICS_MODULO_GOVERNANCA_E_ARQUITETURA.md`

### Página principal
- `web-platform/src/app/afastamentos/cid-analytics/page.tsx`

### Pipeline analítico
- `web-platform/src/lib/afastamentos-cid-analytics.ts`
- `web-platform/src/lib/afastamentos-cid-managerial.ts`
- `web-platform/src/lib/afastamentos-cid-page-architecture.ts`
- `web-platform/src/lib/cid-utils.ts`

### Tipos
- `web-platform/src/types/afastamentos-cid-analytics.ts`
- `web-platform/src/components/analytics/cid/types.ts`

### Componentes visuais (painéis)
- `web-platform/src/components/analytics/cid/CidChapterRankingPanel.tsx`
- `web-platform/src/components/analytics/cid/CidCodeRankingPanel.tsx`
- `web-platform/src/components/analytics/cid/CidClinicalTrendPanel.tsx`
- `web-platform/src/components/analytics/cid/CidOccupationalRankingPanel.tsx`
- `web-platform/src/components/analytics/cid/CidNatureImpactPanel.tsx`
- `web-platform/src/components/analytics/cid/CidOccupationalCrossPanel.tsx`
- `web-platform/src/components/analytics/cid/CidRecurrenceSummaryPanel.tsx`
- `web-platform/src/components/analytics/cid/CidRecurrenceInvestigativeTable.tsx`
- `web-platform/src/components/analytics/cid/CidManagerialAlertsPanel.tsx`
- `web-platform/src/components/analytics/cid/CidPriorityRankingPanel.tsx`

### Componentes reutilizados
- `web-platform/src/components/filters/CompactFilterBar.tsx`
- `web-platform/src/components/filters/ActionIconButton.tsx`
- `web-platform/src/components/filters/FilterChips.tsx`
- `web-platform/src/components/statistics/StatisticCard.tsx`
- `web-platform/src/components/statistics/StatisticCardRow.tsx`

### Auditoria
- `web-platform/tmp/cid_analytics_audit_report.json`

---

## APÊNDICE B — MAPA RESUMIDO DOS COMPONENTES/PAINÉIS

```
/afastamentos/cid-analytics
├── Sidebar
├── Header Analítico
│   ├── CompactFilterBar (busca, período, secretaria, capítulo CID)
│   ├── ActionIconButton × 6 (cargo, natureza, CID, situação, duração, recorrência)
│   └── FilterChips
├── Banner de exclusão de maternidade
└── Container de Abas
    ├── [Visão Geral]
    │   ├── StatisticCardRow × 6 (magnitude + recorrência)
    │   ├── CidManagerialAlertsPanel (alertas gerenciais)
    │   ├── CidPriorityRankingPanel × 4 (secretaria, cargo, capítulo, CID)
    │   └── Bloco explicativo do score
    │
    ├── [CID e Capítulos]
    │   ├── StatisticCardRow × 4 (contexto CID)
    │   ├── CidChapterRankingPanel (ranking capítulos)
    │   ├── CidCodeRankingPanel (ranking CIDs + drill-down)
    │   └── CidClinicalTrendPanel (gráfico de tendência)
    │
    ├── [Visão Ocupacional]
    │   ├── StatisticCardRow × 4 (contexto ocupacional)
    │   ├── CidOccupationalRankingPanel (secretaria)
    │   ├── CidOccupationalRankingPanel (cargo)
    │   ├── CidNatureImpactPanel (natureza)
    │   └── CidOccupationalCrossPanel (cruzamento)
    │
    └── [Casos e Recorrência]
        ├── StatisticCardRow × 4 (contexto recorrência)
        ├── CidRecurrenceSummaryPanel (comparativo 90/180/365)
        └── CidRecurrenceInvestigativeTable (tabela detalhada)
```

---

## APÊNDICE C — ZONAS DE AMBIGUIDADE IDENTIFICADAS

### C.1 Drill-down de capítulo para CID

O drill-down funciona selecionando um capítulo na tabela de capítulos, que filtra a tabela de CIDs e o gráfico de tendência. No entanto, este drill-down é interno ao tab "CID e Capítulos" e não afeta os filtros globais. Isso é intencional — os filtros globais e o drill-down operam em camadas diferentes.

### C.2 Tendência limitada a duas competências

O cálculo de tendência nos rankings gerenciais compara apenas as duas competências mais recentes. Isso pode gerar resultados voláteis em cenários com poucos registros. Não há janela deslizante mais ampla implementada.

### C.3 Resolução de CID em edge cases

Quando o código CID não é encontrado em nenhuma das três fontes (banco, catálogo JSON, range de capítulo), o sistema mantém valores de fallback. Esses casos são raros no dataset atual (auditoria mostra 0 resíduos), mas poderiam surgir com dados de qualidade inferior.

### C.4 Controle de acesso investigativo

O controle atual permite acesso a admin e nurse. Não existe diferenciação entre níveis de visibilidade dentro desses perfis (ex: enfermeiro ver CPF vs não ver). A documentação do módulo reconhece isso como evolução futura.

---

FIM DO RELATÓRIO
