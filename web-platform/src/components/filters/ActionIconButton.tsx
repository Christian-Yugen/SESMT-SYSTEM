"use client";

import React, { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

type Variant = "filter" | "primary" | "success" | "danger" | "contextual";

interface Props {
  icon: React.ReactNode;
  label: string;
  variant?: Variant;
  onClick?: () => void;
  active?: boolean;
  open?: boolean;
  onToggle?: (nextOpen: boolean) => void;
  showMenuIndicator?: boolean;
  children?: React.ReactNode;
  className?: string;
}

function getVariantClasses(variant: Variant, active: boolean, open: boolean) {
  if (variant === "filter") {
    if (active) {
      return "bg-[#1A3351] border-[#1A3351] text-white";
    }
    if (open) {
      return "bg-slate-100 border-slate-300 text-[#1A3351]";
    }
    return "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-[#1A3351]";
  }

  if (variant === "success") {
    if (active || open) {
      return "bg-emerald-700 border-emerald-500 text-white";
    }
    return "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700";
  }

  if (variant === "danger") {
    if (active || open) {
      return "bg-[#b91c1c] border-[#ef4444] text-white";
    }
    return "bg-[#E31E24] border-[#E31E24] text-white hover:brightness-110";
  }

  if (variant === "contextual") {
    if (active || open) {
      return "bg-[#7C2D12] border-[#9A3412] text-white";
    }
    return "bg-[#FDE68A] border-[#F59E0B] text-[#7C2D12] hover:bg-[#FCD34D] hover:border-[#D97706]";
  }

  if (active || open) {
    return "bg-blue-600 border-blue-400 text-white";
  }

  return "bg-[#1A3351] border-[#1A3351] text-white hover:brightness-110";
}

export default function ActionIconButton({
  icon,
  label,
  variant = "primary",
  onClick,
  active = false,
  open = false,
  onToggle,
  showMenuIndicator = false,
  children,
  className,
}: Readonly<Props>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !onToggle || !children) return;

    const closePopover = onToggle;

    function handleOutsideClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        closePopover(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [children, onToggle, open]);

  const buttonStateClass = getVariantClasses(variant, active, open);

  const handleButtonClick = () => {
    if (onToggle) {
      onToggle(!open);
      return;
    }

    onClick?.();
  };

  return (
    <div
      className={`relative group shrink-0 ${className ?? ""}`.trim()}
      ref={ref}
    >
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={handleButtonClick}
        className={`relative h-9 w-9 flex items-center justify-center border shadow-sm rounded-none transition-all duration-150 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1A3351] ${buttonStateClass}`}
      >
        <span className="flex items-center justify-center">{icon}</span>
        {showMenuIndicator && (
          <ChevronDown
            className={`absolute bottom-0.5 right-0.5 h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      <span className="pointer-events-none absolute top-full right-0 mt-2 whitespace-nowrap border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#1A3351] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>

      {open && children && (
        <div className="absolute right-0 top-11 z-[110]">{children}</div>
      )}
    </div>
  );
}
