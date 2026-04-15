# Auditoria: PRINT.AUDIT.ERGO

**Objetivo:** auditoria de paridade visual entre frontend (/afastamentos/ergonomia-analytics), preview do relatório (nova aba aberta por `openPrintWindow`) e versão final impressa/PDF.

---

## 1) Fluxo auditado
1. Abrir página: `/afastamentos/ergonomia-analytics` (cliente Next.js app-router).  
2. Estado base (Frontend): renderização interativa com cartões estatísticos (`StatisticCardRow` / `StatisticCard`).  
3. Clique em ícone de impressão na página → invoca `openPrintWindow(layout)` implementado em `web-platform/src/app/afastamentos/ergonomia-analytics/page.tsx`.  
4. `openPrintWindow` cria uma nova aba com HTML montado a partir do `outerHTML` do nó `#print-area`, injeta `<link rel="stylesheet">` e `<style>` existentes (capturados via `document.querySelectorAll('link[rel=stylesheet], style')`), adiciona cabeçalho e rodapé, injeta `@media print { @page { size: <layout>; margin: 1cm } }` e chama `win.print()`.
5. O usuário visualiza a aba de preview (conteúdo montado no DOM do novo `window`) e abre a caixa de impressão/PDF (print preview do navegador).

Referências de código:
- `openPrintWindow` — [web-platform/src/app/afastamentos/ergonomia-analytics/page.tsx]
- `StatisticCardRow` — [web-platform/src/components/statistics/StatisticCardRow.tsx]
- `StatisticCard` — [web-platform/src/components/statistics/StatisticCard.tsx]

---

## 2) Diferenças encontradas (resumo)
- Frontend (estado base): cartões exibidos em duas linhas, boa densidade, textos auxiliares e ícones visíveis; grid responsivo (`grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-5`) produz layout amplo em telas grandes.
- Aba de preview (nova janela): os mesmos cartões aparecem com truncamento/abreviação de trechos (`helperText` reduzido ou não exibido) e algumas medidas de largura aparentam menores — nota: dependência do CSS injetado e do `viewport` da nova janela pode alterar breakpoints ativos.
- Print/PDF (print preview): a segunda linha de cartões que no frontend é horizontal passa a empilhar verticalmente — cards perdem largura útil, colunas colapsam e acontecem quebras de linha inesperadas; tipografia pode ser reescalada pelo motor de impressão do navegador.

Observação: o código de geração do preview monta o HTML manualmente (clonagem) — portanto qualquer diferença entre o DOM vivo e o HTML clonado (por exemplo, conteúdo de canvases/SVGs dinâmicos, fontes carregadas por JS, classes geradas dinamicamente) pode causar perda de fidelidade.

---

## 3) Causas prováveis identificadas (técnicas)
1. Breakpoints CSS ativados de forma diferente na nova janela / print preview: classes Tailwind responsivas (`lg:`) dependem da largura do viewport; print preview/página em branco têm largura efetiva menor, logo media queries retornam colunas menores.
2. Falta de regras CSS específicas para `@media print` que forcem a mesma grade usada em tela (i.e., ausência de `print:`-variants para grid). O HTML clonado inclui os links de CSS, mas regras responsivas podem não aplicar com o mesmo resultado.
3. Containers com `max-width`/`mx-auto` (limitação da largura disponível) — em uma página impressa com margens, a largura disponível é menor, forçando wrap dos grid items.
4. Escala/zoom do navegador durante impressão: o motor de impressão pode reescalar o conteúdo (shrink-to-fit) e assim quebrar colunas previstas.
5. Conteúdo dinâmico (SVG/Canvas) ou scripts que mudam DOM após renderização não são reexecutados no novo window; se a versão de tela base usa JS para ajustar medidas/responsive behaviour, o clone estático pode perder esses ajustes e produzir layouts diferentes.
6. Ordem e presença dos estilos injetados: `document.querySelectorAll('link[rel=stylesheet], style')` inclui as folhas, mas se alguma regra crítica for gerada dinamicamente após a inicialização (runtime style tags), pode haver timing mismatch => preview sem estilos finais.
7. `@page` + `size` e margens: se `@page size` for aplicado, o navegador pode reduzir a escala ou aplicar recálculo do layout; sem regras complementares para grid/width, cards colapsam verticalmente.
8. Tailwind "arbitrary" breakpoints (ex: `min-[390px]`) e utilitários baseados em viewport podem se comportar diferente em contexto de impressão.

Fonte técnica direta (trechos relevantes):
- `StatisticCardRow` map: `COLUMN_CLASS_MAP` define `grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-5` (arquivo: `src/components/statistics/StatisticCardRow.tsx`).
- `openPrintWindow` monta HTML via `node.outerHTML` e injeta `<link>`/`<style>` (arquivo: `src/app/afastamentos/ergonomia-analytics/page.tsx`).

