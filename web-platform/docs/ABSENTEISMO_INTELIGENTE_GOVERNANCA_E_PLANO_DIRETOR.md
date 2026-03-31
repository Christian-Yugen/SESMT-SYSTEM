# ABSENTEISMO INTELIGENTE - GOVERNANCA E PLANO DIRETOR

Status: CANONICO
Versao: 1.0.0
Data: 2026-03-31
Escopo desta versao: FASE 0 (governanca documental)

## 1. Objetivo institucional do programa

Instituir um programa unificado de inteligencia em absenteismo ocupacional no SESMT-SYSTEM para transformar dados de afastamento em decisao preventiva auditavel, mantendo rigor metodologico, rastreabilidade e aderencia normativa.

O programa unificado amplia o que ja existe no modulo clinico-ocupacional de agravos e organiza uma trilha formal para evolucao de base cadastral, arquitetura de dados, motores analiticos, telas, relatorios e consolidacao.

## 2. Escopo de unificacao metodologica

A unificacao oficial combina:
- Modelo epidemiologico classico (monitoramento populacional e series historicas).
- Modelo normativo-preventivo (leitura do trabalho real, contexto organizacional e priorizacao de acao).

Fundamentacao minima:
- Referencia metodologica de Belem para base epidemiologica classica.
- Indicadores futuros obrigatorios: TAD, IFL, DML/MDL e IG.
- Estratificacoes futuras obrigatorias: sexo, idade, tempo de servico, categoria ocupacional, local de trabalho e unidade orcamentaria.
- Integracao normativa prevista: NR-1 (risco psicossocial/PGR) e NR-17 (ergonomia/AEP/AET).

## 3. Premissas obrigatorias do programa

1. O modulo /afastamentos/cid-analytics esta concluido e consolidado.
2. O programa unificado NAO substitui o cid-analytics; ele o amplia.
3. CID F e CID M sao sinais sentinela e gatilhos de priorizacao, NAO causalidade automatica.
4. Dado e denominador sempre vem antes de tela.
5. A ordem de implantacao oficial e:
   1) base cadastral
   2) schema
   3) ETL
   4) motor epidemiologico
   5) psicossocial/ergonomia
   6) telas
   7) relatorios
   8) QA e consolidacao

## 4. Estado atual consolidado (o que ja existe no cid-analytics)

Consolidado hoje em /afastamentos/cid-analytics:
- Leitura por capitulo CID e CID.
- Dias perdidos.
- Duracao media e mediana.
- Recorrencia.
- Tendencia.
- Visao ocupacional.
- Casos investigativos.
- Alertas gerenciais.
- Rankings prioritarios.
- Pipeline dual-layer com multiplos CIDs por evento.
- Auditoria zerada para maternidade e legado.

## 5. Limites atuais (o que ainda nao esta resolvido)

Itens que permanecem para fases seguintes:
- Enriquecimento completo da base cadastral/funcional do servidor.
- Indicadores epidemiologicos formais TAD, IFL, DML/MDL e IG.
- Denominadores por populacao ativa.
- Analises completas por sexo, tempo de servico, local de trabalho, unidade orcamentaria e categoria funcional.
- Integracao formal com risco psicossocial NR-1/PGR.
- Integracao formal com avaliacao ergonomica NR-17/AEP/AET.
- Relatorios executivos, tecnicos e medicos formais.

## 6. Principios arquiteturais oficiais

1. Preservacao: o modulo /afastamentos/cid-analytics e alicerce clinico-ocupacional e nao deve ser desmontado.
2. Evolucao por camadas: cada camada agrega capacidade sem quebrar contrato anterior.
3. Auditabilidade: cada indicador deve ser reproduzivel por criterio e origem de dado.
4. Governanca de fase: nenhuma fase inicia sem criterio de entrada atendido.
5. Nao antecipacao: e proibido adiantar implementacao fora da fase vigente.

## 7. Camadas oficiais do programa

1. Cadastral/funcional.
2. Epidemiologica classica.
3. Clinica-ocupacional.
4. Risco do trabalho.
5. Executiva de prevencao.

## 8. Arquitetura-alvo de alto nivel

Entidades-base planejadas:
- dim_servidor
- dim_vinculo_servidor
- dim_tempo
- fact_afastamento_evento
- fact_afastamento_cid
- estruturas psicossociais
- estruturas ergonomicas
- fact_population_snapshot

Bibliotecas planejadas:
- afastamentos-masterdata.ts
- afastamentos-epidemiologia.ts
- afastamentos-cid-analytics.ts (preservada)
- afastamentos-psychosocial.ts
- afastamentos-ergonomia.ts
- afastamentos-prevention-priority.ts
- afastamentos-reporting.ts

Rotas planejadas:
- /afastamentos/epidemiologia
- /afastamentos/psychosocial-analytics
- /afastamentos/ergonomia-analytics
- /afastamentos/prevention-board
- /afastamentos/reports

## 9. Trilha oficial FASE 0 a FASE 12

