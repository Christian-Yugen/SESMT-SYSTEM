# Mudanças: Portarias de Afastamento — Migração e UI

Resumo das alterações realizadas:

- Tornamos obrigatório o campo "Número da Portaria" no formulário de criação de afastamentos.
- Substituímos alertas de bloco por validação inline no formulário (`web-platform/src/app/afastamentos/new/page.tsx`).
- Criada migration idempotente que detecta duplicatas, faz backup e renumera registros duplicados antes de aplicar a constraint única `(numero, ano)` em `public.portarias_afastamento`.

Arquivos alterados:

- `web-platform/src/app/afastamentos/new/page.tsx` — validação inline, mensagens de erro, feedback visual.
- `web-platform/migrations/add_unique_portarias_afastamento.sql` — migration que faz backup e adiciona constraint `unique_portaria_por_ano`.

Instruções para deploy / execução da migration (Supabase / Postgres):

1. Fazer backup completo do schema/tabela `portarias_afastamento` (export CSV ou dump do banco).

2. Executar a migration presente em `web-platform/migrations/add_unique_portarias_afastamento.sql` no SQL Editor do Supabase (ou via psql). A migration é idempotente e:
   - cria tabela de backup `public.portarias_afastamento_duplicates_backup` (caso não exista) com os registros duplicados;
   - renumera os registros duplicados, mantendo o primeiro por `created_at` e atribuindo números subsequentes maiores que o máximo daquele ano;
   - adiciona a constraint `unique_portaria_por_ano`.

3. Validar:
   - não devem existir grupos duplicados: `SELECT ano, numero, COUNT(*) FROM public.portarias_afastamento GROUP BY ano, numero HAVING COUNT(*) > 1;` — resultado esperado: nenhum registro.
   - a tabela de backup foi criada: `SELECT COUNT(*) FROM public.portarias_afastamento_duplicates_backup;`.

Rollback / auditoria:

- A migration cria a tabela `public.portarias_afastamento_duplicates_backup` com os registros duplicados originais. Se for necessário reverter a renumeração, use essa tabela para restaurar valores (ex.: `UPDATE public.portarias_afastamento p SET numero = b.numero FROM public.portarias_afastamento_duplicates_backup b WHERE p.id = b.id;`).

Observações importantes:

- A renumeração altera valores do campo `numero` para registros duplicados. Se já houver portarias/docos emitidos externamente com esses números, considere revisar manualmente os pares duplicados e decidir a ação apropriada (excluir registros errados, mesclar, ou renumerar manualmente).
- Recomenda-se manter `portarias_afastamento_duplicates_backup` por pelo menos 30 dias para auditoria antes de remover.

Próximos passos recomendados:

- Revisar e aprovar as mudanças em um PR e aplicar a migration em produção com janela de manutenção se necessário.
- Opcional: substituir outros `alert()` na base por feedback inline onde fizer sentido (consistência UX).

Contato:
- Para dúvidas ou ajuste fino da renumeração, contate o time responsável pelo SESMT.
