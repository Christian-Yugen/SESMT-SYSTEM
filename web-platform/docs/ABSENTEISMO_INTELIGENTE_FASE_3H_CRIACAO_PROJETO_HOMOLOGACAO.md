# ABSENTEISMO INTELIGENTE - FASE 3H

## CRIACAO CONTROLADA DO PROJETO SUPABASE DE HOMOLOGACAO

Status: BLOQUEADA (pre-requisito de credencial ausente)
Data: 2026-04-01
Natureza: tentativa controlada de criacao de projeto, interrompida por bloqueio de autenticacao.

---

## A) Objetivo da microfase

Executar a criacao controlada do projeto Supabase separado de homologacao, com rastreabilidade e isolamento total em relacao a plataforma atual, sem aplicar migrations, sem ETL e sem tocar frontend.

---

## B) Identificacao do projeto criado

Resultado desta execucao:
- projeto de homologacao: NAO CRIADO.
- motivo: ausencia de token de acesso Supabase para operacoes de management API.
- owner/responsavel tecnico previsto: Engenharia de Dados SESMT (conforme FASE 3G).
- data de tentativa: 2026-04-01.

Nome alvo planejado (ainda nao provisionado):
- `sesmt-absenteismo-hml`.

---

## C) Evidencia de isolamento

- Confirmado que nao houve uso do projeto atual da plataforma.
- Confirmado que nenhuma tela atual foi religada.
- Confirmado que /afastamentos/cid-analytics permaneceu intocado.
- Confirmado que nao houve criacao parcial de ambiente por falta de autenticacao.

---

## D) Variaveis e credenciais (registro sem exposicao)

Credenciais previstas para existir apos criacao (nao geradas nesta etapa):
- URL do projeto HML.
- anon key HML.
- service role key HML.
- string de conexao DB HML (quando aplicavel).

Armazenamento previsto:
- cofre institucional de segredos (fonte primaria).
- variaveis protegidas de pipeline HML.
- `.env` local apenas para uso manual autorizado e nunca versionado.

Responsaveis previstos:
- Seguranca/DevOps para geracao e custodia.
- Governanca do Programa para aprovacao de uso.

Variaveis de homologacao previstas:
- `SUPABASE_HML_URL`
- `SUPABASE_HML_ANON_KEY`
- `SUPABASE_HML_SERVICE_ROLE_KEY`
- `SUPABASE_HML_DB_URL`
- `ABS_ETL_ENV=homologacao`
- `ABS_TRACE_RUN_ID`

---

## E) Checklist de criacao concluido

Itens concluidos:
- naming aprovado.
- owner definido.
- segregacao HML x producao definida.
- projeto atual nao tocado.
- rastreabilidade da tentativa registrada.

Item NAO concluido:
- credenciais geradas do novo projeto (dependente da criacao efetiva, bloqueada por autenticacao).

---

## F) Criterios de bloqueio ainda mantidos

Mesmo apos esta microfase bloqueada, permanece explicito:
- migrations ainda NAO foram aplicadas.
- ETL ainda NAO foi executado.
- ingestao ainda continua bloqueada.
- FASE 4 continua bloqueada.

---

## G) Proximo passo seguro

Proxima microfase permitida, apos saneamento do pre-requisito de acesso:
- aplicacao controlada das migrations da FASE 2 no ambiente isolado.

Observacao obrigatoria:
- essa aplicacao NAO acontece nesta 3H.

---

## Evidencia tecnica do bloqueio

- CLI Supabase disponivel via npx.
- tentativa de listar projetos retornou erro de autenticacao:
  - "Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable."
