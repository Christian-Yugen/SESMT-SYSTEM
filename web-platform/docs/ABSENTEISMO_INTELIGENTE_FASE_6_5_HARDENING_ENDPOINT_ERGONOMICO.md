# ABSENTEISMO INTELIGENTE FASE 6.5 - HARDENING ENDPOINT ERGONOMICO

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: hardening operacional do endpoint interno ergonomico, com reforco de governanca de acesso, observabilidade, robustez de erro e seguranca de parametros, sem frontend novo e sem alteracao do legado

---

## A. Objetivo da microfase

Fortalecer operacionalmente o endpoint interno ergonomico implementado na FASE 6.4, mantendo contrato estavel, resposta auditavel, linguagem nao causal/nao deterministica e nao interferencia no legado operacional.

---

## B. Endpoint auditado

Componentes auditados:

- `src/lib/afastamentos-ergonomia-endpoint.ts`
- `src/app/api/absenteismo/ergonomia/route.ts`
- `src/lib/tests/afastamentos-ergonomia-endpoint.test.ts`

---

## C. Reforcos aplicados

Reforcos de hardening implementados no handler:

1. limite superior de seguranca para parametros de estabilidade (`MAX_STABILITY_THRESHOLD = 365`)
2. rejeicao controlada de valores acima do limite para:
   - `minAssessmentsForStableCriticality`
   - `minExposuresForStableCriticality`
3. detalhamento de telemetria em `detail` para cenarios rejeitados por limite de seguranca

Resultado:

- entrada maliciosa ou exagerada para parametros de estabilidade passa a ter bloqueio previsivel (`400 INVALID_QUERY_PARAMS`) sem degradar o contrato.

---

## D. Governanca de acesso

Governanca ativa mantida e auditada:

- autorizacao interna via header `x-internal-api-key` quando `ABSENTEISMO_INTERNAL_API_KEY` estiver configurada
- resposta `401 UNAUTHORIZED` para acesso interno invalido
- metodo restrito a `GET` com `405` para metodo nao suportado

---

## E. Observabilidade/logs

Observabilidade basica mantida e reforcada:

- trilha de eventos (`request_received`, `request_rejected`, `request_succeeded`, `request_failed`)
- correlacao por `x-request-id`
- status, detail e `durationMs` por evento
- log best effort sem quebrar fluxo do endpoint
- ausencia de payload sensivel em log

---

## F. Salvaguardas de linguagem nao causal/nao deterministica

Protecoes ativas:

1. guarda de conformidade textual no sucesso do contrato (bloqueia termos causais/deterministicos proibidos)
2. preservacao da validacao `isNonCausalLanguageConsistent` do contrato
3. respostas de erro com linguagem neutra e nao causal

---

## G. Testes adicionais

Suite auditada/expandida:

- `src/lib/tests/afastamentos-ergonomia-endpoint.test.ts`

Cenarios de hardening cobertos:

1. metodo nao permitido
2. ausencia de parametros obrigatorios
3. intervalo invalido
4. parametros de estabilidade invalidos
5. parametros de estabilidade acima do limite de seguranca
6. falha simulada da camada de aplicacao
7. resposta consistente em erro interno
8. acesso interno nao autorizado
9. preservacao de linguagem nao causal em sucesso
10. preservacao de linguagem nao causal em cenario degradado

Execucao:

- `npm run test:absenteismo-ergonomia-endpoint` -> 18/18 pass

---

## H. Analise da alteracao em package.json

Auditoria da alteracao introduzida na FASE 6.4:

- script dedicado `test:absenteismo-ergonomia-endpoint` permanece restrito ao dominio ergonomico
- ajuste no script agregado `test:absenteismo` apenas incluiu a suite do endpoint ergonomico
- nao houve alteracao em scripts de build, start, dev ou sincronizacao de banco

Conclusao:

- alteracao saneada e aderente ao escopo de testes do dominio absenteismo ergonomico, sem impacto em scripts globais sensiveis.

---

## I. Garantias de nao interferencia

Garantias mantidas:

- sem frontend novo
- sem religacao de telas
- sem alteracao em `/afastamentos/cid-analytics`
- sem alteracao em auth/shared fora do padrao existente do endpoint interno
- sem alteracao de legado operacional

---

## J. Limitacoes conhecidas

1. endpoint depende de variaveis de ambiente de execucao servidor.
2. observabilidade permanece basica (sem pipeline externo de monitoramento nesta microfase).
3. hardening nao inclui politicas avancadas de rate limiting/distribuicao nesta etapa.

---

## K. Proximo passo seguro

Proximo passo seguro recomendado, somente com autorizacao explicita:

- FASE 6.6 de consolidacao operacional ergonomica (playbook de operacao, monitoramento complementar e checklist de readiness), sem abertura de frontend.
