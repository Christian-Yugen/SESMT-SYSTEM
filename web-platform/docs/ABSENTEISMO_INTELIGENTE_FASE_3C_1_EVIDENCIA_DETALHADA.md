# ABSENTEISMO INTELIGENTE - FASE 3C.1

## INSTRUMENTACAO OFFLINE DE EVIDENCIA DETALHADA

Status: CONCLUIDA (preparacao sem execucao)
Data: 2026-04-01

---

## 1) Objetivo

Instrumentar minimamente o script experimental offline para gerar evidencia detalhada por evento (hash por hash), permitindo fechar a FASE 3C com rastreabilidade nominal das inconsistencias residuais de allocated_days e weight_sum_1.

---

## 2) Artefato ajustado

- scripts/_quarantine/phase3-etl-absenteeism.experimental.mjs

Ajuste aplicado:
- mantida a saida agregada existente;
- adicionada uma segunda saida JSON com diagnostico por evento.

---

## 3) Novo arquivo de saida esperado

- web-platform/tmp/absenteismo_phase3_offline_event_diagnostics.json

Esse arquivo passa a conter diagnostico detalhado para cada evento unico apos colapso por hash.

---

## 4) Campos do diagnostico por evento

Para cada evento, o JSON detalhado inclui:
- source_event_hash
- cpf_normalizado
- matricula
- contrato_resolvido
- quantidade_cids
- dias_evento
- soma_allocated_days
- delta_allocated_days
- soma_occurrence_weight
- delta_weight_sum_1
- allocated_days_consistente (boolean)
- weight_sum_consistente (boolean)
- evento_colapsado_por_hash (boolean)

Metadados de auditoria incluidos no arquivo:
- mode
- generated_at
- tolerance_days
- tolerance_weight
- events_raw
- events_unique_after_hash
- events_collapsed_by_hash

---

## 5) Garantia de nao escrita em banco

A instrumentacao preserva o modelo 100% offline:
- sem apply
- sem createClient
- sem upsert
- sem delete
- sem dependencia de SUPABASE_SERVICE_ROLE_KEY
- sem qualquer escrita em banco

A unica escrita adicionada foi de arquivo local JSON no diretorio tmp.

---

## 6) Proximo passo seguro

Executar manualmente o dry-run offline para gerar o novo JSON detalhado e, em seguida, concluir a FASE 3C com identificacao hash por hash dos eventos residuais inconsistentes.
