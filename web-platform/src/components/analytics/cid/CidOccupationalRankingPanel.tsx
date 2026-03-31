"use client";

import { Activity, CalendarClock } from "lucide-react";
import type {
  CidPanelSortMode,
  OccupationalRankingItem,
} from "@/components/analytics/cid/types";

interface CidOccupationalRankingPanelProps {
  title: string;
  subtitle: string;
  items: OccupationalRankingItem[];
  sortMode: CidPanelSortMode;
  onSortModeChange: (value: CidPanelSortMode) => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function CidOccupationalRankingPanel({
  title,
  subtitle,
  items,
  sortMode,
  onSortModeChange,
}: Readonly<CidOccupationalRankingPanelProps>) {
  return (
    <section className="bg-white border border-slate-200 shadow-sm">
      <header className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
            {title}
          </h4>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">
            {subtitle}
          </p>
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => onSortModeChange("frequency")}
            className={`h-8 px-3 border text-[10px] font-bold uppercase tracking-wide ${sortMode === "frequency" ? "bg-[#1A3351] text-white border-[#1A3351]" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"}`}
          >
            <Activity className="w-3.5 h-3.5 inline-block mr-1" />
            Frequencia
          </button>
          <button
            type="button"
            onClick={() => onSortModeChange("impact")}
            className={`h-8 px-3 border text-[10px] font-bold uppercase tracking-wide ${sortMode === "impact" ? "bg-[#E31E24] text-white border-[#E31E24]" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"}`}
          >
            <CalendarClock className="w-3.5 h-3.5 inline-block mr-1" />
            Impacto
          </button>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="p-6 text-center bg-slate-50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Sem dados para o recorte atual.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="bg-[#B0B0B0]/35 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Grupo
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Afastamentos
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Dias Perdidos
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Duracao Media
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Participacao
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Agravo Dominante
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.label}
                  className="border-b border-slate-100 hover:bg-slate-50 align-top"
                >
                  <td className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#1A3351] break-words">
                    {item.label}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                    {formatNumber(item.afastamentos)}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-[#E31E24] tabular-nums">
                    {formatNumber(Math.round(item.daysLost))}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                    {item.avgDays.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                    {formatPercent(item.participationPct)}
                  </td>
                  <td className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 break-words">
                    {item.dominantCid}
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
          Fonte agravo: afastamento_cids (codigo/descricao/capitulo) com
          complemento do catalogo CID oficial local (cid10-data).
        </p>
      </footer>
    </section>
  );
}
