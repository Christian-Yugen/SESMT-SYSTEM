/**
 * Shared display utilities for canonical record items.
 * Used across /referrals, /afastamentos, /abono, /abono/portarias, /history.
 */

/**
 * Masks a CPF string to the standard xxx.xxx.xxx-xx format.
 * Returns "---" if the CPF is empty or invalid.
 */
export function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return "---";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "---";
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formats a YYYY-MM-DD date string to dd/mm/yyyy (pt-BR).
 * Returns "---" for null, undefined, "None", or unparseable input.
 */
export function formatDateBR(date: string | null | undefined): string {
  if (!date || date === "None" || date === "null") return "---";
  try {
    const parts = date.split("-");
    if (parts.length !== 3) return date;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    return new Date(year, month, day).toLocaleDateString("pt-BR");
  } catch {
    return "---";
  }
}

/**
 * Formats an ISO date-time string to dd/mm/yy HH:mm (pt-BR).
 * Returns "---" for null or unparseable input.
 */
export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return "---";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "---";
  }
}
