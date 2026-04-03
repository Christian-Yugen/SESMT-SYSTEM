# ABSENTEISMO INTELIGENTE - FASE 1

## AUDITORIA DA BASE CADASTRAL E DO SCHEMA ATUAL

Status: Concluida (diagnostico tecnico)
Data: 2026-03-31
Escopo: Auditoria e diagnostico. Sem migrations, sem ETL definitivo, sem telas novas.

## A) Escopo auditado

### Fontes inspecionadas
- Planilha cadastral: `dados/AtualizacaoBancoDados.xlsx` (aba `dt21032026`).
- Planilha de eventos: `dados/Afastamentos.xlsx` (aba `Afastamentos 2026`).
- Estruturas de banco e evolucao no repositorio:
  - `web-platform/create_afastamentos_table.sql`
  - `web-platform/update_servidores_schema.sql`
  - `web-platform/fix_legacy_constraint.sql`
  - `web-platform/add_acidente_trabalho_column.sql`
  - `web-platform/fix_afastamentos_audit.sql`
  - `web-platform/fix_afastamentos_logs_final.sql`
  - `web-platform/fix_database_audit.sql`
  - `web-platform/update_natureza_cargo.sql`
- Estruturas consumidas em codigo:
  - `web-platform/src/types/index.ts`
  - `web-platform/src/app/afastamentos/new/page.tsx`
  - `web-platform/src/app/afastamentos/page.tsx`
  - `web-platform/import_afastamentos.mjs`

### Validacoes read-only no Supabase
- Existencia operacional de tabelas: `servidores`, `profiles`, `aso_history` (OK).
- Validacao de colunas por selecao direta (OK para colunas auditadas):
  - `servidores`, `afastamentos`, `afastamento_cids`, `portarias_afastamento`, `afastamentos_logs`.

### Limitacoes encontradas
- Sem acesso a `information_schema`/`pg_catalog` via API REST (erro: `Invalid schema`), portanto constraints e indices do banco ativo foram inferidos por scripts versionados + validacao de colunas reais.
- Scripts de inspecao retornaram `NO DATA` para tabelas de dominio com credencial de leitura, impedindo auditoria por amostra de linhas no banco online.

## B) Inventario da planilha AtualizacaoBancoDados.xlsx

### Estrutura geral
- Aba: `dt21032026`
- Registros: 5443
- Colunas: 36

### Colunas encontradas (com tipagem observada)
1. `CPF.` (int64)
2. `CPF com mascara` (string)
3. `Nome` (string)
4. `Cargo` (string)
5. `Matrícula` (int64)
6. `Dt.Nascimento` (object/date-like)
7. `Secretaria` (string)
8. `Contrato` (int64)
9. `Dt.Admissão` (datetime)
10. `Nome Unidade Orçamentária` (string)
11. `RG.` (string)
12. `Nome Local Trabalho` (string)
13. `Sexo` (string)
14. `Deficiência RAIS` (int64)
15. `Nome Vinculo` (string)
16. `Telefone` (string)
17. `Celular` (string)
18. `Endereço` (string)
19. `email` (string)
20. `CEP.` (int64)
21. `PIS/PASEP/NIT` (int64)
22. `Cidade` (string)
23. `UF.` (string)
24. `Nome Estado Civil` (string)
25. `Nome Nacionalidade` (string)
26. `Nome Categoria Funcional` (string)
27. `Instrução` (int64)
28. `Tipo Cargo Atual` (int64)
29. `Horas/Mes` (int64)
30. `Dias/Semana` (int64)
31. `Horas/Semana` (int64)
32. `Jornada` (float64)
33. `Nome Raça Cor` (string)
34. `Nome Subdivisão` (string)
35. `Nome Situação Funcional` (string)
36. `Nome Natureza Cargo` (string)

### Qualidade de dados (principais achados)
- Campos chave sem nulos: `CPF.`, `Matrícula`, `Contrato`, `Nome`, `Secretaria`, `Cargo`.
- Nulos relevantes:
  - `Nome Categoria Funcional`: 3608 nulos
  - `Jornada`: 1384 nulos
  - `Telefone`: 2887 nulos
  - `Celular`: 2243 nulos
  - `email`: 1166 nulos
- Datas:
  - `Dt.Admissão` com tipo datetime consistente.
  - `Dt.Nascimento` veio como object (padronizar em ETL).

