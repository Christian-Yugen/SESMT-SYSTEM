# TEMPLATE OPERACIONAL PARA EXECUÇÃO DE FASE

**Versão:** 1.0.0  
**Data de criação:** 31 de março de 2026  
**Propósito:** Padronizar como cada fase será documentada, executada e validada.

---

## INSTRUÇÕES DE USO

1. Copie este template para `NOME_DA_FASE_RELATORIO_EXECUCAO.md` no início da fase  
2. Preencham os campos conforme progride a fase  
3. Ao final da fase, complete a seção de decisão e envie para aprovação  
4. Use este documento como fonte única de verdade para status da fase  

---

## CABEÇALHO OBRIGATÓRIO

```
FASE [número]: [nome da fase em CAPS]
Status Atual: IN PROGRESS / BLOCKED / COMPLETED
Data de Início: YYYY-MM-DD
Data Estimada de Término: YYYY-MM-DD
Responsável Principal: [Nome do especialista]
Documentação Canônica: ABSENTEISMO_INTELIGENTE_BACKLOG_MACRO.md
```

---

## 1. OBJETIVO DA FASE

**Copie exatamente do backlog macro desta fase.**

Exemplo:
```
Detalhar schema, campos, normalização, integridade referencial, 
políticas de RLS, garantias de qualidade.
```

---

## 2. CONTEXTO E ENTRADAS

### Contexto
Descreva o que levou a esta fase (resultado da fase anterior, decisão tomada, mudança de escopo).

### Entradas Necessárias
Liste tudo que de fora precisa ser fornecido para a fase funcionar:
- [ ] Documento de FASE N-1 aprovado
- [ ] Dados de X (especificar fonte)
- [ ] Aprovação de Y (quem?)
- [ ] Recurso humano Z disponível
- [ ] Outros: ...

**Status de Entradas:**
- [ ] Todas as entradas confirmadas
- [ ] Bloqueador(es) identificado(s) (descrever)
- [ ] Plano B em caso de falta de entrada (descrever)

---

## 3. ARQUIVOS ESPERADOS

Liste todos os entregáveis de código/documentação/dados esperados, com status de criação.

### Documentação
- [ ] `docs/FASE_X_RELATORIO_EXECUCAO.md` (este arquivo)
- [ ] `docs/FASE_X_ESPECIFICACAO.md` (se aplicável)
- [ ] Outros docs: ...

### Código (Libs)
- [ ] `src/lib/nova-lib-1.ts`
- [ ] `src/lib/nova-lib-2.ts`
- [ ] Outros: ...

### Código (Páginas/Componentes)
- [ ] `src/app/rota-nova/page.tsx`
- [ ] `src/components/novo-componente.tsx`
- [ ] Outros: ...

### Schema/SQL (se aplicável)
- [ ] `database/migrations/YYYYMM_descricao.sql`
- [ ] `database/migrations/YYYYMM_rollback.sql`
- [ ] Outros: ...

### Dados/Assets
- [ ] Arquivo de load bulk (ex: `data/servidor-enriquecido.csv`)
- [ ] Scripts de validação: ...

---

## 4. CRITÉRIOS DE ACEITE

**Copie exatamente do backlog macro desta fase, e marque conforme completam.**

Exemplo para FASE 1:
```
- [ ] Spec revisada por 2+ DBA
- [ ] Zero ambiguidades em tipos de dado, ranges, regras
- [ ] Validação de compatibilidade com Supabase PostgreSQL
- [ ] Arquivo de rejeição de dados (exemplos do que NÃO é incluído)
```

---

## 5. EVIDÊNCIAS OBRIGATÓRIAS

Para cada critério de aceite acima, liste a prova/artefato que valida:

| Critério | Evidência | Status |
|----------|-----------|--------|
| "Spec revisada por 2+ DBA" | Aprovação documentada no arquivo de spec (comentário, assinatura) | ✓ / ✗ / ⏳ |
| "Zero ambiguidades..." | Questões abertas do DBA resolvidas, doc atualizado | ✓ / ✗ / ⏳ |
| "Compatibilidade Supabase" | Script de validação rodado, resultado positivo | ✓ / ✗ / ⏳ |
| Outras: ... | ... | ... |

---

## 6. TESTES EXECUTADOS

Liste todos os testes que foram rodados.

### Testes Unitários
- [ ] Função X funciona corretamente
- [ ] Função Y retorna erro quando entrada é inválida
- [ ] Outros: ...

**Resultado:** PASS / FAIL / PARTIAL  
**Log:** Anexar ou referenciar arquivo de log de testes

### Testes de Integração
- [ ] Lib X integra com Supabase sem erro
- [ ] Migração SQL executa e rollback reverte
- [ ] Página carrega dados corretamente
- [ ] Outros: ...

**Resultado:** PASS / FAIL / PARTIAL  
**Log:** Anexar ou referenciar arquivo

### Testes de Regressão
- [ ] CID Analytics continua funcionando normalmente (ação obrigatória em todas as fases)
- [ ] Outras features existentes não quebram
- [ ] Performance não piorou (testar load time antes/depois)

