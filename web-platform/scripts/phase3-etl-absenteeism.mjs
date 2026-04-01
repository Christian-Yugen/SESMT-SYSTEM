#!/usr/bin/env node

/*
 * DEPRECATED - FASE 2.5
 *
 * Este arquivo foi neutralizado na microfase de blindagem pre-FASE 3.
 * Nao possui logica de ETL e nao executa nenhuma operacao em banco.
 *
 * Referencia oficial:
 * - docs/ABSENTEISMO_INTELIGENTE_FASE_2_5_BLINDAGEM_PRE_FASE_3.md
 * - scripts/_quarantine/phase3-etl-absenteeism.experimental.mjs
 */

const blockedMessage = [
  'BLOQUEIO FASE 2.5: scripts/phase3-etl-absenteeism.mjs esta desativado.',
  'Este artefato foi marcado como deprecated e removido do fluxo operacional.',
  'A FASE 3 permanece NAO AUTORIZADA nesta microfase.',
  'Qualquer experimento local deve ocorrer somente em scripts/_quarantine/phase3-etl-absenteeism.experimental.mjs (offline-only).',
].join('\n');

console.error(blockedMessage);
process.exit(1);
