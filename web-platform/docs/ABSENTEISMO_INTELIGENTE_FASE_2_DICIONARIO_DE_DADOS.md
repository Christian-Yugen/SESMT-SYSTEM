# ABSENTEISMO INTELIGENTE - FASE 2

## DICIONARIO DE DADOS (MODELO RELACIONAL ALVO)

Status: Concluido
Data: 2026-03-31

## 1) public.dim_servidor

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| servidor_id | BIGSERIAL | nao | auto | PK surrogate do servidor | sistema | sem carga na FASE 2 |
| cpf | TEXT | sim | - | CPF unico quando presente e valido | AtualizacaoBancoDados.CPF. | manter 11 digitos |
| cpf_mascarado | TEXT | sim | - | apresentacao legivel | AtualizacaoBancoDados.CPF com mascara | derivado de cpf quando possivel |
| nome | TEXT | nao | - | nome oficial da pessoa | AtualizacaoBancoDados.Nome | padronizacao textual em ETL |
| sexo | TEXT | sim | - | dominio F/M/NAO_INFORMADO | AtualizacaoBancoDados.Sexo | normalizar valores divergentes |
| data_nascimento | DATE | sim | - | base para idade/faixa etaria | AtualizacaoBancoDados.Dt.Nascimento | parse de formato legado |
| raca_cor | TEXT | sim | - | recorte sociodemografico | AtualizacaoBancoDados.Nome Raca Cor | mapear para dominio |
| instrucao | TEXT | sim | - | escolaridade codificada/rotulada | AtualizacaoBancoDados.Instrucao | mapear codigos |
| estado_civil | TEXT | sim | - | recorte sociodemografico | AtualizacaoBancoDados.Nome Estado Civil | normalizar nomenclatura |
| nacionalidade | TEXT | sim | - | recorte sociodemografico | AtualizacaoBancoDados.Nome Nacionalidade | normalizar nomenclatura |
| deficiencia_rais | TEXT | sim | - | atributo funcional de apoio | AtualizacaoBancoDados.Deficiencia RAIS | converter para dominio semantico |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 2) public.dim_vinculo_servidor

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| vinculo_id | BIGSERIAL | nao | auto | PK surrogate do vinculo | sistema | - |
| servidor_id | BIGINT | nao | - | FK para dim_servidor | reconciliacao CPF | obrigatorio apos conciliacao |
| matricula | TEXT | nao | - | parte da chave operacional | AtualizacaoBancoDados.Matricula | manter como texto |
| contrato | TEXT | nao | - | parte da chave operacional | AtualizacaoBancoDados.Contrato | obrigatorio |
| secretaria | TEXT | sim | - | lotacao administrativa | AtualizacaoBancoDados.Secretaria | padronizar taxonomia |
| cargo | TEXT | sim | - | cargo funcional | AtualizacaoBancoDados.Cargo | padronizar grafia |
| natureza_cargo | TEXT | sim | - | natureza do cargo | AtualizacaoBancoDados.Nome Natureza Cargo | dominio controlado |
| nome_vinculo | TEXT | sim | - | tipo de vinculo | AtualizacaoBancoDados.Nome Vinculo | padronizar nomes |
| categoria_funcional | TEXT | sim | - | categoria funcional | AtualizacaoBancoDados.Nome Categoria Funcional | alta nulidade na origem |
| situacao_funcional | TEXT | sim | - | situacao funcional | AtualizacaoBancoDados.Nome Situacao Funcional | padronizacao necessaria |
| data_admissao | DATE | sim | - | base para tempo de servico | AtualizacaoBancoDados.Dt.Admissao | parse e validacao |
| unidade_orcamentaria | TEXT | sim | - | recorte de orcamento | AtualizacaoBancoDados.Nome Unidade Orcamentaria | normalizacao de nomes |
| local_trabalho | TEXT | sim | - | recorte geografico/lotacao | AtualizacaoBancoDados.Nome Local Trabalho | normalizacao de nomes |
| subdivisao | TEXT | sim | - | subunidade administrativa | AtualizacaoBancoDados.Nome Subdivisao | normalizacao de nomes |
| horas_mes | NUMERIC(8,2) | sim | - | carga contratual mensal | AtualizacaoBancoDados.Horas/Mes | converte inteiro para numerico |
| dias_semana | NUMERIC(6,2) | sim | - | jornada semanal em dias | AtualizacaoBancoDados.Dias/Semana | - |
| horas_semana | NUMERIC(8,2) | sim | - | jornada semanal em horas | AtualizacaoBancoDados.Horas/Semana | - |
| jornada | NUMERIC(8,2) | sim | - | fator de jornada | AtualizacaoBancoDados.Jornada | alta nulidade |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 3) public.dim_tempo

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| tempo_id | BIGSERIAL | nao | auto | PK surrogate tempo | sistema | - |
| data_calendario | DATE | nao | - | data base unica | calendario tecnico | unicidade por data |
| ano | INTEGER | nao | - | recorte anual | derivado da data | - |
| semestre | INTEGER | nao | - | recorte semestral | derivado da data | check 1-2 |
| trimestre | INTEGER | nao | - | recorte trimestral | derivado da data | check 1-4 |
| mes | INTEGER | nao | - | recorte mensal | derivado da data | check 1-12 |
| dia | INTEGER | nao | - | recorte diario | derivado da data | check 1-31 |
| competencia_yyyymm | INTEGER | nao | - | competencia oficial | derivado da data | base para snapshots |
| dia_semana | INTEGER | nao | - | 1..7 | derivado da data | - |
| nome_dia_semana | TEXT | nao | - | rotulo dia da semana | derivado da data | - |
| nome_mes | TEXT | nao | - | rotulo de mes | derivado da data | - |
| is_fim_semana | BOOLEAN | nao | false | apoio a dias uteis | derivado da data | - |
| is_dia_util | BOOLEAN | nao | true | apoio a denominadores | calendario institucional | integrar feriados na FASE 3/4 |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 4) public.fact_afastamento_evento

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| afastamento_id | BIGSERIAL | nao | auto | PK do evento | sistema | - |
| servidor_id | BIGINT | sim | - | FK da pessoa | conciliacao com dim_servidor | pode entrar pendente |
| vinculo_id | BIGINT | sim | - | FK do vinculo | conciliacao com dim_vinculo_servidor | pode entrar pendente |
| data_inicio | DATE | nao | - | inicio do evento | Afastamentos.INICIO AFAST | obrigatorio |
| data_fim | DATE | sim | - | fim do evento | Afastamentos.FIM AFAST | validar periodo |
| dias_afastado | INTEGER | sim | - | duracao declarada | Afastamentos.DIAS DE AFAST | validacao com datas |
| tipo_licenca | TEXT | nao | - | tipo da licenca | Afastamentos.TIPO DE LICENCA | dominio controlado |
| situacao | TEXT | sim | - | situacao operacional | Afastamentos.SITUACAO | padronizar |
| status | TEXT | sim | - | status operacional | Afastamentos.STATUS | padronizar |
| condicao | TEXT | sim | - | condicao complementar | Afastamentos.CONDICAO | origem vazia no recorte |
| is_acidente_trabalho | BOOLEAN | nao | false | marcador de acidente | campo operacional atual | manter coerencia com tabela atual |
| source_event_hash | TEXT | nao | - | chave anti-duplicidade | geracao tecnica FASE 3 | unique obrigatoria |
| pendente_resolucao_vinculo | BOOLEAN | nao | false | controla eventos sem vinculo resolvido | processo de ingestao | true exige vinculo_id nulo |
| chave_vinculo_bruta_cpf | TEXT | sim | - | apoio de conciliacao | Afastamentos.CPF | apenas digitos |
| chave_vinculo_bruta_matricula | TEXT | sim | - | apoio de conciliacao | Afastamentos.MATRICULA | texto normalizado |
| chave_vinculo_bruta_contrato | TEXT | sim | - | apoio de conciliacao | Afastamentos.CONTRATO | enriquecimento obrigatorio |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 5) public.fact_afastamento_cid

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| afastamento_cid_id | BIGSERIAL | nao | auto | PK da ocorrencia CID | sistema | - |
| afastamento_id | BIGINT | nao | - | FK para evento | evento consolidado | ON DELETE CASCADE |
| cid_codigo | TEXT | nao | - | codigo CID principal | Afastamentos.CID / afastamento_cids.cid_codigo | normalizar pontuacao |
| cid_descricao | TEXT | sim | - | descricao CID | base CID10 / legado | enriquecer em ETL |
| cid_capitulo | TEXT | sim | - | capitulo CID | base CID10 / legado | enriquecer em ETL |
| occurrence_weight | NUMERIC(12,6) | nao | 1.0 | peso da ocorrencia CID no evento | regra dual-layer | > 0 |
| allocated_days | NUMERIC(12,4) | sim | - | dias alocados ao CID | regra dual-layer | evita inflacao de dias |
| cid_ordem | INTEGER | sim | - | ordem de aparicao do CID | parse da origem | unique por evento quando informado |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 6) public.fact_population_snapshot

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| snapshot_id | BIGSERIAL | nao | auto | PK do snapshot | sistema | - |
| tempo_id | BIGINT | nao | - | FK para dim_tempo | competencia consolidada | obrigatorio |
| competencia_yyyymm | INTEGER | nao | - | competencia de referencia | dim_tempo | base para taxas |
| secretaria | TEXT | sim | - | recorte institucional | base cadastral | - |
| unidade_orcamentaria | TEXT | sim | - | recorte institucional | base cadastral | - |
| local_trabalho | TEXT | sim | - | recorte operacional | base cadastral | - |
| categoria_funcional | TEXT | sim | - | recorte funcional | base cadastral | - |
| natureza_cargo | TEXT | sim | - | recorte funcional | base cadastral | - |
| sexo | TEXT | sim | - | recorte demografico | base cadastral | dominio controlado |
| faixa_etaria | TEXT | sim | - | recorte derivado | derivacao FASE 3/4 | parametrizacao futura |
| faixa_tempo_servico | TEXT | sim | - | recorte derivado | derivacao FASE 3/4 | parametrizacao futura |
| qtd_populacao_ativa | INTEGER | nao | - | denominador oficial | consolidacao mensal | >= 0 |
| fonte | TEXT | sim | - | rastreabilidade da origem | processo ETL | obrigar preenchimento na FASE 3 |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 7) public.dim_psychosocial_factor

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| psychosocial_factor_id | BIGSERIAL | nao | auto | PK do fator | sistema | - |
| codigo | TEXT | sim | - | codigo de fator | catalogo tecnico NR-1/PGR | unique quando informado |
| nome | TEXT | nao | - | nome do fator | catalogo tecnico | obrigatorio |
| descricao | TEXT | sim | - | descricao do fator | catalogo tecnico | - |
| categoria | TEXT | sim | - | agrupador do fator | catalogo tecnico | - |
| fonte_normativa | TEXT | sim | - | referencia normativa | NR-1/PGR | - |
| is_active | BOOLEAN | nao | true | controle de vigencia | sistema | - |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 8) public.fact_psychosocial_assessment

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| psychosocial_assessment_id | BIGSERIAL | nao | auto | PK da avaliacao | sistema | - |
| servidor_id | BIGINT | sim | - | FK servidor | processos psicossociais | preencher no ETL |
| vinculo_id | BIGINT | sim | - | FK vinculo | processos psicossociais | preencher no ETL |
| tempo_id | BIGINT | sim | - | FK tempo | processos psicossociais | preencher no ETL |
| psychosocial_factor_id | BIGINT | sim | - | FK fator | catalogo de fatores | preencher no ETL |
| instrumento | TEXT | sim | - | instrumento aplicado | LIPT-69 ou equivalente | - |
| score | NUMERIC(12,4) | sim | - | escore de avaliacao | instrumento | - |
| nivel_risco | TEXT | sim | - | classificacao de risco | regra tecnica | - |
| avaliador | TEXT | sim | - | responsavel tecnico | processo operacional | - |
| observacoes | TEXT | sim | - | notas tecnicas | processo operacional | - |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 9) public.fact_psychosocial_signal

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| psychosocial_signal_id | BIGSERIAL | nao | auto | PK do sinal | sistema | - |
| afastamento_id | BIGINT | sim | - | FK opcional para evento | correlacao com afastamentos | sem causalidade automatica |
| servidor_id | BIGINT | sim | - | FK servidor | correlacao psicossocial | - |
| vinculo_id | BIGINT | sim | - | FK vinculo | correlacao psicossocial | - |
| cid_codigo | TEXT | sim | - | CID associado ao sinal | ocorrencia CID | F e M como sentinela |
| signal_strength | NUMERIC(12,4) | sim | - | intensidade do sinal | regra de priorizacao futura | >= 0 |
| status_investigacao | TEXT | sim | - | estado da investigacao | fluxo tecnico | - |
| observacoes | TEXT | sim | - | notas tecnicas | fluxo tecnico | - |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 10) public.dim_ergonomic_factor

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| ergonomic_factor_id | BIGSERIAL | nao | auto | PK do fator ergonomico | sistema | - |
| codigo | TEXT | sim | - | codigo de fator | catalogo tecnico NR-17 | unique quando informado |
| nome | TEXT | nao | - | nome do fator | catalogo tecnico | obrigatorio |
| descricao | TEXT | sim | - | descricao do fator | catalogo tecnico | - |
| categoria | TEXT | sim | - | agrupador do fator | catalogo tecnico | - |
| fonte_normativa | TEXT | sim | - | referencia normativa | NR-17/AEP/AET | - |
| is_active | BOOLEAN | nao | true | controle de vigencia | sistema | - |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 11) public.fact_ergonomic_assessment

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| ergonomic_assessment_id | BIGSERIAL | nao | auto | PK da avaliacao ergonomica | sistema | - |
| servidor_id | BIGINT | sim | - | FK servidor | processo ergonomico | - |
| vinculo_id | BIGINT | sim | - | FK vinculo | processo ergonomico | - |
| tempo_id | BIGINT | sim | - | FK tempo | processo ergonomico | - |
| ergonomic_factor_id | BIGINT | sim | - | FK fator | catalogo ergonomico | - |
| metodo_avaliacao | TEXT | sim | - | metodo utilizado | AEP/AET | - |
| score | NUMERIC(12,4) | sim | - | escore ergonomico | processo tecnico | - |
| nivel_risco | TEXT | sim | - | classificacao de risco | processo tecnico | - |
| avaliador | TEXT | sim | - | responsavel tecnico | processo tecnico | - |
| observacoes | TEXT | sim | - | notas tecnicas | processo tecnico | - |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 12) public.fact_ergonomic_exposure

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| ergonomic_exposure_id | BIGSERIAL | nao | auto | PK da exposicao | sistema | - |
| servidor_id | BIGINT | sim | - | FK servidor | processo ergonomico | - |
| vinculo_id | BIGINT | sim | - | FK vinculo | processo ergonomico | - |
| ergonomic_factor_id | BIGINT | sim | - | FK fator | catalogo ergonomico | - |
| local_trabalho | TEXT | sim | - | local de exposicao | base cadastral/avaliacao | indexado |
| frequencia_exposicao | TEXT | sim | - | frequencia da exposicao | avaliacao tecnica | - |
| intensidade_exposicao | TEXT | sim | - | intensidade da exposicao | avaliacao tecnica | - |
| inicio_exposicao | DATE | sim | - | inicio da janela | avaliacao tecnica | validar periodo |
| fim_exposicao | DATE | sim | - | fim da janela | avaliacao tecnica | validar periodo |
| observacoes | TEXT | sim | - | notas tecnicas | avaliacao tecnica | - |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 13) public.fact_ergonomic_action_plan

