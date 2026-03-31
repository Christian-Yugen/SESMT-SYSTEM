"use client";

import { Grid2X2 } from "lucide-react";
import type { OccupationalCrossMatrixRow } from "@/components/analytics/cid/types";

interface CidOccupationalCrossPanelProps {
  title: string;
  subtitle: string;
  columns: string[];
  rows: OccupationalCrossMatrixRow[];
}

function formatChapterLabel(value: string) {
  const cleanValue = (value || "").trim();
  if (
    cleanValue.length === 0 ||
    /NAO INFORMADO|SEM CID|LEGADO|DESCRICAO NAO INFORMADA/i.test(cleanValue)
  ) {
    return "NAO CLASSIFICADO";
  }
  return cleanValue
    .replace(/^CAPITULO\s*/i, "")
    .replace(/^CHAPTER\s*/i, "")
    .trim();
}

function formatCell(occurrences: number, daysLost: number) {
  return `${occurrences} / ${Math.round(daysLost)}d`;
}

export default function CidOccupationalCrossPanel({
  title,
  subtitle,
  columns,
  rows,
}: Readonly<CidOccupationalCrossPanelProps>) {
  return (
    <section className="bg-white border border-slate-200 shadow-sm">
      <header className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1A3351] flex items-center gap-2">
          <Grid2X2 className="w-4 h-4" /> {title}
        </h4>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">
          {subtitle}
        </p>
      </header>

      {rows.length === 0 || columns.length === 0 ? (
        <div className="p-6 text-center bg-slate-50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Sem dados para montar cruzamento no recorte atual.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-[#B0B0B0]/35 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Agravo (Capitulo)
                </th>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.chapter}
                  className="border-b border-slate-100 align-top"
                >
                  <td className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-[#1A3351] break-words">
                    {formatChapterLabel(row.chapter)}
                  </td>
                  {row.values.map((value) => (
                    <td
                      key={`${row.chapter}-${value.group}`}
                      className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 tabular-nums"
                    >
                      {formatCell(value.occurrences, value.daysLost)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && columns.length > 0 ? (
        <p className="px-3 pb-3 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:hidden">
          Arraste horizontalmente para visualizar todas as colunas.
        </p>
      ) : null}

      <footer className="px-4 py-2 border-t border-slate-200 bg-slate-50">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
          Celula: ocorrencias de CID / dias perdidos alocados
        </p>
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 mt-1">
          Fonte agravo: afastamento_cids com complemento do catalogo CID oficial
          local (cid10-data).
        </p>
      </footer>
    </section>
  );
}
