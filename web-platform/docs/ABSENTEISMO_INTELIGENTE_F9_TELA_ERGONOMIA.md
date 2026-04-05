# PRD — FASE 9: Tela de Vigilância Ergonômica (CID M / NR-17)

## 1. Objetivo
Implementar o dashboard de **Vigilância Ergonômica** do SESMT-SYSTEM, integrando sinais sentinela de adoecimento osteomuscular (CID M) com o inventário de riscos ergonômicos da NR-17 (Postura, Mobiliário, Levantamento de Peso e Organização do Trabalho).

## 2. Requisitos de Interface (UI/UX)
- **Rota**: `/afastamentos/ergonomia-analytics`
- **Abas**:
  - `Visão Geral`: Tabela hierárquica de intervenção por Secretaria e Cargo.
  - `Mapa de Riscos`: Catálogo de fatores ergonômicos e status de conformidade.
- **Componentes**: 
  - Cards executivos no topo (Total CID M, Dias Perdidos, Ações Críticas Abertas, Score Médio).
  - Tabela Hierárquica com expand/collapse por Secretaria.

## 3. Blocos Visuais Implementados
| Bloco | Descrição | Origem dos Dados |
| :--- | :--- | :--- |
| **A - Visão Executiva** | Cards sintéticos (Ocorrência CID M, Dias Perdidos, Score de Risco). | `ErgonomicPageModel` |
| **B - Hierarquia Operacional** | Tabela agrupada por Secretaria/Cargo/Unidade com ordenação por Score. | `signalsByAnalyticalGroup` |
| **C - Tendência Ergonômica** | Histograma de evolução mensal de sinais osteomusculares. | `model.view.trendData` |
| **D - Recorrência CID M** | Painel de monitoramento de clusters com alta reincidência de licenças. | `serverEventCounts` |
| **E - Mapa de Riscos** | Catálogo de fatores NR-17 (Postura, Mobiliário, Organização). | `activeFactors` |
| **F - Metodologia** | Rodapé e notas de prudência sobre a natureza sentinela do CID M. | Governança SESMT |

## 4. Origem dos Dados
- **Endpoint**: `/api/absenteismo/ergonomia-view`
- **Backend**: `src/lib/afastamentos-ergonomia.ts` (Esquema `abs_intel`).

## 5. Garantias Metodológicas
- **Vigilância Ativa**: O sistema busca padrões em CID M, G56, R29 para priorizar a gestão SESMT.
- **Não Causualidade**: Explicitamente declarado no rodapé que o CID M não confirma nexo automático.
- **Foco NR-17**: Integração com conceitos de AET (Análise Ergonômica do Trabalho).

## 6. Checklist de Implementação
- [X] Criação do Endpoint `/api/absenteismo/ergonomia-view`.
- [X] Implementação de `ErgonomicPageUtils` para transformação de UI.
- [X] Desenvolvimento da página principal com padrão de Smart Header e Tabela Hierárquica.
- [X] Auditoria de consistência semântica (NR-1 vs NR-17).

## 7. Relatório de Auditoria (Microfase F9.Z)
- **Status Técnico**: APROVADO.
- **Status Visual**: APROVADO (Aderente ao padrão v2.0.0).
- **Ajustes Realizados**: Correção de nomenclatura ("Ergonômico") e sincronização de métricas absolutas de sinal (musculoskeletalEvents).
- **Garantia Institucional**: A tela cumpre o requisito de vigilância sem inferência de nexo causal traumático/ergonômico automático.

**DECISÃO: FASE 9 APROVADA E FORMALMENTE ENCERRADA.**
