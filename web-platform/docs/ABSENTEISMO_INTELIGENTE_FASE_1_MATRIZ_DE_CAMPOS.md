# ABSENTEISMO INTELIGENTE - FASE 1

## MATRIZ DE CAMPOS (ORIGEM -> ESTADO ATUAL -> DESTINO ALVO)

Status: Apoio tecnico da FASE 1
Data: 2026-03-31

## 1) Matriz - Base cadastral (AtualizacaoBancoDados.xlsx)

| Campo planilha cadastral | Campo atual no banco (quando existe) | Destino recomendado (arquitetura-alvo) | Transformacao/normalizacao |
| --- | --- | --- | --- |
| CPF. | servidores.cpf | dim_servidor.cpf | manter apenas digitos (11), validar DV/formato |
| CPF com mascara | nao persistir como coluna principal | dim_servidor.cpf_formatado (opcional) | derivar do CPF normalizado |
| Nome | servidores.nome | dim_servidor.nome_oficial | trim, uppercase tecnico opcional |
| Cargo | servidores.cargo | dim_vinculo_servidor.cargo | historizar por vigencia de vinculo |
| Matrícula | servidores.matricula | dim_vinculo_servidor.matricula | tratar como texto para preservar zeros |
| Dt.Nascimento | servidores.nascimento | dim_servidor.data_nascimento | converter para date |
| Secretaria | servidores.secretaria | dim_vinculo_servidor.secretaria | padronizar nomenclatura |
| Contrato | servidores.contrato | dim_vinculo_servidor.contrato | obrigatorio em chave de vinculo |
| Dt.Admissão | servidores.admissao | dim_vinculo_servidor.data_admissao | converter para date |
| Nome Unidade Orcamentaria | sem campo dedicado confirmado | dim_vinculo_servidor.unidade_orcamentaria | tabela de dominio recomendada |
| RG. | sem campo dedicado confirmado | dim_servidor.rg (opcional/sensivel) | avaliar necessidade LGPD |
| Nome Local Trabalho | servidores.local_trabalho | dim_vinculo_servidor.local_trabalho | padronizar dicionario |
| Sexo | servidores.sexo | dim_servidor.sexo | padrao M/F + dominio expandivel |
| Deficiencia RAIS | servidores.deficiencia_rais | dim_servidor.deficiencia_rais | converter para dominio semantico |
| Nome Vinculo | servidores.vinculo | dim_vinculo_servidor.nome_vinculo | normalizar rotulos de vinculo |
| Telefone | sem campo confirmado | dim_servidor.telefone (opcional) | sanitizar mascara |
| Celular | sem campo confirmado | dim_servidor.celular (opcional) | sanitizar mascara |
| Endereco | sem campo confirmado | dim_servidor.endereco (opcional) | separar logradouro/complemento se necessario |
| email | sem campo confirmado | dim_servidor.email (opcional) | lowercase + validacao |
| CEP. | sem campo confirmado | dim_servidor.cep (opcional) | manter como texto |
| PIS/PASEP/NIT | servidores.pis_pasep | dim_servidor.pis_pasep | tratar como texto |
| Cidade | sem campo confirmado | dim_servidor.cidade (opcional) | padronizar acentuacao/caso |
| UF. | sem campo confirmado | dim_servidor.uf (opcional) | char(2) uppercase |
| Nome Estado Civil | sem campo confirmado | dim_servidor.estado_civil (opcional) | dominio controlado |
| Nome Nacionalidade | sem campo confirmado | dim_servidor.nacionalidade (opcional) | dominio controlado |
| Nome Categoria Funcional | sem campo confirmado | dim_vinculo_servidor.categoria_funcional | alta taxa de nulos, prever UNKNOWN |
| Instrucao | sem campo confirmado | dim_servidor.instrucao | mapear codigos para labels |
| Tipo Cargo Atual | sem campo confirmado | dim_vinculo_servidor.tipo_cargo_atual | mapear codigos para dominio |
| Horas/Mes | sem campo confirmado | dim_vinculo_servidor.horas_mes | numerico inteiro |
| Dias/Semana | sem campo confirmado | dim_vinculo_servidor.dias_semana | numerico inteiro |
| Horas/Semana | sem campo confirmado | dim_vinculo_servidor.horas_semana | numerico inteiro |
| Jornada | sem campo confirmado | dim_vinculo_servidor.jornada | numeric, permitir nulo |
| Nome Raca Cor | sem campo confirmado | dim_servidor.raca_cor | dominio controlado |
| Nome Subdivisao | sem campo confirmado | dim_vinculo_servidor.subdivisao | padronizar taxonomia |
| Nome Situacao Funcional | sem campo confirmado | dim_vinculo_servidor.situacao_funcional | dominio controlado |
| Nome Natureza Cargo | servidores.natureza_cargo | dim_vinculo_servidor.natureza_cargo | padronizar Efetivo/Temporario/Comissao |

