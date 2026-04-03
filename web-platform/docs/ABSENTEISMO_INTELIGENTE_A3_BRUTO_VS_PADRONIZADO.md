# A3 — Regra Oficial de Leitura Bruto vs. Padronizado

**Versão:** 1.0  
**Status:** Implementado  
**Escopo:** Programa Unificado de Inteligência em Absenteísmo Ocupacional — SESMT-SYSTEM  
**Pré-requisito:** A2 (Política de Base Operacional vs. Analítica — commit `e24625c`)

---

## A. Objetivo da Microfase

Definir a regra oficial que determina quando usar contagem bruta, quando usar indicador padronizado por denominador, e como as duas formas de leitura devem coexistir nas telas analíticas do programa — evitando comparações metodologicamente inválidas entre grupos, secretarias, cargos e períodos distintos.

---

## B. Definição de Contagem Bruta

**Contagem bruta** é o número absoluto de eventos ou dias sem normalização por população.

| Indicador bruto | Definição |
|---|---|
| `totalAfastamentos` | Número de registros de afastamento no período/recorte |
| `totalServidoresAfastados` | Número de servidores distintos que se afastaram |
| `totalDiasPerdidos` | Soma dos dias afastados no período/recorte |
| `duracaoMedia` | Média aritmética dos dias por afastamento (DML parcial) |
| `duracaoMediana` | Mediana dos dias por afastamento |
| `recorrencia` | Número/percentual de servidores com ≥2 afastamentos em janela de 180 dias |

**Caracterização:**
- Independe do tamanho da população observada
- Não permite comparação direta entre grupos de tamanhos diferentes
- É o único tipo disponível quando não há denominador populacional (`abs_fact_population_snapshot`)
- É a leitura natural de auditoria, triagem e priorização operacional de CIDs

---

## C. Definição de Indicador Padronizado

**Indicador padronizado** é o valor corrigido pela população-denominador, permitindo comparação proporcional entre grupos ou períodos com tamanhos diferentes.

| Indicador | Fórmula | Unidade |
|---|---|---|
| **TAD** — Taxa de Absenteísmo por Doença | `(totalDiasPerdidos / popolacaoMedia / diasPeriodo) × 365` | dias/func/ano |
| **IFL** — Índice de Frequência de Licenças | `(totalLicencas / populacaoMedia / diasPeriodo) × 365` | lic/func/ano |
| **DML** — Duração Média da Licença | `totalDiasPerdidos / totalLicencas` (quando ≥1 licença) | dias/licença |
| **IG** — Índice de Gravidade | `TAD × IFL` (proxy de impacto ponderado) | dias/func/ano |

**Caracterização:**
- Requer denominador populacional (`abs_fact_population_snapshot`)
- Permite comparação válida entre secretarias, cargos, períodos e faixas etárias distintos
- É a leitura obrigatória para tomada de decisão epidemiológica
- Quando o denominador é insuficiente (< limiar mínimo), TAD, IFL e IG ficam indisponíveis; DML permanece calculável

---

## D. Quando Usar Leitura Bruta

A contagem bruta é o instrumento correto nos seguintes contextos:

1. **Triagem e priorização de CIDs**: qual CID gerou mais dias perdidos, qual tem maior recorrência — sem necessidade de normalização por população.
2. **Auditoria operacional**: quantos registros existem, quais servidores estão afastados, qual é a situação atual — rastreabilidade nominal.
3. **Análise interna a um grupo fixo**: comparações dentro de uma mesma secretaria ao longo do tempo (quando o tamanho da secretaria é estável e conhecido).
4. **Detecção de anomalias operacionais**: pico abrupto de afastamentos em período curto ou concentração em cargo específico — alerta precoce antes da padronização.
5. **Relatórios de volume para gestão**: quantitativos absolutos exigidos por norma ou por solicitação gerencial.
6. **CID Analytics em sua configuração atual**: tela opera sobre `public.afastamentos` sem denominador populacional — toda leitura comparativa é bruta por definição.

---

## E. Quando Usar Leitura Padronizada

O indicador padronizado é obrigatório nos seguintes contextos:

