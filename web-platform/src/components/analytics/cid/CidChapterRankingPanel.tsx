"use client";

import { BarChart3, CalendarClock, Layers3 } from "lucide-react";
import { CID_CHAPTERS } from "@/lib/cid-utils";
import type { ChapterRankingItem, CidPanelSortMode } from "./types";

interface CidChapterRankingPanelProps {
  items: ChapterRankingItem[];
  sortMode: CidPanelSortMode;
  onSortModeChange: (value: CidPanelSortMode) => void;
  selectedChapter: string;
  onSelectChapter: (chapter: string) => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function CidChapterRankingPanel({
  items,
  sortMode,
  onSortModeChange,
  selectedChapter,
  onSelectChapter,
}: Readonly<CidChapterRankingPanelProps>) {
  const maxDays = items[0]?.daysLost || 0;

  function findChapterDescription(rawChapter: string | undefined | null) {
    if (!rawChapter) return "";
    const candidate = String(rawChapter).toUpperCase().trim();
    // Try exact match first
    let found = CID_CHAPTERS.find(
      (c) => c.capitulo.toUpperCase() === candidate,
    );
    if (found) return found.descricao;
    // Try contains/startsWith to handle values like 'Capítulo V' or 'V - ...'
    found = CID_CHAPTERS.find((c) => {
      const code = c.capitulo.toUpperCase();
      return (
        candidate === code ||
        candidate.startsWith(code) ||
        candidate.includes(` ${code}`) ||
        candidate.includes(`${code} `) ||
        candidate.includes(`${code}-`) ||
        candidate.includes(`${code} -`)
      );
    });
    return found ? found.descricao : "";
  }

  return (
    <section className="CidChapterRankingPanel bg-white border border-slate-200 shadow-sm">
      <header className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1A3351] flex items-center gap-2">
            <Layers3 className="w-4 h-4" /> Ranking por Capítulo CID
          </h4>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">
            Entradas CID = total de registros CID no capítulo · Licenças =
            eventos distintos com ao menos 1 CID do capítulo
          </p>
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => onSortModeChange("frequency")}
            className={`h-8 px-3 border text-[10px] font-bold uppercase tracking-wide ${sortMode === "frequency" ? "bg-[#1A3351] text-white border-[#1A3351]" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"}`}
          >
            <BarChart3 className="w-3.5 h-3.5 inline-block mr-1" />
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
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-[#B0B0B0]/35 border-b border-slate-200">
              <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                Capítulo
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                Entradas CID
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                Licenças
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                Participação
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                Dias Perdidos
              </th>
              <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                Impacto Relativo
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isSelected = selectedChapter === item.chapter;
              const widthPct =
                maxDays > 0 ? (item.daysLost / maxDays) * 100 : 0;
              return (
                <tr
                  key={item.chapter}
                  onClick={() => onSelectChapter(item.chapter)}
                  className={`border-b border-slate-100 cursor-pointer ${isSelected ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                >
                  <td className="px-3 py-2.5 text-[11px] tracking-wide">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                      <span className="text-[11px] font-bold uppercase text-[#1A3351]">
                        {item.chapter}
                      </span>
                      <span className="text-[11px] text-slate-600 font-medium">
                        {findChapterDescription(item.chapter)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                    {formatNumber(item.occurrences)}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                    {formatNumber(item.afastamentos)}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                    {formatPercent(item.participationPct)}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-bold text-right text-[#E31E24] tabular-nums">
                    {formatNumber(Math.round(item.daysLost))}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="h-2 w-full bg-slate-200">
                      <div
                        className="h-2 bg-[#E31E24]"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-3 pb-3 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:hidden">
        Arraste horizontalmente para visualizar todas as colunas.
      </p>
    </section>
  );
}
