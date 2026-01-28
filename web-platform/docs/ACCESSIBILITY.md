# Checklist de Acessibilidade (WCAG 2.1 AA)

## 1. Estrutura e Semântica

- [ ] O HTML deve ser semanticamente correto (uso de `<nav>`, `<main>`, `<article>`, `<footer>`).
- [ ] A hierarquia de cabeçalhos (`h1` a `h6`) deve seguir uma sequencia lógica. Apenas um `h1` por página.
- [ ] Marcos de navegação (Landmarks) devem estar presentes para usuários de leitores de tela.

## 2. Cores e Contraste

- [ ] Texto normal deve ter contraste mínimo de 4.5:1 em relação ao fundo.
- [ ] Texto grande (18pt+ ou 14pt+ bold) deve ter contraste mínimo de 3:1.
- [ ] A cor não deve ser o único meio de transmitir informação (ex: erros em formulários devem ter ícones ou texto, não apenas borda vermelha).

## 3. Navegação por Teclado

- [ ] Todos os elementos interativos (links, botões, inputs) devem ser focáveis via `Tab`.
- [ ] O foco visível (`outline`) deve estar presente e ser claro.
- [ ] Não deve haver "armadilhas de teclado" (keyboard traps).
- [ ] Ordem de tabulação deve seguir a lógica visual da página.

## 4. Imagens e Mídia

- [ ] Todas as imagens informativas devem ter atributo `alt` descritivo.
- [ ] Imagens decorativas devem ter `alt=""` ou serem implementadas via CSS.
- [ ] Vídeos e áudios devem possuir legendas ou transcrições adequadas.

## 5. Formulários

- [ ] Todos os inputs devem ter `labels` associados (visíveis ou via `aria-label`/`aria-labelledby`).
- [ ] Mensagens de erro devem ser identificáveis e descritivas (uso de `aria-invalid` e `aria-describedby`).
- [ ] Agrupamentos de campos relacionados devem usar `<fieldset>` e `<legend>`.

## 6. Tecnologia Assistiva e ARIA

- [ ] Use ARIA apenas quando o HTML nativo não for suficiente.
- [ ] Elementos dinâmicos (modais, accordions) devem notificar mudanças de estado (`aria-expanded`, `aria-hidden`).
- [ ] Assegurar compatibilidade com leitores de tela (NVDA, JAWS, VoiceOver).
