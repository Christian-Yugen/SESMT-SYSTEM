Resumo das alterações automáticas para portarias

1) Objetivo
- Tornar o número da portaria confiável: auditoria de alterações, verificação de disponibilidade antes do save e limpeza automática de backups.

2) Arquivos adicionados
- `web-platform/migrations/add_portarias_audit_and_rpc.sql` — cria tabela de auditoria, trigger, função RPC `check_portaria_availability(numero, ano)`, função de limpeza `cleanup_portarias_backups()` e tentativa de agendar um job via `pg_cron` (se disponível).
- `web-platform/src/app/afastamentos/new/page.tsx` — integra pré-checagem RPC antes do salvamento (verifica disponibilidade para o número informado e para incrementos quando aplicável).

3) Como aplicar (Supabase)
- No painel SQL do Supabase, execute o conteúdo de `web-platform/migrations/add_portarias_audit_and_rpc.sql`.
- O script é idempotente: (1) cria tabela de auditoria se não existir, (2) anexa trigger se não existir, (3) cria a função RPC.
- Se a extensão `pg_cron` existir no projeto, o script tentará agendar um job diário para limpar backups com mais de 30 dias. Caso contrário, a função `cleanup_portarias_backups()` ficará disponível para execução manual ou agendamento via UI de tarefas agendadas do Supabase.

4) Rollback / considerações
- A função de auditoria apenas insere registros em tabela separada — rollback seguro removendo linhas da audit se necessário.
- A função de limpeza só apaga linhas antigas em `portarias_afastamento_duplicates_backup` — revisar backup antes de executar.

5) Integridade futura
- `check_portaria_availability` retorna `true` quando o par (numero, ano) estiver livre. O frontend bloqueia tentativa de uso de números já em uso.
- A aplicação continua usando `insertPortariaWithRetry` como defesa em tempo de corrida; a pré-checagem reduz a chance do usuário ver erro em tempo de execução.

6) Próximos passos opcionais
- Programar revisão/remoção de `portarias_afastamento_duplicates_backup` após política de retenção (30 dias por padrão).
- Revisar e habilitar `pg_cron` no projetp Supabase para automatizar limpeza.


