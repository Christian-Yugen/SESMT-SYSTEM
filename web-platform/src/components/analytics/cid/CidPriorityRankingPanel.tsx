"use client";

import { Layers3 } from "lucide-react";
import type {
  ManagerialPriorityLevel,
  PriorityRankingItem,
} from "@/components/analytics/cid/types";

interface CidPriorityRankingPanelProps {
  title: string;
  subtitle: string;
  items: PriorityRankingItem[];
  volumeLabel: string;
  scoreFormulaLabel: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getLevelLabel(level: ManagerialPriorityLevel): string {
  if (level === "prioridade-critica") return "Prioridade critica";
  if (level === "atencao-alta") return "Atencao alta";
  return "Atencao moderada";
}

function getLevelClass(level: ManagerialPriorityLevel): string {
  if (level === "prioridade-critica") {
    return "bg-red-100 border-red-300 text-red-700";
  }
  if (level === "atencao-alta") {
    return "bg-amber-100 border-amber-300 text-amber-700";
  }
  return "bg-blue-100 border-blue-300 text-blue-700";
}

export default function CidPriorityRankingPanel({
  title,
  subtitle,
  items,
  volumeLabel,
  scoreFormulaLabel,
}: Readonly<CidPriorityRankingPanelProps>) {
  return (
    <section className="bg-white border border-slate-200 shadow-sm">
      <header className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1A3351] flex items-center gap-2">
          <Layers3 className="w-4 h-4" /> {title}
        </h4>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">
          {subtitle}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="p-6 text-center bg-slate-50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Sem dados suficientes para classificar criticidade.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-[#B0B0B0]/35 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Grupo
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Score
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Faixa
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  {volumeLabel}
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Dias Perdidos
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Recorrencia
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Tendencia
                </th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 6).map((item) => (
                <tr
                  key={item.label}
                  className="border-b border-slate-100 hover:bg-slate-50 align-top"
                >
                  <td className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#1A3351] break-words max-w-[220px]">
                    {item.label}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                    {item.score.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex px-1.5 py-0.5 border text-[9px] font-bold uppercase ${getLevelClass(item.level)}`}
                    >
                      {getLevelLabel(item.level)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                    {formatNumber(item.volume)}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-[#E31E24] tabular-nums">
                    {formatNumber(Math.round(item.daysLost))}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                    {item.recurrencePct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                    {formatPercent(item.trendDeltaPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 ? (
        <p className="px-3 pb-3 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:hidden">
          Arraste horizontalmente para visualizar todas as colunas.
        </p>
      ) : null}

      <footer className="px-4 py-2 border-t border-slate-200 bg-slate-50">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
          Score de prioridade: {scoreFormulaLabel}.
        </p>
      </footer>
    </section>
  );
}
