# ABSENTEISMO INTELIGENTE FASE 6.4 - ENDPOINT INTERNO ERGONOMICO

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: exposicao interna controlada do contrato ergonomico NR-17 por endpoint backend, sem frontend novo, sem religacao de telas e sem alteracao do legado operacional

---

## A. Objetivo da microfase

Implementar endpoint interno ergonomico controlado para entrega do contrato de consumo ja validado na FASE 6.2, mantendo trilha de auditoria, linguagem nao causal/nao deterministica e isolamento do dominio analitico.

---

## B. Endpoint implementado

Endpoint interno GET:

- `src/app/api/absenteismo/ergonomia/route.ts`

Handler de aplicacao:

- `src/lib/afastamentos-ergonomia-endpoint.ts`

Repositorio consumido:

- `createSupabaseErgonomicRepository(...)` em `src/lib/afastamentos-ergonomia.ts`

---

## C. Metodo e contrato retornado

Metodo suportado:

- `GET`

Contrato exposto (estavel e auditavel):

- `contractVersion`
- `generatedAt`
- `period`
- `policy`
- `overview` (visao geral ergonomica)
- `cuts` (cargo, localTrabalho, posto, tarefa, fatorErgonomico, categoriaNR17, grupoAnaliticoMusculoesqueletico, criticidade)
- `validation`

Campos de governanca preservados:

- flags de validade
- observacoes/limitacoes
- justificativas auditaveis por recorte

---

## D. Validacoes de entrada

Validacoes aplicadas no handler:

1. autorizacao interna por `x-internal-api-key` (quando configurada)
2. metodo permitido (`GET`)
3. parametros permitidos (whitelist de query params)
4. formato de datas (`YYYY-MM-DD`)
5. intervalo de datas valido (`startDate <= endDate`)
6. limite maximo de intervalo (1096 dias)
7. validacao de inteiros positivos para:
   - `minAssessmentsForStableCriticality`
   - `minExposuresForStableCriticality`

---

## E. Tratamento de erro

Respostas controladas e consistentes:

- `400 INVALID_QUERY_PARAMS` para entrada invalida
- `401 UNAUTHORIZED` para acesso interno invalido
- `405 UNSUPPORTED_METHOD` para metodo nao suportado
- `500 INTERNAL_ERROR` para falhas controladas/inesperadas da camada de aplicacao
- `503 INTERNAL_ERROR` em indisponibilidade da rota (configuracao servidor)

Padrao de resposta:

- payload JSON estavel
- cabecalho `x-request-id`
- cache-control `no-store`

---

## F. Salvaguardas de linguagem nao causal/nao deterministica

Salvaguardas aplicadas:

1. guarda no endpoint para rejeitar contrato com linguagem causal/deterministica proibida
2. reaproveitamento da validacao de consistencia nao causal do contrato
3. mensagens de erro sem atribuicao causal automatica

Termos proibidos sao bloqueados no fluxo de conformidade do handler (incluindo linguagem deterministica sem contexto de cautela).

---

## G. Testes implementados

Arquivo:

- `src/lib/tests/afastamentos-ergonomia-endpoint.test.ts`

Cobertura implementada:

1. resposta 200 em cenario valido
2. estrutura do payload e contrato exposto
3. erro controlado em parametros invalidos
4. metodo nao permitido
5. ausencia de parametros obrigatorios
6. comportamento sem avaliacoes
7. comportamento sem exposicoes
8. comportamento sem acoes planejadas
9. comportamento com contexto insuficiente
10. preservacao de justificativa auditavel
11. preservacao de linguagem nao causal/nao deterministica
12. ausencia de regressao do contrato e metadados
13. acesso interno invalido
14. erro interno controlado e erro inesperado com resposta consistente

Scripts de validacao:

- `test:absenteismo-ergonomia-endpoint`
- `test:absenteismo` (agregado, incluindo endpoint ergonomico)

---

## H. Garantias de nao interferencia

Garantias mantidas nesta microfase:

- sem criacao de tela
- sem religacao de frontend ao novo dominio
- sem alteracoes em `/afastamentos/cid-analytics`
- sem alteracoes em auth/shared fora do padrao existente de endpoint interno
- sem alteracao de legado operacional

---

## I. Limitacoes conhecidas

1. endpoint interno depende de configuracao de ambiente (`ABSENTEISMO_INTERNAL_API_KEY` e Supabase server config).
2. camada ergonomica continua sujeita aos limites metodologicos ja documentados na FASE 6.1 (ex.: parse de observacoes quando nao houver coluna dedicada).
3. esta fase nao inclui hardening operacional avancado (rate limiting, observabilidade expandida, etc.).

---

## J. Proximo passo seguro

Proximo passo seguro recomendado, somente com autorizacao explicita:

- FASE 6.5 para hardening do endpoint ergonomico interno (observabilidade, limites operacionais, validacoes complementares, checklist de prontidao operacional), sem religacao de frontend.
