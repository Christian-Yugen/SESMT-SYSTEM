# Security Recommendations & Threat Model

## 1. Threat Model (STRIDE)

| Ameaça | Categoria | Descrição | Mitigação |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Identidade | Atacante se passa por outro usuário (Mestre). | Autenticação forte (Supabase Auth), validação de email, logs de acesso. |
| **Tampering** | Integridade | Modificação de notas ou progresso de curso. | RLS (Row Level Security) rigoroso, validação server-side de inputs, Auditoria (Audit Logs). |
| **Repudiation** | Não-repúdio | Usuário nega ter completado curso ou acessado. | Logs de auditoria imutáveis para ações críticas (Emissão de certificados). |
| **Information Disclosure** | Confidencialidade | Vazamento de lista de membros ou dados pessoais. | RLS policies estritas, exposição mínima de dados na API, mascaramento de dados sensíveis no frontend. |
| **Denial of Service** | Disponibilidade | Sobrecarga de API. | Rate limiting (via Next.js Middleware ou Supabase), CDN caching. |
| **Elevation of Privilege** | Privilégio | Iniciante acessa conteúdo de Mestre. | Verificação de role em cada endpoint e componente protegido (MiddlewareMatcher). |

## 2. Controles de Segurança

### P0 (Crítico - MVP)

- [ ] **RLS Enable**: Ativar RLS em TODAS as tabelas públicas.
- [ ] **Input Validation**: Usar Zod para validar todos os inputs de API e forms.
- [ ] **HTTPS**: Enforce HTTPS (padrão Vercel/Supabase).
- [ ] **Auth State Management**: Não confiar em state do cliente para permissões críticas; revalidar no servidor.

### P1 (Importante - Pré-Launch)

- [ ] **Rate Limiting**: Implementar limitação de requisições por IP na rota de login e API.
- [ ] **Security Headers**: Configurar headers HTTP (HSTS, X-Frame-Options, CSP) no `next.config.js`.
- [ ] **Audit Logging**: Implementar sistema de logs para ações administrativas e emissão de certificados.

### P2 (Melhoria Contínua)

- [ ] **Monitoramento**: Alertas de falhas de login consecutivas.
- [ ] **Pentest Simplificado**: Scan automatizado de vulnerabilidades (ex: OWASP ZAP).

## 3. Plano de Hardening

1. **Supabase**: Desativar APIs públicas não utilizadas. Configurar backup diário (PITR).
2. **Next.js**: Desabilitar `x-powered-by header`. Minimizar dependencies.
3. **CI/CD**: Scans de segredos (trufflehog) no pipeline.
