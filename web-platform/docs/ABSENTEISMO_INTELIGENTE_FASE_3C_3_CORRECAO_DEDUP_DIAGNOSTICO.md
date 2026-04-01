# ABSENTEISMO INTELIGENTE - FASE 3C.3

## CORRECAO MINIMA DE DEDUPLICACAO NO DIAGNOSTICO OFFLINE

Status: CONCLUIDA (ajuste sem execucao)
Data: 2026-04-01

---

## 1) Objetivo

Aplicar uma correcao minima no script experimental offline para impedir dupla contagem de ocorrencias CID no diagnostico por evento/hash quando houver evento colapsado por hash.

---

## 2) Hash afetado

- e1a9730b9532bb9240a393f439a5daa79e0aeef12b7f659e1402d11830c286d5

---

## 3) Defeito identificado

No bloco de diagnostico por evento, as ocorrencias CID de um evento colapsado por hash estavam sendo somadas em duplicidade, inflando:
- soma_allocated_days
- soma_occurrence_weight

---

## 4) Causa confirmada

Duplicidade de linhas CID no conjunto agregado por hash para evento colapsado, sem deduplicacao local no bloco de diagnostico.

---

## 5) Correcao aplicada

Ajuste localizado apenas no bloco de `eventDiagnostics` do script offline:
- antes dos somatorios, as linhas CID do evento sao deduplicadas;
- os somatorios passam a usar o conjunto deduplicado.

---

## 6) Regra de deduplicacao adotada

Chave estavel e explicita por ocorrencia CID no evento:
- source_event_hash + cid_ordem + cid_codigo

Somente chaves unicas entram no calculo de:
- soma_allocated_days
- soma_occurrence_weight
- quantidade_cids

---

## 7) Garantia de continuidade offline

A correcao nao altera a natureza do script:
- continua offline
- sem apply
- sem createClient
- sem upsert
- sem delete
- sem dependencia de service role
- sem escrita em banco

---

## 8) Proximo passo seguro

Rerodar manualmente o dry-run offline e revalidar o arquivo detalhado por evento para confirmar que o hash afetado deixa de apresentar inconsistencia material em allocated_days e weight_sum_1.
