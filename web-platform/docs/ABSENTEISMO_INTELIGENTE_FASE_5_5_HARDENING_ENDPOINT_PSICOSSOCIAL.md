# ABSENTEISMO INTELIGENTE FASE 5.5 - HARDENING ENDPOINT PSICOSSOCIAL

## 1. Objetivo da microfase

Fortalecer operacionalmente o endpoint interno psicossocial, com governanca de acesso, observabilidade basica, robustez de erro e testes complementares, preservando a linguagem nao causal obrigatoria e sem ampliar escopo para frontend ou legado.

## 2. Endpoint auditado

- Endpoint interno: `/api/absenteismo/psicossocial`
- Handler: `src/lib/afastamentos-psychosocial-endpoint.ts`
- Rota: `src/app/api/absenteismo/psicossocial/route.ts`

## 3. Reforcos aplicados

- endurecimento de query com lista explicita de parametros suportados
- limite de tamanho de query para evitar abuso em consumo interno
- diferenciacao consistente entre erros de cliente (`400/401/405`) e servidor (`500/503`)
- resposta de erro estavel e sem exposicao de detalhes internos
- trilha de request com `requestId` e duracao (`durationMs`) em logs best effort
- guarda explicita de conformidade nao causal antes da resposta `200`

## 4. Governanca de acesso

- acesso interno governado por header `x-internal-api-key`
- token exigido via `ABSENTEISMO_INTERNAL_API_KEY` no nivel da rota
- rejeicao com `401` para credencial invalida
- rota retorna `503` quando dependencia de infraestrutura nao estiver disponivel

## 5. Observabilidade e logs

- eventos padronizados: `request_received`, `request_rejected`, `request_succeeded`, `request_failed`
- atributos operacionais: `requestId`, `status`, `detail`, `durationMs`
- estrategia best effort: falha de logger nao interrompe fluxo do endpoint
- sem log de payload sensivel

## 6. Salvaguardas de linguagem nao causal

- contrato validado por consistencia nao causal antes de resposta de sucesso
- auditoria textual de observacoes e justificativas para bloquear termos causais proibidos
- mensagens de erro mantidas em linguagem neutra, sem causalidade automatica

## 7. Testes adicionais

Suite reforcada em `src/lib/tests/afastamentos-psychosocial-endpoint.test.ts` cobrindo:

- metodo nao permitido
- ausencia de parametros obrigatorios
- intervalo invalido
- `minAssessmentsForStableCriticality` invalido
- `minSignalsForStableCriticality` invalido
- parametro nao suportado
- falha simulada da camada de aplicacao
- resposta consistente em erro interno inesperado
- acesso interno nao autorizado
- preservacao de linguagem nao causal em sucesso
- preservacao de linguagem nao causal em cenario degradado

## 8. Analise da alteracao em package.json

Auditoria da alteracao introduzida na FASE 5.4:

- script adicionado: `test:absenteismo-psychosocial-endpoint`
- script agregado atualizado: `test:absenteismo` passou a incluir apenas a suite nova do dominio psicossocial
- nenhum script global sensivel de build/deploy/start foi alterado

Conclusao: alteracao permanece restrita ao escopo de testes do dominio psicossocial. Nenhum ajuste adicional foi necessario na FASE 5.5.

## 9. Garantias de nao interferencia

Esta microfase nao:

- cria tela nova
- religa frontend ao novo dominio
- altera `/afastamentos/cid-analytics`
- altera auth/shared fora do necessario
- altera legado operacional
- abre FASE 5.6 ou FASE 6

## 10. Limitacoes conhecidas

- endpoint continua interno e dependente de governanca operacional de segredo
- sem camada de rate-limit distribuida (fora do escopo atual)
- a leitura metodologica permanece de sinal/hipotese, nao de causalidade automatica

## 11. Proximo passo seguro

Prosseguir para FASE 5.6 apenas mediante autorizacao explicita, mantendo trilha interna controlada e sem abertura de frontend.