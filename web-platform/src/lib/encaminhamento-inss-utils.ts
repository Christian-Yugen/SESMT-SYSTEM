export const NON_EFETIVO_KEYWORDS = [
  "CONTRATADO",
  "TERCEIRIZADO",
  "ESTAGIARIO",
  "ESTAGIÁRIO",
  "TEMPORARIO",
  "TEMPORÁRIO",
  "COMISSIONADO",
  "TERCEIRO",
  "PJ",
  "SUBSTITUTO",
];

export function suggestEncaminhamentoInss(
  naturezaCargo?: string | null,
): boolean {
  if (!naturezaCargo) return false;
  const text = naturezaCargo.toString().toUpperCase();
  return NON_EFETIVO_KEYWORDS.some((kw) => text.includes(kw));
}

export default suggestEncaminhamentoInss;
