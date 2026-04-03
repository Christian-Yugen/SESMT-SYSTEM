# ABSENTEISMO INTELIGENTE - FASE 3E

## PLANO DE INGESTAO CONTROLADA EM AMBIENTE ISOLADO

Status: CONCLUIDA (planejamento documental)
Data: 2026-04-01
Natureza: estrategia de preparacao para ingestao futura, sem execucao tecnica.

---

## 1) Objetivo da microfase

Definir a estrategia segura para futura ingestao controlada da FASE 3 em ambiente isolado, preservando a plataforma atual, sem executar ETL real, sem apply, sem escrita em banco e sem alterar modulos fora da trilha documental.

---

## 2) Estado atual da baseline offline

Baseline offline consolidada e validada pelas microfases 2.5, 3A, 3B, 3C e 3D, com:
- artefato experimental em quarentena e offline-only;
- script principal da FASE 3 mantido como deprecated/stub;
- evidencia JSON de dry-run e diagnostico por evento registrada;
- saneamento de escopo no branch com remocao de alteracao indevida fora do programa.

A ingestao real permanece bloqueada e nao e liberada automaticamente.

---

## 3) Riscos de ingestao real mapeados

- Contaminacao da plataforma atual por carga em ambiente compartilhado sem isolamento forte.
- Mistura de escopo entre trilha de absenteismo e alteracoes globais (auth/frontend/config).
- Divergencia entre regras validadas no offline e comportamento observado em ambiente de ingestao.
- Falta de rollback claro em caso de anomalia de carga ou regressao funcional.
- Perda de rastreabilidade se execucao ocorrer sem gate formal por etapa.

---

## 4) Opcoes de isolamento

### 4.1 Opcao A - schema isolado no mesmo Supabase

Vantagens:
- menor custo operacional inicial;
- reaproveitamento de infraestrutura existente.

Riscos:
- maior risco de acoplamento acidental com objetos da plataforma atual;
- maior complexidade de garantias de nao interferencia.

Indicacao:
- somente com politicas rigidas de naming, credenciais segregadas e trilha de validacao reforcada.

### 4.2 Opcao B - projeto Supabase separado para homologacao

Vantagens:
- isolamento forte por infraestrutura;
- menor risco de impacto involuntario no ambiente atual;
- rollback operacional mais simples (descarte de ambiente isolado).

Riscos:
- maior custo de provisionamento e governanca;
- necessidade de sincronizar configuracoes minimas de observabilidade e seguranca.

Indicacao:
- opcao preferencial para primeira ingestao controlada.

---

## 5) Recomendacao principal

Adotar a Opcao B (projeto Supabase separado para homologacao) como rota padrao da primeira ingestao controlada, por oferecer isolamento estrutural superior e reduzir risco para a plataforma atual.

---

## 6) Pre-requisitos obrigatorios antes da ingestao

1. Aprovacao formal de abertura da microfase operacional de ingestao controlada.
2. Ambiente isolado provisionado e identificado como nao produtivo.
3. Checklist de governanca validado (escopo, seguranca, rastreabilidade e rollback).
4. Congelamento da baseline de codigo e documentos de referencia da FASE 3 offline.
5. Matriz de responsabilidade definida (execucao, auditoria, aprovacao e bloqueio).
6. Criterios objetivos de sucesso e falha por etapa previamente documentados.

---

## 7) Sequencia operacional segura (planejada)

1. Gate de autorizacao formal e conferencias de pre-requisito.
2. Validacoes pre-carga no ambiente isolado (estrutura, permissao, rastreabilidade).
3. Execucao controlada em lote pequeno para prova inicial de comportamento.
4. Auditoria de consistencia e reconciliacao com baseline offline.
5. Escalonamento progressivo apenas se etapa anterior aprovada.
6. Encerramento com relatorio tecnico e decisao formal de continuidade ou bloqueio.

---

## 8) Criterios de rollback

Rollback deve ser acionado imediatamente se ocorrer qualquer condicao:
- falha de consistencia acima dos limites definidos para etapa;
- divergencia estrutural entre resultado de ingestao e baseline offline validada;
- risco de interferencia na plataforma atual;
- perda de rastreabilidade ou evidencia incompleta.

Requisitos minimos de rollback:
- retorno ao estado anterior da etapa em ambiente isolado;
- registro do motivo, impacto e evidencias;
- bloqueio de progressao ate nova aprovacao formal.

---

## 9) Criterios de aprovacao por etapa

Cada etapa so e aprovada se todos os itens forem verdadeiros:
- objetivos da etapa atingidos sem desvio critico;
- consistencia de dados dentro do limite aprovado;
- trilha de auditoria completa (entradas, processamento, saidas);
- ausencia de impacto na plataforma atual;
- aceite formal do responsavel tecnico e da governanca.

---

## 10) Validacoes pre-carga

- Confirmacao do isolamento do ambiente alvo.
- Confirmacao de escopo limitado ao programa de absenteismo.
- Confirmacao de que a baseline offline esta congelada e referenciada.
- Confirmacao de plano de rollback disponivel e testavel.
- Confirmacao de criterios de aprovacao publicados para a execucao.

---

## 11) Validacoes pos-carga

- Reconciliacao de volumetria e consistencia contra baseline offline.
- Verificacao de integridade das entidades e fatos previstos.
- Conferencia de rastreabilidade ponta a ponta da etapa executada.
- Registro de desvios, acoes corretivas e decisao formal de continuidade.

---

## 12) Criterios para nao tocar na plataforma atual

- Nenhuma credencial, schema, rotina ou fluxo da plataforma ativa pode ser alvo da ingestao controlada.
- Nenhum modulo funcional ja consolidado pode ser alterado por efeito colateral da microfase.
- Qualquer indicio de interferencia encerra a etapa e aciona rollback/bloqueio.

---

## 13) Criterios para futura liberacao da FASE 3 real

A liberacao da FASE 3 real somente podera ocorrer com:
- consolidacao de todas as etapas de ingestao controlada sem nao conformidades criticas;
- evidencias de estabilidade tecnica e rastreabilidade completas;
- aprovacao formal e explicita da governanca para transicao de status;
- plano de operacao e contingencia aprovado para ambiente real.

---

## 14) Proximos passos seguros

1. Manter bloqueio da ingestao real ate autorizacao formal.
2. Abrir microfase operacional separada apenas para preparacao de ambiente isolado.
3. Executar a primeira ingestao controlada somente apos checklist integral aprovado.
