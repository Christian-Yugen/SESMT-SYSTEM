# ABSENTEISMO INTELIGENTE - FASE 3R

## REABERTURA E REORGANIZACAO DA GOVERNANCA DA FASE 3

Status: CONCLUIDA (reabertura formal da governanca por restricao real de infraestrutura)
Data: 2026-04-02
Natureza: documental e decisoria, sem execucao tecnica nesta microfase.

---

## A) Objetivo da microfase

Registrar formalmente a mudanca de estrategia da FASE 3 por restricao real de infraestrutura, preservando a trilha construida e redefinindo a continuidade para execucao no projeto atual `SESMT-System` com isolamento interno rigido e governanca reforcada de risco.

---

## B) Motivo formal da reabertura

- Houve impossibilidade real de criar novo projeto Supabase para homologacao devido ao limite de projetos ativos da conta/organizacao.
- O bloqueio da estrategia anterior de HML separado foi legitimo e verificavel operacionalmente.
- A continuidade segura do programa exige reorganizacao formal da governanca da FASE 3, sem descaracterizar o plano macro.

---

## C) Status da trilha ja construida

Permanecem validas como historico e base de decisao:
- FASE 2.5
- FASE 3A
- FASE 3B
- FASE 3C
- FASE 3D
- FASE 3E
- FASE 3F
- FASE 3G
- FASE 3H

Observacao de governanca:
- As microfases anteriores nao sao apagadas nem invalidadas.
- As decisoes de ambiente HML separado passam a ser tratadas como estrategia superseded por restricao real de infraestrutura, mantendo valor historico e de rastreabilidade.

---

## D) Decisao de governanca

- A estrategia de projeto HML separado deixa de ser rota preferencial da FASE 3.
- Passa a valer a estrategia de isolamento interno no projeto atual `SESMT-System`.
- A mudanca e estritamente tatico-operacional; o plano macro do Programa Unificado de Inteligencia em Absenteismo Ocupacional permanece mantido.

---

## E) Regras duras do novo isolamento interno

- additive-only em estruturas do novo dominio de absenteismo.
- proibido DROP em estruturas atuais da plataforma.
- proibido ALTER destrutivo em objetos ja existentes.
- proibido renomear objetos utilizados pela plataforma atual.
- proibido alterar contratos atualmente consumidos pelo frontend existente.
- proibido tocar no `/afastamentos/cid-analytics`.
- proibido religar telas novas ao schema novo antes da liberacao formal.
- proibido usar tabelas atuais como staging provisoria.
- preferencia por schema isolado dentro do mesmo projeto (ou segregacao tecnica equivalente explicitamente documentada).
- execucao obrigatoria por microetapas com gate de aprovacao e plano de rollback por etapa.

---

## F) Criterios obrigatorios da nova estrategia

- isolamento estrutural verificavel.
- rollback por etapa, com procedimento explicito antes da execucao.
- validacao de nao interferencia na plataforma atual a cada microfase.
- trilha de auditoria documental e tecnica obrigatoria.
- aprovacao explicita por microfase antes de avancar para a seguinte.

---

## G) O que continua bloqueado

- FASE 4 permanece bloqueada.
- ETL real imediato permanece bloqueado.
- ligacao do frontend ao novo dominio permanece bloqueada.
- qualquer mudanca invasiva no banco atual permanece bloqueada.

---

## H) Reorganizacao das proximas microfases da FASE 3

Sequencia sugerida apos a reabertura:
- 3S - desenho do isolamento interno no `SESMT-System`.
- 3T - auditoria de impacto no projeto atual.
- 3U - package de migrations additive-only para schema isolado.
- 3V - aplicacao controlada das migrations.
- 3W - ETL controlado no isolamento interno.
- 3X - validacao da carga, cobertura e residuos.

Regra de progressao:
- nenhuma microfase avanca sem gate da anterior formalmente aprovado.

---

## I) Criterios para encerrar a FASE 3

A FASE 3 so termina quando todos os itens abaixo estiverem atendidos:
- schema isolado criado com seguranca.
- migrations aplicadas com sucesso e sem interferencia na plataforma atual.
- ETL executado sem impacto operacional no fluxo atual.
- dimensoes e fatos principais populados com consistencia.
- validacao de cobertura e residuos concluida.
- aprovacao formal de encerramento registrada.

---

## J) Proximo passo seguro

Proxima microfase recomendada:
- 3S - desenho tecnico do isolamento interno no `SESMT-System`, com delimitacao de schema, fronteiras de contrato e checklist de nao interferencia.

Observacao obrigatoria:
- nenhuma execucao tecnica (migrations, ETL, carga ou religacao de frontend) acontece nesta 3R.