# 🚀 GUIA RÁPIDO: Executar Script SQL no Supabase

## ⚠️ IMPORTANTE: Execute este procedimento AGORA para ativar o sistema

---

## 📝 Passo a Passo

### 1️⃣ Abrir o Supabase

1. Acesse: <https://supabase.com/dashboard>
2. Faça login na sua conta
3. Selecione o projeto **SESMT**

### 2️⃣ Acessar o SQL Editor

1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Clique no botão **"New query"** (ou "+ New Query")

### 3️⃣ Copiar o Script SQL

1. Abra o arquivo: `setup_deletion_system.sql`
2. Selecione TODO o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)

### 4️⃣ Colar e Executar

1. Cole o script no editor SQL do Supabase (Ctrl+V)
2. Clique no botão **"Run"** (ou pressione Ctrl+Enter)
3. Aguarde a execução (alguns segundos)

### 5️⃣ Verificar Sucesso

Você deve ver mensagens de sucesso na parte inferior:

```
✓ Success. No rows returned
```

Se houver erros, copie a mensagem e me envie.

---

## ✅ Verificar se Funcionou

### Método 1: Via Table Editor

1. No Supabase, clique em **"Table Editor"** no menu lateral
2. Procure pela tabela **`deletion_requests`**
3. Ela deve aparecer na lista de tabelas

### Método 2: Via SQL Editor

Execute esta query simples:

```sql
SELECT * FROM deletion_requests;
```

Se retornar uma tabela vazia (sem erros), está funcionando! ✅

---

## 🔄 Após Executar o Script

1. **Volte para o navegador** onde está o sistema SESMT
2. **Recarregue a página** (F5 ou Ctrl+R)
3. **Teste novamente**:
   - Vá para o Histórico
   - Expanda um registro seu
   - Clique em "Solicitar Exclusão"
   - Preencha o motivo
   - Confirme

Agora deve funcionar perfeitamente! 🎉

---

## ❌ Se Der Erro

### Erro: "relation already exists"

✅ **Solução**: Ignore, significa que a tabela já existe. Continue.

### Erro: "permission denied"

❌ **Problema**: Você não tem permissões de admin no Supabase
📧 **Solução**: Use a conta de owner/admin do projeto

### Erro: "syntax error"

❌ **Problema**: O script foi colado incorretamente
📋 **Solução**: Copie novamente TODO o conteúdo do arquivo

---

## 📞 Precisa de Ajuda?

Se o erro persistir:

1. Tire um print do erro exato que aparece
2. Copie a mensagem de erro completa
3. Me envie para eu ajudar a resolver

---

**Desenvolvido por UXBRAS®**
