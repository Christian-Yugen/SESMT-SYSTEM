# ABSENTEISMO INTELIGENTE FASE 5.6 - CONSOLIDACAO OPERACIONAL PSICOSSOCIAL

## 1. Objetivo da microfase

Consolidar operacionalmente a trilha psicossocial da FASE 5, registrando readiness interno, playbook minimo de operacao, monitoramento, criterios de uso seguro e decisao formal de encerramento desta etapa, sem abrir frontend, sem religar telas e sem alterar legado operacional.

## 2. Inventario consolidado da FASE 5

### 2.1 Entregas da 5.1 (engine psicossocial)

- engine analitica psicossocial NR-1 em `src/lib/afastamentos-psychosocial.ts`
- score explicavel, criticidade e `cidZone` com leitura nao causal
- recortes minimos por secretaria, cargo, local, CID e grupo analitico

### 2.2 Entregas da 5.2 (contrato de consumo)

- contrato psicossocial versionado (`5.2.0`) em `src/lib/afastamentos-psychosocial-contrato.ts`
- blocos estaveis: `contractVersion`, `generatedAt`, `period`, `policy`, `overview`, `cuts`, `validation`
- comportamento controlado para casos-limite: sem avaliacoes, sem sinais, contexto insuficiente

### 2.3 Entregas da 5.3 (prontidao auditada)

- auditoria formal de prontidao para exposicao interna controlada
- decisao registrada: pronta com ressalvas
- bloqueios de escopo preservados

### 2.4 Entregas da 5.4 (endpoint interno)

- endpoint interno GET em `/api/absenteismo/psicossocial`
- retorno do contrato psicossocial sem acoplamento com frontend
- erros controlados e resposta auditavel

### 2.5 Entregas da 5.5 (hardening operacional)

- governanca de acesso interno por token
- reforco de validacao de query e limites basicos de consumo
- observabilidade basica com `requestId`, eventos e `durationMs`
- guarda explicita de linguagem nao causal
- cobertura de testes complementares de resiliencia

## 3. Readiness interno do endpoint psicossocial

Status consolidado: **PRONTO PARA USO INTERNO CONTROLADO**, com operacao condicionada a pre-requisitos de segredo, monitoramento de erros e preservacao de linguagem nao causal.

Readiness coberto:

- funcional: contrato estavel, recortes minimos e metadados de auditoria
- tecnico: endpoint e handler isolados em backend, sem religacao com UI
- operacional: codigos de erro previsiveis, logs operacionais, trilha por request id
- metodologico: proibicao de causalidade automatica preservada

## 4. Playbook minimo de operacao

### 4.1 Pre-condicoes para uso interno

- endpoint deve permanecer de uso interno controlado
- consumo permitido apenas para fluxos internos autorizados
- manter bloqueio de uso externo/publico

### 4.2 Variaveis e segredos necessarios

- `ABSENTEISMO_INTERNAL_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (preferencial) ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` para fallback de leitura

### 4.3 Interpretacao basica de erros

- `400`: parametros invalidos, ausentes, intervalo invalido ou query fora do permitido
- `401`: credencial interna ausente/invalida
- `405`: metodo nao suportado (somente GET)
- `500`: falha interna de aplicacao/contrato
- `503`: indisponibilidade de infraestrutura no nivel da rota

### 4.4 Leitura de logs e request id

- correlacionar investigacao por `x-request-id`
- observar eventos `request_received`, `request_rejected`, `request_succeeded`, `request_failed`
- usar `durationMs` para detectar degradacao de latencia
- nao registrar payload sensivel em logs operacionais

### 4.5 Checklist de verificacao rapida

1. Segredo interno configurado e valido.
2. Datas no formato `YYYY-MM-DD` e intervalo permitido.
3. Somente parametros permitidos na query.
4. Resposta inclui `contractVersion`, `overview`, `cuts`, `validation`.
5. `validation.consistency.isNonCausalLanguageConsistent` permanece `true`.
6. Flags de edge case coerentes com o cenario (`sem_avaliacoes`, `sem_sinais`, `contexto_insuficiente_para_criticidade_estavel`).

### 4.6 Quando bloquear consumo

- crescimento recorrente de `500/503`
- falhas de autorizacao sem explicacao operacional clara
- violacao de consistencia estrutural do contrato
- qualquer suspeita de linguagem causal indevida no payload

### 4.7 Quando escalar incidente

- indisponibilidade persistente acima do limiar operacional definido pelo time
- falha de segredo/token sem restabelecimento rapido
- degradacao continua de latencia com impacto no consumo interno
- repeticao de falha interna sem causa identificada

### 4.8 Como garantir linguagem nao causal

- tratar saida sempre como sinal e hipotese, nunca como prova causal
- validar termos proibidos em observacoes/justificativas em revisoes operacionais
- preservar regra institucional: CID F e sentinela para investigacao tecnica

## 5. Orientacoes de monitoramento

- acompanhar taxa de sucesso por janela operacional
- acompanhar distribuicao de erros por codigo (`400/401/405/500/503`)
- acompanhar latencia por `durationMs`
- acompanhar volume de rejeicoes por parametro invalido para detectar uso indevido

## 6. Sinais de falha e resposta esperada

- sinal: aumento de `400` com `unsupported_param`.
  resposta: revisar consumidor interno e remover parametros fora do contrato.
- sinal: aumento de `401`.
  resposta: rotacionar/validar segredo e revalidar cadeia de autorizacao.
- sinal: aumento de `500` controlado.
  resposta: abrir analise de aplicacao/dataset e manter bloqueio de consumo critico ate estabilizacao.
- sinal: aumento de `503`.
  resposta: tratar indisponibilidade de infraestrutura e retomar apos healthcheck.

## 7. Limites de uso seguro

- endpoint interno, sem exposicao publica
- consumo somente para leitura controlada do contrato
- sem inferencia de causalidade ocupacional automatica
- sem acoplamento com frontend nesta etapa
- sem expansao para FASE 6 sem autorizacao explicita

## 8. Salvaguardas de linguagem nao causal

- linguagem nao causal tratada como requisito operacional obrigatorio
- guarda de conformidade ativa no endpoint antes da resposta de sucesso
- testes cobrindo nao causalidade em sucesso e em cenario degradado

## 9. Garantias de nao interferencia

Esta microfase nao:

- cria tela nova
- religa frontend ao novo dominio
- altera `/afastamentos/cid-analytics`
- altera `auth/shared`
- altera legado operacional
- abre FASE 6 automaticamente

## 10. Bloqueios ainda mantidos

- FASE 6 segue bloqueada
- sem consumo visual/front-end do dominio psicossocial
- sem abertura de endpoint publico
- sem religacao com fluxos operacionais legados

## 11. Decisao sobre encerramento da FASE 5

**Decisao formal:** eixo psicossocial da FASE 5 encerrado com consolidacao operacional concluida e readiness interno documentado.

Condicao de continuidade:

- qualquer proxima evolucao depende de autorizacao explicita de governanca, mantendo separacao de escopo e bloqueio da FASE 6.

## 12. Proximo passo seguro

Prosseguir somente por autorizacao explicita para proxima microfase de governanca interna, mantendo consumo restrito e sem abertura de frontend.