/**
 * Tipos compartilhados para o sistema de filtros padronizado (Fase 5+).
 * Centraliza todos os tipos de domínio de filtros e variantes de componentes.
 */

// --- Tipos de Componentes de Filtro ---

/** Par chave/rótulo exibido nos chips de filtros ativos. */
export type FilterChip = {
  key: string;
  label: string;
};

/** Referência de operador para resolução de nome em filtros e chips. */
export interface ReferralOperatorEntry {
  generated_by: string;
  operator_name?: string;
}

/** Estado do popover aberto no CompactFilterBar. */
export type FilterPopoverState =
  | "date"
  | "user"
  | "secretaria"
  | "asoType"
  | null;

/** Variantes visuais do ActionIconButton. */
export type ActionButtonVariant =
  | "filter"
  | "primary"
  | "success"
  | "danger"
  | "contextual";

/** Contagem de filtros ativos — alias semântico para clareza. */
export type ActiveFilterCount = number;

/** Modo de busca no campo de pesquisa. */
export type SearchMode = "unified" | "name" | "cpf";

/** Configuração de um filtro contextual dinâmico. */
export interface ContextualFilterConfig {
  id: string;
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

// --- Tipos de Domínio do Sistema SESMT ---

/** Subtipos de ASO utilizados nos filtros de tipo. */
export type AsoSubtype = "ADMISS" | "DEMISS" | "RETORNO" | "all";

/** Turnos para filtro de relatórios históricos. */
export type ShiftType = "all" | "manha" | "tarde" | "noturno";

/** Natureza do cargo para filtro. */
export type CargoNatureType = "EFETIVO" | "COMISSIONADO" | "CELETISTA" | "all";

/** Status de requisições de exclusão. */
export type DeletionRequestStatus = "pending" | "approved" | "rejected";

/** Modo de busca no arquivo físico de pastas médicas. */
export type ArchiveSearchType = "cpf" | "nome" | "all";

/** Filtro de status de benefício de abono salarial. */
export type AbonoStatusFilter = "all" | "active" | "expired" | "finished";

/** Filtro de status de afastamento médico. */
export type AfastamentoStatusFilter =
  | "all"
  | "active"
  | "expired"
  | "alert"
  | "finished";

/** Ordenação de registros agrupados por servidor. */
export type SortOrder = "alphabetical" | "newest" | "oldest";

// --- Tipos para Componentes Recharts ---

/** Props do tick customizado para YAxis de gráficos de ranking (injetadas pelo Recharts em runtime). */
export type RechartsTickProps = {
  x?: number;
  y?: number;
  payload?: {
    value: string;
  };
};