**Resultado:** PASS / FAIL / PARTIAL  
**Log:** Referenciar teste

### Testes de Qualidade de Dados (if applicable)
- [ ] Dados carregados: contagem OK (comparecom fonte de verdade)
- [ ] Integridade referencial: zero FK órfãs
- [ ] Idempotência: rodar load 2x não cria duplicatas
- [ ] Outliers / invalidade: documentados e tratados

**Resultado:** PASS / FAIL / PARTIAL  
**Log:** Relatório de qualidade de dados

---

## 7. PROBLEMAS ENCONTRADOS E CORREÇÕES

Documente cada problema (bug, design flaw, bloqueador) encontrado durante execução e como foi resolvido.

### Problema #1: [Título]
- **Descrição:** Ao tentar fazer X, obtiveY.
- **Raiz:** Explicar por que aconteceu.
- **Solução aplicada:** Como foi corrigido. 
- **Validação:** Como confirmar que está correto.
- **Status:** FIXED / WORKAROUND / PENDING

### Problema #2: [Título]
- **Descrição:** ...
- **Raiz:** ...
- **Solução:** ...
- **Status:** ...

(Adicionar quantos forem necessários)

---

## 8. PENDÊNCIAS

Descreva tudo que foi planejado mas NÃO foi executado.

- [ ] Item A: Motivo (bloqueador? recursos? escopo mudou?)
- [ ] Item B: Motivo
- [ ] Outros:

**Impacto:** Esta pendência bloqueia próxima fase? Descrever.

---

## 9. MÉTRICAS E OBSERVAÇÕES

### Métricas de Execução
- Linhas de código adicionadas/modificadas: [número]
- Arquivos criados: [número]
- Executar script rodou X vezes com status: PASS/FAIL
- Testes escritos: [número]
- Testes passando: [número] / [total]

### Horas Gastas
- Planejamento: [H] horas
- Desenvolvimento: [H] horas
- Testes: [H] horas
- Documentação: [H] horas
- **Total:** [H] horas estimadas vs [H] reais

### Observações Críticas
- Qualidades positivas encontradas:
  - ...
- Riscos detectados para próximas fases:
  - ...
- Facilidades para reusar em próximas fases:
  - ...

---

## 10. ASSINATURA E APROVA ÇÃO

### Responsável Principal
- Nome: _______________
- Data: ________________
- Status: ✓ VALIDADO / ⚠ COM RESSALVAS / ✗ REJEITADO

### Revisor Técnico (obrigatório)
- Nome: _______________
- Data: ________________
- Observações: _________
- Status: ✓ APROVADO / ⚠ PENDÊNCIAS / ✗ REJEITAR

### Aprovador de Programa
- Nome: _______________
- Data: ________________
- Autoridade: Aprovação de Política/Arquitetura
- Status: ✓ LIBERADO / ⚠ ANÁLISE ADICIONAL / ✗ BLOQUEADO

---

## 11. DECISÃO FINAL: CORRIGIR / ACEITAR / AVANÇAR

No final da fase, escolha UMA opção:

### ✓ ACEITAR E AVANÇAR

Use quando:
- Todos os critérios estão OK
- Testes passam
- Documentação completa
- Nenhum bloqueador para próxima fase

**Ação:** Merge para main, cria branch de FASE N+1

---

### ⚠ ACEITAR COM RESSALVA E AVANÇAR

Use quando:
- Critérios principais estão OK
- Existem pendências pequenas não-críticas (ex: documentação incompleta, performance para otimizar depois)
- Próxima fase não é bloqueada

**Ressalvas identificadas:**
- [ ] Pendência A: Resolver até FASE N+1 ou N+2?
- [ ] Pendência B: ...

**Ação:** Merge com anotação de pendências, cria branch de FASE N+1

---

### ✗ REJEITAR E CORRIGIR

Use quando:
- Critérios principais não estão OK
- Problemas críticos não foram resolvidos
- Testes crucial falhando
- Bloqueador para próxima fase

**Motivo da rejeição:**
- [ ] Critério X falhou
- [ ] Problema Y não foi resolvido
- [ ] Evidência Z falta

**Ação:** Volta para desenvolvimento, gera PR corretivo, re-submete para aprovação

---

## DECISÃO FINAL (marque uma):

- [ ] ✓ ACEITAR E AVANÇAR
- [ ] ⚠ ACEITAR COM RESSALVA E AVANÇAR
- [ ] ✗ REJEITAR E CORRIGIR

**Justificativa:**

```
[Descrever brevemente por que essa decisão]
```

---

## LOG DE SUBMISSÕES

| Data | Versão | Status | Reviewer | Obs |
|------|--------|--------|----------|-----|
| 2026-03-31 | 0.1 | DRAFT | Agent | Inicial |
| YYYY-MM-DD | 0.2 | REVIEW | DBA | Cor
reções schema |
| YYYY-MM-DD | 1.0 | APPROVED | Program Manager | Liberado |

---

**Template consolidado em:** 31 de março de 2026  
**Mantido por:** Programa de Inteligência em Absenteísmo
