# Microfase C2 — Padronização da Legenda Metodológica e Semântica Visual

**Commit:** `2bdd94a`  
**Branch:** `feat/unified-absenteeism-intelligence-program`  
**Status:** ✅ Concluída

---

## A. Objetivo da microfase

Padronizar a linguagem, a legenda metodológica e os sinais visuais entre a Tela Epidemiológica
Geral e o CID Analytics, tornando explícito para o usuário o papel de cada tela, o tipo de
leitura que cada módulo oferece, e quando um indicador não é calculável em determinado contexto.

---

## B. Pontos de desalinhamento encontrados

| # | Superfície | Problema identificado |
|---|---|---|
| 1 | Epidemiologia — subtítulo do header | "Inteligência em Absenteísmo · SESMT" — não comunicava que é leitura principal nem padronizada |
| 2 | Epidemiologia — rodapé institucional | "Dados gerados pelo motor epidemiológico SESMT · Leitura somente" — vago; omitia a distinção padronizada/principal e a referência ao CID Analytics |
| 3 | CID Analytics — subtítulo do header | "Vigilância Epidemiológica Ocupacional • Camada Executiva • Base Operacional • Leitura Bruta" — "Camada Executiva" era semanticamente equivocado para um módulo investigativo/bruto |
| 4 | CID Analytics — banner metodológico | "indicadores padronizados: ver Epidemiologia Geral" — sem deixar claro que é a leitura principal e que usa denominador populacional |
| 5 | CID Analytics — bloco "Regra de Prioridade Gerencial" | Texto sobre leitura bruta não definia quando TAD/IFL/IG são N/D neste módulo |

---

## C. Convenção institucional adotada

| Conceito | Formulação canônica | Onde aparece |
|---|---|---|
| Leitura principal | "Leitura Principal · Indicadores Padronizados por População" | Epidemiologia — subtítulo |
| Leitura investigativa | "Leitura Investigativa · Volume Bruto · sem padronização por população" | CID Analytics — subtítulo |
| Referência cruzada padronizada | "indicadores padronizados por população: Epidemiologia Geral (leitura principal)" | CID Analytics — banner metodológico |
| N/D explícito | "N/D: TAD, IFL e IG não são calculáveis neste módulo (sem denominador padronizado)" | CID Analytics — regra gerencial |
| Rodapé Epidemiologia | "Leitura principal padronizada · motor epidemiológico SESMT · aprofundamento clínico por CID: ver CID Analytics" | Epidemiologia — rodapé |

---

## D. Ajustes aplicados na Epidemiologia

**subtítulo do header (linha 611):**  
`antes:` Inteligência em Absenteísmo · SESMT  
`depois:` Leitura Principal · Indicadores Padronizados por População · SESMT

**rodapé institucional:**  
`antes:` Dados gerados pelo motor epidemiológico SESMT · Leitura somente  
`depois:` Leitura principal padronizada · motor epidemiológico SESMT · aprofundamento clínico por CID: ver CID Analytics

---

## E. Ajustes aplicados no CID Analytics

**subtítulo do header:**  
`antes:` Vigilância Epidemiológica Ocupacional • Camada Executiva • Base Operacional • Leitura Bruta  
`depois:` Leitura Investigativa · Volume Bruto · sem padronização por população • para indicadores populacionais: Epidemiologia Geral

**banner metodológico (linha do rodapé do banner de metadados):**  
`antes:` indicadores padronizados: ver Epidemiologia Geral  
`depois:` indicadores padronizados por população: Epidemiologia Geral (leitura principal)

**bloco "Regra de Prioridade Gerencial" — parágrafo sobre volume bruto:**  
Adicionada ao final: `N/D: TAD, IFL e IG não são calculáveis neste módulo (sem denominador padronizado) — para esses indicadores, consulte Epidemiologia Geral.`

---

## F. Relação com A1–A4

| Política | Impacto em C2 |
|---|---|
| A1 — exclusão de maternidade | Não afetada; sem alteração em lógica |
| A2 — base operacional vs analítica | Reforçada: o subtítulo do CID Analytics deixa de dizer "Camada Executiva" e passa a dizer "sem padronização por população", alinhado com o papel da base operacional |
| A3 — bruto vs padronizado | Reforçada: a distinção agora é visível nos subtítulos de ambas as telas |
| A4 — convergência CID Analytics | Reforçada: a referência a Epidemiologia Geral como "leitura principal" está explícita no banner do módulo |

---

## G. Relação com B1–B2 e C1

| Microfase | Conexão com C2 |
|---|---|
| B1 | Bloco "Agravos Dominantes" não alterado; sua nota de rodapé própria ("clique no capítulo para abrir CID Analytics filtrado") permanece |
| B2 | Navegação contextual não alterada; o cabeçalho contextual C1 permanece intacto |
| C1 | Cabeçalho epidemiológico C1 foi preservado; C2 só atualizou os subtítulos dos headers e textos metodológicos fixos, não a lógica contextual |

A C2 opera em camada diferente de B1–B2–C1: enquanto B/C1 criaram fluxo funcional, C2 padroniza a semântica linguística da interface.

---

## H. Garantias de não interferência

- Psicossocial: zero arquivos alterados
- Ergonomia: zero arquivos alterados
- Legado operacional: zero arquivos alterados
- Motor analítico (ambas as telas): zero alterações em lógica, estados, filtros ou dados
- Apenas texto de subtítulo, rodapé e nota metodológica foram modificados

---

## I. Limitações conhecidas

1. **Denominador insuficiente** na Epidemiologia já tem mensagem explicativa detalhada quando `!summary.isValid`; não foi adicionado badge visual separado — o texto existente cobre o caso adequadamente.
2. **"N/D" no CID Analytics** foi introduzido como nota textual no bloco gerencial. Não foi criado um badge inline por ausência de superfície adequada sem criar nova estrutura.
3. **Referência cruzada** (Epidemiologia → CID Analytics e vice-versa) está em texto; não foi criado link clicável para não introduzir navegação de rodapé fora do escopo.

---

## J. Próximo passo seguro

Com C1 + C2, a Prioridade 3 está encerrada:
- relação metodológica explícita entre as telas: ✅ (C1)
- linguagem e legenda padronizadas: ✅ (C2)

**Próximos caminhos possíveis:**
- **D1**: semáforo de tendência no bloco executivo da Epidemiologia (indicador de agravamento)
- **C2-bis**: badges visuais inline de N/D nos recortes Epidemiologia quando denominador insuficiente
- **Hardening de lint**: `no-unused-vars` (145), `no-explicit-any` (30)

A decisão de direção cabe ao responsável do programa.
