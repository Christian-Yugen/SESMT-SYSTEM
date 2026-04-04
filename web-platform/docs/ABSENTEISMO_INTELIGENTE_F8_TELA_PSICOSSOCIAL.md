# ABSENTEISMO_INTELIGENTE - FASE 8

## Tela de Psychosocial Analytics (NR-1)

Data de execução: 04 de Abril de 2026  
Status: **CONCLUÍDO**

---

### A. Objetivo da fase
Criar a camada visual especializada para vigilância epidemiológica de agravos compatíveis com risco psicossocial (NR-1), integrando sinais sentinela (CID F e correlatos) com o inventário de avaliações psicossociais já modelado no backend.

### B. Finalidade institucional da tela
Apoiar o SESMT na **priorização de ações preventivas** e investigações técnicas. A tela serve como um painel de vigilância que aponta onde há maior compatibilidade de risco, permitindo intervenções direcionadas antes que o agravo se torne crônico ou coletivo.

### C. Blocos visuais implementados

| Bloco | Descrição | Origem dos Dados |
| :--- | :--- | :--- |
| **A - Visão Executiva** | Cards com total de licenças mentais, dias perdidos e score médio de criticidade. | `integrateRiskProfile` |
| **B - Tabela Hierárquica** | Agrupamento por Secretaria/Cargo/Unidade com ordenação por Score de Criticidade e Dias Perdidos. | `signalsByAnalyticalGroup` |
| **C - Inteligência CID-F** | Detalhamento de CIDs vinculados por cargo e contagem de profissionais impactados. | `associatedCids / impactedServerCount` |
| **D - Mapa de Fatores** | Resumo dos domínios psicossociais (Organização, Conteúdo) aguardando coleta de questionários. | `activeFactors` |
| **E - Metodologia** | Notas de rodapé reforçando a natureza de 'Sinal Sentinela' e ausência de nexo automático. | Governança SESMT |

### D. Origem dos dados consumidos
Os dados são servidos pelo endpoint interno:
- **Rota**: `/api/absenteismo/psychosocial-view`
- **Lib Backend**: `src/lib/afastamentos-psychosocial.ts`
- **Schema**: `abs_intel`
- **Filtros**: `startDate`, `endDate`

### E. Garantias metodológicas
Conforme exigido pelo programa:
- **Prudência no Nexo**: A tela utiliza termos como "Sinal Sentinela" e "Hipótese Ocupacional Reforçada", evitando afirmar nexo causal automático.
- **Transparência**: O score é composto por thresholds explicáveis (Concentração CID F, Recorrência, Tendência, Dias Perdidos e Exposição Média).
- **Consistência**: CID F é lido do schema analítico `abs_intel`.

### F. Relatório de Auditoria (Microfase F8.Z)
- **Status**: **FASE 8 APROVADA E LIBERADA PARA INÍCIO DA FASE 9**
- **Arquivos Auditados**: `src/app/afastamentos/psychosocial-analytics/page.tsx`, `src/lib/afastamentos-psychosocial.ts`.
- **Achados**:
  - [CORRIGIDO] Ruído de texto redundante na aba de fatores.
  - [CONSOLIDADO] Hierarquia visual unificada em tabela hierárquica superior ao sistema de múltiplos rankings anterior.
- **Decisão**: A fase está metodologicamente íntegra e pronta para herdar a camada ergonômica (Fase 9).

### G. Próximos passos seguros
- [X] Auditoria de fechamento da Fase 8.
- [ ] Ativação da **Fase 9: Camada Ergonômica (NR-17)**.
- [ ] Implementação do **Prevention Board** para acompanhamento do status de execução das ações recomendadas nesta tela.

---
**Marcador de Trilha:**
RETOMAR_TRILHA_GERAL_ABSENTEISMO_INTELIGENTE
