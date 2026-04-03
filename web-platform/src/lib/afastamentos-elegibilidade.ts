/**
 * Política única de elegibilidade epidemiológica — SESMT-SYSTEM
 * Microfase A1 — Exclusão de Licença-Maternidade
 *
 * Regra canônica: um evento é maternidade se o campo de tipo de afastamento
 * (tipo_afastamento em public.afastamentos / tipo_licenca em abs_intel)
 * contém a palavra "MATERNIDADE" (sem acento, case-insensitive).
 *
 * Para registros legados com qualidade de preenchimento baixa em
 * tipo_afastamento, são usados sinais secundários nos campos CID
 * (cid_codigo, cid_descricao, cid_capitulo) — exclusivo para
 * public.afastamentos onde esses campos existem.
 */

import type { AfastamentoRecord } from "@/types";

// ---------------------------------------------------------------------------
// Constante canônica do marcador
// ---------------------------------------------------------------------------

export const MATERNITY_MARKER = "MATERNIDADE" as const;

// ---------------------------------------------------------------------------
// Normalização interna
// ---------------------------------------------------------------------------

function normalizeForMaternity(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[^\x00-\x7F]/g, "")
    .toUpperCase()
    .trim();
}

// ---------------------------------------------------------------------------
// Sinal primário — single string check
// ---------------------------------------------------------------------------

/**
 * Retorna true se o valor textual contém o marcador de maternidade.
 * Aplicável a tipo_afastamento (public.afastamentos) e tipo_licenca (abs_intel).
 */
export function isMaternitySignal(value: string | null | undefined): boolean {
  return normalizeForMaternity(value).includes(MATERNITY_MARKER);
}

// ---------------------------------------------------------------------------
// Verificação de registro — public.afastamentos (CID Analytics)
// ---------------------------------------------------------------------------

/**
 * Retorna true se um registro AfastamentoRecord é maternidade.
 *
 * Sinal primário: tipo_afastamento.
 * Sinais secundários (legado): cid_codigo, cid_descricao, cid_capitulo.
 * Os sinais secundários cobrem registros onde tipo_afastamento estava
 * vazio, mas o CID registrado indica claramente uma licença maternidade.
 */
export function isMaternityAfastamentoRecord(
  record: AfastamentoRecord,
): boolean {
  if (isMaternitySignal(record.tipo_afastamento)) return true;

  return (record.afastamento_cids ?? []).some(
    (cid) =>
      isMaternitySignal(cid.cid_codigo) ||
      isMaternitySignal(cid.cid_descricao) ||
      isMaternitySignal(cid.cid_capitulo),
  );
}

// ---------------------------------------------------------------------------
// Mensagem institucional de auditoria
// ---------------------------------------------------------------------------

/**
 * Retorna a mensagem padronizada de auditoria da exclusão.
 * Deve ser exibida em ambas as telas analíticas quando count > 0.
 */
export function buildMaternityExclusionAuditMessage(count: number): string {
  if (count === 0) return "";
  const plural = count > 1;
  return (
    `Licença maternidade não compõe esta análise epidemiológica. ` +
    `${count} registro${plural ? "s" : ""} excluído${plural ? "s" : ""} automaticamente.`
  );
}
