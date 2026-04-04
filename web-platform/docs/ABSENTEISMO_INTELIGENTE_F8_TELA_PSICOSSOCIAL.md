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
| **B - Rankings de Recorte** | Listagem das secretarias, cargos e unidades com maior score de criticidade psicossocial. | `cuts.secretaria / cuts.cargo` |
| **C - Sinais Sentinela** | Feed de ocorrências recentes de CID F e seus respectivos cargos/locais. | `assessmentSummaries` |
| **D - Prioridades NR-1** | Painel lateral com justificativas auditáveis para os grupos em alerta. | `signalsByAnalyticalGroup` |
| **E - Mapa de Fatores** | Resumo dos fatores psicossociais ativos (NR-1) por domínio (ex: Organização, Conteúdo). | `activeFactors` |
| **F - Metodologia** | Rodapé explicativo reforçando a diferença entre sinal sentinela e causalidade. | Governança SESMT |

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
- **Consistência**: CID F é lido do schema analítico `abs_intel`, garantindo que os dados já passaram pelo processo de higienização e de-duplicação.

### F. Limitações conhecidas
1.  **Sincronização**: O dashboard depende da carga do schema `abs_intel`. Dados inseridos no legado operacional hoje só aparecerão após o próximo ciclo de ETL/Geração.
2.  **Ações Recomendadas**: As ações nos cards de prioridade são inferidas pela criticidade do risco quando não há plano de ação explícito no banco.

### G. Próximos passos seguros
- [ ] Ativação da **Fase 9: Camada Ergonômica (NR-17)**.
- [ ] Implementação do **Prevention Board** para acompanhamento do status de execução das ações recomendadas nesta tela.

---
**Marcador de Trilha:**
RETOMAR_TRILHA_GERAL_ABSENTEISMO_INTELIGENTE
