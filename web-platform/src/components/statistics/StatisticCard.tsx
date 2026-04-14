"use client";

import type {
  StatisticCardBaseProps,
  StatisticCardInteractiveProps,
} from "./types";

type StatisticCardProps =
  | StatisticCardBaseProps
  | StatisticCardInteractiveProps;

const ACCENT_CLASSES: Record<
  NonNullable<StatisticCardBaseProps["accent"]>,
  string
> = {
  neutral: "border-l-slate-400 text-slate-600",
  primary: "border-l-[#1A3351] text-[#1A3351]",
  success: "border-l-emerald-500 text-emerald-700",
  warning: "border-l-amber-500 text-amber-700",
  danger: "border-l-[#E31E24] text-[#E31E24]",
  info: "border-l-blue-600 text-blue-700",
};

const VARIANT_CLASSES: Record<
  NonNullable<StatisticCardBaseProps["variant"]>,
  string
> = {
  informative: "bg-white",
  interactive:
    "bg-white hover:shadow-md hover:border-slate-300 active:shadow-sm",
  analytic: "bg-[#FCFCFC]",
};

function isInteractive(
  props: StatisticCardProps,
): props is StatisticCardInteractiveProps {
  return "onClick" in props;
}

export default function StatisticCard(props: Readonly<StatisticCardProps>) {
  const {
    title,
    value,
    subtitle,
    helperText,
    icon,
    accent = "neutral",
    variant = "informative",
    active = false,
    className = "",
    compact = false,
  } = props as any;

  const accentClass = ACCENT_CLASSES[accent];
  const variantClass = VARIANT_CLASSES[variant];

  const paddingClass = compact ? "px-2 py-1" : "px-3 py-2 sm:px-3.5 sm:py-2.5";
  const valueSizeClass = compact ? "text-lg" : "text-xl";
  const titleSizeClass = compact ? "text-[9px]" : "text-[10px]";
  const helperSizeClass = compact ? "text-[8px]" : "text-[9px]";

  const baseClass = [
    "StatisticCard w-full border border-slate-200 border-l-4",
    paddingClass,
    "rounded-none transition-all duration-150",
    "flex items-center justify-between gap-2",
    accentClass,
    variantClass,
    active ? "ring-2 ring-inset ring-slate-400/40" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className="min-w-0">
        <p className={`${titleSizeClass} font-semibold uppercase tracking-widest text-slate-400 leading-none`}>
          {title}
        </p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <h3 className={`${valueSizeClass} font-bold leading-none tabular-nums`}>{value}</h3>
          {subtitle ? (
            <span className="text-[9px] font-medium text-slate-500">
              {subtitle}
            </span>
          ) : null}
        </div>
        {helperText ? (
          <p className={`mt-1 ${helperSizeClass} font-medium uppercase tracking-wide text-slate-500`}>
            {helperText}
          </p>
        ) : null}
      </div>
      {icon ? (
        <div className="shrink-0 opacity-60" aria-hidden="true">
          {icon}
        </div>
      ) : null}
    </>
  );

  if (isInteractive(props)) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        disabled={props.disabled}
        className={`${baseClass} text-left ${props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
