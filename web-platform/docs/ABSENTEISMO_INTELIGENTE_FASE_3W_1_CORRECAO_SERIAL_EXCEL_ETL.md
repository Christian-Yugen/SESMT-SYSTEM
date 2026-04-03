# ABSENTEISMO_INTELIGENTE — FASE 3W.1
## Correcao do Mapeamento de Datas Serial Excel no ETL

**Data de execucao:** 02 de Abril de 2026  
**Projeto:** SESMT-System  
**Ref Supabase:** `wybzkkejyraadabznjqg` | Regiao: sa-east-1 | PostgreSQL 17 | Status: ACTIVE_HEALTHY  
**Branch Git:** `feat/unified-absenteeism-intelligence-program`  
**Arquivo ajustado:** `database/etl/001_abs_intel_controlled_etl.sql`  
**Escopo:** leitura em `public`, escrita somente em `abs_intel`

---

## A. Objetivo da Microfase

Corrigir exclusivamente o ETL do dominio `abs_intel` para suportar datas em serial Excel nos campos de nascimento e admissao, reexecutar a carga idempotente e restaurar a derivacao correta de idade, faixa etaria, tempo de servico e faixa de tempo de servico, sem qualquer alteracao no legado `public`, no frontend, em `auth/shared` ou no modulo `/afastamentos/cid-analytics`.

---

## B. Defeito Identificado na FASE 3X

A validacao final da carga (FASE 3X) confirmou que:

- `abs_dim_servidor.data_nascimento` estava 100% nula
- `abs_dim_vinculo_servidor.data_admissao` estava 100% nula
- `abs_fact_population_snapshot.faixa_etaria` estava 100% `NAO_INFORMADO`
- `abs_fact_population_snapshot.faixa_tempo_servico` estava 100% `NAO_INFORMADO`

Hipotese confirmada nesta microfase:

- `public.servidores.nascimento` e `public.servidores.admissao` estao armazenados como serial Excel em texto numerico
- Exemplos reais da fonte: `26357`, `34649`, `35796`, `46073`

Causa adicional encontrada durante a implementacao:

- o ETL usava regex com `\d`, mas no operador regex `~` do PostgreSQL os padroes utilizados nao estavam casando como esperado nesta query
- a correcao efetiva exigiu duas coisas ao mesmo tempo:
  1. suporte ao serial Excel
  2. substituicao de `\d` por `[0-9]` nos padroes regex de parsing de datas

---

## C. Correcao Aplicada no ETL

Foram ajustados exclusivamente os blocos de parsing de datas em `database/etl/001_abs_intel_controlled_etl.sql`:

1. parsing de `nascimento` na carga de `src_servidores`
2. parsing de `nascimento` na carga de `tmp_src_servidores`
3. parsing de `admissao` na carga de `vinculos_servidores`
4. parsing de `nascimento` e `admissao` na derivacao de `servidores_base` usada no `abs_fact_population_snapshot`

A logica passou a suportar tres formatos, nesta ordem:

1. ISO: `YYYY-MM-DD`
2. Brasileiro: `DD/MM/YYYY`
3. Serial Excel: `^[0-9]{4,5}$`

Expressao aplicada para serial Excel:

```sql
(DATE '1899-12-30' + trim(valor)::integer * INTERVAL '1 day')::date
```

Nenhuma migration foi criada. Nenhuma tabela do `public` foi alterada. O ETL continuou idempotente com `TRUNCATE ... RESTART IDENTITY` no inicio.

---

## D. Estrategia de Conversao de Serial Excel

### D.1 — Regra adotada

Quando o valor de origem corresponde a uma string numerica de 4 ou 5 digitos:

```sql
trim(COALESCE(valor, '')) ~ '^[0-9]{4,5}$'
```

o ETL converte o valor para data com base na origem Excel:

```sql
DATE '1899-12-30' + valor::integer * INTERVAL '1 day'
```

### D.2 — Evidencia de conversao valida na fonte

| Campo fonte | Valor bruto | Data convertida |
|---|---|---|
| `nascimento` | `26357` | `1972-02-28` |
| `nascimento` | `25284` | `1969-03-22` |
| `nascimento` | `34649` | `1994-11-11` |
| `admissao` | `35796` | `1998-01-01` |
| `admissao` | `46073` | `2026-02-20` |

### D.3 — Observacao tecnica

A primeira tentativa de correcao adicionou o ramo de serial Excel, mas ainda reutilizava regex com `\d`. A validacao direta sobre a fonte mostrou que o match seguia falso. A correção final substituiu todos os padroes por `[0-9]`, que passaram a casar corretamente no PostgreSQL/Supabase.

---

## E. Reexecucao da Carga

O ETL foi reexecutado com sucesso no arquivo:

- `database/etl/001_abs_intel_controlled_etl.sql`

Caracteristicas preservadas:

- carga full reload idempotente
- escrita exclusiva em `abs_intel`
- leitura somente em `public.afastamentos`, `public.afastamento_cids` e `public.servidores`
- nenhuma alteracao estrutural no banco
- nenhum acoplamento com frontend ou analytics legado

---

## F. Resultados Antes/Depois

### F.1 — Datas no destino

