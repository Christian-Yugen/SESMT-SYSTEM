"use client";

import { CalendarClock, RefreshCcw } from "lucide-react";

interface WindowSummaryEntry {
  label: string;
  days: number;
  count: number;
  pct: number;
}

interface CidRecurrenceSummaryPanelProps {
  totalEvents: number;
  windows: WindowSummaryEntry[];
  primaryWindowDays: number;
  daysAccumulated: number;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function CidRecurrenceSummaryPanel({
  totalEvents,
  windows,
  primaryWindowDays,
  daysAccumulated,
}: Readonly<CidRecurrenceSummaryPanelProps>) {
  const safeWindows = Array.isArray(windows) ? windows : [];
  const maxCount = Math.max(...safeWindows.map((w) => w.count), 1);

  return (
    <section className="bg-white border border-slate-200 shadow-sm">
      <header className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1A3351] flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            Distribuicao de Recorrencia por Janela
          </h4>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">
            Comparativo entre janelas de 90, 180 e 365 dias
          </p>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:items-end gap-0.5">
          <span className="text-[9px] font-bold uppercase text-slate-500">
            Janela Principal
          </span>
          <span className="text-[11px] font-bold uppercase text-[#1A3351] flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" />
            {primaryWindowDays} dias
          </span>
        </div>
      </header>

      {totalEvents === 0 ? (
        <div className="p-6 text-center bg-slate-50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Sem dados de recorrencia para o recorte atual.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="bg-[#B0B0B0]/35 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Janela
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Recorrentes
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  % Recorrencia
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Proporcao Visual
                </th>
              </tr>
            </thead>
            <tbody>
              {safeWindows.map((w) => {
                const isPrimary = w.days === primaryWindowDays;
                const widthPct = maxCount > 0 ? (w.count / maxCount) * 100 : 0;
                return (
                  <tr
                    key={w.days}
                    className={`border-b border-slate-100 ${isPrimary ? "bg-blue-50" : "hover:bg-slate-50"}`}
                  >
                    <td className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#1A3351]">
                      {w.label}
                      {isPrimary && (
                        <span className="ml-2 px-1.5 py-0.5 bg-[#1A3351] text-white text-[9px] font-bold uppercase">
                          PRINCIPAL
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                      {formatNumber(w.count)}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-bold text-right text-[#E31E24] tabular-nums">
                      {formatPercent(w.pct)}
                    </td>
                    <td className="px-3 py-2.5 w-48">
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
      )}

      {totalEvents > 0 ? (
        <p className="px-3 pb-3 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:hidden">
          Arraste horizontalmente para visualizar todas as colunas.
        </p>
      ) : null}

      <footer className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-4">
        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500">
            Total no recorte:{" "}
          </span>
          <span className="text-[9px] font-bold text-[#1A3351]">
            {formatNumber(totalEvents)} afastamentos
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500">
            Dias acumulados (recorrentes):{" "}
          </span>
          <span className="text-[9px] font-bold text-[#E31E24]">
            {formatNumber(Math.round(daysAccumulated))} dias
          </span>
        </div>
      </footer>
    </section>
  );
}
