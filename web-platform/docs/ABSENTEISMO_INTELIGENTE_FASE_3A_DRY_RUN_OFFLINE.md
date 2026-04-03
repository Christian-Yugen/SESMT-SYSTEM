# ABSENTEISMO INTELIGENTE - FASE 3A

## DRY-RUN OFFLINE AUDITAVEL

Status: PREPARATORIA CONCLUIDA (sem execucao)
Data: 2026-03-31
Escopo: Validacao offline/local do artefato experimental em quarentena, sem escrita em banco.

---

## 1) OBJETIVO DA FASE 3A

Preparar a execucao manual de dry-run offline auditavel do ETL experimental em quarentena, garantindo que nao exista escrita em banco, uso de service role, apply, migrations ou qualquer impacto na plataforma atual.

---

## 2) ARTEFATO UTILIZADO

- Caminho oficial: scripts/_quarantine/phase3-etl-absenteeism.experimental.mjs
- Origem de dados local esperada:
  - dados/AtualizacaoBancoDados.xlsx
  - dados/Afastamentos.xlsx

O script antigo do fluxo principal (scripts/phase3-etl-absenteeism.mjs) permanece deprecated e fora de uso operacional.

---

## 3) GARANTIAS DE NAO ESCRITA EM BANCO

Inspecao tecnica do artefato experimental confirmou:
- nao usa apply
- nao usa upsert
- nao usa delete
- nao usa createClient
- nao depende de SUPABASE_SERVICE_ROLE_KEY

Politica interna registrada no proprio JSON de saida:
- db_write_capability: false
- accepts_apply: false
- requires_service_role: false
- schema_mutation: false
- migrations_execution: false

---

## 4) COMANDO MANUAL PROPOSTO (NAO EXECUTADO NESTA FASE)

Executar manualmente apenas quando autorizado:

node scripts/_quarantine/phase3-etl-absenteeism.experimental.mjs

Observacao:
- O comando deve ser executado a partir de web-platform.
- Esta microfase nao executa o comando; apenas o define.

---

## 5) ARQUIVO DE SAIDA ESPERADO

- Caminho esperado do relatorio JSON:
  - web-platform/tmp/absenteismo_phase3_offline_audit_report.json

---

## 6) METRICAS ESPERADAS NO RELATORIO

Blocos obrigatorios esperados:
- mode
- policy
- sources
- processed
- resolution
- consistency
- residuals

Campos minimos para analise:
- resolution.coverage_cpf
- resolution.coverage_cpf_matricula
- resolution.coverage_cpf_matricula_contrato
- residuals.pendencias_resolucao_vinculo
- processed.eventos_collapsed_by_hash
- consistency.events_with_allocated_days_consistent
- consistency.events_checked
- consistency.events_with_weight_sum_1

---

## 7) CRITERIOS DE APROVACAO DO DRY-RUN

Para aprovar o dry-run, todos os criterios abaixo devem ser atendidos:

1. coverage_cpf satisfatoria:
   - validos/total >= 0.98

2. coverage_cpf_matricula satisfatoria:
   - validos/total >= 0.95

3. coverage_cpf_matricula_contrato satisfatoria para a realidade da fonte:
   - validos/total >= 0.02
   - e registro formal de que contratos faltantes foram tratados por conciliacao de vinculo

4. pendencias_resolucao_vinculo abaixo de limite aceitavel:
   - pendencias_resolucao_vinculo / eventos_unique_after_hash <= 0.05

5. eventos_collapsed_by_hash coerentes:
   - eventos_collapsed_by_hash / eventos_raw <= 0.20
   - acima deste limite exige auditoria de deduplicacao antes de avancar

6. consistencia entre dias do evento e allocated_days:
   - events_with_allocated_days_consistent / events_checked >= 0.99
   - events_with_weight_sum_1 / events_checked >= 0.99

7. nenhuma dependencia de banco ou service role:
   - todos os flags de policy devem permanecer false para escrita/aplicacao/mutacao

---

## 8) CRITERIOS DE BLOQUEIO DO DRY-RUN

Bloquear avancos se qualquer condicao ocorrer:
- ausencia do JSON esperado
- estrutura do JSON incompleta
- qualquer flag de policy incompatvel com modo offline
- falha em qualquer criterio de aprovacao do item 7
- anomalia sem justificativa formal (exemplo: colapso por hash acima do limite)

---

## 9) PROXIMO PASSO POSSIVEL APOS O DRY-RUN

Se aprovado:
- abrir microfase de analise tecnica dos resultados (ainda sem apply e sem escrita em banco), registrando decisoes para eventual liberacao controlada futura.

Se reprovado:
- manter bloqueio e ajustar apenas artefato experimental/documentacao ate conformidade total.
