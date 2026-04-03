# ABSENTEISMO INTELIGENTE FASE 6.3 - PRONTIDAO PARA EXPOSICAO INTERNA CONTROLADA DA CAMADA ERGONOMICA

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: auditoria de prontidao da camada ergonomica NR-17 (engine + contrato + testes + limites de uso seguro), sem abrir endpoint, sem frontend novo e sem religacao ao legado operacional

---

## A. Objetivo da microfase

Auditar se a camada ergonomica NR-17 implementada nas FASES 6.1 e 6.2 esta pronta para futura exposicao interna controlada por servico/endpoint, mantendo isolamento backend, estabilidade contratual e governanca metodologica.

---

## B. Escopo auditado

Arquivos e artefatos auditados em conjunto:

- `src/lib/afastamentos-ergonomia.ts`
- `src/lib/afastamentos-ergonomia-contrato.ts`
- `src/lib/tests/afastamentos-ergonomia.test.ts`
- `src/lib/tests/afastamentos-ergonomia-consumo.test.ts`
- `docs/ABSENTEISMO_INTELIGENTE_FASE_6_1_CAMADA_ERGONOMICA_NR17.md`
- `docs/ABSENTEISMO_INTELIGENTE_FASE_6_2_CONTRATO_DE_CONSUMO_ERGONOMICO.md`

Evidencia de validacao executada nesta microfase:

- `npm run test:absenteismo` -> 57/57 testes aprovados

---

## C. Criterios de prontidao avaliados

### C.1. Prontidao funcional

- contrato estavel e versionado (`contractVersion`)
- payload consistente com validacao estrutural e reconciliacao de recortes
- recortes minimos cobertos (cargo, local, posto, tarefa, fator, categoria, grupo, criticidade)
- metadados de auditoria presentes (fatores, numeradores, validade, observacoes)
- flags de validade presentes para consumo seguro
- casos-limite tratados (sem avaliacoes, sem exposicoes, sem acoes, contexto insuficiente)

### C.2. Prontidao tecnica

- camada ergonomica isolada no backend (`src/lib`)
- dependencias explicitas e restritas (engine e contrato desacoplados de UI)
- pontos futuros de entrada definidos em nivel de aplicacao:
  - `buildErgonomicConsumptionContract(...)`
  - `buildErgonomicConsumptionContractFromRepository(...)`
- ausencia de acoplamento indevido com frontend atual
- ausencia de acoplamento com legado operacional e com `/afastamentos/cid-analytics`

### C.3. Prontidao metodologica

- score e criticidade explicaveis com `scoreBreakdown` e justificativas
- coerencia entre fatores, avaliacoes, exposicoes e acoes validada por testes
- linguagem nao causal e nao deterministica preservada por validacao textual
- ressalvas metodologicas mantidas e documentadas (incluindo limites de granularidade)

### C.4. Prontidao de governanca

- versionamento do contrato presente e auditavel
- politica de arredondamento definida e validada
- comportamento sem avaliacoes documentado
- comportamento sem exposicoes documentado
- comportamento sem acoes documentado
- comportamento com contexto insuficiente documentado
- criterios de consumo seguro documentados (flags e validade)

---

## D. Pontos aprovados

1. Engine ergonomica e contrato de consumo estao coerentes e integrados.
2. Validacao automatica cobre estabilidade estrutural, consistencia de visao geral/recortes e edge cases.
3. Linguagem de risco nao causal e nao deterministica permanece preservada.
4. Contrato apresenta metadados suficientes para auditoria interna controlada.
5. A camada continua isolada de frontend, auth/shared e legado operacional.

---

## E. Lacunas encontradas

1. Ainda nao existe handler/endpoint ergonomico dedicado para exposicao interna (bloqueio intencional desta microfase).
2. Parte do contexto ocupacional ainda depende de parse estruturado de observacoes quando nao houver coluna dedicada (limite metodologico ja conhecido).

---

## F. Ajustes minimos realizados

- Nao foi necessario ajuste de codigo funcional nesta microfase.
- Ajuste documental realizado: registro canonico da auditoria de prontidao FASE 6.3 e atualizacao enxuta de indice.

---

## G. Decisao final de prontidao

**PRONTO COM RESSALVAS** para futura exposicao interna controlada.

Justificativa:

- pronto: base funcional, tecnica, metodologica e de governanca esta validada e auditavel;
- com ressalvas: exposicao via endpoint ainda nao foi aberta por regra de escopo, e permanece como proxima etapa controlada.

---

## H. Bloqueios ainda mantidos

- nao criar endpoint nesta microfase
- nao abrir frontend novo
- nao religar telas ao novo dominio
- nao alterar `/afastamentos/cid-analytics`
- nao alterar auth/shared
- nao alterar legado operacional

---

## I. Proximo passo seguro

Proximo passo seguro recomendado, somente com autorizacao explicita:

- FASE 6.4 para exposicao interna controlada da camada ergonomica por endpoint backend dedicado, com validacoes de acesso interno, parametros permitidos, respostas padronizadas e testes de hardening, sem religacao de frontend.
