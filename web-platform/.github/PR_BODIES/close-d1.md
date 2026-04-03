Fechamento da trilha D1 — Validação Cruzada Epidemiologia ↔ CID Analytics

Resumo
- Esta PR fecha a microfase D1 (D1.Z) que validou a integração entre `/afastamentos/epidemiologia` e `/afastamentos/cid-analytics`.
- Registra a decisão metodológica canônica (inclusão por `startDate`) e adiciona testes que fixam o contrato temporal vigente.
- Não há alterações funcionais nesta PR; trata-se de documentação e testes de blindagem.

Arquivos alterados
- `src/lib/tests/afastamentos-cid-analytics-temporal.test.ts` (novo)
- `docs/ABSENTEISMO_INTELIGENTE_D1_VALIDACAO_CRUZADA_INTEGRACAO.md` (atualizado com seção D1.Z)

Checklist
- [x] Documentação atualizada (seção D1.Z)
- [x] Testes adicionados e executados localmente
- [x] Nenhuma mudança funcional introduzida
- [ ] Revisão metodológica para alterações futuras (se necessário)

Notas para o revisor
- Esta PR registra formalmente o encerramento da trilha D1. Revise a clareza do texto e a cobertura dos testes temporais.
- Para executar localmente (no diretório `web-platform`):
  - `npx vitest src/lib/tests/afastamentos-cid-analytics-temporal.test.ts`

Motivo
- Encerramento formal da microfase D1 e preparação para iniciar a próxima trilha (NR1 — psicossocial) em branch dedicada.