1. **Comparação entre secretarias, cargos ou locais de trabalho** de tamanhos diferentes: não é metodologicamente válido comparar volume bruto da Secretaria de Saúde (500 servidores) com a Secretaria de Finanças (50 servidores).
2. **Comparação entre períodos de duração diferente**: trimestres vs. semestres.
3. **Benchmark temporal**: evolução de uma secretaria ao longo de múltiplos anos.
4. **Decisão sobre intervenção preventiva** baseada em impacto epidemiológico real, não em volume absoluto.
5. **Qualquer comunicação oficial de indicadores** que envolva taxas ou índices comparativos.

---

## F. Quando Apresentar Ambos

As duas leituras devem aparecer juntas sempre que:

1. **O usuário precisa de contexto absoluto** para interpretar o indicador padronizado (ex.: TAD de 12 dias/func/ano sobre uma população de 8 servidores é menos confiável que sobre 300 — o volume bruto dá essa ancoragem).
2. **A tela serve tanto gestores operacionais quanto epidemiologistas**: o número absoluto ancora a leitura, o indicador padronizado qualifica a comparação.
3. **O denominador é baixo mas suficiente**: exibir o bruto junto sinaliza ao usuário que o grupo é pequeno e a taxa deve ser interpretada com cautela.

**Regra de apresentação combinada:**
> Indicador padronizado como leitura principal + contagem bruta como contexto de volume (subtítulo, tooltip ou campo auxiliar).

---

## G. Quando NÃO Comparar Volume Bruto entre Grupos Diferentes

A comparação direta de totais brutos entre grupos é **metodologicamente proibida** quando:

1. **Os grupos têm tamanhos de população significativamente diferentes** (diferença > 30% entre o maior e o menor grupo).
2. **Os períodos têm durações diferentes** (ex.: comparar total de afastamentos de janeiro com total do 1º semestre).
3. **O recorte geográfico ou funcional é heterogêneo** (ex.: comparar secretaria com poucos especialistas versus secretaria com muitos servidores administrativos).
4. **O denominador é indisponível** para qualquer um dos grupos comparados.

**Consequência metodológica:** apresentar rankings de volume bruto entre grupos desiguais sem ressalva é um antipadrão que gera decisões erradas de gestão de pessoas.

**Solução:** exibir o ranking com ressalva explícita de que a ordenação é por volume absoluto e não por taxa, ou substituir pelo ranking padronizado quando o denominador estiver disponível.

---

## H. Como a Epidemiologia Geral Deve Apresentar Isso

A tela `/afastamentos/epidemiologia` é a **tela de leitura principal padronizada**.

### Hierarquia de leitura obrigatória

| Nível | Conteúdo | Tipo |
|---|---|---|
| **Principal** | TAD, IFL, DML, IG | Padronizado |
| **Contexto** | Total de Licenças, Dias Perdidos, População Média | Bruto + denominador |
| **Recortes** | TAD/IFL/DML/IG por grupo (sexo, faixa, secretaria, cargo) | Padronizado |
| **Aviso de denominador insuficiente** | Grupo com população < limiar → opacidade reduzida | Governança |

### Regras de exibição

1. Os cards principais (TAD, IFL, DML, IG) são sempre padronizados — nunca substituir por volumes brutos.
2. O bloco de resumo (`Total de Licenças`, `Dias Perdidos`, `População Média`) serve como âncora de contexto bruto para que o usuário interprete a escala dos índices.
3. Grupos com população insuficiente aparecem com opacidade reduzida e TAD/IFL/IG indisponíveis — DML permanece (não depende de denominador).
4. A mensagem de auditoria de exclusão de maternidade informa o volume bruto excluído, ancorando a leitura bruta da elegibilidade.

### Nota de UX

Os labels "Total de Licenças" e "Dias Perdidos" no bloco de resumo devem ser complementados com o subtexto **"(volume bruto)"** para deixar explícito ao usuário que esses valores não são padronizados por população.

---

## I. Como o CID Analytics Deve Apresentar Isso

A tela `/afastamentos/cid-analytics` é a **tela de leitura principal bruta com complemento gerencial**.

