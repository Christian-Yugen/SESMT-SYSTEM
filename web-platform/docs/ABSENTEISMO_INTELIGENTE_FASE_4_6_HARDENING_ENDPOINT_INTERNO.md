# ABSENTEISMO_INTELIGENTE - FASE 4.6

## Hardening Operacional do Endpoint Interno

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: endurecimento operacional do endpoint interno epidemiologico, sem abertura de frontend, sem religacao de telas e sem alteracao de legado operacional

---

## A. objetivo da microfase

Fortalecer operacionalmente o endpoint interno epidemiologico com governanca de acesso, observabilidade basica, robustez de erro e previsibilidade em cenarios degradados, preservando o contrato analitico de sucesso ja estabelecido nas fases 4.2 e 4.3.

---

## B. endpoint auditado

Endpoint auditado e endurecido:

- src/app/api/absenteismo/epidemiologia/route.ts
- src/lib/afastamentos-epidemiologia-endpoint.ts

Cobertura de testes ampliada em:

- src/lib/tests/afastamentos-epidemiologia-endpoint.test.ts

---

## C. reforcos aplicados

1. Validacao de data em formato ISO estrito (evita datas normalizadas implicitamente pelo parser de Date).
2. Limite de seguranca de intervalo temporal para consumo interno (maximo de 1096 dias).
3. Diferenciacao clara entre erros de cliente e servidor:
   - 400 para query invalida
   - 401 para acesso interno nao autorizado
   - 405 para metodo nao suportado
   - 500 para erro interno controlado/inesperado
   - 503 para indisponibilidade de configuracao no bootstrap da rota
4. Header x-request-id em todas as respostas do handler para rastreabilidade minima.
5. Preservacao do payload de sucesso no formato canonicamente definido (sem envelope adicional).

---

## D. governanca de acesso

Controle de acesso interno aplicado por token dedicado de ambiente:

- variavel esperada: ABSENTEISMO_INTERNAL_API_KEY
- header exigido para consumo interno: x-internal-api-key
- token ausente em ambiente: rota responde 503 controlado
- token incorreto/ausente na requisicao: handler responde 401 controlado

Essa governanca mantem o endpoint interno fechado por credencial explicita, sem dependencia de alteracoes em auth/shared fora do escopo.

---

## E. observabilidade/logs

Observabilidade basica adicionada no handler e na rota, com logs controlados e sem dados sensiveis:

- eventos: request_received, request_rejected, request_succeeded, request_failed, route_unavailable
- campos logados: requestId, status e detalhe tecnico curto
- sem stack trace, SQL ou payload sensivel retornado ao cliente
- log em modo best effort (falha de log nao derruba o endpoint)

---

## F. testes adicionais

Arquivo:

- src/lib/tests/afastamentos-epidemiologia-endpoint.test.ts

Cenarios cobertos nesta microfase:

1. metodo nao permitido
2. ausencia de parametros obrigatorios
3. intervalo invalido de datas
4. minPopulationForStableCut invalido
5. falha simulada da camada de aplicacao
6. resposta consistente em erro interno
7. preservacao do formato do contrato em sucesso
8. cobertura adicional de acesso interno nao autorizado

Resultado:

- Suite agregada do dominio epidemiologico: 15 testes aprovados, 0 falhas

---

## G. analise da alteracao em package.json

Auditoria da alteracao introduzida na fase 4.5 concluida:

- scripts adicionados e mantidos:
  - test:absenteismo-consumo
  - test:absenteismo-endpoint
  - test:absenteismo
- escopo restrito: execucao de testes do dominio epidemiologico apenas
- nenhum script global sensivel (build, start, lint, db:sync) foi alterado

Nao foi necessario ajuste adicional em package.json nesta fase.

---

## H. garantias de nao interferencia

1. Nenhuma tela nova criada.
2. Nenhuma religacao do frontend ao dominio abs_intel.
3. Nenhuma alteracao em /afastamentos/cid-analytics.
4. Nenhuma alteracao em auth/shared fora do estritamente necessario.
5. Nenhuma alteracao do legado operacional.
6. Escopo de codigo limitado a endpoint interno, rota interna, testes e documentacao.

---

## I. limitacoes conhecidas

1. O controle de acesso por token depende de variavel de ambiente corretamente provisionada por ambiente.
2. A observabilidade desta microfase e basica (console estruturado), sem integracao com stack externa de tracing.
3. O endpoint permanece interno e nao possui consumo visual conectado nesta fase.

---

## J. proximo passo seguro

Proximo passo recomendado (sem abertura automatica):

- FASE 4.7 focada em consolidacao operacional (playbook de operacao, monitoracao e criterios de readiness para consumo interno assistido), mantendo frontend e fases 5/6 bloqueadas.
