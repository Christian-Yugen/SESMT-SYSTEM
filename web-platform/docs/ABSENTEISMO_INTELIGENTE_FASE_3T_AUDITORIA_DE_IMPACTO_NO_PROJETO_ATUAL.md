# ABSENTEISMO INTELIGENTE - FASE 3T

## AUDITORIA DE IMPACTO NO PROJETO ATUAL

Status: CONCLUIDA (auditoria documental e tecnica de impacto)
Data: 2026-04-02
Natureza: auditoria de risco e dependencias, sem execucao tecnica nesta microfase.

---

## A) Objetivo da microfase

Executar auditoria documental e tecnica de impacto no projeto atual `SESMT-System` para identificar o que pode ser afetado por futuras migrations additive-only e garantir nao interferencia no legado operacional.

---

## B) Escopo auditado

- Projeto atual `SESMT-System`.
- Estruturas de banco referenciadas pelo frontend atual e SQL versionado no repositorio.
- Camadas sensiveis: autenticacao, cliente Supabase, rotas operacionais e modulos analiticos ja em uso.
- Contratos atuais que devem permanecer intactos: consultas, filtros e fluxos de escrita/leitura do sistema em producao.

---

## C) Inventario dos pontos criticos do legado

### Tabelas legadas usadas pela plataforma atual
- `profiles`
- `servidores`
- `funcoes`
- `exames_config`
- `aso_history`
- `abono_salarial`
- `abono_salarial_logs`
- `portarias_abono`
- `portarias_abono_logs`
- `afastamentos`
- `afastamento_cids`
- `afastamentos_logs`
- `portarias_afastamento`
- `medical_folders`
- `medical_folder_logs`
- `deletion_requests`
- `system_greetings`
- `cid10`

### Views existentes relevantes
- Nao foram encontrados `CREATE VIEW` nos SQLs versionados auditados.
- Regra de seguranca: qualquer view nova do dominio deve ser criada no isolamento e sem colidir com nomes legados.

### Funcoes/RPCs relevantes
- Nao foram encontrados `CREATE FUNCTION` nos SQLs versionados auditados.
- Nao foram encontrados usos de `.rpc(...)` no frontend atual auditado.

### Triggers relevantes
- Triggers de atualizacao historicamente sensiveis no legado e no escopo de dados ocupacionais, incluindo:
  - `trigger_medical_folders_updated_at`
  - `trg_dim_servidor_updated_at`
  - `trg_dim_vinculo_servidor_updated_at`
  - `trg_dim_tempo_updated_at`
  - `trg_fact_afastamento_evento_updated_at`
  - `trg_fact_afastamento_cid_updated_at`
  - `trg_fact_population_snapshot_updated_at`
  - `trg_dim_psychosocial_factor_updated_at`
  - `trg_fact_psychosocial_assessment_updated_at`
  - `trg_fact_psychosocial_signal_updated_at`
  - `trg_dim_ergonomic_factor_updated_at`
  - `trg_fact_ergonomic_assessment_updated_at`
  - `trg_fact_ergonomic_exposure_updated_at`
  - `trg_fact_ergonomic_action_plan_updated_at`

### Policies relevantes (RLS)
- Policies em `profiles` (governanca de usuarios/admin).
- Policies em `abono_salarial` e `abono_salarial_logs`.
- Policies em `portarias_abono` e `portarias_abono_logs`.
- Policies em `afastamentos`, `afastamento_cids`, `portarias_afastamento` e `afastamentos_logs`.
- Policies em `medical_folders` e `medical_folder_logs`.
- Policies em `deletion_requests`.

### Integracoes frontend com dados atuais
- Home, historico e referrals dependem de `servidores`, `funcoes`, `exames_config` e `aso_history`.
- Modulos de abono dependem de `abono_salarial`, `abono_salarial_logs`, `portarias_abono`, `portarias_abono_logs`.
- Modulos de afastamentos dependem de `afastamentos`, `afastamento_cids`, `afastamentos_logs`, `portarias_afastamento`.
- Gestao de acesso depende de `profiles`.
- Saudacao institucional depende de `system_greetings`.

### Modulos que nao podem sofrer regressao
- fluxo principal de emissao e historico.
- modulo de abono e portarias.
- modulo de afastamentos.
- modulo de analytics existente.
- modulo `/afastamentos/cid-analytics` como nucleo preservado.

