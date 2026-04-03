# FASE 7.1 — Tela Epidemiológica Geral

**Programa:** Inteligência Unificada em Absenteísmo Ocupacional — SESMT-SYSTEM
**Microfase:** 7.1
**Status:** ENTREGUE
**Data:** 2026-04-02
**Prerequisito cumprido:** FASE 7.0 autorizada (FASES 3–6 encerradas)

---

## A. Objetivo da microfase

Implementar a primeira tela visual do Programa Unificado de Inteligência em Absenteísmo,
correspondente à Tela Epidemiológica Geral (`/afastamentos/epidemiologia`).

A tela consome exclusivamente o contrato de consumo epidemiológico via rota view autenticada
por sessão, exibe em modo read-only os indicadores executivos TAD, IFL, DML e IG, o resumo
do período e os recortes por dimensão. Não altera nenhum módulo legado.

---

## B. Rota implementada

| Artefato                    | Caminho                                                                       |
|-----------------------------|-------------------------------------------------------------------------------|
| Tela UI (App Router)        | `src/app/afastamentos/epidemiologia/page.tsx`                                 |
| Rota view API               | `src/app/api/absenteismo/epidemiologia-view/route.ts`                         |
| Utilitários de apresentação | `src/lib/afastamentos-epidemiologia-page-utils.ts`                            |
| Testes dos utilitários      | `src/lib/tests/afastamentos-epidemiologia-page-utils.test.ts`                 |
| Link no Sidebar             | `src/components/layout/Sidebar.tsx` (Benefícios > Epidemiologia)              |

---

## C. Blocos visuais entregues

### C.1 — Cards executivos (Bloco A)

Quatro `StatisticCard` organizados em `StatisticCardRow` com `columns=4`:

| Card | Sigla | Significado                      | Acento    |
|------|-------|----------------------------------|-----------|
| TAD  | TAD   | Taxa de Absenteísmo por Doença   | primary   |
| IFL  | IFL   | Índice de Frequência de Licenças | info      |
| DML  | DML   | Duração Média da Licença         | warning   |
| IG   | IG    | Índice de Gravidade              | danger    |

Métricas nulas (`null`) renderizam como `"N/D"` (não disponível), com `available=false`.
DML é sempre disponível mesmo sem denominador populacional.

### C.2 — Resumo do período (Bloco B)

Exibe:
- Período consultado (startDate a endDate + diasPeriodo)
- Total de licenças
- Total de dias perdidos
- População média
- Flags de validade (quando presentes)
- Observações de auditabilidade do contrato

Aviso explícito quando indicadores TAD/IFL/IG não são calculáveis por denominador insuficiente.

### C.3 — Recortes por dimensão (Bloco C)

Tabelas `CutTable` para cada dimensão:
- **Sexo**
- **Faixa Etária**
- **Faixa de Tempo de Serviço**
- **Local de Trabalho**
- **Secretaria**
- **Cargo / Categoria**

Cada tabela mostra: Grupo | TAD | IFL | DML | IG.
Grupos com `audit.validade.isValid=false` são renderizados com opacidade reduzida (60%).
Recortes vazios exibem mensagem "Sem dados para este recorte no período."

### C.4 — Tendência (Bloco D — limitação documentada)

Bloco informativo explica que visualização de série temporal não está disponível na versão atual.
O contrato epidemiológico agrega dados para um único período. Tendências temporais exigem
múltiplas consultas em janelas deslizantes — previsão de implementação futura.

---

## D. Fonte de dados consumida