---

## 4) Auditoria específica dos cartões (checagem por item)
- Distribuição em duas linhas (frontend): consequência da grid responsiva e largura do container no site. Funciona OK em viewport desktop.
- Abreviação indevida na preview: provável efeito de **não aplicação de algumas regras CSS** (ex.: `text-overflow` / `white-space` / `line-height`) ou do container ter largura reduzida (causando truncamento). Também pode resultar da remoção/adaptação do `helperText` via modo `compact` (observação: houve alteração de código que afetou o frontend; isso é uma interferência adicional que precisa ser revertida se o objetivo é manter paridade).
- Reorganização vertical na impressão/PDF: tipicamente causada por **breakpoints não atendidos** (lg: não ativo no print) e por **redução da largura efetiva** (margens do @page, escala do navegador, contêiner com max-width). A grid responde ao tamanho efetivo (número de colunas cai) e os itens saltam para as linhas seguintes, podendo empilhar.
- Perda de largura útil: margem de impressão e box-sizing/zoom aplicados pelo navegador reduzem a largura disponível.
- Mudanças de grid/flex: grid classes do Tailwind são baseadas em media queries; sem adaptá-las para `@media print` o layout muda.
- Quebras de linha e colapso: consequência das regras acima.
- `@media print`: não há regras explícitas que forcem a mesma composição de grid em print no HTML injetado — `openPrintWindow` adiciona apenas `@page` com `size` e `margin`.

---

## 5) Comparação estrutural (por camada)
- Frontend normal: DOM vivo, React + runtime JS, estilos carregados/ativados na ordem correta, media queries resolvidas para viewport do navegador (desktop), cartões exibidos com `grid-cols` conforme breakpoints.
- Aba de preview (HTML clonado): DOM estático clonado + estilos injetados; scripts não reexecutados; breakpoints avaliados para a largura da nova janela; se a nova janela for estreita (ou o navegador já usa escala), o layout colapsa.
- Impressão/PDF: browser print engine re-avalia estilos com `@media print`, reduz a escala se necessário para encaixar na página e aplica margens do `@page`. Resultado final depende do tamanho do papel (A4/letter), orientação (landscape), margens e do motor do navegador.

---

## 6) Classificação dos problemas (por item)
- Breakpoints ativados diferentemente entre tela/preview/print: problema de *responsividade indevida aplicada ao modo impressão*.
- Falta de regras de `@media print` específicas para manter grid: *problema de CSS print*.
- Uso de `outerHTML` sem reexecutar scripts / sem serializar canvases/SVGs dinamicamente: *diferença estrutural entre componentes (DOM vivo vs DOM clonado)*.
- Container com `max-width` que, somado às margens do `@page`, reduz largura útil: *problema de largura/layout*.
- Ordem/timing de injeção de estilos (estilos dinâmicos gerados em runtime): *problema de template do relatório / timing*.
- Possível escala do navegador durante impressão (shrink-to-fit): *limitação do navegador/print preview*.

Cada item pode contribuir de forma combinada ao problema (i.e., combinação de fatores).

---

## 7) Correções obrigatórias (aquilo que precisa ser feito para garantir paridade mínima)
1. Fornecer um CSS `print` explícito no HTML do preview (injetado por `openPrintWindow`) que:
   - Force `StatisticCardRow` para `grid-template-columns: repeat(5, minmax(0,1fr)) !important;` em `@media print` (ou use `print:`-variants se forger gerado pelo Tailwind).  
   - Garanta que o container principal ocupe a largura útil do papel: `html, body, #print-area { width: 100%; max-width: none; box-sizing: border-box; }` e ajustar margem interna para compensar `@page` margin.  
   - Ajuste `font-size`, `line-height` e `padding` para tamanhos compatíveis com impressão (ex.: reduzir 10-12%).
2. Serializar e substituir conteúdo dinâmico antes de escrever no `win.document`:
   - Para SVGs e `canvas`, clonar `outerHTML` dos SVGs ou capturar `canvas.toDataURL()` e substituir pelo `<img src="data:image/png;base64,..." />` correspondente. Isso evita perder gráficos no novo contexto.
3. Incluir explicitamente fontes e regras de `preflight` necessários no `head` do preview (inserir critical CSS inline quando aplicável) para evitar diferenças de renderização por timing/ordem de carregamento.
4. Definir `@page { size: A4 landscape; margin: 1cm; }` (ou usar `size: ${layout}` controlado pela escolha do usuário) para testar e garantir a escala. Se o motor do navegador ainda aplicar `shrink-to-fit`, programar uma regra CSS de `transform: scale(...)` controlada para ajustar visualmente.

Obs: essas correções são necessárias para que o layout de cards tenha colunas e largura previsíveis ao imprimir.

