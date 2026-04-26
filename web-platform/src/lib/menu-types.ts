export type Role =
  | "admin"
  | "nurse"
  | "analytic_manager"
  | "doctor"
  | "viewer"
  | "social_assistant"
  | "operator";

export type MatchMode = "exact" | "startsWith" | "regex";

export interface MenuItem {
  id: string;
  label: string;
  path?: string; // may be absent for non-navigable items
  roles?: Role[]; // allowed roles (frontend UX); backend must enforce
  match?: MatchMode;
  disabled?: boolean;
  hidden?: boolean; // technical/hidden routes
}

export interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
  roles?: Role[]; // group-level visibility
}

export interface MenuConfig {
  groups: MenuGroup[];
}

export default MenuConfig;