### Campos-chave e derivados relevantes
- Chave operacional candidata: `CPF + Matrícula + Contrato`.
- Campos para dimensao de servidor/vinculo:
  - `cpf`, `nome`, `sexo`, `data_nascimento`, `data_admissao`, `matricula`, `contrato`, `secretaria`, `cargo`, `natureza_cargo`, `nome_vinculo`, `categoria_funcional`, `situacao_funcional`, `unidade_orcamentaria`, `local_trabalho`, `subdivisao`, `horas_mes`, `dias_semana`, `horas_semana`, `jornada`, `raca_cor`, `instrucao`.

## C) Inventario da planilha Afastamentos.xlsx

### Estrutura geral
- Aba: `Afastamentos 2026`
- Registros: 197
- Colunas: 14

### Colunas encontradas (com tipagem observada)
1. `CPF` (int64)
2. `MATRICULA` (int64)
3. `CONTRATO` (float64; majoritariamente nulo)
4. `NOME` (string)
5. `NATUREZA CARGO` (string)
6. `TIPO DE LICENÇA` (string)
7. `SECRETARIA` (string)
8. `DIAS DE AFAST` (int64)
9. `CID` (string)
10. `INICIO AFAST` (datetime)
11. `FIM AFAST` (datetime)
12. `SITUAÇÃO` (string)
13. `STATUS` (string)
14. `CONDIÇÃO` (float64; 100% nulo)

### Qualidade e granularidade
- Granularidade: registro de evento de afastamento por servidor/vinculo/periodo.
- `CONTRATO`: 193 nulos de 197 (lacuna critica para vinculo).
- `CID`: 1 nulo; 58 linhas com CID multiplo; maximo de 8 CIDs na mesma linha.
- Datas `INICIO AFAST` e `FIM AFAST`: sem duracao negativa e sem duracao zero.
- `STATUS`: valores observados `ATIVO`, `VENCIDO`.
- `SITUAÇÃO`: valores operacionais mistos (`VALIDO`, `VENCIDO - RESOLVER URGENTE`, `X Dias para vencer`).

### Presenca dos campos criticos solicitados
- Presentes: cpf, nome, matricula, contrato (parcial), secretaria, natureza/cargo, tipo_licenca, cid, data_inicio, data_fim, dias_afastado, situacao, status.

## D) Inventario do schema real atual do Supabase (dominio)

### Tabelas relacionadas ao dominio (confirmadas)
- `public.servidores`
- `public.afastamentos`
- `public.afastamento_cids`
- `public.portarias_afastamento`
- `public.afastamentos_logs`
- Apoio de dominio: `public.aso_history`, `public.profiles`

### Colunas confirmadas por consulta read-only

#### `servidores`
`id`, `cpf`, `nome`, `cargo`, `matricula`, `nascimento`, `secretaria`, `contrato`, `sexo`, `local_trabalho`, `vinculo`, `natureza_cargo`, `admissao`, `deficiencia_rais`, `pis_pasep`.

#### `afastamentos`
`id`, `servidor_cpf`, `servidor_nome`, `servidor_matricula`, `servidor_contrato`, `servidor_secretaria`, `natureza_cargo`, `tipo_afastamento`, `dias_afastado`, `cid`, `data_inicio`, `data_fim`, `data_pericia`, `perito_nome`, `perito_crm`, `situacao`, `status`, `observacoes`, `renovado_por_id`, `criado_em`, `atualizado_em`, `criado_por`, `anexo_url`, `hash_auditoria`, `is_acidente_trabalho`.

#### `afastamento_cids`
`id`, `afastamento_id`, `cid_codigo`, `cid_descricao`, `cid_capitulo`, `criado_em`.

#### `portarias_afastamento`
`id`, `afastamento_id`, `numero`, `ano`, `link_documento`, `data_emissao`, `criado_por`, `created_at`.

#### `afastamentos_logs`
`id`, `afastamento_id`, `usuario_id`, `usuario_email`, `data_alteracao`, `motivo`, `dados_anteriores`, `dados_novos`, `hash_auditoria`, `motivo_alteracao`, `alterado_por`.