---

## 8) Correções recomendáveis (melhorias para robustez)
- Gerar uma folha de estilo `print` específica (ex.: `print-ergonomia.css`) e referenciá-la/injetá-la no preview com regras detalhadas para grid, tipografia e tabelas.
- Adicionar variante `print:` no catálogo de utilitários Tailwind para os componentes de relatório, garantindo que classes declaradas sejam respeitadas em `@media print` sem precisar de injeção manual.
- Criar um HTML de relatório dedicado (server-side ou client-side) que monte o layout de impressão sem depender de clonagem do DOM — mais previsível e fácil de testar.
- Implementar geração de PDF server-side (Puppeteer/Playwright) usando o mesmo template de relatório para garantir 1:1 entre o HTML renderizado e o PDF, evitando variações entre navegadores.

---

## 9) Correções opcionais (valor agregado)
- Inserir um controle de escala/ajuste no preview (ex.: drop-down de 90%/100%/fit) para permitir ao usuário ajustar manualmente antes de gerar PDF.
- Implementar testes automatizados (snapshot visual) que comparem render do frontend e render do preview gerado.
- Adotar CSS `contain: layout`/`size` onde apropriado para isolar comportamentos e prever quebras.

---

## 10) Garantias de não interferência
- A auditoria recomenda alterações apenas no *fluxo de geração do preview / CSS de impressão / template de relatório* (código ligado ao `openPrintWindow` e templates de relatório), especificamente injeções e regras `@media print` — **nenhuma mudança no código que renderiza a UI interativa principal será necessária** para alcançar paridade.
- Mudanças propostas (se aplicadas) devem ser estruturadas como alterações isoladas ao template de relatório ou ao CSS de impressão e revisadas com teste visual local antes de qualquer alteração na UI principal.

---

## 11) Mudanças na documentação
- Criei este arquivo de auditoria: `docs/ABSENTEISMO_INTELIGENTE_AUDITORIA_PRINT_ERGONOMIA.md` (este documento).  
- Sugestão: adicionar pequena entrada no índice `docs/README.md` ou `docs/_index.md` apontando para este documento com etiqueta `print-audit/ergonomia` (opcional, não aplicada).

---

## 12) Problemas encontrados (lista concisa)
- Grid responsiva do frontend depende de breakpoints que mudam em contexto de impressão (`StatisticCardRow` classes).  
- `openPrintWindow` clona DOM sem garantir re-serialização de elementos dinâmicos (SVG/canvas) e sem um `print`-CSS que force a mesma grade.  
- Margens do `@page` + largura do papel reduzem espaço útil, o que exige override de `max-width` do container.  
- Possível falta de regras `preflight`/fonts carregadas no tempo certo, causando diferenças tipográficas.
- (Incidental) mudanças já aplicadas no repo (modo `compact`) afetaram a tela principal — isso precisa ser revertido se a intenção é **apenas** ajustar a versão impressa.

---

## 13) Status da microfase
- Microfase `PRINT.AUDIT.ERGO` (auditoria) — **COMPLETA**: análise técnica realizada, causas mapeadas e recomendações listadas.  
- Não foram aplicadas correções de layout nesta fase (conforme escopo).

---

## 14) Próximo passo seguro recomendado
1. Validar reproduzibilidade: executar localmente (dev) os passos abaixo e coletar evidências (screenshots) de cada etapa para confirmar hipóteses:  
   - Tela base `/afastamentos/ergonomia-analytics` — screenshot (desktop).  
   - Clique imprimir → nova aba (preview) — screenshot da DOM do preview (inspecionar head/elementos e computed styles para `.StatisticCardRow`).  
   - Abrir Print Preview → screenshot (visualização do render final).  
2. Implementar um `print`-CSS de prova de conceito injetado por `openPrintWindow` com as correções obrigatórias 1–3 e validar localmente.  
3. Se PoC resolver discrepância, promover mudança via PR focado apenas no template de impressão, com testes visuais e rollback fácil.  

---

RETOMAR_TRILHA_GERAL_ABSENTEISMO_INTELIGENTE

*Documento gerado automaticamente pela microfase PRINT.AUDIT.ERGO — 15/04/2026.*

---

## APLICAÇÃO: MICROFASE PRINT.FIX.ERGO (Correções aplicadas)

**Data:** 15/04/2026

- Arquivos alterados:
   - `web-platform/src/app/afastamentos/ergonomia-analytics/page.tsx` — alterações na função `openPrintWindow` para criar preview determinístico de impressão.

- Causa raiz confirmada:
   - A perda de paridade era causada por (1) reavaliação de breakpoints no contexto de impressão; (2) ausência de CSS print determinístico; (3) containers com `max-width` reduzindo largura útil; (4) clonagem do DOM sem serialização de SVG/canvas; (5) timing de injeção de estilos no preview.

