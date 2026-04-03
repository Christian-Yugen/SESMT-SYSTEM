# A1 — Política de Elegibilidade Epidemiológica: Exclusão de Licença-Maternidade

**Versão:** 1.0  
**Status:** Implementado  
**Escopo:** `/afastamentos/epidemiologia` e `/afastamentos/cid-analytics`

---

## 1. Objetivo

Definir, implementar e documentar uma **política única e auditável** de elegibilidade para as análises de absenteísmo-doença no SESMT-SYSTEM, excluindo definitivamente registros de licença-maternidade dos dois módulos analíticos.

---

## 2. Motivação

Licença-maternidade é um evento fisiológico e legalmente garantido. Sua inclusão nos indicadores de absenteísmo-doença (TAD, IFL, DML, IG) distorce as métricas, penaliza secretarias com alta concentração de servidoras em idade fértil e inviabiliza comparações epidemiológicas entre unidades com perfil demográfico diferente.

---

## 3. Regra Formal

> **Um registro de afastamento deve ser excluído da análise de absenteísmo-doença se, e somente se, seu campo de tipo de afastamento/licença contiver a sequência de caracteres "MATERNIDADE" (sem acento, caixa alta, após normalização NFD).**

Signal de detecção:

```
normalize(value).toUpperCase().includes("MATERNIDADE")
```

Onde `normalize` remove acentos via decomposição NFD e elimina os caracteres não-ASCII.

---

## 4. Módulo Canônico

**Arquivo:** `src/lib/afastamentos-elegibilidade.ts`

Exporta:

| Símbolo | Tipo | Descrição |
|---|---|---|
| `MATERNITY_MARKER` | `string` | Constante `"MATERNIDADE"` |
| `isMaternitySignal(value)` | `function` | Detecta sinal em um único campo string |
| `isMaternityAfastamentoRecord(record)` | `function` | Detecta maternidade em um `AfastamentoRecord` completo (tipo + CIDs legados) |
| `buildMaternityExclusionAuditMessage(count)` | `function` | Gera mensagem de auditoria padronizada em PT-BR |

---

## 5. Campos de Detecção por Fonte

### `public.afastamentos` (CID Analytics)

Campo primário: `tipo_afastamento`  
Campos secundários (cobertura de dados legados): `afastamento_cids[].cid_codigo`, `afastamento_cids[].cid_descricao`, `afastamento_cids[].cid_capitulo`

Função aplicada: `isMaternityAfastamentoRecord(record)`

### `abs_intel.abs_fact_afastamento_evento` (Epidemiologia)

Campo: `tipo_licenca` (populado pelo ETL a partir de `tipo_afastamento`)  
Confirmação: migration `008_create_abs_intel_facts_and_staging.sql`, linha 17 (`tipo_licenca TEXT NOT NULL`)

Função aplicada: `isMaternitySignal(event.tipo_licenca)`

---

## 6. Pontos de Impacto no Sistema

| Arquivo | Mudança |
|---|---|
| `src/lib/afastamentos-elegibilidade.ts` | **Criado** — módulo canônico de elegibilidade |
| `src/lib/afastamentos-epidemiologia.ts` | `EpidemiologyEventRow` + campo `tipo_licenca: string \| null` |
| `src/lib/afastamentos-epidemiologia-application.ts` | SELECT de `abs_fact_afastamento_evento` + `tipo_licenca` |
| `src/lib/afastamentos-epidemiologia-contrato.ts` | Filtro de elegibilidade em `buildEpidemiologyConsumptionContract()`; campo `eligibility.excludedMaternityCount` no contrato |
| `src/lib/afastamentos-epidemiologia-page-utils.ts` | `EpidemiologySummaryModel` + `excludedMaternityCount`; populado a partir do contrato |
| `src/app/afastamentos/epidemiologia/page.tsx` | Aviso de exclusão exibido nos dois blocos de resumo quando `excludedMaternityCount > 0` |
| `src/app/afastamentos/cid-analytics/page.tsx` | Funções embutidas removidas; importa `isMaternityAfastamentoRecord` e `buildMaternityExclusionAuditMessage` do módulo canônico |

---

## 7. Auditoria

### CID Analytics

O contador `excludedMaternityCount` é exibido na interface via `buildMaternityExclusionAuditMessage(count)`:

> _"Licença-maternidade excluída desta análise epidemiológica. {N} registro(s) removido(s)."_

### Epidemiologia Geral

O contador `contract.eligibility.excludedMaternityCount` é:
1. Propagado ao `EpidemiologySummaryModel.excludedMaternityCount`
2. Exibido no bloco de resumo (ambas as resoluções de tela) via `buildMaternityExclusionAuditMessage(count)`

---

## 8. Garantias de Não-Interferência

- **ETL não é alterado.** Os eventos de maternidade continuam sendo ingeridos em `abs_fact_afastamento_evento`. A exclusão ocorre em tempo de análise, antes da entrada no motor epidemiológico.
- **Dados brutos preservados.** A tabela `public.afastamentos` não é modificada.
- **Filtro reversível.** A política é aplicada no contrato e na camada de aplicação, não no banco de dados.
- **CIDs secundários mantidos apenas para legado.** A cobertura por campos CID em `isMaternityAfastamentoRecord` é exclusiva para a fonte `public.afastamentos`, onde dados históricos podem ter `tipo_afastamento` nulo mas CID de maternidade preenchido.

---

## 9. Consistência Arquitetural

A assimetria de fontes entre as duas telas é intencional:

| Tela | Fonte | Campo de detecção |
|---|---|---|
| CID Analytics | `public.afastamentos` | `tipo_afastamento` (+ CIDs legados) |
| Epidemiologia | `abs_intel.abs_fact_afastamento_evento` | `tipo_licenca` |

A política unificada abstrai essa assimetria: o módulo `afastamentos-elegibilidade.ts` provê funções específicas para cada fonte, mantendo o signal de detecção idêntico (`MATERNIDADE`).

---

## 10. Testes

Os fixtures de teste nos arquivos abaixo foram atualizados para conformidade de tipo:

- `src/lib/tests/afastamentos-epidemiologia-consumo.test.ts` — `tipo_licenca: null` em todos os eventos
- `src/lib/tests/afastamentos-epidemiologia-endpoint.test.ts` — `tipo_licenca: null` no evento
- `src/lib/tests/afastamentos-epidemiologia-page-utils.test.ts` — `eligibility: { excludedMaternityCount: 0 }` no contrato minimal

---

_Documento canônico — qualquer alteração na política de elegibilidade deve ser refletida neste documento e no módulo `afastamentos-elegibilidade.ts`._