### Constraints/chaves/indices (evidencia por scripts versionados)
- PKs por `id` (BIGSERIAL) nas tabelas de afastamento.
- FKs:
  - `afastamentos.renovado_por_id -> afastamentos.id`
  - `afastamentos.criado_por -> auth.users.id`
  - `afastamento_cids.afastamento_id -> afastamentos.id`
  - `portarias_afastamento.afastamento_id -> afastamentos.id`
  - `portarias_afastamento.criado_por -> auth.users.id`
  - `afastamentos_logs.afastamento_id -> afastamentos.id`
  - `afastamentos_logs.usuario_id -> auth.users.id`
- `servidores`: constraint de unicidade `unique_servidor_vinculo (cpf, matricula, contrato)` e indice `idx_servidores_composite_key`.
- `servidores`: indice `idx_servidores_natureza`.
- RLS habilitado para tabelas de afastamentos.

### Diferencas para arquitetura-alvo (FASE 0)
Arquitetura-alvo: `dim_servidor`, `dim_vinculo_servidor`, `fact_afastamento_evento`, `fact_afastamento_cid`, `fact_population_snapshot`.

Estado atual:
- Existe modelo operacional denormalizado (`servidor_*` dentro de `afastamentos`).
- Ainda nao existem fatos/dimensoes canonicos da trilha alvo.
- Nao existe estrutura formal de snapshot populacional para denominadores.

## E) Matriz de mapeamento obrigatoria

Matriz completa no documento auxiliar:
- `docs/ABSENTEISMO_INTELIGENTE_FASE_1_MATRIZ_DE_CAMPOS.md`

Resumo objetivo:
- Campos cadastrais mapeiam majoritariamente para `servidores` (atual) e destino final em `dim_servidor`/`dim_vinculo_servidor`.
- Campos de afastamento mapeiam para `afastamentos`/`afastamento_cids` (atual) e destino final em `fact_afastamento_evento`/`fact_afastamento_cid`.
- `CONTRATO` na planilha de afastamentos exige preenchimento por lookup cadastral para evitar colapso de vinculos.

## F) Diagnostico de chaves e deduplicacao

### Testes de chave nas planilhas
Base cadastral (5443 linhas):
- CPF sozinho: 404 grupos duplicados.
- CPF + matricula: 23 grupos duplicados.
- CPF + matricula + contrato: 0 duplicados (chave unica).

Base afastamentos (197 linhas):
- CPF sozinho: 12 grupos duplicados.
- CPF + matricula: 6 grupos duplicados.
- CPF + matricula + contrato: 4 grupos duplicados (contrato frequentemente ausente).

### Conclusao de chave operacional
- CPF sozinho: insuficiente.
- CPF + matricula: insuficiente para multiplo vinculo.
- CPF + matricula + contrato: melhor chave operacional para dominio, mas depende de contrato completo no evento.

### Achados de conflito
- 23 combinacoes `CPF+matricula` com multiplos contratos na base cadastral.
- 2 CPFs com mais de um nome na base cadastral (possivel variacao nominal/atualizacao cadastral).
- 3 grupos de possivel evento duplicado em afastamentos (mesmo CPF+matricula+periodo+tipo).

## G) Diagnostico de vinculacao servidor x vinculo x evento

Nivel correto de modelagem:
- Nivel servidor: identidade estavel da pessoa (`dim_servidor`).
- Nivel vinculo: contexto funcional/contratual (`dim_vinculo_servidor`).
- Nivel evento de afastamento: episodio temporal (`fact_afastamento_evento`).
- Nivel ocorrencia CID: granularidade diagnostica por evento (`fact_afastamento_cid`).

Risco de colar campos no evento (sem normalizacao):
- Drift historico de secretaria/cargo/local.
- Perda de rastreabilidade de mudanca de vinculo.
- Dificuldade de deduplicacao e reconstrucao de historico.

Evidencia de viabilidade:
- 191/191 chaves `CPF+matricula` de afastamentos encontradas na base cadastral.
- Divergencia Secretaria/Natureza entre as duas planilhas: 0 no recorte auditado.

## H) Diagnostico de campos derivados obrigatorios

Derivacoes recomendadas para fases futuras:
- `idade_atual`: diferenca entre data de referencia e `data_nascimento`.
- `faixa_etaria`: bucket parametrizado por idade.
- `tempo_servico_dias`: diferenca entre data de referencia e `data_admissao`.
- `faixa_tempo_servico`: bucket parametrizado de tempo de servico.
- `competencia`: chave temporal mensal (YYYY-MM) via `data_inicio` e/ou snapshot.
- Denominadores por populacao ativa: exigir `fact_population_snapshot` por competencia, secretaria, vinculo e categoria funcional.

