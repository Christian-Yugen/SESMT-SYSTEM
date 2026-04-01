# ABSENTEISMO INTELIGENTE - FASE 2.5

## BLINDAGEM, ESTABILIZACAO DO WORKSPACE E FECHAMENTO PRE-FASE 3

Status: CONCLUIDA
Data de conclusao: 2026-03-31
Natureza: microfase de blindagem (sem execucao operacional)

---

## 1) OBJETIVO DA MICROFASE

Consolidar e fechar com seguranca tudo o que precisa estar correto entre FASE 2 e FASE 3, reduzindo risco de quebra da plataforma atual e impedindo inicio operacional prematuro.

---

## 2) PREMISSAS APLICADAS

- O modulo /afastamentos/cid-analytics e nucleo consolidado e permaneceu intocado.
- A ordem metodologica foi preservada: base/schema -> ETL -> motor epidemiologico -> psicossocial/ergonomia -> telas -> relatorios -> QA.
- CID F e CID M permanecem como sinal sentinela, sem causalidade automatica.
- Nenhuma atividade de producao, banco ativo, commit ou execucao operacional foi realizada nesta microfase.

---

## 3) ESTADO REAL INSPECIONADO NO WORKSPACE

### 3.1 Artefato antigo da FASE 3
- Foi encontrado scripts/phase3-etl-absenteeism.mjs no fluxo principal.
- Estado encontrado antes da blindagem: script operacional com suporte a apply e escrita em banco.

### 3.2 Area de quarentena/experimental
- Foi encontrado scripts/_quarantine/phase3-etl-absenteeism.experimental.mjs.
- Estado encontrado: offline-only, sem escrita em banco.

### 3.3 Risco operacional identificado
No artefato antigo da FASE 3 foram encontrados elementos operacionais de risco, incluindo:
- argumento apply
- uso de escrita em banco
- uso de upsert e delete
- criacao de client para operacoes de escrita
- dependencia de SUPABASE_SERVICE_ROLE_KEY

### 3.4 Documentacao da FASE 3
- O documento de FASE 3 ja declarava bloqueio, porem ainda descrevia fluxo operacional com apply.

### 3.5 package.json e superficie funcional
- Nenhuma alteracao foi feita em package.json nesta microfase.
- Nenhuma alteracao foi feita em telas, libs de frontend ou /afastamentos/cid-analytics nesta microfase.

---

## 4) BLINDAGEM EXECUTADA

### 4.1 Script antigo neutralizado
- scripts/phase3-etl-absenteeism.mjs foi convertido para stub deprecated.
- O arquivo nao contem logica executavel de ETL e nao executa escrita em banco.

### 4.2 Quarentena mantida
- scripts/_quarantine/phase3-etl-absenteeism.experimental.mjs foi mantido como unico artefato com logica experimental.
- Mantido com politica offline-only e fora do fluxo principal.

### 4.3 Fechamento documental
- docs/ABSENTEISMO_INTELIGENTE_FASE_3_ETL_E_POPULACAO_CONTROLADA.md atualizado para bloqueio estrito da fase.
- docs/SESMT_SYSTEM_DOCUMENTATION.md atualizado para refletir stub deprecated + artefato experimental em quarentena.

---

## 5) CRITERIOS DE LIBERACAO DA FASE 3

A FASE 3 so podera ser liberada se TODOS os itens abaixo forem verdadeiros:

1. Nenhum script operacional com escrita em banco.
2. Nenhum argumento apply restante no fluxo operacional da FASE 3.
3. Nenhuma dependencia operacional de service role para execucao da microfase de blindagem.
4. Nenhuma alteracao no modulo /afastamentos/cid-analytics.
5. Nenhuma alteracao em package.json.
6. Nenhuma execucao em terminal nesta microfase.
7. Schema da FASE 2 confirmado apenas como contrato/documentacao/migrations versionadas.
8. Inicio da FASE 3 somente em modo dry-run com aprovacao explicita.

---

## 6) REGISTRO DE EXECUCAO DA MICROFASE

- Sem commit.
- Sem execucao de ETL.
- Sem aplicacao de migration.
- Sem escrita em banco.
- Sem alteracoes de frontend, telas ou UI.
- Sem alteracoes em /afastamentos/cid-analytics.

---

## 7) PROXIMO PASSO SEGURO

Manter a FASE 3 bloqueada ate aprovacao formal de retomada em dry-run controlado, partindo do artefato em quarentena e com checklist de liberacao integralmente atendido.
