Automação para migração `servidor_sexo`

Este README descreve como usar o workflow GitHub Actions que faz backup, aplica a migração e gera artefatos de verificação.

Workflow criado:
- .github/workflows/apply-servidor-sexo-migration.yml

Pré-requisitos
1) Adicionar o secret `DATABASE_URL` nas configurações do repositório (Settings → Secrets → Actions).
   - Valor: connection string completa do Postgres (ex: postgres://user:pass@host:5432/dbname)
2) Permitir que o Runner use Docker (o workflow usa a imagem `postgres:15` para `pg_dump`/`psql`).

Como executar (pela UI do GitHub)
1) Acesse a aba Actions no repositório.
2) Escolha o workflow "Apply servidor_sexo migration (backup + apply + verify)".
3) Clique em "Run workflow" (workflow_dispatch) e confirme.

O que o workflow faz
- Gera um backup binário com `pg_dump` e faz upload como artifact.
- Aplica o arquivo SQL `web-platform/migrations/2026_05_14_add_servidor_sexo_and_backfill.sql`.
- Executa queries de verificação e envia `verification.txt` como artifact.

Execução local alternativa (Docker)
- Fazer backup localmente:

```powershell
$env:DATABASE_URL = 'postgres://USER:PASS@HOST:5432/DB'
TS=$(Get-Date -Format yyyyMMdd_HHmmss)
docker run --rm -v "${PWD}:/work" -w /work postgres:15 pg_dump "$env:DATABASE_URL" -F c -b -v -f /work/backup_full_$TS.dump
```

- Aplicar migração localmente (Docker):
```powershell
docker run --rm -v "${PWD}:/work" -w /work postgres:15 psql "$env:DATABASE_URL" -f /work/web-platform/migrations/2026_05_14_add_servidor_sexo_and_backfill.sql
```

Observações de segurança
- Nunca comite `DATABASE_URL` em texto aberto.
- O backup binário é armazenado como artifact do workflow; faça download e armazene em local seguro.

Se quiser, posso: 
- preparar um GitHub Action adicional para rodar automaticamente após merge em `main`, ou
- criar um job que também rode a migração de auditoria/RPC previamente criada.
