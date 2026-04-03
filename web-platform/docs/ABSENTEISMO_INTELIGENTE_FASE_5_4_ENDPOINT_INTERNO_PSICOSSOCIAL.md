# ABSENTEISMO INTELIGENTE FASE 5.4 - ENDPOINT INTERNO PSICOSSOCIAL

## 1. Objetivo da microfase

Implementar a exposicao interna controlada da camada psicossocial por endpoint interno, preservando o contrato ja validado, a linguagem nao causal obrigatoria, a trilha de auditoria e a nao interferencia no legado operacional.

## 2. Endpoint implementado

- Endpoint: `/api/absenteismo/psicossocial`
- Metodo: `GET`
- Finalidade: entregar o contrato psicossocial de consumo interno para uso controlado de aplicacao, sem abrir frontend nem religar telas.

## 3. Metodo e contrato retornado

O endpoint retorna o contrato psicossocial estabilizado na FASE 5.2, preservando:

- `contractVersion`
- `generatedAt`
- `period`
- `policy`
- `overview`
- `cuts`
- `validation`
- `flags` de validade
- observacoes, limitacoes e justificativas auditaveis

Os recortes expostos incluem:

- secretaria
- cargo
- local de trabalho
- grupo analitico
- capitulo CID
- CID compativel
- criticidade

## 4. Validacoes de entrada

O handler aplica controles minimos aderentes ao padrao interno do repositorio:

- `startDate` e `endDate` obrigatorios no formato `YYYY-MM-DD`
- rejeicao de intervalo invertido
- rejeicao de intervalo acima de 1096 dias
- validacao de `minAssessmentsForStableCriticality` como inteiro positivo
- validacao de `minSignalsForStableCriticality` como inteiro positivo
- bloqueio por token interno invalido quando configurado

## 5. Tratamento de erro

O endpoint responde de forma controlada e auditavel com:

- `400` para parametros invalidos
- `401` para acesso interno nao autorizado
- `405` para metodo nao suportado
- `500` para falha controlada ou inesperada do backend
- `503` no nivel da rota quando a infraestrutura do servidor estiver indisponivel

As respostas de erro nao expõem detalhes internos de implementacao nem mensagens tecnicas de infraestrutura.

## 6. Salvaguardas de linguagem nao causal

Foram preservadas as salvaguardas ja definidas nas microfases anteriores:

- proibicao de linguagem causal automatica
- manutencao da leitura como sinal, hipotese e necessidade de investigacao
- preservacao de observacoes auditaveis e justificativas nao causais no payload
- continuidade da regra de consumo interno controlado

## 7. Testes implementados

Foi criada cobertura especifica para o endpoint psicossocial cobrindo:

- resposta `200` em cenario valido
- estrutura do payload
- parametros invalidos
- ausencia de avaliacoes
- ausencia de sinais
- contexto insuficiente para criticidade estavel
- preservacao de justificativa auditavel
- preservacao de linguagem de cautela e nao causalidade
- ausencia de regressao do contrato
- acesso interno invalido
- falha controlada de aplicacao

## 8. Garantias de nao interferencia

Esta microfase nao:

- cria frontend novo
- religa telas ao dominio psicossocial
- altera `/afastamentos/cid-analytics`
- modifica o legado operacional
- abre a FASE 5.5
- mistura a trilha com a FASE 6

## 9. Limitacoes conhecidas

- o endpoint permanece de consumo interno controlado e depende de governanca de acesso
- a leitura psicossocial continua nao causal por definicao metodologica
- parte do contexto residual ainda depende do parsing estruturado de observacoes ja mapeado na FASE 5.3

## 10. Proximo passo seguro

O proximo passo seguro e a FASE 5.5 somente se houver decisao explicita para integrar consumo interno autenticado a uma camada aplicacional mais ampla, sem ainda abrir frontend publico e sem tocar a FASE 6.