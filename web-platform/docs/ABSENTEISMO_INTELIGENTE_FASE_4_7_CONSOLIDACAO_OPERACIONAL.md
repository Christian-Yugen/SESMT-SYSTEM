# ABSENTEISMO_INTELIGENTE - FASE 4.7

## Consolidacao Operacional e Readiness Interno

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: consolidacao operacional da FASE 4 com readiness interno, playbook minimo de operacao e criterios de uso seguro do endpoint interno epidemiologico, sem abertura de frontend e sem alteracao do legado operacional

---

## A. objetivo da microfase

Consolidar formalmente as entregas da FASE 4.1-4.6, registrar readiness interno do endpoint epidemiologico, definir um playbook operacional minimo e documentar limites de uso seguro, mantendo frontend, telas novas, auth/shared, `/afastamentos/cid-analytics` e legado operacional fora do escopo.

---

## B. inventario do que foi entregue na FASE 4

FASE 4.1 - motor epidemiologico classico:

- formulas TAD, IFL, DML/MDL e IG
- recortes minimos por sexo, faixa etaria, faixa de tempo de servico, secretaria, cargo, local de trabalho e capitulo CID
- reconciliacao e validacao metodologica no dominio `abs_intel`

FASE 4.2 - contrato de consumo analitico:

- contrato versionado com `contractVersion`, `generatedAt`, `period`, `policy`, `overall`, `cuts` e `validation`
- metadados de auditoria, regras de arredondamento e flags de validade

FASE 4.3 - integracao e testes de consumo:

- camada de aplicacao/repository para montar o contrato a partir do `abs_intel`
- testes de consumo cobrindo estrutura, coerencia, ausencia de denominador e residual CID

FASE 4.4 - prontidao para exposicao controlada:

- auditoria funcional, tecnica e de governanca
- saneamento do padrao de acesso a schema nao-default com `.schema("abs_intel")`

FASE 4.5 - endpoint interno controlado:

- rota interna GET para entrega do contrato epidemiologico
- validacao de parametros e resposta controlada de erro

FASE 4.6 - hardening operacional:

- governanca de acesso por token interno
- observabilidade basica com `x-request-id` e logs controlados
- diferenciacao clara de erros 400, 401, 405, 500 e 503
- ampliacao da suite de testes do endpoint

Estado consolidado no encerramento desta microfase:

- motor: concluido
- contrato: concluido
- integracao: concluida
- endpoint: concluido
- hardening: concluido
- testes: concluidos e verdes

---

## C. readiness interno do endpoint

Readiness interno avaliado como APTO PARA USO INTERNO CONTROLADO, condicionado a:

1. variaveis de ambiente configuradas corretamente
2. token interno provisionado em `ABSENTEISMO_INTERNAL_API_KEY`
3. schema `abs_intel` disponivel para leitura server-side
4. consumo restrito a chamadas internas autorizadas
5. monitoramento basico de logs com correlacao por `x-request-id`

Sinais de readiness presentes:

- contrato estavel e versionado
- regras de validacao e erro documentadas
- endpoint endurecido para acesso interno
- resposta previsivel em degradacao
- suite agregada validada com 15 testes aprovados

---

## D. playbook minimo de operacao

### Pre-condicoes para uso interno

- `NEXT_PUBLIC_SUPABASE_URL` configurada
- `SUPABASE_SERVICE_ROLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` disponivel para o bootstrap server-side
- `ABSENTEISMO_INTERNAL_API_KEY` configurada no ambiente
- schema `abs_intel` habilitado para uso server-side
- chamada HTTP usando metodo GET e header `x-internal-api-key`

