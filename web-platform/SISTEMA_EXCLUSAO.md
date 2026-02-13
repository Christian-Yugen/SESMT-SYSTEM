# Sistema de Exclusão de Registros com Aprovação

## Visão Geral

Foi implementado um sistema completo de exclusão de registros do histórico que requer:

1. **Solicitação do Operador**: Qualquer operador pode solicitar a exclusão de registros que ele mesmo criou
2. **Aprovação do Admin**: Apenas administradores podem aprovar ou rejeitar as solicitações
3. **Motivo Obrigatório**: O operador deve descrever o motivo da exclusão
4. **Processo Moderno**: Interface com modais e confirmações para evitar exclusões acidentais

## Arquivos Criados

### 1. `create_deletion_system.sql`
Script SQL para criar as tabelas e políticas necessárias no Supabase.

### 2. `src/app/deletion-requests/page.tsx`
Página administrativa para gerenciar solicitações de exclusão pendentes.

### 3. Modificações em `src/app/history/page.tsx`
- Adicionado botão "Solicitar Exclusão" que aparece apenas para o operador que criou o registro
- Adicionado modal de confirmação com campo obrigatório de motivo
- Adicionado link na sidebar para "Exclusões Pendentes" (apenas para admins)

## Como Aplicar as Mudanças

### Passo 1: Executar o Script SQL no Supabase

1. Acesse o painel do Supabase (https://supabase.com)
2. Vá para o seu projeto SESMT
3. No menu lateral, clique em "SQL Editor"
4. Clique em "New Query"
5. Copie e cole todo o conteúdo do arquivo `create_deletion_system.sql`
6. Clique em "Run" para executar o script
7. Verifique se não há erros

### Passo 2: Verificar as Tabelas Criadas

No Supabase, vá para "Table Editor" e verifique se foram criadas:

- Tabela `deletion_requests` com as colunas:
  - id, history_record_id, requester_id, requester_name
  - deletion_reason, status, requested_at, reviewed_at
  - reviewed_by, reviewer_name, original_data

- Colunas adicionadas em `aso_history`:
  - deletion_pending, deleted, deleted_at, deleted_by

### Passo 3: Testar o Sistema

#### Como Operador:

1. Faça login no sistema
2. Vá para o Histórico (`/history`)
3. Expanda um registro que VOCÊ criou
4. Você verá o botão "Solicitar Exclusão"
5. Clique no botão
6. Preencha o motivo da exclusão (obrigatório)
7. Confirme a solicitação
8. O registro permanecerá no histórico com status "pending"

#### Como Admin:

1. Faça login como administrador
2. No menu lateral, clique em "Exclusões Pendentes"
3. Você verá todas as solicitações pendentes
4. Expanda uma solicitação para ver os detalhes
5. Leia o motivo da exclusão fornecido pelo operador
6. Escolha:
   - **Aprovar**: O registro será excluído definitivamente do banco de dados
   - **Rejeitar**: A solicitação é rejeitada e o registro permanece no histórico

## Características do Sistema

### Segurança

- ✅ Apenas o operador que criou o registro pode solicitar exclusão
- ✅ Apenas administradores podem aprovar/rejeitar exclusões
- ✅ Row Level Security (RLS) implementado no Supabase
- ✅ Dupla confirmação antes de exclusão definitiva

### Interface do Usuário

- ✅ Modal moderno com animações
- ✅ Campo de motivo obrigatório (até 500 caracteres)
- ✅ Contador de caracteres
- ✅ Mensagens de aviso claras
- ✅ Estados de loading durante processamento
- ✅ Feedback visual de sucesso/erro

### Fluxo de Dados

1. **Operador solicita exclusão**
   - Modal com informações do registro
   - Campo obrigatório de motivo
   - Confirmação da solicitação
   - Registro marcado como `deletion_pending: true`
   - Solicitação criada com `status: 'pending'`

2. **Admin revisa solicitação**
   - Vê todas as solicitações pendentes
   - Lê o motivo fornecido
   - Visualiza dados do registro original
   - Decide aprovar ou rejeitar

3. **Aprovação**
   - Registro é excluído da tabela `aso_history`
   - Solicitação atualizada para `status: 'approved'`
   - Dados do revisor registrados

4. **Rejeição**
   - Registro permanece em `aso_history`
   - Flag `deletion_pending` removido
   - Solicitação atualizada para `status: 'rejected'`
   - Dados do revisor registrados

## Filtros na Página de Admin

A página de gerenciamento oferece filtros por status:
- **Todas**: Mostra todas as solicitações
- **Pendentes**: Apenas solicitações aguardando aprovação
- **Aprovadas**: Solicitações aprovadas (registros já excluídos)
- **Rejeitadas**: Solicitações rejeitadas

## Estatísticas

Cartões de estatísticas mostram:
- Total de solicitações pendentes
- Total de aprovadas (excluídas)
- Total de rejeitadas

## Próximos Passos (Opcional)

Se desejar, podemos adicionar:

1. **Notificações**: Email para admin quando houver nova solicitação
2. **Histórico de Exclusões**: Log detalhado de todas as exclusões
3. **Filtros Avançados**: Filtrar por operador, data, tipo de documento
4. **Exportação**: Exportar relatório de exclusões em PDF/Excel
5. **Prazo de Validade**: Solicitações expiram após X dias sem resposta

## Troubleshooting

### Erro: "permission denied for table deletion_requests"
- Execute o script SQL novamente, especialmente a seção de GRANT

### Botão de exclusão não aparece
- Verifique se você é o operador que criou o registro
- Verifique se `currentUserId === entry.generated_by`

### Admin não vê a página
- Verifique se o usuário tem `role: 'admin'` na tabela `profiles`

### Exclusão não funciona
- Verifique se o script SQL foi executado corretamente
- Verifique as políticas RLS no Supabase
- Verifique os logs do navegador (Console) para erros

## Suporte

Se encontrar problemas, verifique:
1. Console do navegador para erros JavaScript
2. Network tab para ver requisições falhas
3. Supabase logs para erros no servidor
4. Tabela `deletion_requests` para ver se os dados estão sendo salvos

---

**Desenvolvido por UXBRAS®**
