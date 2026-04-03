# ABSENTEISMO_INTELIGENTE - FASE 4.5

## Implementacao do Endpoint Interno Controlado

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: exposicao controlada do contrato epidemiologico por rota interna de aplicacao

---

## A. objetivo da microfase

Implementar endpoint interno para entrega do contrato epidemiologico ja validado nas fases 4.1-4.4, sem abrir frontend novo, sem religar telas e sem alterar legado operacional.

---

## B. endpoint implementado

Endpoint interno criado:

- src/app/api/absenteismo/epidemiologia/route.ts

Handler de dominio aplicado:

- src/lib/afastamentos-epidemiologia-endpoint.ts

---

## C. metodo e contrato retornado

Metodo suportado:

- GET

Parametros de entrada via query string:

- startDate (obrigatorio, YYYY-MM-DD)
- endDate (obrigatorio, YYYY-MM-DD)
- minPopulationForStableCut (opcional, inteiro positivo)

Contrato retornado em 200:

- contractVersion
- generatedAt
- period
- policy
- overall
- cuts
- validation

Recortes expostos no payload:

- sexo
- faixaEtaria
- faixaTempoServico
- secretaria
- cargo
- localTrabalho
- cidCapitulo

---

## D. validacoes de entrada

Validacoes implementadas no handler interno:

1. Metodo diferente de GET retorna 405 controlado.
2. startDate e endDate obrigatorios no formato YYYY-MM-DD.
3. startDate nao pode ser maior que endDate.
4. minPopulationForStableCut, quando informado, deve ser inteiro positivo.

---

## E. tratamento de erro

Erros retornados com payload controlado e sem exposicao de detalhes internos:

- INVALID_QUERY_PARAMS (400)
- UNSUPPORTED_METHOD (405)
- INTERNAL_ERROR (500/503)

Padrao de resposta de erro:

- { error: { code, message } }

Nao ha vazamento de stack trace, SQL ou detalhes de infraestrutura na resposta.

---

## F. testes implementados

Arquivo de testes do endpoint:

- src/lib/tests/afastamentos-epidemiologia-endpoint.test.ts

Cenarios testados:

1. resposta 200 em cenario valido
2. estrutura do payload
3. erro controlado em parametros invalidos
4. comportamento em ausencia de denominador
5. preservacao dos campos obrigatorios do contrato
6. ausencia de regressao do contrato ja validado

Resultado da execucao:

- 4 testes executados
- 4 testes aprovados
- 0 falhas

---

## G. garantias de nao interferencia

1. Nenhuma tela nova criada.
2. Nenhuma religacao de frontend ao dominio abs_intel.
3. Nenhuma alteracao em /afastamentos/cid-analytics.
4. Nenhuma alteracao em auth/shared.
5. Nenhuma alteracao no legado operacional (schema public).

---

## H. limitacoes conhecidas

1. Endpoint depende de configuracao de ambiente para cliente Supabase server-side.
2. Para uso real, schema abs_intel deve estar permitido na configuracao de API do Supabase.
3. Esta microfase nao inclui qualquer consumo visual em UI.

---

## I. proximo passo seguro

Proxima microfase recomendada:

- FASE 4.6 - hardening operacional do endpoint interno (observabilidade, politicas de acesso e testes adicionais de contrato sob carga), sem abrir frontend.

Regra de governanca:

- FASE 4.6 nao e aberta automaticamente nesta entrega.
