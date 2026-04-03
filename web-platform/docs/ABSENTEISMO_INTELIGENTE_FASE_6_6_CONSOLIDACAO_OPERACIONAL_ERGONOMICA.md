# ABSENTEISMO INTELIGENTE FASE 6.6 - CONSOLIDACAO OPERACIONAL ERGONOMICA

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: consolidacao operacional e readiness interno da trilha ergonomica FASE 6 (6.1 a 6.5), sem frontend novo, sem religacao de telas e sem alteracao do legado operacional

---

## A. Objetivo da microfase

Consolidar oficialmente a operacao interna da camada ergonomica NR-17, registrando inventario de entregas, readiness do endpoint, playbook minimo de uso seguro, monitoramento, sinais de falha e decisao formal sobre encerramento da FASE 6.

---

## B. Inventario do que foi entregue na FASE 6

Entregas consolidadas da trilha ergonomica:

1. FASE 6.1 - engine analitica ergonomica NR-17
   - `src/lib/afastamentos-ergonomia.ts`
   - `src/lib/tests/afastamentos-ergonomia.test.ts`
2. FASE 6.2 - contrato de consumo ergonomico
   - `src/lib/afastamentos-ergonomia-contrato.ts`
   - `src/lib/tests/afastamentos-ergonomia-consumo.test.ts`
3. FASE 6.3 - auditoria de prontidao para exposicao interna
   - `docs/ABSENTEISMO_INTELIGENTE_FASE_6_3_PRONTIDAO_EXPOSICAO_INTERNA_ERGONOMICA.md`
4. FASE 6.4 - endpoint interno ergonomico
   - `src/lib/afastamentos-ergonomia-endpoint.ts`
   - `src/app/api/absenteismo/ergonomia/route.ts`
   - `src/lib/tests/afastamentos-ergonomia-endpoint.test.ts`
5. FASE 6.5 - hardening operacional do endpoint
   - reforco de limites de seguranca de parametros
   - reforco de observabilidade e governanca de erro

Evidencia de estabilidade consolidada:

- `npm run test:absenteismo` -> 75/75 testes aprovados
- `npm run test:absenteismo-ergonomia-endpoint` -> 18/18 testes aprovados

---

## C. Readiness interno do endpoint ergonomico

Classificacao final de readiness interno:

- **PRONTO PARA USO INTERNO CONTROLADO**

Base de readiness:

1. contrato ergonomico estavel e versionado
2. endpoint interno com validacoes de entrada e respostas controladas
3. trilha de logs com correlacao por request id
4. protecao ativa de linguagem nao causal/nao deterministica
5. cobertura de testes para sucesso, edge cases e falhas degradadas

---

## D. Playbook minimo de operacao

### D.1. Pre-condicoes para uso interno

1. ambiente servidor com endpoint interno ativo
2. disponibilidade do schema `abs_intel` e tabelas da trilha ergonomica
3. endpoint acessado apenas por consumidor interno autorizado

### D.2. Variaveis e segredos necessarios

1. `ABSENTEISMO_INTERNAL_API_KEY`
2. `NEXT_PUBLIC_SUPABASE_URL`
3. `SUPABASE_SERVICE_ROLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` (conforme padrao servidor)

### D.3. Interpretacao basica de erros

1. `400 INVALID_QUERY_PARAMS`: parametros ausentes, invalidos, fora de whitelist ou acima de limites
2. `401 UNAUTHORIZED`: credencial interna invalida ou ausente para politica ativa
3. `405 UNSUPPORTED_METHOD`: metodo diferente de GET
4. `500 INTERNAL_ERROR`: falha controlada/inesperada na camada de aplicacao
5. `503 INTERNAL_ERROR`: indisponibilidade de configuracao servidor da rota

### D.4. Leitura de logs e request id

1. usar `x-request-id` para correlacionar requisicao, erro e resposta
2. acompanhar eventos:
   - `request_received`
   - `request_rejected`
   - `request_succeeded`
   - `request_failed`
3. usar `detail`, `status` e `durationMs` para triagem inicial

### D.5. Checklist de verificacao rapida

