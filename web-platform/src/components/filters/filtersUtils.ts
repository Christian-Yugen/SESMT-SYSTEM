export type FilterState = {
  searchTerm: string;
  startDate: string;
  endDate: string;
  filterUser: string;
  filterSecretaria: string;
  filterAsoType: string;
};

export function normalizeSearchTerm(value: string): string {
  return value.trim();
}

export function normalizeCpfDigits(value: string): string {
  return value.replaceAll(/\D/g, "");
}

export function matchesUnifiedNameCpfSearch(
  name: string,
  cpf: string | null | undefined,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return true;

  const queryDigits = normalizeCpfDigits(normalizedQuery);
  const nameMatches = name
    .toLowerCase()
    .includes(normalizedQuery.toLowerCase());

  if (queryDigits.length === 0) {
    return nameMatches;
  }

  const cpfMatches = cpf
    ? normalizeCpfDigits(cpf).includes(queryDigits)
    : false;
  return nameMatches || cpfMatches;
}

export function countActiveFilters(state: Partial<FilterState>) {
  let c = 0;
  if (state.searchTerm && state.searchTerm.trim() !== "") c++;
  if (state.startDate && state.startDate.trim() !== "") c++;
  if (state.endDate && state.endDate.trim() !== "") c++;
  if (state.filterUser && state.filterUser !== "all") c++;
  if (state.filterSecretaria && state.filterSecretaria !== "all") c++;
  if (state.filterAsoType && state.filterAsoType !== "all") c++;
  return c;
}