### Variaveis e segredos necessarios

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ABSENTEISMO_INTERNAL_API_KEY`

### Interpretacao basica de erros

- 400: query invalida; revisar `startDate`, `endDate` e `minPopulationForStableCut`
- 401: consumo interno nao autorizado; revisar `x-internal-api-key`
- 405: metodo incorreto; usar GET
- 500: falha interna no processamento do contrato; analisar logs do handler e correlacionar pelo `x-request-id`
- 503: indisponibilidade de bootstrap/configuracao; revisar segredos, ambiente e disponibilidade do cliente server-side

### Leitura de logs e request id

- localizar o `x-request-id` retornado na resposta
- correlacionar o identificador com eventos `request_received`, `request_rejected`, `request_succeeded`, `request_failed` e `route_unavailable`
- usar `status` e `detail` como primeiro diagnostico operacional

### Checklist de verificacao rapida

1. confirmar metodo GET
2. confirmar header `x-internal-api-key`
3. confirmar datas em `YYYY-MM-DD`
4. confirmar intervalo maximo de 1096 dias
5. confirmar ambiente com segredos carregados
6. confirmar retorno do `x-request-id`
7. confirmar ausencia de erro 500/503 repetitivo nos logs

### Quando bloquear consumo

- falha repetida 401 indicando token divergente ou ambiente inconsistente
- recorrencia de 500 com `request_failed`
- recorrencia de 503 com `route_unavailable`
- evidencia de configuracao ausente para o schema ou cliente Supabase server-side

### Quando escalar incidente

- 500 recorrente sem resolucao no primeiro diagnostico operacional
- 503 persistente apos revisao de variaveis/segredos
- ausencia de logs correlacionaveis por `x-request-id`
- suspeita de indisponibilidade do `abs_intel` ou regressao de contrato

---

## E. orientacoes de monitoramento

Monitorar minimamente:

- taxa de respostas 200 versus 4xx/5xx
- ocorrencia de `route_unavailable`
- repeticao de `controlled_application_error` e `unexpected_error`
- volume de rejeicoes 401 e 400
- presenca consistente do `x-request-id`

Leituras operacionais basicas recomendadas:

- picos de 400 sugerem erro de consumo interno ou parametro malformado
- picos de 401 sugerem problema de governanca de acesso
- picos de 500 sugerem falha na camada de aplicacao ou indisponibilidade do dominio analitico
- 503 sugere erro de configuracao ou indisponibilidade do bootstrap server-side

---

## F. sinais de falha e resposta esperada

Sinais de falha esperados:

- 400 com `INVALID_QUERY_PARAMS`
- 401 com `UNAUTHORIZED`
- 405 com `UNSUPPORTED_METHOD`
- 500 com `INTERNAL_ERROR`
- 503 com indisponibilidade do servico

Resposta operacional esperada:

- 400: corrigir entrada e repetir chamada
- 401: revisar segredo interno e cadeia de consumo
- 405: corrigir metodo do cliente interno
- 500: abrir diagnostico com base em logs e `x-request-id`
- 503: verificar ambiente, segredos e bootstrap antes de liberar novo consumo

---

## G. limites de uso seguro

Limites operacionais documentados:

- uso interno apenas
- acesso protegido por token interno
- metodo GET apenas
- intervalo temporal maximo de 1096 dias
- datas estritas no formato `YYYY-MM-DD`
- `minPopulationForStableCut` somente inteiro positivo
- sem dependencia de frontend ou telas conectadas nesta fase

O consumo deve permanecer assistido e controlado, sem extrapolar para uso visual ou integracoes fora do dominio interno autorizado.

---

## H. garantias de nao interferencia

1. Nenhuma tela nova criada na FASE 4.7.
2. Nenhuma religacao do frontend ao dominio `abs_intel`.
3. Nenhuma alteracao em `/afastamentos/cid-analytics`.
4. Nenhuma alteracao em `auth/shared`.
5. Nenhuma alteracao no legado operacional.
6. Microfase restrita a consolidacao documental e indice enxuto.

---

## I. bloqueios ainda mantidos

- FASE 5 continua bloqueada
- FASE 6 continua bloqueada
- frontend continua fora de escopo
- telas novas continuam proibidas
- consumo visual do endpoint continua nao autorizado
- alteracoes no legado operacional continuam proibidas

---

## J. decisao sobre encerramento da FASE 4

DECISAO: FASE 4 ENCERRADA COM READINESS INTERNO DOCUMENTADO.

Fundamento:

- motor epidemiologico implementado e auditado
- contrato analitico estabilizado
- integracao aplicada com testes de consumo
- endpoint interno entregue e endurecido
- operacao interna documentada com playbook minimo
- uso seguro delimitado sem interferencia no sistema atual

A FASE 4 encerra sem abertura automatica da FASE 5.

---

## K. proximo passo seguro

Proximo passo seguro recomendado, sem abertura automatica:

- eventual FASE 5.0 de governanca e autorizacao formal, somente se houver aprovacao explicita do usuario e mantendo o frontend fora do escopo ate nova decisao documentada.