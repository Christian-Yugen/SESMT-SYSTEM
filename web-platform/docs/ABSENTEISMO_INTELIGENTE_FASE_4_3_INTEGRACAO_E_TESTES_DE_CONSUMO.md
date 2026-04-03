# ABSENTEISMO_INTELIGENTE - FASE 4.3

## Integracao Controlada do Contrato na Camada de Aplicacao e Testes de Consumo

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Ref Supabase: wybzkkejyraadabznjqg (sa-east-1, PostgreSQL 17, ACTIVE_HEALTHY)  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: integracao de contrato analitico na camada de aplicacao e testes de consumo, sem frontend

---

## A. Objetivo da microfase

Integrar o contrato de consumo epidemiologico da FASE 4.2 na camada de aplicacao do dominio abs_intel, com testes de consumo e consistencia da estrutura, sem criar telas, sem religar frontend e sem alterar legado operacional.

---

## B. Arquitetura da integracao

Fluxo implementado:

1. Repository de aplicacao carrega dataset do abs_intel.
2. Orquestrador de aplicacao chama o builder do contrato 4.2.
3. Resultado retorna payload estavel com metadados de validacao.

Camadas:

- Repository adapter Supabase: cria dataset tipado do motor epidemiologico.
- Orchestration layer: integra repository + contrato.
- Consumption contract layer: mantida da FASE 4.2 (versionada e validavel).

---

## C. Camada(s) afetada(s)

- src/lib/afastamentos-epidemiologia-application.ts
- src/lib/afastamentos-epidemiologia-contrato.ts (consumida, sem quebra estrutural)
- src/lib/tests/afastamentos-epidemiologia-consumo.test.ts

---

## D. Contrato consumido

Contrato preservado integralmente na integracao:

- contractVersion
- generatedAt
- period
- policy
- overall
- cuts
- validation

Recortes consumidos na camada de aplicacao:

- sexo
- faixaEtaria
- faixaTempoServico
- secretaria
- cargo
- localTrabalho
- cidCapitulo

---

## E. Testes implementados

Arquivo de testes:

- src/lib/tests/afastamentos-epidemiologia-consumo.test.ts

Comando:

- npm run test:absenteismo-consumo

Cobertura implementada:

1. Estrutura do payload e campos obrigatorios.
2. Tipos esperados.
3. Regras de arredondamento.
4. Comportamento sem denominador.
5. Comportamento com populacao insuficiente.
6. Coerencia global vs recortes.
7. Residual minimo em capitulo CID ponderado.

---

## F. Cenarios cobertos

1. Cenario base com visao geral e todos os recortes minimos.
2. Cenario sem snapshots para validar ausencia de denominador.
3. Cenario com minPopulationForStableCut acima da populacao para flag de insuficiencia.
4. Cenario com CID ponderado em fracao para validar tolerancia de residual.

---

## G. Limitacoes conhecidas

1. Testes de consumo usam dataset controlado em memoria (nao executam leitura real de banco).
2. Adapter Supabase da camada de aplicacao depende da disponibilidade das tabelas abs_intel em ambiente alvo.
3. Esta microfase nao inclui API publica nem consumo por tela.

---

## H. Garantias de nao interferencia

1. Nenhuma alteracao em frontend ou rotas de tela.
2. Nenhuma alteracao em /afastamentos/cid-analytics.
3. Nenhuma alteracao em auth/shared.
4. Nenhuma alteracao no legado operacional (public).
5. Integracao restrita ao dominio analitico abs_intel e camada de lib/testes.

---

## I. Proximo passo seguro

Proxima microfase recomendada:

- FASE 4.4 - validacao de prontidao para exposicao controlada por endpoint interno, ainda sem abertura de frontend.

Regra de governanca:

- FASE 4.4 nao e aberta automaticamente nesta entrega.

---

Documento canonico da FASE 4.3 criado em 02/04/2026.
