# ABSENTEISMO INTELIGENTE - FASE 3F

## PREPARACAO DO AMBIENTE ISOLADO DE HOMOLOGACAO

Status: CONCLUIDA (planejamento documental e governanca)
Data: 2026-04-01
Natureza: preparacao formal para execucao futura, sem qualquer operacao tecnica nesta microfase.

---

## A) Objetivo da microfase

Definir e preparar, somente em nivel documental e de governanca, a estrutura minima obrigatoria para futura ingestao controlada da FASE 3 em ambiente isolado de homologacao, sem execucao de ETL, sem banco, sem apply e sem impacto na plataforma atual.

---

## B) Estado atual da baseline offline validada

A baseline offline da FASE 3 permanece validada e consolidada pelas microfases 2.5, 3A, 3B, 3C, 3D e 3E, incluindo:
- artefato experimental em quarentena e offline-only;
- stub deprecated no script operacional antigo;
- evidencias JSON offline registradas;
- planejamento de ingestao controlada em ambiente isolado ja formalizado na FASE 3E.

---

## C) Confirmacao de bloqueio da ingestao real

A ingestao real da FASE 3 permanece BLOQUEADA.

Esta microfase nao autoriza:
- criacao de ambiente em provedor;
- aplicacao de migrations;
- execucao de ETL;
- carga de dados;
- abertura da FASE 4.

---

## D) Ambiente-alvo preferencial

Ambiente preferencial definido:
- projeto Supabase separado para homologacao.

Justificativa:
- isolamento estrutural superior;
- risco reduzido de interferencia na plataforma atual;
- governanca de rollback e bloqueio mais objetiva.

---

## E) Escopo exato do ambiente isolado

### O que existira no ambiente isolado
- estrutura de schema necessaria para a trilha de absenteismo da FASE 3;
- credenciais exclusivas de homologacao;
- variaveis de ambiente dedicadas;
- trilha de logs e rastreabilidade da carga controlada;
- artefatos de validacao pre-carga e pos-carga.

### O que nao existira no ambiente isolado
- reutilizacao de credenciais de producao;
- acoplamento com rotinas operacionais da plataforma atual;
- alteracoes de frontend ou religacao de telas nesta microfase.

### O que nao pode tocar na plataforma atual
- projeto Supabase atual da plataforma;
- frontend em uso;
- modulo /afastamentos/cid-analytics;
- qualquer fluxo ja consolidado fora da trilha de absenteismo.

---

## F) Checklist de preparacao do ambiente isolado

1. Nome logico do ambiente/projeto definido e documentado.
2. Ownership e responsavel tecnico formalmente designados.
3. Credenciais e segredos obrigatorios mapeados e segregados.
4. Variaveis de ambiente exigidas listadas e validadas em checklist.
5. Separacao explicita entre credenciais de homologacao e producao.
6. Convencao de nomenclatura padronizada (projeto, schema, objetos e logs).
7. Politica de acesso com principio de menor privilegio definida.
8. Politica de backup/export previo definida, quando aplicavel.
9. Politica de logs e rastreabilidade ponta a ponta definida.
10. Gate de bloqueio para ambiente errado definido antes de qualquer execucao futura.

---

## G) Sequencia segura de futura execucao (planejada, sem executar)

1. Criacao do ambiente isolado.
2. Configuracao de variaveis e acessos.
3. Aplicacao controlada das migrations da FASE 2.
4. Validacao estrutural do schema.
5. Execucao do ETL controlado.
6. Validacao da carga.
7. Decisao formal de aprovacao/reprovacao.

---

## H) Gates obrigatorios entre etapas

- Gate de criacao do ambiente: valida isolamento e ownership antes de seguir.
- Gate de aplicacao de migrations: libera apenas com checklist tecnico completo.
- Gate de execucao do ETL: libera somente com schema validado e rastreabilidade ativa.
- Gate de aprovacao da carga: exige conformidade de validacoes pos-carga.
- Gate de bloqueio por divergencia: interrompe fluxo em qualquer nao conformidade critica.

---

## I) Criterios de rollback

### Quando abortar
- ambiente alvo incorreto;
- credenciais incorretas ou mistura entre homologacao/producao;
- divergencia estrutural critica no schema;
- inconsistencias de carga acima do limite aprovado;
- falha de rastreabilidade.

### Como abortar
- parar a progressao imediatamente na etapa corrente;
- acionar protocolo de retorno ao estado anterior da etapa em homologacao;
- congelar execucoes subsequentes ate nova aprovacao formal.

### Como registrar o incidente
- abrir registro tecnico com data/hora, etapa, causa, impacto e evidencias;
- anexar artefatos de log e decisao de bloqueio/retomada.

### Como impedir progressao indevida
- exigir gate de reautorizacao formal apos incidente;
- manter bloqueio automatico de etapas seguintes enquanto houver pendencia.

---

## J) Criterios de aprovacao do ambiente isolado

- ambiente criado conforme padrao definido;
- nenhum vinculo tecnico com producao;
- variaveis de ambiente corretas e segregadas;
- migrations aplicaveis com seguranca na homologacao;
- rastreabilidade completa de ponta a ponta;
- zero impacto na plataforma atual.

---

## K) Criterios de nao interferencia

Fica explicitamente vedado nesta trilha:
- tocar no projeto Supabase atual da plataforma;
- tocar no frontend atual;
- tocar no /afastamentos/cid-analytics;
- religar telas ao novo schema nesta microfase.

---

## L) Riscos remanescentes

- erros de configuracao do ambiente isolado;
- mistura acidental de credenciais;
- aplicacao em ambiente errado;
- carga em projeto incorreto;
- falta de rastreabilidade em etapas criticas;
- dependencia de pessoas/acessos para liberacao de gates.

---

## M) Proximo passo seguro

Abrir a proxima microfase exclusivamente para pre-check operacional de homologacao (gate de criacao do ambiente), ainda sem ETL e sem carga, mantendo bloqueio da ingestao real ate aprovacao formal completa.