**Rota view API:** `GET /api/absenteismo/epidemiologia-view?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Autenticação: Bearer token da sessão Supabase do usuário.

A rota view:
1. Valida o token via `supabase.auth.getUser(token)` (cliente anon key).
2. Valida `startDate`/`endDate` com as mesmas regras do endpoint interno.
3. Chama `buildEpidemiologyContractFromRepository` diretamente (mesma lógica do endpoint interno).
4. Retorna o `EpidemiologyConsumptionContract` serializado.

O endpoint interno original (`/api/absenteismo/epidemiologia`, API key) não foi alterado.
A rota view é uma superfície nova e independente, com autenticação por sessão de usuário.

**Padrão de data padrão:** últimos 12 meses (calculado em runtime).

---

## E. Limitações conhecidas

| # | Limitação                                        | Justificativa                                          |
|---|--------------------------------------------------|--------------------------------------------------------|
| 1 | Sem visualização de série temporal (tendência)   | Contrato não suporta múltiplos períodos em uma chamada |
| 2 | Build do Next.js falha por erro pré-existente    | `afastamentos-psychosocial.ts:528` — status literal vs union type. Erro anterior a esta fase, fora do escopo |
| 3 | Sem recorte por Capítulo CID na tela             | `cidCapitulo` presente no contrato mas excluído da UI por volume e legibilidade. Pode ser adicionado em 7.2+ |
| 4 | Ausência de testes React de renderização DOM     | Infraestrutura de teste do projeto usa `npx tsx --test` (Node nativo). Sem React Testing Library. Testes cobrem a camada de modelo |

---

## F. Garantias de não interferência

- `/afastamentos/cid-analytics` — **não alterado**
- Auth/shared (`auth-utils.ts`, `supabase.ts`) — **não alterado**
- Endpoint interno epidemiológico (`/api/absenteismo/epidemiologia`) — **não alterado**
- Endpoint ergonômico e psicossocial — **não alterados**
- Módulo de abono — **não alterado**
- Módulo legado de afastamentos (`/afastamentos/page.tsx`) — **não alterado**
- Tela psicossocial — **não criada** (FASE 8+)
- Tela ergonômica — **não criada** (FASE 9+)
- Painel integrado — **não criado** (FASE 10+)

A rota view `epidemiologia-view` é additive-only: nova superfície que não interfere em rotas existentes.
O Sidebar recebeu somente um novo botão no submenu existente (Benefícios > Afastamentos).

---

## G. Testes implementados

**Suite:** `src/lib/tests/afastamentos-epidemiologia-page-utils.test.ts`
**Script:** `npm run test:absenteismo-epidemiologia-page-utils`
**Incluído no agregado:** `npm run test:absenteismo`

| # | Teste                                                                       | Categoria                  |
|---|-----------------------------------------------------------------------------|----------------------------|
| 1 | buildLoadingPageModel retorna modelo placeholder válido                     | Estado de loading          |
| 2 | buildFetchError — erro controlado retorna objeto correto                    | Estado de erro             |
| 3 | buildFetchError — erro de rede retorna objeto correto                       | Estado de erro             |
| 4 | buildEpidemiologyPageModel produz 4 cards corretos                          | Renderização básica        |
| 5 | Card TAD tem valor correto e disponível                                     | Cards principais           |
| 6 | Card DML sempre disponível mesmo sem denominador                            | Cards principais           |
| 7 | Cards com métricas nulas renderizam N/D                                     | Cards principais           |
| 8 | Summary reflete corretamente o contrato                                     | Consumo do payload         |
| 9 | Summary preserva observações de auditabilidade                              | Consumo do payload         |
| 10 | Recortes por sexo populados corretamente                                   | Consumo do payload         |
| 11 | Recorte inválido marca available=false                                     | Consumo do payload         |
| 12 | Todos os eixos de recorte são populados                                    | Consumo do payload         |
| 13 | Recortes sem dados resultam em array vazio                                 | Consumo do payload         |
| 14 | buildLoadingPageModel e buildEpidemiologyPageModel são independentes       | Não-regressão              |

**Resultado:** 14/14 pass

**Suite agregada** (`npm run test:absenteismo`): **89/89 pass** (incluindo todas as FASES 4–6).

---

## H. Próximo passo seguro

A FASE 7.1 está entregue. A tela epidemiológica geral está disponível.

Antes de abrir a FASE 7.2 ou qualquer avanço no programa, deve-se:

1. Verificar funcionamento da tela com dados reais em ambiente de desenvolvimento.
2. Decidir se o recorte CID deve ser incluído em 7.1 ou reservado para versão futura.
3. Resolver o erro pré-existente em `afastamentos-psychosocial.ts:528` (fora do escopo da FASE 7.1).

**Próxima fase possível (requer autorização explícita):**
- FASE 7.2 — Tela Psicossocial Geral (NR-1), se autorizada dentro do FASE 7.
- Ou consolidação operacional da FASE 7 antes de avançar.

**Fases fora do escopo desta trilha:**
- FASE 8, FASE 9, FASE 10 continuam sem data de abertura.
