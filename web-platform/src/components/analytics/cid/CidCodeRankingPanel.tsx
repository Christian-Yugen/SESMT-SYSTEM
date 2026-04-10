"use client";

import { Activity, CalendarClock, FileSearch } from "lucide-react";
import type { CidPanelSortMode, CidRankingItem } from "./types";

interface CidCodeRankingPanelProps {
  items: CidRankingItem[];
  sortMode: CidPanelSortMode;
  onSortModeChange: (value: CidPanelSortMode) => void;
  chapterFocusLabel: string | null;
  onClearChapterFocus: () => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function CidCodeRankingPanel({
  items,
  sortMode,
  onSortModeChange,
  chapterFocusLabel,
  onClearChapterFocus,
}: Readonly<CidCodeRankingPanelProps>) {
  return (
    <section className="CidCodeRankingPanel bg-white border border-slate-200 shadow-sm">
      <header className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1A3351] flex items-center gap-2">
            <FileSearch className="w-4 h-4" /> Ranking de CIDs Específicos
          </h4>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">
            Priorização técnica por frequência e dias perdidos
          </p>
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2 flex-wrap justify-end">
          {chapterFocusLabel ? (
            <button
              type="button"
              onClick={onClearChapterFocus}
              className="h-8 w-full sm:w-auto px-3 border border-emerald-500 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wide"
            >
              Capítulo ativo: {chapterFocusLabel} (limpar)
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onSortModeChange("frequency")}
            className={`h-8 px-3 border text-[10px] font-bold uppercase tracking-wide ${sortMode === "frequency" ? "bg-[#1A3351] text-white border-[#1A3351]" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"}`}
          >
            <Activity className="w-3.5 h-3.5 inline-block mr-1" />
            Frequência
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="bg-[#B0B0B0]/35 border-b border-slate-200">
              <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351] w-[8%] min-w-[70px]">
                CID
              </th>
              <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351] w-[44%] min-w-[360px]">
                Descrição Clínica
              </th>
              <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351] w-[8%] min-w-[70px]">
                Capítulo
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351] w-[10%] min-w-[80px]">
                Ocorrências
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351] w-[10%] min-w-[80px]">
                Afastamentos
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351] w-[10%] min-w-[90px]">
                Dias Perdidos
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351] w-[10%] min-w-[80px]">
                Participação
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={`${item.cidCode}-${item.cidChapter}`}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-3 py-2.5 text-[11px] font-bold text-[#1A3351] tabular-nums uppercase w-[8%]">
                  {item.cidCode}
                </td>
                <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-700 leading-tight whitespace-normal break-words w-[44%]">
                  {item.cidDesc}
                </td>
                <td className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide w-[8%]">
                  {item.cidChapter}
                </td>
                <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                  {formatNumber(item.occurrences)}
                </td>
                <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                  {formatNumber(item.afastamentos)}
                </td>
                <td className="px-3 py-2.5 text-[11px] font-bold text-right text-[#E31E24] tabular-nums">
                  {formatNumber(Math.round(item.daysLost))}
                </td>
                <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                  {formatPercent(item.participationPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-3 pb-3 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:hidden">
        Arraste horizontalmente para visualizar todas as colunas.
      </p>
    </section>
  );
}