---

## D) Areas de risco de interferencia

- Schema atual: risco de colisao de nomes e permissao.
- Tabelas atuais: risco de impacto por alteracoes acidentais em contratos de leitura/escrita.
- Auth/shared: risco de regressao ampla se houver alteracao de comportamento para suportar nova trilha.
- Frontend atual: risco de quebra por mudanca em contratos de consulta esperados pelas telas.
- Rotas existentes: risco operacional em fluxos ja produtivos.
- Analytics em producao: risco de inconsistencia se objetos compartilhados forem alterados.
- Infraestrutura compartilhada: risco em configuracoes globais ou clientes comuns.

---

## E) Itens explicitamente proibidos de tocar

- qualquer tabela legada ja consumida pela plataforma atual.
- contratos atuais de leitura/escrita de `profiles`, `aso_history`, `servidores`, `funcoes`, `exames_config`.
- contratos atuais de `abono_salarial`, `abono_salarial_logs`, `portarias_abono`, `portarias_abono_logs`.
- contratos atuais de `afastamentos`, `afastamento_cids`, `afastamentos_logs`, `portarias_afastamento`.
- rotas e telas existentes.
- camada de autenticacao e bibliotecas compartilhadas.
- modulo `/afastamentos/cid-analytics`.
- qualquer objeto legado usado por triggers/policies atuais.

---

## F) Dependencias cruzadas

- O frontend atual le diretamente tabelas legadas por chamadas Supabase em multiplas rotas de negocio.
- Modulos de historico/referrals cruzam `aso_history` com `servidores` e perfis.
- Modulos de afastamentos cruzam `afastamentos` com `afastamento_cids`, `afastamentos_logs` e `portarias_afastamento`.
- Modulos de abono cruzam registros principais com logs e portarias.
- Configuracoes compartilhadas de cliente/autenticacao sustentam varios modulos; alteracao de contrato pode propagar regressao.
- Colisao de naming de objetos pode causar ambiguidade operacional e erro de consulta em etapas futuras.

---

## G) Riscos de naming/collision

- Tabelas: colisao com nomes ja existentes no schema `public`.
- Schema: risco ao criar schema com nome ambiguo ou similar a objeto legado.
- Views: risco de sobrescrever convencoes de leitura se nao houver prefixo dedicado.
- Funcoes: risco de assinatura/nome colidir com funcao futura ou legado nao versionado.
- Staging: risco de reaproveitar tabelas antigas e gerar mistura de dominio.

Diretriz obrigatoria para 3U:
- usar naming dedicado do dominio de absenteismo e prefixos aprovados na 3S, sem reutilizacao de nomes legados.

---

## H) Checklist de nao interferencia para a 3U

- nenhum `ALTER` destrutivo em objeto legado.
- nenhum `DROP` em objeto legado.
- nenhum rename de objeto legado.
- nenhuma alteracao em policies legadas existentes.
- nenhuma alteracao em triggers legadas existentes.
- nenhuma alteracao em contratos de leitura das rotas atuais.
- nenhuma alteracao em auth/shared libs.
- nenhuma alteracao no modulo `/afastamentos/cid-analytics`.
- naming novo validado contra inventario do legado.
- rollback documental por etapa definido antes de gerar SQL.

---

## I) Recomendacao operacional para 3U

- produzir pacote de migrations estritamente additive-only.
- criar apenas objetos novos do dominio isolado (schema/tabelas/indices/constraints/views/funcoes auxiliares novas, quando necessarias).
- proibir qualquer comando que modifique sem isolamento objetos do legado.
- validar colisao de naming antes da consolidacao do pacote.
- manter rastreabilidade de cada migration com gate de aprovacao.

---

## J) Criterios de bloqueio

A 3U permanece proibida se houver:
- qualquer duvida sobre fronteira legado x novo dominio.
- risco de colidir naming com objetos existentes.
- necessidade de alterar contratos atuais da plataforma.
- necessidade de alterar auth/shared libs.
- ausencia de rollback por etapa.
- qualquer possibilidade de impacto no `/afastamentos/cid-analytics`.

---

## K) Proximo passo seguro

Proxima microfase:
- 3U - package de migrations additive-only para isolamento interno.

Observacao obrigatoria:
- nenhuma migration e criada ou aplicada nesta 3T.
