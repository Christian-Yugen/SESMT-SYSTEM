"use client";

import type { StatisticCardSectionProps } from "./types";

export default function StatisticCardsSection({
  children,
  title,
  description,
  className = "",
}: Readonly<StatisticCardSectionProps>) {
  return (
    <section className={`space-y-2.5 ${className}`}>
      {title ? (
        <div className="px-0.5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#1A3351]">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