### Hierarquia de leitura atual

| Nível | Conteúdo | Tipo |
|---|---|---|
| **Principal** | Total de afastamentos, Servidores afastados, Dias perdidos, Duração média/mediana | Bruto |
| **Complemento** | Recorrência 180 dias | Métrica bruta derivada |
| **Priorização** | Rankings por secretaria, cargo, capítulo CID | Score composto (bruto) |
| **Sem denominador** | TAD, IFL, IG não calculáveis | Limitação arquitetural atual |

### Regras de exibição

1. Os cards de volume (Total, Dias Perdidos, Duração) são explicitamente brutos — a tela **não** produz TAD/IFL/IG nesta fase arquitetural.
2. Os rankings de secretaria e cargo por volume **não** representam taxa de absenteísmo — representam **concentração de eventos** no período filtrado.
3. A ressalva sobre a natureza bruta dos rankings deve ser visível na interface para evitar interpretação como taxa comparativa.
4. O score de prioridade gerencial combina métricas relativas internas ao dataset filtrado — é comparável dentro da tela, mas não entre telas ou entre datasets com denominadores diferentes.

### Nota de UX

O bloco "Regra de Prioridade Gerencial" existente deve incluir explicitamente que os rankings são baseados em **volume relativo dentro do dataset filtrado** e que não equivalem a indicadores epidemiológicos padronizados por população.

### Gap arquitetural (A2 — pendente de A3 futura)

Enquanto CID Analytics ler `public.afastamentos` sem denominador, toda leitura comparativa entre secretarias permanece bruta. Essa limitação deve ser comunicada ao usuário na interface.

---

## J. Glossário Institucional Mínimo

| Termo | Definição |
|---|---|
| **Contagem bruta** | Número absoluto de eventos, dias ou servidores, sem normalização por população |
| **Indicador padronizado** | Métrica calculada sobre o denominador populacional, permitindo comparação entre grupos de tamanhos diferentes |
| **Denominador populacional** | Média de servidores ativos no período; armazenado em `abs_fact_population_snapshot` |
| **TAD** | Taxa de Absenteísmo por Doença — dias perdidos por funcionário por ano |
| **IFL** | Índice de Frequência de Licenças — licenças por funcionário por ano |
| **DML** | Duração Média da Licença — dias por licença (não depende de denominador) |
| **IG** | Índice de Gravidade — produto de TAD e IFL (proxy ponderado de impacto) |
| **Limiar mínimo de denominador** | Valor mínimo de população exigido para que TAD, IFL e IG sejam exibidos; definido em `EpidemiologyConsumptionContractOptions.minPopulationForStableCut` (padrão: 30) |
| **Score de prioridade gerencial** | Combinação ponderada de volume relativo, dias relativos, recorrência relativa e tendência recente — comparável apenas dentro do mesmo dataset filtrado |
| **Recorrência** | Evento em que o mesmo servidor teve ≥2 afastamentos na janela de 180 dias |
| **Elegibilidade epidemiológica** | Critério de inclusão/exclusão de registros antes da análise (ex.: excluir licença-maternidade — Política A1) |
| **Base operacional** | `public.afastamentos` — registros transacionais com rastreabilidade nominal (Política A2) |
| **Base analítica** | `abs_intel.*` — data warehouse dimensional com denominador e campos derivados (Política A2) |

---

## K. Próximo Passo Seguro

Com as políticas A1, A2 e A3 formalizadas, as bases metodológicas do programa estão estabelecidas. O próximo passo natural é:

**Microfase A4 — Migração de CID Analytics para abs_intel:**  
Migrar a fonte de dados da tela `/afastamentos/cid-analytics` de `public.afastamentos` para `abs_intel.*`, eliminando o gap arquitetural identificado em A2 e permitindo que CID Analytics passe a exibir indicadores padronizados (TAD, IFL, IG por CID) como complemento epidemiológico à leitura bruta atual.

**A3 não abre A4 automaticamente.** A ordem de execução continua sob decisão do usuário.

---

_Documento canônico — qualquer decisão sobre como apresentar dados brutos ou padronizados nas telas analíticas deve referenciar este documento._
