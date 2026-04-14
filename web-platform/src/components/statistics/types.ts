import type { ReactNode } from "react";

export type StatisticCardVariant = "informative" | "interactive" | "analytic";

export type StatisticCardAccent =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface StatisticCardBaseProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  helperText?: ReactNode;
  icon?: ReactNode;
  accent?: StatisticCardAccent;
  variant?: StatisticCardVariant;
  active?: boolean;
  className?: string;
  compact?: boolean;
}

export interface StatisticCardInteractiveProps extends StatisticCardBaseProps {
  onClick: () => void;
  disabled?: boolean;
}

export interface StatisticCardSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export interface StatisticCardRowProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}
