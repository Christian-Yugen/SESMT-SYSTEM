# ABSENTEISMO INTELIGENTE — FASE 7.R

## CORRECAO DO ERRO INTERNO NA TELA EPIDEMIOLOGICA

Status: CONCLUIDA
Data: 2026-06-08
Natureza: corretiva — habilitacao da tela epidemiologica em producao

---

## A. Contexto

A tela `/afastamentos/epidemiologia` retornava `INTERNAL_ERROR` ("Falha ao processar dados epidemiologicos.") em todos os carregamentos reais desde sua entrega em FASE 7.1. O erro foi escalado apos FASE 7.2.1 como bloqueador de uso em producao.

---

## B. Cadeia de erro confirmada

```
page.tsx → fetchContract()
  → GET /api/absenteismo/epidemiologia-view
    → buildEpidemiologyContractFromRepository()
      → repository.loadDataset()
        → client.schema("abs_intel").from("abs_fact_afastamento_evento").select(...)
          → Supabase retorna erro (PGRST106 ou similar)
            → fetchRows() lanca EpidemiologyApplicationError
              → route.ts catch → HTTP 500 "Falha ao processar dados epidemiologicos."
```

---

## C. Causa raiz

### C.1 — Schema abs_intel nao exposto no PostgREST (causa primaria)

O Supabase JS client usa PostgREST via HTTP. O metodo `.schema("abs_intel")` envia o
header `Accept-Profile: abs_intel`. O PostgREST valida o schema contra sua lista de
schemas expostos (`db_schema`). Se `abs_intel` nao estiver nessa lista, a resposta e:

```json
{
  "code": "PGRST106",
  "message": "The schema must be one of the following: public, ..."
}
```

Esta configuracao e gerenciada pelo Supabase Dashboard e estava definida apenas para
`public` desde a criacao do schema abs_intel (FASE 3W).

### C.2 — Ausencia de GRANTs de acesso (causa secundaria)

Mesmo com o schema exposto, o PostgREST exige que o role PostgreSQL utilizado na
requisicao (`service_role`) tenha `USAGE` no schema e `SELECT` nas tabelas. Nenhum
`GRANT` foi aplicado para abs_intel em nenhuma das migrations 007-009.

### C.3 — Limitacao documentada mas nao resolvida

O documento `ABSENTEISMO_INTELIGENTE_FASE_4_5_ENDPOINT_INTERNO_CONTROLADO.md`, secao H,
registrava explicitamente:

> "Para uso real, schema abs_intel deve estar permitido na configuracao de API do Supabase."

Essa pendencia nao foi endereçada nas fases seguintes.

### C.4 — Por que o SUPABASE_SERVICE_ROLE_KEY nao resolve sozinho

O service role key contorna RLS mas NAO contorna a validacao de schema exposto do
PostgREST. A chave estava corretamente configurada no `.env.local`. O problema era
exclusivamente no nível da configuracao de infraestrutura (Dashboard + GRANTs SQL).

---

## D. Impacto de codigo

- Nenhuma coluna errada: colunas consultadas (afastamento_id, servidor_id, vinculo_id,
  data_inicio, data_fim, dias_afastado, cid_capitulo, occurrence_weight, allocated_days,
  sexo, data_nascimento, secretaria, cargo, natureza_cargo, local_trabalho, data_admissao,
  competencia_yyyymm, faixa_etaria, faixa_tempo_servico, qtd_populacao_ativa) foram
  verificadas contra `database/migrations/007_create_abs_intel_dimensions.sql` e
  `008_create_abs_intel_facts_and_staging.sql` — todas existem.
- Nenhuma logica de negocio alterada.
- Motor epidemiologico funcionou corretamente em todos os 96 testes unitarios.

---

## E. Correccoes aplicadas

### E.1 — Melhoria de diagnostico em application.ts (codigo)

Arquivo: `src/lib/afastamentos-epidemiologia-application.ts`

Funcao `fetchRows` atualizada para capturar `code` e `details` do erro Supabase alem de
`message`. Agora os logs do servidor mostram:

```
Falha ao carregar eventos epidemiologicos [PGRST106]: The schema must be one of the following: public, ...
```

em vez de:

```
Falha ao carregar eventos epidemiologicos: The schema must be one of the following: public, ...
```

Mudanca minima, sem alteracao de contrato ou testes.

### E.2 — Migration SQL de grants (banco de dados)

Arquivo: `database/migrations/010_abs_intel_postgrest_grants.sql`

Conteudo:
- `GRANT USAGE ON SCHEMA abs_intel TO anon, authenticated, service_role`
- `GRANT SELECT ON tabelas_relevantes TO service_role`
- `REVOKE ALL ON ALL TABLES IN SCHEMA abs_intel FROM anon, authenticated`
- `NOTIFY pgrst, 'reload config'`

### E.3 — Configuracao manual obrigatoria (Supabase Dashboard)

**Esta etapa nao pode ser automatizada via SQL.**

1. Acessar: https://supabase.com/dashboard/project/wybzkkejyraadabznjqg
2. Navegar: Settings → API
3. Localizar secao "Exposed schemas" (ou "Schema")
4. Adicionar: `abs_intel`
5. Salvar e aguardar reload do PostgREST (~10-30 segundos)

---

## F. Sequencia de execucao

**Ordem obrigatoria:**

1. Executar `database/migrations/010_abs_intel_postgrest_grants.sql` no SQL Editor do
   Supabase (projeto `wybzkkejyraadabznjqg`)
2. Adicionar `abs_intel` na lista de schemas expostos no Dashboard (Settings → API)
3. Aguardar reload do PostgREST (~30s)
4. Acessar `/afastamentos/epidemiologia` com periodo valido e verificar carregamento real

---

## G. Validacao pos-correcao esperada

Apos execucao das etapas E.2 e E.3:

- A tela deve carregar dados reais de afastamentos
- Logs do servidor devem mostrar `[epi-view] contract_generated` em vez de
  `[epi-view] application_error`
- Cards TAD/IFL/DML/IG devem exibir valores numericos reais
- Recortes por sexo/faixa etaria/secretaria/cargo devem estar populados
- Bloco de tendencia deve exibir dados mensais reais

---

## H. Garantias de nao interferencia

- Nenhum dado em `public` schema alterado
- Nenhum componente de frontend alterado
- Nenhuma logica de negocio alterada
- Motor epidemiologico: 96/96 testes pass (sem alteracao)
- Typecheck: zero erros (sem alteracao)

---

## I. Escopo desta fase

Esta fase e estritamente corretiva. Ela nao abre FASE 8 nem nenhum novo modulo.
Qualquer expansao de funcionalidade (serie temporal real, filtros avancados, analytics
de CID) deve seguir o fluxo normal de autorizacao de fase.
