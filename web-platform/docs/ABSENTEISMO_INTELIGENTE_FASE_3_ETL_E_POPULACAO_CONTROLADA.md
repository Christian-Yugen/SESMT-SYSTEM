# ABSENTEISMO INTELIGENTE - FASE 3

## ETL, ENRIQUECIMENTO E POPULACAO CONTROLADA DAS DIMENSOES E FATOS

Status: BLOQUEADA POR GOVERNANCA (microfase 2.5 ativa)
Data de atualizacao: 2026-03-31
Escopo atual: Somente registro de bloqueio e diretrizes de quarentena.

---

## 1) BLOQUEIO OFICIAL DA FASE 3

A FASE 3 segue NAO AUTORIZADA.

Motivos de bloqueio:
- Schema da FASE 2 permanece apenas como contrato em migrations versionadas.
- A microfase 2.5 determinou blindagem adicional antes de qualquer execucao ETL.
- Nao ha autorizacao para execucao operacional, carga real ou escrita em banco.

Documento vinculante de bloqueio e criterios de liberacao:
- docs/ABSENTEISMO_INTELIGENTE_FASE_2_5_BLINDAGEM_PRE_FASE_3.md

---

## 2) SITUACAO DOS ARTEFATOS DE SCRIPT

### 2.1 Script antigo (fluxo principal)
- scripts/phase3-etl-absenteeism.mjs
- Estado: DEPRECATED (stub de bloqueio).
- Funcao atual: impedir uso operacional e redirecionar para a governanca da microfase 2.5.

### 2.2 Script experimental em quarentena
- scripts/_quarantine/phase3-etl-absenteeism.experimental.mjs
- Estado: permitido apenas como artefato experimental offline.
- Restricoes:
  - sem escrita em banco
  - sem dependencia operacional de service role
  - sem modo apply

---

## 3) PROIBICOES VIGENTES ENQUANTO A FASE 3 ESTIVER BLOQUEADA

- Nao executar ETL operacional.
- Nao executar carga em banco.
- Nao aplicar migrations no contexto desta fase documental.
- Nao alterar o modulo /afastamentos/cid-analytics.
- Nao alterar telas, frontend ou fluxos visuais por causa da FASE 3.

---

## 4) CONDICAO PARA RETOMADA

A retomada da FASE 3 so pode ocorrer apos conclusao formal da microfase 2.5 e aprovacao explicita de inicio em modo dry-run.

Referencia unica de liberacao:
- docs/ABSENTEISMO_INTELIGENTE_FASE_2_5_BLINDAGEM_PRE_FASE_3.md

Microfase preparatoria vigente para o dry-run offline:
- docs/ABSENTEISMO_INTELIGENTE_FASE_3A_DRY_RUN_OFFLINE.md
