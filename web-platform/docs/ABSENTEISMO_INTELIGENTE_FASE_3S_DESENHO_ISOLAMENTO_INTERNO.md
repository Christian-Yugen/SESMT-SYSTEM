# ABSENTEISMO INTELIGENTE - FASE 3S

## DESENHO TECNICO DO ISOLAMENTO INTERNO NO SESMT-SYSTEM

Status: CONCLUIDA (desenho tecnico documental)
Data: 2026-04-02
Natureza: documental e arquitetural, sem execucao tecnica nesta microfase.

---

## A) Objetivo da microfase

Definir tecnicamente como o isolamento interno do novo dominio de absenteismo sera implementado dentro do projeto atual `SESMT-System`, sem tocar no legado operacional e sem executar mudancas no banco nesta etapa.

---

## B) Estado atual da governanca

- FASE 3 formalmente reaberta na 3R.
- Rota de HML separado preservada como historico documental.
- Nova rota ativa: isolamento interno rigido no projeto atual `SESMT-System`.
- FASE 4 permanece bloqueada.
- ETL real permanece bloqueado.
- Nenhuma migration e aplicada nesta 3S.

---

## C) Principio arquitetural do isolamento

- additive-only para estruturas do novo dominio.
- zero impacto no legado operacional ativo.
- nenhuma alteracao destrutiva em estruturas existentes.
- nenhuma mudanca em contratos ja consumidos pelo frontend atual.
- nenhum toque em `/afastamentos/cid-analytics`.

---

## D) Fronteiras do legado x novo dominio

### Legado atual (nao pode ser tocado)
- tabelas e contratos ja usados pela plataforma operacional atual.
- rotas e telas existentes em producao.
- estruturas de autenticacao e bibliotecas compartilhadas atuais.
- modulo `/afastamentos/cid-analytics` (preservacao expressa).

### Novo dominio de absenteismo (escopo futuro)
- estruturas analiticas proprias de absenteismo ocupacional.
- dimensoes, fatos e artefatos auxiliares novos para pipeline controlado.
- staging isolado exclusivo do novo dominio.

### Tabelas atuais como leitura/referencia
- tabelas operacionais existentes podem ser usadas apenas como fonte de leitura controlada para composicao de carga.
- proibido alterar, renomear ou reutilizar tabelas atuais como staging temporario.

### Estruturas novas que precisarao existir
- schema isolado para absenteismo (preferencial).
- tabelas novas de dimensao/fato do dominio.
- constraints e indices dedicados ao novo dominio.
- staging novo segregado.
- views/funcoes auxiliares novas quando justificadas.

### Proibicoes de staging
- proibido usar tabelas legadas para staging intermediario.
- proibido misturar staging novo com estruturas atuais da plataforma.

---

## E) Estrategia de isolamento estrutural

Decisao tecnica preferencial desta fase:
- usar schema isolado dentro do mesmo projeto `SESMT-System` para todo o novo dominio de absenteismo.

Diretriz de contingencia (somente se houver limitacao tecnica real comprovada):
- adotar segregacao equivalente explicitamente documentada, mantendo separacao de objetos, naming, permissao e trilha de auditoria.

---

## F) Estrategia de nomenclatura

Padrao para evitar colisao com legado:
- schema novo: `abs_intel` (preferencial) ou nome equivalente aprovado em gate.
- tabelas: prefixo `abs_`.
- views: prefixo `vw_abs_`.
- funcoes: prefixo `fn_abs_`.
- staging: prefixo `stg_abs_`.
- artefatos temporarios: prefixo `tmp_abs_` com sufixo de rastreio de execucao.

Regra de naming:
- nenhum objeto novo pode reutilizar nome de objeto ja existente no legado atual.

---

## G) Contratos de nao interferencia

- proibido alterar tabelas ja usadas pela plataforma atual.
- proibido reaproveitar staging em tabelas atuais.
- proibido alterar rotas e telas existentes.
- proibido religar leitura do frontend atual ao novo dominio nesta fase.
- proibido alterar auth e shared libs por causa desta fase.

---

## H) Inventario do que precisara ser criado depois

Sem criar nada nesta 3S, os alvos das proximas microfases serao:
- schema isolado.
- tabelas novas do dominio.
- constraints novas.
- indices novos.
- staging novo.
- views auxiliares (se necessario).
- funcoes auxiliares (se necessario).

---

## I) Gates antes de migrations

Checklist obrigatorio para abrir 3U/3V:
- desenho tecnico aprovado.
- fronteiras legado x novo dominio aprovadas.
- naming aprovado.
- rollback definido por etapa.
- nao interferencia validada formalmente.

Regra:
- sem 100% dos gates aprovados, migrations continuam bloqueadas.

---

## J) Criterios de rollback arquitetural

A estrategia deve ser revista antes de aplicar migrations se houver:
- risco concreto de colisao com objetos legados.
- necessidade de alteracao destrutiva em estrutura existente.
- evidencia de quebra de contrato consumido pelo frontend atual.
- inviabilidade de manter staging segregado.
- duvida nao resolvida sobre nao interferencia no modulo `/afastamentos/cid-analytics`.

---

## K) Proximas microfases reorganizadas

Sequencia consolidada:
- 3S - desenho tecnico do isolamento interno.
- 3T - auditoria de impacto no projeto atual.
- 3U - package de migrations additive-only para isolamento interno.
- 3V - aplicacao controlada das migrations.
- 3W - ETL controlado no isolamento interno.
- 3X - validacao da carga.

---

## L) Proximo passo seguro

Proxima microfase:
- 3T - auditoria de impacto no projeto atual.

Observacao obrigatoria:
- nenhuma migration ocorre nesta 3S.
