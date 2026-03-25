
# 🚀 Design System Evolution, Smart Header & Critical Fixes

## 📋 Descrição
Este PR consolida uma série de melhorias fundamentais na experiência do usuário (UX), otimização de espaço em tela e correções críticas de estabilidade e auditoria no sistema de **Afastamentos**.

## ✨ Alterações Principais

### 🏹 Experiência do Usuário (Smart Header)
- **Navegação Inteligente**: Implementado o cabeçalho que oculta-se ao rolar para baixo e reaparece ao subir a página, garantindo foco máximo nos dados.
- **Otimização de Espaço**: O cabeçalho agora libera o espaço físico no topo (`grid-rows-[0fr]`), eliminando áreas em branco indesejadas.
- **Threshold de Scroll**: Ajustado para 250px de subida, prevenindo jitter visual durante a navegação.
- **Padronização Global**: Aplicado em: Afastamentos, Histórico, Analytics, Abono e Encaminhamentos.

### 🔐 Correção Crítica de Gravação (UUID vs Email)
- **Fix "Invalid Output Syntax"**: Resolvido o erro fatal que impedia enfermeiros de salvar novos registros (estava enviando o email no campo de UUID `criado_por`).
- **Integridade de Tipos**: Padronizado o uso de `user?.id` (UUID) para colunas de referência e `alterado_por` (TEXT) para visualização de auditoria.

### 🗃️ Banco de Dados e Auditoria
- **Audit Logs v2**: Adicionadas colunas `hash_auditoria`, `motivo_alteracao` e `alterado_por` para rastreabilidade 100% confiável.
- **Tipagem Corrigida**: Alterado `afastamento_id` em logs de `UUID` para `BIGINT`, alinhando-se à chave primária real da tabela de afastamentos.
- **Refresh de Cache**: Incluídos scripts SQL (`fix_database_audit.sql`, `fix_afastamentos_logs_final.sql`) para sincronização do ambiente de produção.

### 🛡️ Estabilidade de Autenticação
- **Tratamento de Tokens**: Melhorado o fluxo de renovação de sessão para evitar interrupções de trabalho causadas por expiração de tokens em background.

## 🗂️ Arquivos Adicionados/Modificados
- `src/app/afastamentos/new/page.tsx`, `src/app/afastamentos/page.tsx` (Fix Gravação)
- `src/lib/supabase.ts`, `src/lib/auth-utils.ts` (Estabilidade)
- `fix_database_audit.sql`, `fix_afastamentos_logs_final.sql` (Schema Fixes)

## ✅ Checklist de Qualidade
- [x] Lógica de gravação testada com perfis de `nurse` e `admin`
- [x] Interface livre de "flash" de layout no scroll
- [x] RLS garantindo acesso correto para saúde e administração
- [x] Script de banco de dados validado para tabelas vazias

---
**Desenvolvido com excelência técnica por UXBRAS®**