| Indicador | Antes (3X) | Depois (3W.1) |
|---|---:|---:|
| `abs_dim_servidor.data_nascimento` preenchida | 0 | 5.037 |
| `abs_dim_servidor.data_nascimento` nula | 5.037 | 0 |
| `abs_dim_vinculo_servidor.data_admissao` preenchida | 0 | 5.443 |
| `abs_dim_vinculo_servidor.data_admissao` nula | 5.443 | 0 |

### F.2 — Faixas derivadas

| Indicador | Antes (3X) | Depois (3W.1) |
|---|---:|---:|
| `faixa_etaria` preenchida | 0 | 33.289 |
| `faixa_etaria = NAO_INFORMADO` | 9.386 | 0 |
| `faixa_tempo_servico` preenchida | 0 | 33.289 |
| `faixa_tempo_servico = NAO_INFORMADO` | 9.386 | 0 |

### F.3 — Cardinalidade das tabelas apos a recarga

| Tabela | Registros apos 3W.1 |
|---|---:|
| `abs_dim_servidor` | 5.037 |
| `abs_dim_vinculo_servidor` | 5.443 |
| `abs_dim_tempo` | 366 |
| `abs_fact_afastamento_evento` | 257 |
| `abs_fact_afastamento_cid` | 378 |
| `abs_fact_population_snapshot` | 33.289 |
| `stg_abs_evento` | 257 |
| `stg_abs_evento_cid` | 0 |

### F.4 — Interpretacao do aumento em `abs_fact_population_snapshot`

Na FASE 3X havia apenas 9.386 linhas porque todas as observacoes estavam colapsadas em `faixa_etaria = NAO_INFORMADO` e `faixa_tempo_servico = NAO_INFORMADO`.

Com a restauracao das datas, a granularidade dimensional foi reaberta, aumentando a cardinalidade para 33.289 linhas, sem alterar a populacao agregada total.

| Medida | Valor |
|---|---:|
| Competencias distintas | 13 |
| Populacao total acumulada | 70.759 |

A populacao total acumulada permaneceu estavel; o que mudou foi apenas a distribuicao correta nas dimensoes demograficas.

---

## G. Impacto em Idade, Faixa Etaria, Tempo de Servico e Faixa

### G.1 — Distribuicao final de `faixa_etaria`

| Faixa | Registros |
|---|---:|
| `ATE_29` | 3.978 |
| `30_39` | 8.735 |
| `40_49` | 10.042 |
| `50_59` | 6.769 |
| `60_OU_MAIS` | 3.765 |

### G.2 — Distribuicao final de `faixa_tempo_servico`

| Faixa | Registros |
|---|---:|
| `ATE_1_ANO` | 8.948 |
| `1_5_ANOS` | 11.903 |
| `6_10_ANOS` | 5.124 |
| `11_OU_MAIS` | 7.314 |

### G.3 — Efeito funcional

A partir desta microfase:

- `idade` volta a ser derivavel com base em `data_nascimento`
- `faixa_etaria` deixa de ficar integralmente colapsada em `NAO_INFORMADO`
- `tempo de servico` volta a ser derivavel com base em `data_admissao`
- `faixa_tempo_servico` deixa de ficar integralmente colapsada em `NAO_INFORMADO`

---

## H. Confirmacao de Nao Interferencia

### H.1 — Integridade da carga mantida

| Verificacao | Resultado |
|---|---:|
| Eventos totais | 257 |
| CIDs totais | 378 |
| `pendente_resolucao_vinculo = true` | 0 |
| Eventos sem servidor valido | 0 |
| Eventos sem vinculo valido | 0 |
| Inconsistencias `allocated_days` | 0 |
| Inconsistencias `occurrence_weight` | 0 |
| Eventos sem CID | 0 |

### H.2 — Legado `public` preservado

| Medida | Valor |
|---|---:|
| Tabelas `public` | 21 |
| Triggers `public` | 2 |
| FKs cruzadas `abs_intel ↔ public` | 0 |

### H.3 — Fora do banco

- nenhum arquivo de frontend foi alterado
- nenhuma alteracao em `auth/shared`
- nenhuma alteracao em `/afastamentos/cid-analytics`
- nenhuma nova migration foi criada

---

## I. Bloqueios Ainda Mantidos

| Bloqueio | Status |
|---|---|
| Alteracoes no legado `public` | BLOQUEADO |
| Religacao de telas ao novo dominio | BLOQUEADO |
| Alteracoes em frontend/auth/shared | BLOQUEADO |
| Alteracoes no modulo `/afastamentos/cid-analytics` | BLOQUEADO |
| FASE 4 — analise epidemiologica | BLOQUEADA ate revalidacao final |

---

## J. Proximo Passo Seguro

Executar **FASE 3X.1 — Revalidacao Final da Carga apos Correcao de Datas**, com foco em:

1. confirmar formalmente o before/after das dimensoes demograficas
2. validar novamente cobertura, residuos e nao interferencia com a nova cardinalidade de snapshots
3. encerrar a FASE 3 sem ressalvas remanescentes
4. manter a FASE 4 bloqueada ate a aprovacao formal dessa revalidacao

---

*Data de criacao: 02 de Abril de 2026 (FASE 3W.1)*  
*Status: ETL corrigido, recarga concluida, revalidacao final ainda pendente*