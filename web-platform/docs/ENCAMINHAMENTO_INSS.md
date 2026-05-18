# Encaminhamento ao INSS — comportamento e instruções

Resumo
------
- Foi adicionado o campo booleano `encaminhamento_inss` na tabela `afastamentos`.
- A UI sugere automaticamente o encaminhamento com base na `natureza_cargo` (heurística em `src/lib/encaminhamento-inss-utils.ts`).
- Se marcado, o sistema NÃO gera registros em `portarias_afastamento` para aquele afastamento.

Comportamento atual
-------------------
- A sugestão é aplicada automaticamente ao selecionar o servidor/vínculo(s).
- O usuário pode sobrescrever manualmente a sugestão. A decisão é persistida no registro via campo `encaminhamento_inss`.
- Observação: a auditoria/trigger para registrar o *override* manual está pendente e será implementada em migration separada.

Backfill (opcional)
--------------------
Se desejar marcar historicamente afastamentos por `natureza_cargo`, existe uma função helper criada pela migration:

```
SELECT public.set_encaminhamento_inss_by_naturezas(ARRAY[
  'CONTRATADO','TERCEIRIZADO','ESTAGIARIO','TEMPORARIO','COMISSIONADO','TERCEIRO','PJ','SUBSTITUTO'
]);
```

Execute este comando apenas após fazer backup do banco e revisar a lista de naturezas para o seu contexto.

Problemas conhecidos
--------------------
- Quando a migration é aplicada, o PostgREST/Supabase pode manter cache de schema e não reconhecer imediatamente a nova coluna. Caso ocorram erros do tipo "could not find the 'encaminhamento_inss' column":
  - Local (CLI): pare e inicie o stack Supabase: `supabase stop` && `supabase start`.
  - Hospedado: aguarde alguns minutos ou re-deploy/restart do projeto no Dashboard.

Próximos passos (recomendados)
-----------------------------
1. Implementar trigger/migration para registrar overrides em `afastamentos_logs`.
2. (Opcional) Rodar backfill com função helper após validação dos dados.
3. Testar o fluxo final em ambiente de staging com restart do serviço para garantir que a API reconheça o novo campo.