## 2) Matriz - Base de eventos (Afastamentos.xlsx)

| Campo planilha afastamentos | Campo atual no banco (quando existe) | Destino recomendado (arquitetura-alvo) | Transformacao/normalizacao |
| --- | --- | --- | --- |
| CPF | afastamentos.servidor_cpf | fact_afastamento_evento.cpf (via fk vinculo) | manter apenas digitos |
| MATRICULA | afastamentos.servidor_matricula | fact_afastamento_evento.matricula (via fk vinculo) | texto padronizado |
| CONTRATO | afastamentos.servidor_contrato | fact_afastamento_evento.contrato (via fk vinculo) | hoje majoritariamente nulo; preencher por lookup |
| NOME | afastamentos.servidor_nome | fact_afastamento_evento.nome_snapshot (opcional) | nome de evento opcional para auditoria |
| NATUREZA CARGO | afastamentos.natureza_cargo | fact_afastamento_evento.natureza_cargo_snapshot | manter snapshot + referencia a vinculo |
| TIPO DE LICENCA | afastamentos.tipo_afastamento | fact_afastamento_evento.tipo_afastamento | normalizar dominio |
| SECRETARIA | afastamentos.servidor_secretaria | fact_afastamento_evento.secretaria_snapshot | snapshot do evento |
| DIAS DE AFAST | afastamentos.dias_afastado | fact_afastamento_evento.dias_afastado | recalcular por data quando necessario |
| CID | afastamentos.cid (legado texto) + afastamento_cids.cid_codigo | fact_afastamento_cid.cid_codigo | parse CID multiplo para N linhas |
| INICIO AFAST | afastamentos.data_inicio | fact_afastamento_evento.data_inicio | date |
| FIM AFAST | afastamentos.data_fim | fact_afastamento_evento.data_fim | date |
| SITUACAO | afastamentos.situacao | fact_afastamento_evento.situacao | dominio controlado |
| STATUS | afastamentos.status | fact_afastamento_evento.status | dominio controlado |
| CONDICAO | sem uso atual | avaliar campo analitico futuro | origem 100% nula neste recorte |

## 3) Regras de chave para o desenho alvo

| Entidade alvo | Chave recomendada | Observacao |
| --- | --- | --- |
| dim_servidor | servidor_id surrogate + cpf unico de negocio | CPF sozinho identifica pessoa, nao vinculo |
| dim_vinculo_servidor | vinculo_id surrogate + unique(cpf, matricula, contrato) | chave operacional validada na base cadastral |
| fact_afastamento_evento | evento_id surrogate + hash natural anti-duplicidade | natural key sugerida: cpf+matricula+contrato+tipo+data_inicio+data_fim |
| fact_afastamento_cid | ocorrencia_id surrogate + fk evento | permitir multiplos CIDs por evento |
| fact_population_snapshot | snapshot_id surrogate + competencia + recortes | base para denominadores e taxas |

## 4) Observacoes criticas de transformacao

- `CONTRATO` em afastamentos deve ser enriquecido antes de consolidar chave de vinculo.
- `CID` textual multiplo deve ser quebrado e normalizado (pontuacao CID-10).
- Campos de snapshot (`servidor_nome`, `servidor_secretaria`, `natureza_cargo`) devem coexistir com FKs para evitar perda de contexto historico.
- Campos derivados obrigatorios (idade, faixa_etaria, tempo_servico, competencia) devem ser calculados em camada analitica controlada, nao no front-end.
