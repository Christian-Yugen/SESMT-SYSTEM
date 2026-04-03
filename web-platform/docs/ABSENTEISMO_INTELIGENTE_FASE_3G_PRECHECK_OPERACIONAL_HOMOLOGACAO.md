# ABSENTEISMO INTELIGENTE - FASE 3G

## PRE-CHECK OPERACIONAL DO AMBIENTE ISOLADO DE HOMOLOGACAO

Status: CONCLUIDA (pre-check documental e operacional preparatorio)
Data: 2026-04-01
Natureza: validacao de prontidao para criacao futura do ambiente isolado, sem execucao tecnica nesta microfase.

---

## A) Objetivo da microfase

Executar exclusivamente o pre-check operacional preparatorio para futura criacao do ambiente isolado de homologacao da FASE 3, sem criar projeto, sem usar banco, sem apply, sem migrations e sem impacto na plataforma atual.

---

## B) Estado atual da trilha

- FASE 3E concluida com plano de ingestao controlada.
- FASE 3F concluida com preparacao documental do ambiente isolado.
- Ingestao real da FASE 3 permanece bloqueada.
- FASE 4 permanece nao autorizada.

---

## C) Confirmacao do ambiente-alvo

Ambiente-alvo confirmado para a futura criacao:
- projeto Supabase separado para homologacao.

Premissa obrigatoria:
- nenhum uso do projeto Supabase atual da plataforma nesta trilha.

---

## D) Inventario operacional para futura criacao do ambiente

### Nome sugerido do projeto de homologacao
- Nome logico sugerido: `sesmt-absenteismo-hml`.

### Naming convention
- Projeto: `sesmt-absenteismo-hml`.
- Identificadores de ambiente: sufixo `-hml`.
- Objetos de trilha: prefixo `abs_` para diferenciar artefatos do programa.
- Registros operacionais: padrao `fase3g_<etapa>_<yyyyMMdd_HHmm>`.

### Owner/responsavel tecnico
- Owner tecnico da trilha: papel formal de Engenharia de Dados SESMT.
- Backup de ownership: papel formal de Governanca Tecnica SESMT.

### Responsaveis por credenciais
- Geracao/gestao de segredos: papel formal de Seguranca/DevOps.
- Aprovacao de uso operacional: papel formal de Governanca do Programa.
- Custodia de acesso administrativo: papel formal de owner tecnico designado.

### Variaveis de ambiente necessarias
- `SUPABASE_HML_URL`
- `SUPABASE_HML_ANON_KEY`
- `SUPABASE_HML_SERVICE_ROLE_KEY` (uso apenas em etapa autorizada de carga controlada)
- `SUPABASE_HML_DB_URL` (se aplicavel ao fluxo de migracao controlada)
- `ABS_ETL_ENV=homologacao`
- `ABS_TRACE_RUN_ID` (identificador de rastreabilidade por execucao futura)

### Segredos necessarios
- Chave anonima de homologacao.
- Service role de homologacao.
- Credenciais de conexao de banco de homologacao (quando aplicavel).
- Token de automacao CI/CD de homologacao (se houver pipeline dedicada).

### Onde cada credencial devera ser cadastrada
- Cofre de segredos institucional (fonte primaria de verdade).
- Variaveis protegidas do pipeline de homologacao (escopo exclusivo HML).
- Arquivo local `.env` apenas para execucao manual autorizada em homologacao, nunca versionado.

### Distincao entre valores de homologacao e producao
- Credenciais, URLs e tokens de homologacao devem ser diferentes em 100% dos casos.
- Chaves de producao nao podem existir no contexto operacional de homologacao.
- Qualquer sobreposicao de segredo invalida o gate de criacao.

### Politica de armazenamento seguro das credenciais
- Armazenar segredos apenas em cofre institucional e variaveis protegidas.
- Proibir compartilhamento por chat, arquivo versionado ou documento aberto.
- Rotacao obrigatoria apos incidente ou troca de ownership.

---

## E) Pre-check de integridade da trilha antes da criacao

Checklist documental de integridade (estado esperado: conforme):
- baseline offline validada e consolidada.
- migrations da FASE 2 prontas e versionadas.
- script experimental offline preservado em quarentena.
- bloqueio da ingestao real mantido.
- ausencia de dependencia da plataforma atual para a trilha preparatoria.
- ausencia de alteracao no /afastamentos/cid-analytics nesta trilha.

---

## F) Gate de criacao do ambiente

Checklist explicito de aprovacao antes da futura criacao do projeto de homologacao:
- responsaveis definidos e formalmente aceitos;
- naming aprovado;
- variaveis de ambiente listadas e revisadas;
- segredos listados e mapeados para armazenamento seguro;
- rollback de criacao definido e documentado;
- confirmacao explicita de que o projeto atual da plataforma nao sera tocado.

Regra do gate:
- sem 100% dos itens aprovados, a criacao continua proibida.

---

## G) Riscos operacionais da criacao

- criacao no workspace/projeto errado;
- mistura de chaves de homologacao com producao;
- apontamento acidental do frontend atual para homologacao;
- confusao entre migrations do programa e artefatos externos;
- perda de rastreabilidade de aprovadores da criacao.

---

## H) Criterios de bloqueio

A criacao do ambiente deve permanecer proibida se houver qualquer item:
- ownership indefinido ou conflito de responsabilidade;
- naming nao aprovado ou ambiguo;
- variaveis/segredos incompletos ou sem segregacao HML x producao;
- ausencia de plano de rollback de criacao;
- risco de tocar o projeto atual da plataforma;
- rastreabilidade de aprovacao incompleta.

---

## I) Criterios de aprovacao da proxima microfase

A proxima microfase (criacao formal do ambiente isolado) so pode ser aberta quando:
- inventario operacional estiver completo e revisado;
- gate de criacao estiver 100% aprovado;
- papeis de ownership e aprovacao estiverem formalizados;
- armazenamento seguro de segredos estiver confirmado;
- bloqueio de nao interferencia na plataforma atual estiver explicitamente validado.

---

## J) Proximo passo seguro

Proxima microfase prevista:
- criacao controlada do projeto Supabase de homologacao.

Observacao obrigatoria:
- a criacao do projeto NAO acontece nesta FASE 3G.