| Campo | Tipo SQL | Nulo | Default | Regra de negocio resumida | Origem provavel | Observacoes de transformacao futura |
| --- | --- | --- | --- | --- | --- | --- |
| ergonomic_action_plan_id | BIGSERIAL | nao | auto | PK do plano de acao | sistema | - |
| ergonomic_assessment_id | BIGINT | sim | - | FK opcional para avaliacao | processo ergonomico | - |
| servidor_id | BIGINT | sim | - | FK servidor | processo ergonomico | - |
| vinculo_id | BIGINT | sim | - | FK vinculo | processo ergonomico | - |
| prioridade | TEXT | sim | - | prioridade do plano | regra tecnica futura | - |
| acao_recomendada | TEXT | nao | - | acao tecnica recomendada | avaliacao ergonomica | obrigatorio |
| responsavel | TEXT | sim | - | dono da acao | fluxo operacional | - |
| data_prevista | DATE | sim | - | prazo previsto | fluxo operacional | - |
| data_execucao | DATE | sim | - | data de execucao | fluxo operacional | validar sequencia |
| status_acao | TEXT | sim | - | estado do plano | fluxo operacional | indexado |
| observacoes | TEXT | sim | - | notas tecnicas | fluxo operacional | - |
| created_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | - |
| updated_at | TIMESTAMPTZ | nao | now() | auditoria tecnica | sistema | trigger de atualizacao |

## 14) Notas de incerteza residual

- Constraints e indices do banco ativo fora das tabelas auditadas por coluna nao foram lidos via `information_schema`/`pg_catalog` na API REST.
- O package foi construído com base no padrao versionado do repositorio e na auditoria da FASE 1.
- Revisao humana da DDL e pre-requisito antes de aplicar em qualquer ambiente.
