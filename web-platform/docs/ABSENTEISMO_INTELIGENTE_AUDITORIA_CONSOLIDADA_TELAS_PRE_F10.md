# Auditoria Consolidada de Telas: Absenteísmo Inteligente (Pré-Fase 10)

## A. Objetivo da Auditoria
Validar a maturidade, estabilidade e integridade semântica das telas analíticas do programa de absenteísmo, garantindo que a base visual e metodológica está sólida antes do início da **FASE 10 — Prevention Board**.

---

## B. Telas Auditadas

| Rota | Nome do Módulo | Finalidade Metodológica |
| :--- | :--- | :--- |
| `/afastamentos/cid-analytics` | Análise por CID | Estudo de agravos e causas médicas |
| `/afastamentos/epidemiologia` | Inteligência Epidemiológica | Visão executiva de indicadores (TAD, IFL, DML, IG) |
| `/afastamentos/psychosocial-analytics` | Vigilância Psicossocial | Gestão de riscos NR-1 (Saúde Mental - CID F) |
| `/afastamentos/ergonomia-analytics` | Vigilância Ergonômica | Gestão de riscos NR-17 (Musculoesquelético - CID M) |

---

## C. Status de Cada Tela

| Tela | Status | Observação |
| :--- | :--- | :--- |
| **CID Analytics** | ✅ Concluída | Sidebar unificada e Relatório Profissional (PDF) integrados. |
| **Epidemiologia** | ✅ Concluída | Motor de inteligência funcional; Integração com CID Analytics íntegra. |
| **Psychosocial** | ✅ Concluída | Semântica NR-1 correta; Escalonamento DEA operando. |
| **Ergonomia** | ✅ Concluída | Semântica NR-17 correta; Isolamento de CID M garantido. |

---

## D. Verificações de Integridade

### 1. Integração Epidemiologia ↔ CID Analytics
- **Status:** 🟢 Íntegra.
- **Verificação:** Cliques nos capítulos CID na visão epidemiológica disparam corretamente o filtro no CID Analytics.

### 2. Isolamento Semântico (Ergo vs. Psi)
- **Status:** 🟢 Garantido.
- **Psicossocial:** Focada em CID F (Mental) e vigilância NR-1.
- **Ergonomia:** Focada em CID M (Musculoesquelético) e vigilância NR-17.
- **Causalidade:** Ambas tratam afastamentos como "Sinais Sentinela", sem atribuir causalidade automática nexo-trabalho, respeitando o rigor técnico do SESMT.

### 3. Governança Visual
- **Status:** 🟢 Consistente.
- **Padrão:** Todas as telas utilizam o componente global `<Sidebar />` e seguem o layout de "Header Cinza + Títulos em Azul Institucional".

---

## E. Pendências Identificadas

| Pendência | Classificação | Impacto |
| :--- | :--- | :--- |
| Adicionar botão de "Relatório Analítico" em Ergo e Psi | **Recomendável** | Unifica a experiência de exportação de dados analíticos. |
| Padronização de Tooltips de Ajuda no Header | **Recomendável** | Melhora a UX para usuários não técnicos da gestão. |
| Remoção de flags de debug residuais em Epidemiologia | **Opcional** | Limpeza de código (`debugEpi`). |

---

## F. Riscos Residuais
- **Performance:** Telas com grandes intervalos de data podem sofrer latência no Supabase devido ao volume de joins (especialmente em Epidemiologia).
- **Semântica:** A distinção entre "Afastamento" e "Vigilância Ativa" precisa ser reforçada nos tooltips para evitar interpretações errôneas da gestão.

---

## G. Decisão sobre Prontidão para FASE 10

> [!IMPORTANT]
> **VEREDITO: PRONTO PARA INICIAR A FASE 10**

**Justificativa:** 
As fundações analíticas e metodológicas estão extremamente estáveis. O isolamento de riscos está implementado, a integração entre módulos opera sem erros e a governança visual está unificada. As pendências remanescentes são de caráter cosmético ou de refinamento de UX (Reports/Tooltips), não afetando a capacidade do sistema de avançar para o **Prevention Board**.

---

## H. Próximos Passos Seguros
1. **F10.1:** Desenhar o Mockup do Prevention Board (Painel Integrado).
2. **F10.2:** Consolidar os scores de Ergo e Psi em uma escala unificada de priorização.
3. **F10.3:** Implementar a barra de "Ações Preventivas Sugeridas".

---
*Gerado por SESMT-SYSTEM Audit Subagent em 2026-04-05.*
