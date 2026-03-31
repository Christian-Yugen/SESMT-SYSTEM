"use client";

import { Building2 } from "lucide-react";
import type { NaturezaImpactItem } from "@/components/analytics/cid/types";

interface CidNatureImpactPanelProps {
  items: NaturezaImpactItem[];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function CidNatureImpactPanel({
  items,
}: Readonly<CidNatureImpactPanelProps>) {
  return (
    <section className="bg-white border border-slate-200 shadow-sm p-4 sm:p-5">
      <header className="mb-4">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1A3351] flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Natureza do Cargo e Impacto
        </h4>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">
          Distribuicao de casos, dias e duracao media por vinculo
        </p>
      </header>

      {items.length === 0 ? (
        <div className="p-6 text-center bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Sem dados para o recorte atual.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <article
              key={item.natureza}
              className="border border-slate-200 bg-slate-50 p-3"
            >
              <h5 className="text-[10px] font-bold uppercase tracking-wide text-[#1A3351] break-words">
                {item.natureza}
              </h5>
              <dl className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Afastamentos
                  </dt>
                  <dd className="text-[11px] font-bold text-slate-700 tabular-nums">
                    {formatNumber(item.afastamentos)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Dias Perdidos
                  </dt>
                  <dd className="text-[11px] font-bold text-[#E31E24] tabular-nums">
                    {formatNumber(Math.round(item.daysLost))}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Duracao Media
                  </dt>
                  <dd className="text-[11px] font-bold text-slate-700 tabular-nums">
                    {item.avgDays.toFixed(1)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Participacao
                  </dt>
                  <dd className="text-[11px] font-bold text-slate-700 tabular-nums">
                    {formatPercent(item.participationPct)}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
