# ABSENTEISMO_INTELIGENTE_B1 — CAPÍTULOS CID NA TELA EPIDEMIOLÓGICA

**Programa:** Inteligência Unificada em Absenteísmo Ocupacional  
**Microfase:** B1  
**Status:** CONCLUÍDA  
**Branch:** feat/unified-absenteeism-intelligence-program

---

## A. OBJETIVO DA MICROFASE

Adicionar na Tela Epidemiológica Geral um bloco executivo resumido dos capítulos CID com maior impacto no período, funcionando como ponte analítica para o CID Analytics, sem transformar a tela epidemiológica em uma tela clínica detalhada e sem alterar qualquer outro módulo.

---

## B. RACIONAL DO BLOCO EXECUTIVO

### Por que o bloco pertence à Epidemiologia Geral?

A Tela Epidemiológica Geral já produz indicadores padronizados (TAD, IFL, DML, IG) com recortes por sexo, faixa etária, secretaria etc. O usuário que lê esses indicadores possui a pergunta natural imediata: **"Quais patologias estão causando esse absenteísmo?"** Sem o bloco, ele precisaria navegar para outra tela (CID Analytics) apenas para ter a leitura executiva de capítulos dominantes.

O bloco resolve essa pergunta sem detalhamento clínico — apenas volume bruto de capítulos como contexto para os indicadores padronizados que a tela já exibe.

### Por que leitura bruta?

O motor epidemiológico (`abs_intel.*`) já calcula `cuts.cidCapitulo` por capítulo CID com `totalLicencas`, `totalDiasPerdidos` e `dml`. Esses dados não têm denominador populacionalpe capítulo (a população não é estratificada por diagnóstico), portanto a leitura é necessariamente bruta — o que é coerente com a Política A3.

### Por que não drill-down clínico?

O drill-down clínico é o papel do CID Analytics (base operacional, leitura nominativa, análise de recorrência, ranking gerecencail). Criar isso na Epidemiologia duplicaria responsabilidades e descaracterizaria os módulos.

---

## C. POSIÇÃO ESCOLHIDA NA TELA

**Tab:** Visão Geral  
**Posição:** Entre o bloco de contexto (período/licenças/dias/população) e a seção de recortes populacionais (tabelas de sexo, faixa etária, etc.)

**Justificativa:** O fluxo de leitura executiva fica:
1. Indicadores padronizados (TAD, IFL, DML, IG) → *o quê está acontecendo*
2. Contexto de volume (período, total de licenças, dias) → *escala do problema*
3. **→ Capítulos CID dominantes → *qual o agravo principal*** ← NOVO
4. Recortes populacionais → *quem é mais afetado*
5. Tendência → *como está evoluindo*

Esta sequência é metodologicamente coerente: o gestor sai da escala para o agravo antes de detalhar o recorte.

---

## D. CRITÉRIO DE ORDENAÇÃO ADOTADO

**Critério primário: `totalDiasPerdidos` — decrescente**

### Justificativa:

| Critério | Avaliação |
|---|---|
| **Dias perdidos** | Representa o impacto organizacional real — reflete tanto frequência quanto duração. É sempre disponível (não nulo). Privilegia tratamentos longos e agravos crônicos. **Escolhido.** |
| Licenças (contagem) | Pode ser distorcido por episódios curtos de alta frequência (gripais, etc.) que inflam o ranking sem impacto real. |
| IG (Índice de Gravidade) | Requer denominador populacional estratificado por CID — não disponível. Seria nulo para todos os capítulos. |

**Filtro adicional:** capítulos com `totalLicencas === 0` ou chave `NAO_INFORMADO` são excluídos  
**Limite:** top 10 capítulos por período  
**Empate:** ordenação estável (preserva inserção original)

---

## E. CAMPOS EXIBIDOS

| Campo | Fonte | Descrição |
|---|---|---|
| Posição (1–N) | índice calculado | Rank por dias perdidos |
| Capítulo CID | `block.key` | Nome/código do capítulo |
| Lic. | `totalLicencas` | Volume bruto de licenças no capítulo |
| % Lic. | calculado | Participação no total de licenças do período |
| Dias | `totalDiasPerdidos` | Volume bruto de dias perdidos no capítulo |
| % Dias | calculado | Participação no total de dias do período |
| DML | `dml` | Duração média da licença no capítulo (dias/licença) |

