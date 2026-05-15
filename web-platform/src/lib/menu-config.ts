import type { MenuConfig, DecisionRequiredNavigationRoute } from "./menu-types";

const menuConfig: MenuConfig = {
  groups: [
    {
      id: "main",
      label: "Principal",
      items: [
        {
          id: "create-docs",
          label: "Criar documentos",
          path: "/",
          match: "exact",
          roles: ["admin", "nurse", "viewer", "operator"],
        },
        {
          id: "referrals",
          label: "Central de Evidências",
          path: "/referrals",
          match: "startsWith",
          roles: ["admin", "nurse", "analytic_manager", "doctor", "operator"],
        },
      ],
    },
    {
      id: "benefits",
      label: "Benefícios",
      items: [
        {
          id: "afastamentos",
          label: "Listagem Geral",
          path: "/afastamentos",
          match: "startsWith",
          roles: ["admin", "nurse", "analytic_manager", "doctor"],
        },
        {
          id: "cid-analytics",
          label: "CID Analytics",
          path: "/afastamentos/cid-analytics",
          match: "startsWith",
          roles: ["admin", "nurse", "analytic_manager", "doctor"],
        },
        {
          id: "epidemiologia",
          label: "Epidemiologia",
          path: "/afastamentos/epidemiologia",
          match: "startsWith",
          roles: ["admin", "nurse", "analytic_manager", "doctor"],
        },
        {
          id: "psychosocial",
          label: "Psicossocial",
          path: "/afastamentos/psychosocial-analytics",
          match: "startsWith",
          roles: ["admin", "nurse", "analytic_manager", "doctor"],
        },
        {
          id: "ergonomia",
          label: "Ergonomia",
          path: "/afastamentos/ergonomia-analytics",
          match: "startsWith",
          roles: ["admin", "nurse", "analytic_manager", "doctor"],
        },
        {
          id: "maternidade",
          label: "Lic. Maternidade",
          path: "/afastamentos/maternidade",
          match: "startsWith",
          roles: ["admin", "nurse", "analytic_manager", "doctor"],
        },
        {
          id: "afastamentos-portarias",
          label: "Portarias",
          path: "/afastamentos/portarias",
          match: "startsWith",
          roles: ["admin", "nurse", "analytic_manager", "doctor"],
        },
      ],
    },
    {
      id: "abono",
      label: "Abono",
      items: [
        {
          id: "abono-panel",
          label: "Painel de Gestão",
          path: "/abono",
          match: "startsWith",
          roles: ["admin", "analytic_manager", "social_assistant"],
        },
        {
          id: "abono-portarias",
          label: "Portarias",
          path: "/abono/portarias",
          match: "startsWith",
          roles: ["admin", "analytic_manager", "social_assistant"],
        },
        {
          id: "abono-lei",
          label: "Legislação e Regras",
          path: "/abono/lei",
          match: "startsWith",
          roles: ["admin", "analytic_manager", "doctor", "social_assistant"],
        },
        {
          id: "abono-atestados",
          label: "Atestados",
          path: "/abono/atestados",
          match: "startsWith",
          roles: ["admin", "nurse", "analytic_manager", "doctor"],
        },
      ],
    },
    {
      id: "history",
      label: "Histórico",
      items: [
        {
          id: "history-log",
          label: "Log Principal",
          path: "/history",
          match: "startsWith",
          roles: ["admin", "nurse", "analytic_manager", "doctor"],
        },
        {
          id: "analytics",
          label: "Indicadores BI",
          path: "/analytics",
          match: "startsWith",
          roles: ["admin", "nurse", "analytic_manager", "doctor"],
        },
      ],
    },
    {
      id: "archive_admin",
      label: "Arquivos & Administração",
      items: [
        {
          id: "archive",
          label: "Arquivo Médico",
          path: "/archive",
          match: "startsWith",
          roles: ["admin"],
        },
        {
          id: "users",
          label: "Gestão de Usuários",
          path: "/users",
          match: "startsWith",
          roles: ["admin"],
        },
        {
          id: "deletion-requests",
          label: "Exclusões Pendentes",
          path: "/deletion-requests",
          match: "startsWith",
          roles: ["admin"],
        },
      ],
    },
  ],
};

export const hiddenNavigationRoutes: string[] = [
  "/login",
  "/reset-password",
  "/abono/new",
  "/abono/edit/[id]",
  "/abono/portarias/new",
  "/abono/portarias/edit/[id]",
  "/afastamentos/new",
];

export const decisionRequiredNavigationRoutes: DecisionRequiredNavigationRoute[] = [
  {
    path: "/abono/analytics",
    reason:
      "Rota existente no App Router; decidir se deve entrar no grupo Abono ou permanecer como análise técnica/oculta.",
  },
];

export default menuConfig;
