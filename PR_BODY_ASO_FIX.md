# PR: Corrige salvamento de ASO — normaliza datas em `exams_json`

## Resumo
Este PR corrige um problema em que a geração de ASO produzia o PDF, mas o registro NÃO era salvo no histórico (POST /api/aso-history retornava 400 com code "INVALID_EXAMS").

## Causa raiz
O frontend montava `exams_json` com datas no formato local pt-BR (ex.: "24/04/2026"), que a validação do endpoint rejeitava. Pendências antigas em `pending_aso_history` também podiam conter formatos legados.

## O que foi alterado
- Normalização das datas de exames para ISO (YYYY-MM-DDT00:00:00.000Z) antes do POST:
  - Fluxo principal: `web-platform/src/app/page.tsx`
  - Backup/pending: `web-platform/src/lib/pending-aso-storage.ts`
  - Reenvio: `web-platform/src/components/layout/Sidebar.tsx`
- Correções de tipagem/robustez no reenvio (evita `any` e trata `unknown`).

## Arquivos principais incluídos neste PR
- `web-platform/src/app/page.tsx`
- `web-platform/src/components/layout/Sidebar.tsx`
- `web-platform/src/lib/pending-aso-storage.ts`

(Dependência utilitária já presente: `web-platform/src/lib/utils.ts` — `ensureISO()`.)

## Migrations
- Migrations 011/012/013 foram aplicadas em STAGING. **Em produção** as migrations serão aplicadas separadamente por runbook controlado. **NÃO** incluir migrations neste PR.

## Checklist (staging) — já executado
- `/api/aso-history` respondeu 201 com payloads normalizados.
- Geração de ASO gravou no histórico.
- Reenvio (Sidebar) normalizou datas legadas e gravou.
- Migrations 011/012/013 aplicadas com sucesso em staging.

## Checklist (pré-merge)
- [ ] Code review aprovado (QA + Release manager)
- [ ] Testes manuais em staging concluídos
- [ ] Aprovação de infra/DBA para execução das migrations em produção via runbook

## Checklist (pós-deploy)
- [ ] Gerar ASO de teste → `/api/aso-history` retorna 201
- [ ] Verificar registro em `aso_history`
- [ ] Forçar reenvio via Sidebar → confirmar sucesso e remoção da pendência
- [ ] Confirmar ausência de `INVALID_EXAMS` e `DB_ERROR` nos logs
- [ ] Monitorar por 1–2 horas

## AVISO IMPORTANTE
- **NÃO** executar `fix_security_advisor_issue.sql` sem aprovação explícita da equipe de infra/DBA — este script pode reverter hardening e comprometer segurança.

---

_Observação do autor do PR_: este PR contém apenas alterações no frontend/backend necessárias para normalizar `exams_json` e evitar `INVALID_EXAMS`. Aplicação de migrations em produção será organizada em runbook separado.