**Barra visual:** minia-barra horizontal proporcional ao maior `totalDiasPerdidos` da lista (relativo ao líder, não ao total).

**Rodapé:** aviso de leitura bruta + referência ao CID Analytics para análise clínica detalhada.

---

## F. RELAÇÃO COM A POLÍTICA A1–A4

| Política | Aderência |
|---|---|
| **A1 — Exclusão de maternidade** | Respeitada: os eventos de maternidade são excluídos pela camada de elegibilidade do motor `abs_intel` antes de chegarem ao contrato. `cuts.cidCapitulo` já reflete apenas eventos elegíveis. |
| **A2 — Base operacional vs analítica** | O bloco usa `abs_intel.abs_fact_afastamento_cid` (base analítica) — correto para o contexto epidemiológico padronizado. Diferente do CID Analytics, que usa `public.afastamentos`. |
| **A3 — Bruto vs padronizado** | Explicitamente rotulado como "leitura bruta" no cabeçalho e rodapé do bloco. Os indicadores principais da tela (TAD, IFL, DML, IG) continuam sendo a leitura padronizada primária. |
| **A4 — Identidade do CID Analytics** | O bloco não é drill-down, não tem análise de recorrência, não tem ranking gerencial. A referência cruzada no rodapé direciona o usuário ao CID Analytics para análise detalhada. |

---

## G. GARANTIAS DE NÃO INTERFERÊNCIA

1. **Epidemiologia Geral**: apenas o tab `visao-geral` recebe o bloco — os outros 4 tabs (Indicadores, Recortes Populacionais, Análise Organizacional, Tendência) não foram alterados
2. **CID Analytics**: nenhuma linha alterada
3. **Psicossocial e ergonomia**: não tocados
4. **Legado operacional**: não tocado
5. **Endpoint e application layer**: não alterados
6. **Contrato**: não alterado — `cuts.cidCapitulo` já existia
7. **Motor epidemiológico**: não alterado

---

## H. LIMITAÇÕES CONHECIDAS

1. **Sem denominador por capítulo**: CID não tem snapshot populacional estratificado por diagnóstico. TAD/IFL/IG por capítulo não são calculáveis nesta arquitetura. DML está disponível e é exibido.
2. **Leitura de volume bruto**: o ranking de capítulos é sensível ao tamanho absoluto do período — períodos mais longos tendem a ter mais dias perdidos em todos os capítulos independentemente do perfil epidemiológico.
3. **Top 10 fixo**: a visualização é limitada a 10 capítulos. Capítulos de baixo volume com relevância clínica específica podem ficar ocultos.
4. **Sem link de navegação ativo**: o aprofundamento para o CID Analytics referenciado no rodapé não é um link clicável nesta microfase. É apenas indicação textual.
5. **Chave do capítulo**: o valor exibido é o `cid_capitulo` conforme armazenado em `abs_fact_afastamento_cid`. Se houver variação de capitalização ou nomenclatura incompleta no dado bruto, isso aparece na lista.

---

## I. PRÓXIMO PASSO SEGURO

**Microfase B2 (proposta):** Adicionar link de navegação clicável no bloco "Agravos Dominantes do Período" para abrir o CID Analytics com o filtro de capítulo pré-selecionado — criando a ponte funcional entre as duas telas.

**Alternativa B2:** Ampliar o bloco para incluir o tab `analise-organizacional` com os capítulos CID mais relevantes por secretaria (cruzamento capítulo × secretaria no nível executivo).

---

## Checklist de Critérios de Aceite

| Critério | Status |
|---|---|
| Bloco executivo de capítulos CID presente na Tela Epidemiológica | ✅ |
| Bloco compacto, legível e coerente com papel da tela | ✅ |
| Critério de ordenação (dias perdidos) claramente justificado | ✅ |
| Política A1–A4 respeitada | ✅ |
| Sem alterações fora do escopo | ✅ |
| Typecheck limpo (`npx tsc --noEmit`) | ✅ |

---

`RETOMAR_TRILHA_GERAL_ABSENTEISMO_INTELIGENTE`
