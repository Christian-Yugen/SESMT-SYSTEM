# ABSENTEISMO_INTELIGENTE — FASE 3X.1
## Revalidacao Final da Carga Pos-Correcao de Datas

**Data de execucao:** 02 de Abril de 2026  
**Projeto:** SESMT-System  
**Ref Supabase:** wybzkkejyraadabznjqg (sa-east-1, PostgreSQL 17, ACTIVE_HEALTHY)  
**Branch:** feat/unified-absenteeism-intelligence-program  
**Escopo:** validacao somente leitura no schema abs_intel (sem ETL, sem DDL, sem DML)

---

## A. Objetivo da microfase

Executar exclusivamente a revalidacao final da carga no abs_intel apos a correcao de datas da FASE 3W.1, eliminando formalmente a ressalva da FASE 3X e confirmando encerramento da FASE 3 sem pendencias remanescentes.

## B. Defeito original da FASE 3X

Na FASE 3X, a carga estava integra estruturalmente, mas com ressalva demografica:

- abs_dim_servidor.data_nascimento: 0 preenchidos / 5.037 nulos
- abs_dim_vinculo_servidor.data_admissao: 0 preenchidos / 5.443 nulos
- abs_fact_population_snapshot.faixa_etaria: 100% NAO_INFORMADO (9.386)
- abs_fact_population_snapshot.faixa_tempo_servico: 100% NAO_INFORMADO (9.386)

## C. Correcao aplicada na FASE 3W.1

A FASE 3W.1 ajustou o arquivo database/etl/001_abs_intel_controlled_etl.sql com:

- suporte a serial Excel para nascimento/admissao
- conversao via DATE '1899-12-30' + valor::integer * INTERVAL '1 day'
- ajuste de regex para padroes explicitos [0-9]
- recarga idempotente completa no abs_intel

## D. Resultados da revalidacao (3X.1)

### D.1 — Correcao do defeito original

| Indicador | Resultado atual |
|---|---:|
| data_nascimento preenchida | 5.037 |
| data_nascimento nula | 0 |
| data_admissao preenchida | 5.443 |
| data_admissao nula | 0 |
| faixa_etaria preenchida | 33.289 |
| faixa_etaria NAO_INFORMADO | 0 |
| faixa_tempo_servico preenchida | 33.289 |
| faixa_tempo_servico NAO_INFORMADO | 0 |

### D.2 — Distribuicao restaurada

Faixa etaria:
- ATE_29: 3.978
- 30_39: 8.735
- 40_49: 10.042
- 50_59: 6.769
- 60_OU_MAIS: 3.765

Faixa tempo de servico:
- ATE_1_ANO: 8.948
- 1_5_ANOS: 11.903
- 6_10_ANOS: 5.124
- 11_OU_MAIS: 7.314

## E. Before/After resumido

| Medida | Antes (3X) | Depois (3X.1) |
|---|---:|---:|
| data_nascimento preenchida | 0 | 5.037 |
| data_admissao preenchida | 0 | 5.443 |
| faixa_etaria preenchida | 0 | 33.289 |
| faixa_tempo_servico preenchida | 0 | 33.289 |
| faixa_etaria NAO_INFORMADO | 9.386 | 0 |
| faixa_tempo_servico NAO_INFORMADO | 9.386 | 0 |

## F. Integridade do ETL apos a correcao

### F.1 — Tabelas revalidadas

| Tabela | Registros |
|---|---:|
| abs_dim_servidor | 5.037 |
| abs_dim_vinculo_servidor | 5.443 |
| abs_dim_tempo | 366 |
| abs_fact_afastamento_evento | 257 |
| abs_fact_afastamento_cid | 378 |
| abs_fact_population_snapshot | 33.289 |

### F.2 — Integridade funcional e referencial

| Verificacao | Resultado |
|---|---:|
| total_eventos | 257 |
| total_cids | 378 |
| pendente_resolucao_vinculo | 0 |
| inconsistencias_allocated_days | 0 |
| inconsistencias_weight_sum | 0 |
| eventos_servidor_orfao | 0 |
| eventos_vinculo_orfao | 0 |
| snapshots_tempo_orfao | 0 |

### F.3 — Coerencia de snapshots

| Verificacao | Resultado |
|---|---:|
| total_snapshots | 33.289 |
| competencias distintas | 13 |
| populacao_total_acumulada | 70.759 |

Interpretacao: a populacao acumulada permaneceu coerente; o aumento de linhas no snapshot decorre da restauracao da granularidade demografica (faixa etaria/faixa tempo de servico), nao de duplicacao de pessoas.

## G. Evidencias de nao interferencia

| Evidencia | Resultado |
|---|---:|
| tabelas no schema public | 21 |
| triggers no schema public | 2 |
| FKs cruzadas abs_intel <-> public | 0 |

Tambem confirmado no workspace:

- sem alteracoes em frontend
- sem alteracoes em auth/shared
- sem alteracoes em /afastamentos/cid-analytics

## H. Decisao final sobre a FASE 3

**DECISAO: FASE 3 ENCERRADA SEM RESSALVAS REMANESCENTES.**

A ressalva da FASE 3X foi formalmente eliminada na 3X.1. A carga no abs_intel permanece integra, consistente e isolada do legado.

## I. Bloqueios ainda mantidos ou liberados

- FASE 3: liberada/encerrada
- FASE 4: **permanece bloqueada por governanca nesta entrega**
- religacao de telas ao novo dominio: bloqueada ate abertura formal da fase apropriada
- alteracoes em frontend, auth/shared e cid-analytics: fora de escopo e nao realizadas

## J. Proximo passo seguro

Abrir uma microfase de governanca para **autorizacao explicita da abertura da FASE 4**, com checklist de entrada validado (escopo analitico, contratos de consumo e trilha de nao interferencia).

---

*Documento canonico da FASE 3X.1 criado em 02/04/2026.*