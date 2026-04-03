# Microfase C1 — Cabeçalho Epidemiológico Contextual no CID Analytics

**Commit:** `519ba5e`  
**Branch:** `feat/unified-absenteeism-intelligence-program`  
**Status:** ✅ Concluída

---

## A. Objetivo da microfase

Adicionar ao CID Analytics um cabeçalho contextual epidemiológico exibido quando o módulo é
acessado a partir da Tela Epidemiológica, ancorando a leitura bruta do CID Analytics em um
contexto populacional/padronizado, sem descaracterizar o módulo nem alterar seu papel
clínico-investigativo.

---

## B. Racional do cabeçalho contextual

O CID Analytics trabalha com leitura bruta: contagem absoluta de evento, frequência de CID,
duração de licença. Por si só, essa leitura não informa ao analista qual é o peso relativo do
capítulo que ele está investigando no quadro geral de absenteísmo da organização.

Quando o analista chega ao CID Analytics vindo de um clique na Tela Epidemiológica, ele já
sabe o peso relativo — viu a tabela de "Agravos Dominantes". O cabeçalho contextual traz esse
dado consigo, sem forçar uma segunda consulta, sem duplicar a tela de Epidemiologia, e sem
alterar o papel primário do CID Analytics.

O cabeçalho funciona como âncora metodológica: "você está investigando em detalhe um capítulo
que representa X licenças e Y dias perdidos no período selecionado."

---

## C. Informações exibidas

| Campo | Fonte | Exibição |
|---|---|---|
| Período | query param `startDate` + `endDate` | duas linhas (de / a) |
| Capítulo CID em foco | query param `chapter` | nome completo |
| Licenças no recorte | query param `epiLic` | número formatado pt-BR |
| Dias perdidos | query param `epiDias` | número formatado pt-BR em vermelho |
| % dias sobre o total | query param `epiPct` | "X.X% do total" |
| DML origem | query param `epiDml` | dias médios |

**Renderização graceful:**
- Se presentes `chapter` ou `startDate`: o cabeçalho é exibido
- Se `epiLic`/`epiDias`/`epiDml`/`epiPct` estiverem ausentes (URL antiga / acesso direto com apenas period/chapter): apenas as colunas Período e Capítulo são mostradas, sem erro

---

## D. Fonte de dados utilizada

Todos os valores do cabeçalho vêm dos **query params da URL**, não de uma chamada de API
adicional no CID Analytics.

Os valores são originados no `EpidemiologyCidChapterRow` construído em
`buildCidChapterRows()` (`afastamentos-epidemiologia-page-utils.ts`) e passados no momento
do clique em `CidChapterExecutiveBlock.handleRowClick()`.

**Parâmetros de URL utilizados:**
```
/afastamentos/cid-analytics?
  chapter=DOENÇAS+DO+APARELHO+CIRCULATÓRIO
  &startDate=2024-01-01
  &endDate=2024-12-31
  &epiLic=1234
  &epiDias=45678
  &epiDml=37.0
  &epiPct=18.3
```

**Sem chamada adicional à API.** O CID Analytics lê os valores apenas de `useSearchParams()`,
já disponível (e com `Suspense` correto desde B2).

---

## E. Relação com a política A1–A4

| Política | Impacto em C1 |
|---|---|
| A1 — exclusão de maternidade | Os valores de `epiLic` e `epiDias` passados já são calculados com a exclusão de maternidade aplicada (`buildCidChapterRows` usa `isMaternityAfastamentoRecord`) |
| A2 — base operacional vs analítica | O cabeçalho exibe dados da base operacional (Epidemiologia Geral), consistente com a política A2 |
| A3 — bruto vs padronizado | O cabeçalho é explicitamente rotulado "leitura de suporte · valores brutos · não substitui indicadores padronizados" |
| A4 — convergência CID Analytics | O cabeçalho reforça o texto metodológico já presente no rodapé do módulo |

---

## F. Relação com B1–B2

| Microfase | Conexão com C1 |
|---|---|
| B1 | O bloco "Agravos Dominantes" fornece `EpidemiologyCidChapterRow` com os valores que C1 exibe no cabeçalho |
| B2 | A infraestrutura de query params (`chapter`, `startDate`, `endDate`) e o `Suspense` foram estabelecidos em B2; C1 estende adicionando `epiLic`, `epiDias`, `epiDml`, `epiPct` |

A C1 completa o fluxo: B1 calcula → B2 conecta → C1 contextualiza.

---

## G. Garantias de não interferência

- **Psicossocial**: nenhum arquivo alterado
- **Ergonomia**: nenhum arquivo alterado
- **Legado operacional**: nenhum arquivo alterado
- **Filtros do CID Analytics**: inalterados (o cabeçalho é renderização visual, não lógica de filtro)
- **Estados internos do CID Analytics**: inalterados (o cabeçalho lê apenas `searchParams`, não escreve estado)
- **Leitura bruta primária**: continua sendo a principal; o cabeçalho aparece acima mas não substitui nenhuma seção existente

---

## H. Limitações conhecidas

1. **Secretaria/cargo/local não propagados**: por decisão de escopo, apenas `chapter`, `startDate`, `endDate` e os KPIs do capítulo são passados. Cortes por secretaria ou local de trabalho não fazem parte do deep link atual.

2. **Valores frozen no clique**: os dados do cabeçalho refletem o estado no momento do clique. Se o analista alterar as datas no CID Analytics, os KPIs do cabeçalho continuarão exibindo os valores originais (o que é correto, pois servem de contexto de origem).

3. **Acesso direto**: se o analista acessar CID Analytics diretamente (sem vir da Epidemiologia), o cabeçalho não aparece. Isso é o comportamento correto.

4. **Acesso via URL antiga (B2)**: URLs geradas antes de C1 (sem `epiLic`/`epiDias`) ainda funcionam; o cabeçalho exibe apenas Período e Capítulo, sem os KPIs numéricos.

---

## I. Próximo passo seguro

A arquitetura das três microfases (B1 → B2 → C1) está completa. A ponte funcional entre
Epidemiologia e CID Analytics foi estabelecida e qualificada.

**Possíveis próximas microfases:**
- **C2**: enriquecer o fluxo inverso (CID Analytics → Epidemiologia com parâmetros preservados)
- **D1**: indicadores de tendência no bloco executivo da Epidemiologia (semáforo de agravamento)
- **Fase de hardening**: lint no-unused-vars (145 ocorrências), no-explicit-any (30) — manutenção de código

A decisão de direção cabe ao responsável do programa.