## I) Diagnostico das lacunas para FASE 2

### Para `dim_servidor`
- Definir padrao de tipo e normalizacao para documentos e datas (`cpf`, `nascimento`, `admissao`).
- Decidir politica de variacao nominal para CPFs com nomes divergentes.

### Para `dim_vinculo_servidor`
- Congelar chave surrogate de vinculo e regra de historizacao.
- Tornar `contrato` obrigatorio nas entradas de evento (ou regra de inferencia controlada).

### Para `fact_afastamento_evento`
- Definir chave natural de evento e estrategia anti-duplicidade.
- Padronizar status/situacao operacionais em dominio controlado.

### Para `fact_afastamento_cid`
- Normalizar parse de CID multiplo e padrao de codigo CID-10.
- Definir regra para CID ausente e auditoria de qualidade.

### Para `fact_population_snapshot`
- Definir fonte, periodicidade e criterios de populacao ativa.
- Definir cortes obrigatorios para denominadores (sexo, tempo, categoria, secretaria, unidade, local).

## J) Riscos tecnicos obrigatorios

- CPF nulo/inconsistente: baixo na amostra (nao observado nulo), mas requer validacao de formato em ETL.
- Matricula duplicada entre contratos: risco real (23 casos em base cadastral por CPF+matricula com contrato multiplo).
- Contrato ausente em afastamentos: risco alto (193/197 nulos no arquivo de eventos).
- Divergencia secretaria/cargo/local: nao detectada no recorte comparado, mas risco estrutural se evento continuar denormalizado.
- Datas invalidas: nao detectadas neste recorte (sem duracoes negativas/zero).
- CIDs multiplos: risco alto para modelagem se ficar em campo texto unico.
- Ausencia de denominadores prontos: risco critico para fases 5-6 (TAD/IFL/DML/IG).
- Divergencia de nomenclatura documental canonica na branch: ver secao especifica abaixo.

## Divergencias de rastreabilidade documental

Documentos solicitados no briefing e nao localizados com o nome exato nesta branch:
- `CID_ANALYTICS_MODULO_GOVERNANCA_E_ARQUITETURA.md`
- `RELATORIO_TECNICO_CID_ANALYTICS.md`
- `HANDOFF_PLANO_UNIFICADO_ABSENTEISMO_INTELIGENTE_SESMT.md`

Normalizacao proposta (sem alterar escopo da FASE 1):
1. Congelar um indice de rastreabilidade em `docs` com alias canonico -> arquivo real.
2. Padronizar nomes finais dos documentos de governanca para evitar handoffs com caminhos divergentes.
3. Exigir referencia cruzada obrigatoria no inicio de cada fase.

## K) Conclusao operacional

Readiness para FASE 2: **APTA COM PRE-CONDICOES**.

A base permite avancar para modelagem de schema (FASE 2), desde que as seguintes decisoes sejam congeladas antes de migrations:
1. Chave operacional oficial de vinculo: `CPF + matricula + contrato`.
2. Regra de preenchimento de `contrato` em eventos de afastamento (obrigatorio por lookup cadastral quando ausente na origem).
3. Separacao canonica de niveis: servidor, vinculo, evento, ocorrencia CID.
4. Regra anti-duplicidade para evento (natural key + hash de auditoria).
5. Dominio controlado para `situacao`/`status` e parse de CID multiplo.
6. Contrato de derivacao de denominadores (`fact_population_snapshot`) antes de motor epidemiologico.

Recomendacoes objetivas para FASE 2:
- Entregar contrato de schema com DDL proposta (sem executar ainda).
- Incluir matriz de transformacao obrigatoria no pacote de FASE 2.
- Definir politica de qualidade para contrato/cpf/cid e status.
- Preservar integralmente `/afastamentos/cid-analytics` como nucleo clinico-ocupacional.

## Confirmacao de escopo da FASE 1

- Nenhuma migration criada nesta fase.
- Nenhuma tabela alterada nesta fase.
- Nenhuma tela alterada nesta fase.
- Nenhuma logica de `/afastamentos/cid-analytics` alterada.
- Fase executada exclusivamente como auditoria e diagnostico tecnico.
