"use client";

import type { StatisticCardBaseProps, StatisticCardInteractiveProps } from "./types";

type StatisticCardProps = StatisticCardBaseProps | StatisticCardInteractiveProps;

const ACCENT_CLASSES: Record<NonNullable<StatisticCardBaseProps["accent"]>, string> = {
  neutral: "border-slate-300 text-slate-700",
  primary: "border-[#1A3351] text-[#1A3351]",
  success: "border-emerald-500 text-emerald-700",
  warning: "border-amber-500 text-amber-700",
  danger: "border-[#E31E24] text-[#E31E24]",
  info: "border-blue-600 text-blue-700",
};

const VARIANT_CLASSES: Record<NonNullable<StatisticCardBaseProps["variant"]>, string> = {
  informative: "bg-white",
  interactive: "bg-white hover:-translate-y-px hover:shadow-md active:translate-y-0",
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
  } = props;

  const accentClass = ACCENT_CLASSES[accent];
  const variantClass = VARIANT_CLASSES[variant];

  const baseClass = [
    "w-full min-h-[72px] border-l-4 border border-r border-t border-b border-slate-200",
    "px-3 py-2.5 sm:px-3.5 sm:py-3",
    "rounded-none transition-all duration-150",
    "flex items-center justify-between gap-3",
    accentClass,
    variantClass,
    active ? "ring-1 ring-[#1A3351]/30" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className="min-w-0">
        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none">
          {title}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <h3 className="text-lg sm:text-xl font-bold leading-none">{value}</h3>
          {subtitle ? (
            <span className="text-[10px] font-medium text-slate-500">{subtitle}</span>
          ) : null}
        </div>
        {helperText ? (
          <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">
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