### FASE 0 - Governanca do programa (ATUAL)
Objetivo: congelar escopo, metodo de execucao e artefatos canonicos.

### FASE 1 - Requisitos tecnicos detalhados
Objetivo: formalizar requisitos de dados, regras de negocio e contratos.

### FASE 2 - Contrato de schema
Objetivo: modelagem detalhada das dimensoes, fatos e relacionamentos.

### FASE 3 - ETL e ingestao
Objetivo: definicao e implementacao controlada da alimentacao de dados.

### FASE 4 - Validacao de denominadores
Objetivo: garantir consistencia da populacao ativa e snapshots temporais.

### FASE 5 - Motor epidemiologico classico (parte 1)
Objetivo: base de indicadores e funcoes epidemiologicas nucleares.

### FASE 6 - Motor epidemiologico classico (parte 2)
Objetivo: consolidacao de indicadores e estratificacoes oficiais.

### FASE 7 - Integracao ergonomica (NR-17)
Objetivo: correlacoes tecnicas com AEP/AET e exposicoes ergonomicas.

### FASE 8 - Priorizacao ergonomica-operacional
Objetivo: maturar regras de risco e priorizacao de intervencao.

### FASE 9 - Integracao psicossocial (NR-1)
Objetivo: correlacoes com fatores psicossociais do trabalho real.

### FASE 10 - Consolidacao clinico-ocupacional e investigativa
Objetivo: consolidar leitura integrada com foco em prioridade de acao.

### FASE 11 - Relatorios formais
Objetivo: emitir relatorios executivos, tecnicos e medicos auditaveis.

### FASE 12 - Board unificado de prevencao
Objetivo: consolidar painel de priorizacao preventiva multiparadigma.

## 10. Dependencias entre fases

- 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12
- Dependencia critica: fases 5 e 6 exigem fase 4 concluida (denominador validado).
- Dependencia de integracao: fases 7 e 9 dependem da consolidacao minima de 5 e 6.
- Fase 11 depende da consistencia das fases 5 a 10.

## 11. Criterios de entrada e saida por fase

Regra geral de entrada:
- fase anterior aprovada;
- backlog da fase atualizado;
- evidencias da fase anterior registradas.

Regra geral de saida:
- entregaveis previstos completos;
- testes e validacoes executados;
- pendencias classificadas;
- decisao final registrada (corrigir, aceitar ou avancar).

## 12. Regras metodologicas obrigatorias

1. TAD, IFL, DML/MDL e IG sao parte obrigatoria da base epidemiologica futura.
2. Analises por sexo, idade, tempo de servico e categoria ocupacional sao obrigatorias nas fases corretas.
3. CID F e CID M exigem interpretacao tecnica contextualizada com trabalho real.
4. Nenhuma leitura de CID F/M pode ser publicada como nexo automatico.
5. Correlacoes com NR-1 e NR-17 exigem evidencia e trilha de verificacao tecnica.

## 13. Regras expressas de preservacao e proibicoes nesta fase

Preservacao obrigatoria:
- /afastamentos/cid-analytics deve permanecer preservado como nucleo clinico-ocupacional.

Proibicoes da FASE 0:
- Nao criar migrations.
- Nao alterar schema do Supabase.
- Nao criar ETL.
- Nao criar telas novas.
- Nao alterar logica analitica existente do /afastamentos/cid-analytics.
- Nao iniciar FASE 1.
- Nao antecipar implementacao de TAD/IFL/DML/IG.
- Nao criar feature parcial adiantada.

## 14. Riscos e cautelas de execucao

Riscos principais:
- Interpretacao causal indevida de CID F/M.
- Uso de denominador inconsistente para metricas epidemiologicas.
- Antecipacao de desenvolvimento fora da fase vigente.
- Duplicacao de contratos de dados sem governanca central.

Cautelas obrigatorias:
- Revisao tecnica de cada fase antes de avancar.
- Trilhas de evidencia e testes por fase.
- Revisao de consistencia metodologica e normativa antes de publicar paines.

## 15. Metodo de trabalho com agente

1. Receber escopo de fase.
2. Ler governanca obrigatoria.
3. Executar apenas escopo autorizado.
4. Registrar evidencias, testes e pendencias.
5. Retornar no template obrigatorio de agente.
6. Nao iniciar proxima fase sem aprovacao formal.

## 16. Proximos passos oficiais apos aprovacao da FASE 0

1. Aprovar formalmente os artefatos canonicos de governanca.
2. Iniciar FASE 1 com o template operacional.
3. Planejar FASE 2 com contrato detalhado de schema.
4. Manter checkpoint de nao-regressao do /afastamentos/cid-analytics.

## 17. Fontes de contexto e governanca consideradas

- AGENTS.md
- DESIGN_SYSTEM_SESMT_GOVERNANCA_VISUAL_UNIFICADA.md
- Contexto de handoff desta execucao (programa unificado de absenteismo inteligente)
- Referencia metodologica de Belem para epidemiologia classica

Fim do documento canonico da FASE 0.
