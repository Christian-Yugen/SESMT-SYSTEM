# ABSENTEISMO_INTELIGENTE - FASE 5.3

## Validacao de Prontidao para Exposicao Interna Controlada da Camada Psicossocial

Data de execucao: 02 de Abril de 2026  
Projeto: SESMT-System  
Branch: feat/unified-absenteeism-intelligence-program  
Escopo da microfase: auditoria de prontidao da engine psicossocial, do contrato de consumo e da validacao backend para futura exposicao interna controlada, sem abrir endpoint, sem frontend novo e sem alterar o legado operacional

---

## A. Objetivo da microfase

Auditar se a camada psicossocial NR-1 entregue nas fases 5.1 e 5.2 esta pronta para futura exposicao interna controlada por servico ou endpoint, considerando engine, contrato, validacoes, testes e limites de uso seguro, sem executar a exposicao nesta microfase.

---

## B. Escopo auditado

Arquivos auditados:

- `src/lib/afastamentos-psychosocial.ts`
- `src/lib/afastamentos-psychosocial-contrato.ts`
- `src/lib/tests/afastamentos-psychosocial.test.ts`
- `src/lib/tests/afastamentos-psychosocial-consumo.test.ts`
- `docs/ABSENTEISMO_INTELIGENTE_FASE_5_1_CAMADA_PSICOSSOCIAL_NR1.md`
- `docs/ABSENTEISMO_INTELIGENTE_FASE_5_2_CONTRATO_DE_CONSUMO_PSICOSSOCIAL.md`

Fora de escopo e intocados:

- frontend atual
- telas novas
- `/afastamentos/cid-analytics`
- `auth/shared`
- legado operacional e schema `public`
- criacao de endpoint nesta microfase

---

## C. Criterios de prontidao avaliados

### C.1 Prontidao funcional

- contrato estavel com `contractVersion`
- payload consistente e validado internamente
- recortes minimos cobertos
- metadados de auditoria presentes
- flags de validade presentes
- casos-limite tratados (`sem_avaliacoes`, `sem_sinais`, `contexto_insuficiente_para_criticidade_estavel`)

### C.2 Prontidao tecnica

- camada backend isolada em `src/lib`
- dependencias claras entre engine e contrato
- pontos futuros de entrada definidos por builder de contrato e builder a partir de repositorio
- ausencia de acoplamento com frontend atual
- ausencia de acoplamento com legado operacional

### C.3 Prontidao metodologica

- score e criticidade explicaveis
- coerencia entre fatores, avaliacoes e sinais
- preservacao de linguagem nao causal
- CID F tratado como sinal sentinela e hipotese de investigacao
- limites metodologicos documentados

### C.4 Prontidao de governanca

- versionamento do contrato presente
- arredondamento documentado
- comportamento sem avaliacoes documentado
- comportamento sem sinais documentado
- comportamento com contexto insuficiente documentado
- criterios de consumo seguro delimitados para uso interno controlado apenas

---

## D. Pontos aprovados

- Engine psicossocial isolada, sem dependencia de frontend e sem toque no legado.
- Contrato psicossocial versionado (`5.2.0`) e com politica de arredondamento explicita.
- Visao geral e recortes minimos implementados e cobertos por teste.
- Metadados de auditoria presentes em `overview` e nos recortes.
- Validacoes de estrutura, coerencia, arredondamento, casos-limite e linguagem nao causal implementadas.
- Testes psicossociais e testes de consumo passando dentro da suite agregada do dominio.
- Ponto futuro de entrada backend ja definido por `buildPsychosocialConsumptionContractFromRepository`, sem necessidade de expor endpoint nesta fase.

---

## E. Lacunas encontradas

Lacunas nao bloqueantes identificadas:

1. O schema atual de avaliacao psicossocial ainda depende de fallback em `observacoes` para parte de `evidencia`, `acao_recomendada` e `status_acao` quando esses campos estruturados nao estiverem presentes.
2. A prontidao auditada e somente para exposicao interna controlada; nao existe endpoint aberto nem consumo visual, por decisao de governanca.
3. O contrato esta pronto para uso interno, mas a futura camada de exposicao devera manter explicitamente os bloqueios de linguagem nao causal, escopo interno e observabilidade minima.

---

## F. Ajustes minimos realizados, se houver

Nenhum ajuste funcional adicional foi necessario nesta microfase.

A auditoria concluiu que a camada entregue nas fases 5.1 e 5.2 ja atende aos criterios de prontidao para futura exposicao interna controlada, restando apenas registrar formalmente a decisao e as ressalvas.

---

## G. Decisao final de prontidao

**DECISAO: PRONTO COM RESSALVAS PARA EXPOSICAO INTERNA CONTROLADA FUTURA.**

Fundamento da decisao:

- pronto porque engine, contrato, validacoes e testes estao coerentes e isolados, com comportamento controlado em casos-limite e linguagem nao causal preservada;
- com ressalvas porque ainda existe dependencia parcial de parsing em `observacoes` para campos operacionais de avaliacao e porque a exposicao futura devera manter governanca estrita de uso interno, sem extrapolacao para frontend ou leitura causal indevida.

---

## H. Bloqueios ainda mantidos

- nenhum endpoint e aberto nesta 5.3
- nenhum frontend e aberto nesta 5.3
- nenhuma religacao do sistema ao novo dominio
- `/afastamentos/cid-analytics` permanece intocado
- `auth/shared` permanece intocado
- legado operacional permanece intocado
- FASE 6 permanece bloqueada
- FASE 5.4 nao e aberta automaticamente

---

## I. Proximo passo seguro

Proximo passo seguro recomendado, somente com autorizacao explicita:

- FASE 5.4 de exposicao interna controlada da camada psicossocial, com handler/servico interno, validacao de acesso, observabilidade minima e sem abertura de frontend.

Regra de governanca:

- a exposicao nao ocorre nesta 5.3; esta microfase apenas certifica a prontidao controlada.