# Arquitetura de Software

## 1. Visão Geral

A arquitetura proposta utiliza uma stack moderna e serverless para garantir escalabilidade, segurança e rapidez desenvolvimento. A aplicação será uma Single Page Application (SPA) renderizada no servidor (SSR) e estática (SSG) onde possível.

## 2. Tech Stack

- **Frontend/Fullstack Framework**: Next.js 14+ (App Router).
- **Linguagem**: TypeScript.
- **Estilização**: Tailwind CSS + Shadcn/ui (para consistência de componentes).
- **Backend/Database**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Geração de PDF**: `react-pdf` ou `@react-pdf/renderer` executado server-side.
- **Ícones**: Lucide React.
- **State Management**: React Context / Hooks (SWR ou TanStack Query para data fetching).

## 3. Diagrama de Arquitetura

```
[Client Browser]
      |
      | (HTTPS / JSON)
      v
[Next.js Server / Vercel Edge]
      |
      +---> [Supabase Auth] (JWT Validation)
      +---> [Supabase Database] (Postgres + RLS)
      +---> [Supabase Storage] (Course Assets, PDFs)
```

## 4. Segurança e Dados

- **RLS (Row Level Security)**: Toda a segurança de dados reside no banco. Cada query é filtrada automaticamente pelo ID do usuário autenticado no contexto da transação.
- **Roles**: Definidas na tabela `public.profiles` ou `auth.users` metadata e verificadas nas Policies do RLS.
- **Audit**: Log de eventos críticos (login, emissão de certificado) via triggers no banco de dados.

## 5. Endpoints Principais (Server Actions / API Routes)

- `POST /auth/login`: Autenticação.
- `GET /api/courses`: Lista cursos permitidos para a role.
- `GET /api/courses/:id`: Detalhes e progresso.
- `POST /api/progress`: Atualiza progresso de aula.
- `POST /api/certificate/generate`: Gera PDF e salva registro.
- `GET /verify/:code`: Rota pública para validação de veracidade de certificado.

## 6. Geração de Certificado

1. Usuário completa 100% do curso.
2. Botão "Gerar Certificado" chama Server Action.
3. Server Action verifica requisitos no DB.
4. Gera hash único (UUID ou hash curto).
5. Renderiza PDF em memória com QR Code apontando para `domain.com/verify/{hash}`.
6. Salva PDF no Supabase Storage (Bucket privado) e metadados na tabela `certificates`.
7. Retorna URL assinada para download e visualização.

## 7. Módulo CID Analytics

Documentação canônica do módulo Gestão Analítica de Afastamentos por CID:

- `docs/CID_ANALYTICS_MODULO_GOVERNANCA_E_ARQUITETURA.md`

## 8. Programa Unificado de Inteligência em Absenteísmo Ocupacional

Arquitetura e governança do programa macro de vigilância epidemiológica integrada:

- **Documento principal:** `docs/ABSENTEISMO_INTELIGENTE_GOVERNANCA_E_PLANO_DIRETOR.md`
- **Backlog de execução:** `docs/ABSENTEISMO_INTELIGENTE_BACKLOG_MACRO.md`
- **Templates operacionais:** `docs/ABSENTEISMO_INTELIGENTE_TEMPLATE_EXECUCAO_DE_FASE.md` e `docs/ABSENTEISMO_INTELIGENTE_TEMPLATE_RETORNO_AGENTE.md`

**Escopo:** O programa unifica análise epidemiológica clássica (TAD, IFL, DML, IG), avaliação clínica-ocupacional, risco psicossocial (NR-1) e ergonomia (NR-17) em 12 fases progressivas. CID Analytics (módulo 6.0) é núcleo preservado e fundação para todas as próximas camadas.

**Fase atual:** FASE 0 (Governança) — EM EXECUÇÃO

**Próximas fases:** 1 (Requisitos) → 2 (Schema) → 3-4 (ETL + Validação Denominador) → 5-6 (Motor Epidemiológico) → 7-12 (Integração de risco + Relatórios + Prevention Board)