1. validar token interno e cabecalhos
2. validar intervalo e formato de datas
3. validar parametros de estabilidade (inteiros positivos e dentro do limite)
4. confirmar `contractVersion`, `overview`, `cuts`, `validation`
5. confirmar flags de validade e observacoes
6. confirmar ausencia de linguagem causal/deterministica proibida

### D.6. Quando bloquear consumo

Bloquear consumo interno quando houver:

1. repeticao persistente de `500` para o mesmo recorte temporal
2. `503` por indisponibilidade de configuracao
3. falha de conformidade de linguagem
4. inconsistencia de validacao com `hasBlockingIssues = true`

### D.7. Quando escalar incidente

Escalar imediatamente quando houver:

1. falha recorrente de autorizacao sem causa operacional conhecida
2. degradacao de resposta com aumento abrupto de latencia ou erro
3. suspeita de regressao contratual estrutural
4. suspeita de exposicao de comportamento causal/deterministico indevido

### D.8. Como garantir linguagem nao causal/nao deterministica

1. manter ativa a guarda textual do endpoint
2. manter validacao de consistencia nao causal do contrato
3. bloquear deploy de alteracao que introduza termos causais proibidos
4. revisar exemplos e mensagens operacionais com linguagem de risco e monitoramento

---

## E. Orientacoes de monitoramento

Monitoramento minimo recomendado:

1. taxa de sucesso 200 por janela de tempo
2. distribuicao de erros 400/401/405/500/503
3. acompanhamento de latencia por `durationMs`
4. auditoria periodica de logs por `x-request-id`
5. verificacao periodica da estabilidade de contrato por testes automatizados

---

## F. Sinais de falha e resposta esperada

Sinais principais e resposta operacional:

1. aumento de `400`: revisar clientes internos e parametros de chamada
2. aumento de `401`: revisar segredo interno e distribuicao de credenciais
3. aumento de `500`: abrir investigacao backend e executar testes de regressao
4. ocorrencia de `503`: restaurar configuracao ambiente/segredos
5. alerta de linguagem: bloquear consumo e executar revisao de conformidade

---

## G. Limites de uso seguro

Limites operacionais consolidados:

1. apenas metodo GET
2. apenas parametros permitidos por whitelist
3. intervalo maximo de datas: 1096 dias
4. parametros de estabilidade: inteiros positivos e limite maximo 365
5. consumo exclusivamente interno e autorizado

---

## H. Salvaguardas de linguagem nao causal/nao deterministica

A linguagem nao causal e nao deterministica e requisito operacional obrigatorio:

1. bloqueio de termos causais/deterministicos proibidos no fluxo de resposta
2. validacao de consistencia textual no contrato
3. obrigatoriedade de linguagem de risco, hipotese e monitoramento
4. proibicao de nexo causal automatico em mensagens e justificativas

---

## I. Garantias de nao interferencia

Garantias preservadas na consolidacao:

1. nenhuma tela nova criada
2. nenhuma religacao de frontend ao novo dominio
3. nenhuma alteracao em `/afastamentos/cid-analytics`
4. nenhuma alteracao em auth/shared nesta microfase
5. nenhuma alteracao no legado operacional

---

## J. Bloqueios ainda mantidos

Bloqueios vigentes apos encerramento da FASE 6:

1. nao abrir fase visual automaticamente
2. nao expor consumo ergonomico para frontend sem fase dedicada
3. nao alterar legado operacional fora de trilha autorizada
4. manter exigencia de linguagem nao causal/nao deterministica em toda evolucao

---

## K. Decisao sobre encerramento da FASE 6

Decisao formal:

- **FASE 6 ENCERRADA COM READINESS INTERNO APROVADO**

Justificativa:

1. cadeia completa 6.1-6.5 implementada e validada
2. endpoint interno ergonomico ativo com hardening e testes complementares
3. playbook minimo, limites de uso seguro e resposta a falhas consolidados
4. requisito de linguagem nao causal/nao deterministica tratado como controle operacional

---

## L. Proximo passo seguro

Proximo passo seguro recomendado, somente com autorizacao explicita:

- abrir fase subsequente do programa em trilha nao visual, mantendo bloqueio de frontend e preservacao integral do legado operacional.
