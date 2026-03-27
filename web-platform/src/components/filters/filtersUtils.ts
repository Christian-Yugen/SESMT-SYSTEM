export function countActiveFilters(state: {
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  filterUser?: string;
  filterSecretaria?: string;
  filterAsoType?: string;
}) {
  let c = 0;
  if (state.searchTerm && state.searchTerm.trim() !== "") c++;
  if (state.startDate && state.startDate.trim() !== "") c++;
  if (state.endDate && state.endDate.trim() !== "") c++;
  if (state.filterUser && state.filterUser !== "all") c++;
  if (state.filterSecretaria && state.filterSecretaria !== "all") c++;
  if (state.filterAsoType && state.filterAsoType !== "all") c++;
  return c;
}
