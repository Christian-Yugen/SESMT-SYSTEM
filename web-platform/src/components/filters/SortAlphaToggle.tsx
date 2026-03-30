"use client";

import { ArrowDownAZ, ArrowDownWideNarrow } from "lucide-react";

interface Props {
  active: boolean;
  onToggle: () => void;
  count?: number;
}

export default function SortAlphaToggle({
  active,
  onToggle,
  count,
}: Readonly<Props>) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        title={
          active
            ? "Ordenação alfabética ativa — clique para voltar à ordem cronológica"
            : "Ordenar alfabeticamente (A→Z)"
        }
        aria-label={
          active
            ? "Desativar ordenação alfabética"
            : "Ativar ordenação alfabética"
        }
        aria-pressed={active}
        onClick={onToggle}
        className={`h-8 px-2.5 flex items-center gap-1.5 border shadow-sm transition-all duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1A3351] ${
          active
            ? "bg-[#1A3351] border-[#1A3351] text-white"
            : "bg-white/80 border-slate-300 text-slate-500 hover:border-slate-400 hover:text-[#1A3351]"
        }`}
      >
        {active ? (
          <ArrowDownAZ className="w-3.5 h-3.5" />
        ) : (
          <ArrowDownWideNarrow className="w-3.5 h-3.5" />
        )}
        <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
          {active ? "A–Z" : "Recentes"}
        </span>
      </button>
      {count !== undefined && (
        <span className="text-[9px] font-medium text-slate-500 uppercase tabular-nums">
          {count} {count === 1 ? "resultado" : "resultados"}
        </span>
      )}
    </div>
  );
}
