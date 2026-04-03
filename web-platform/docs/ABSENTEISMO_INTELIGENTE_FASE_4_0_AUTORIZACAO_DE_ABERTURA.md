# ABSENTEISMO_INTELIGENTE — FASE 4.0
## Autorizacao e Entrada Formal da FASE 4

**Data de execucao:** 02 de Abril de 2026  
**Projeto:** SESMT-System  
**Ref Supabase:** wybzkkejyraadabznjqg (sa-east-1, PostgreSQL 17, ACTIVE_HEALTHY)  
**Branch:** feat/unified-absenteeism-intelligence-program  
**Natureza da microfase:** governanca e autorizacao formal (sem implementacao do motor)

---

## A. Objetivo da microfase

Registrar formalmente a abertura da FASE 4 do Programa Unificado de Inteligencia em Absenteismo Ocupacional, com criterios de entrada, escopo permitido/proibido, dependencias e criterios de aceite da futura implementacao, sem iniciar ainda o motor epidemiologico nesta microfase.

## B. Confirmacao formal de encerramento da FASE 3

A FASE 3 esta formalmente encerrada, com base nos documentos canonicos 3W, 3X, 3W.1 e 3X.1:

- ETL concluido no dominio isolado `abs_intel`
- revalidacao concluida apos correcao de datas
- dominio `abs_intel` integro (integridade referencial e matematica preservadas)
- nao interferencia no legado comprovada (`public` preservado e sem FKs cruzadas)

Conclusao de gate: condicoes tecnicas de entrada da FASE 4 estao atendidas.

## C. Criterios de entrada da FASE 4

Criterios obrigatorios de entrada confirmados:

1. dimensoes centrais populadas (`abs_dim_servidor`, `abs_dim_vinculo_servidor`, `abs_dim_tempo`)
2. fatos centrais populados (`abs_fact_afastamento_evento`, `abs_fact_afastamento_cid`)
3. snapshots populacionais validos (`abs_fact_population_snapshot`)
4. derivacao demografica restaurada (faixa etaria e faixa tempo de servico sem colapso em `NAO_INFORMADO`)
5. residuos criticos zerados ou aceitos formalmente na trilha 3X/3X.1
6. legado preservado (schema `public` inalterado)

## D. Escopo permitido da FASE 4

Escopo metodologico e tecnico permitido para a FASE 4:

- motor epidemiologico classico
- TAD
- IFL
- DML/MDL
- IG
- series temporais
- metricas por sexo
- metricas por faixa etaria
- metricas por tempo de servico
- metricas por secretaria
- metricas por cargo
- metricas por local de trabalho
- metricas por capitulo CID

## E. Escopo proibido nesta abertura

Proibicoes explicitas na FASE 4.0:

- nao abrir telas novas nesta microfase
- nao religar frontend ao novo dominio nesta microfase
- nao misturar FASE 4 com FASE 5/6
- nao alterar o legado operacional (`public`, contratos atuais e modulos ativos)

## F. Dependencias para a implementacao da FASE 4

Dependencias obrigatorias para a futura FASE 4.1:

1. dados de entrada consolidados no `abs_intel`
2. definicoes metodologicas formais das formulas epidemiologicas
3. denominadores validos em `abs_fact_population_snapshot`
4. criterios de validacao e reconciliacao definidos antes de publicar resultados

## G. Criterios de aceite da futura FASE 4.1

A FASE 4.1 de implementacao so sera aceita se atender, no minimo:

1. formulas documentadas
2. selectors/queries consistentes e rastreaveis
3. reconciliacao manual por amostras
4. coerencia com o estudo de Belem e com o plano do programa

## H. Proximo passo seguro

Proximo passo autorizado:

- **FASE 4.1 — implementacao do motor epidemiologico classico**

Regra de governanca desta 4.0:

- a implementacao do motor **NAO ocorre** nesta microfase de abertura

---

## Decisao formal da FASE 4.0

**FASE 4 FORMALMENTE AUTORIZADA PARA ENTRADA (gate aberto para 4.1).**

Condicionantes mantidos:

- implementacao somente na microfase 4.1
- sem alteracao de frontend nesta abertura
- sem alteracao do legado operacional nesta abertura

---

*Documento canonico da FASE 4.0 criado em 02/04/2026.*