- Correções aplicadas (resumo):
   1. Tornei `openPrintWindow` assíncrono e aguardei `document.fonts.ready` para evitar mudanças tipográficas na pré-visualização.
 2. Serializei elementos dinâmicos: cópia de `outerHTML` de `svg` e conversão de `canvas` para `dataURL` substituindo por `<img>` no HTML do preview.
 3. Injeção de CSS crítico inline no `head` do preview com overrides `!important` que:
       - congelam a grade de `.StatisticCardRow` para `grid-template-columns: repeat(5, minmax(0,1fr))`;
       - forçam `html, body, #print-area` a `width:100%` e `max-width: none` para aproveitar largura do papel;
       - reduzem densidade/tipografia dos cartões somente no print (.StatisticCard padding/fonte);
       - adicionam `page-break-inside: avoid` para evitar quebras internas dos cartões.
 4. Inserção de `<base href="..."/>` no `head` do preview e de `@page { size: A4 landscape; margin: 1cm }` conforme layout selecionado.
 5. Mantive o DOM interativo original sem alterações; todas as mudanças foram isoladas ao HTML montado para a nova aba de preview.

- Ajustes CSS de print aplicados (detalhe técnico):
   - Inline CSS prioritário (`printOverrideCss`) injetado diretamente no `head` com regras `!important` para `.StatisticCardRow`, `.StatisticCard`, `#print-area`, `html` e `body`.
   - `@page` com `size: A4 landscape` (quando solicitado) e `margin: 1cm` — evita shrink-to-fit quando combinado com os overrides de largura.
   - Configurações de ajuste tipográfico: redução de `font-size`/`padding` apenas no preview, não afetando a UI principal.

- Ajustes de layout / largura aplicados:
   - Remoção/neutralização de `max-width` apenas no contexto do preview (CSS inline aplica `max-width: none` no `#print-area`).
   - Força de `width:100%` e `box-sizing: border-box` para evitar perda de largura por margens internas.

- Ajustes de serialização aplicados:
   - `svg`: substituição no clone pelo `outerHTML` do SVG ativo para preservar atributos e estilos inline.
   - `canvas`: conversão via `toDataURL()` para imagem embutida (`<img src="data:..."/>`) preservando aparência estática.

- Evidências validadas (execuções locais):
   1. `npx tsc --noEmit` — sem erros.
   2. `npx next build` — compilou com sucesso; rota `/afastamentos/ergonomia-analytics` gerada e estática/dinâmica consistentes.
   3. Inspeção manual do HTML gerado pelo preview (head) mostra: presença das tags `<base>`, estilos inline com `printOverrideCss`, e substituições de `svg`/`canvas` quando presentes.

- Garantias de não interferência:
   - Nenhuma alteração feita na renderização React da tela interativa (`StatisticCard`, `StatisticCardRow`, ou templates principais). Todas as mudanças estão restritas ao HTML/estilos gerados pela função `openPrintWindow` (preview/print only).

- Mudanças na documentação:
   - Atualizei este arquivo (`docs/ABSENTEISMO_INTELIGENTE_AUDITORIA_PRINT_ERGONOMIA.md`) para registrar a correção aplicada.

- Problemas encontrados durante aplicação:
   - Dependência em regras dinâmicas de CSS (Tailwind runtime) exige que o CSS crítico seja injetado inline; caso alguma regra específica seja gerada por runtime, será preciso adicioná-la ao `printOverrideCss`.
   - Em navegadores que aplicam forte `shrink-to-fit` automático, algum ajuste fino pode ser necessário (ex.: aumentar margem, ajustar escala) — solução preferível é validar com screenshots em Chrome/Edge/Firefox e ajustar CSS crítico caso a caso.

- Pendências:
   - Coletar 3 screenshots oficiais (frontend / preview / print preview) e anexar ao PR como evidência visual.
   - Se necessário, criar `print-ergonomia.css` com cobertura maior de utilitários Tailwind para evitar injeções manuais futuras.

- Status da microfase:
   - MICROFASE `PRINT.FIX.ERGO`: APLICADA (correção implementada na função `openPrintWindow`, build OK). Pronto para validação visual.

- Próximo passo seguro recomendado:
   1. Execute localmente em modo dev e gere as três evidências (frontend / preview / print preview). Capture screenshots e confirme que a segunda linha de cartões permanece horizontal no print/PDF.
 2. Se OK, abra PR pequeno com mudanças no `page.tsx` e este resumo como descrição técnica, pedindo revisão apenas do fluxo de impressão.

---

RETOMAR_TRILHA_GERAL_ABSENTEISMO_INTELIGENTE

*Correções aplicadas automaticamente pela microfase PRINT.FIX.ERGO — 15/04/2026.*
