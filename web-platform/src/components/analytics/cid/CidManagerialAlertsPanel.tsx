"use client";

import { AlertCircle, ShieldAlert, TrendingUp } from "lucide-react";
import type {
  ManagerialAlertItem,
  ManagerialPriorityLevel,
} from "@/components/analytics/cid/types";

interface CidManagerialAlertsPanelProps {
  items: ManagerialAlertItem[];
  trendWindowLabel: string | null;
}

function getLevelStyles(level: ManagerialPriorityLevel) {
  if (level === "prioridade-critica") {
    return {
      badge: "bg-red-100 border-red-300 text-red-700",
      stripe: "border-l-[6px] border-red-500",
      icon: <ShieldAlert className="w-4 h-4 text-red-600" />,
      label: "Prioridade critica",
    };
  }
  if (level === "atencao-alta") {
    return {
      badge: "bg-amber-100 border-amber-300 text-amber-700",
      stripe: "border-l-[6px] border-amber-500",
      icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
      label: "Atencao alta",
    };
  }
  return {
    badge: "bg-blue-100 border-blue-300 text-blue-700",
    stripe: "border-l-[6px] border-blue-500",
    icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
    label: "Atencao moderada",
  };
}

export default function CidManagerialAlertsPanel({
  items,
  trendWindowLabel,
}: Readonly<CidManagerialAlertsPanelProps>) {
  return (
    <section className="bg-white border border-slate-200 shadow-sm">
      <header className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
            Alertas Gerenciais
          </h4>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">
            Sinais interpretaveis de risco, concentracao e tendencia no recorte
            atual
          </p>
        </div>
        {trendWindowLabel ? (
          <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
            Janela comparada: {trendWindowLabel}
          </span>
        ) : null}
      </header>

      {items.length === 0 ? (
        <div className="p-6 text-center bg-slate-50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Nenhum alerta gerencial relevante no recorte atual.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-3 sm:p-4">
          {items.map((item) => {
            const styles = getLevelStyles(item.level);
            return (
              <article
                key={item.id}
                className={`bg-slate-50 border border-slate-200 p-3 ${styles.stripe}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {styles.icon}
                    <h5 className="text-[10px] font-bold uppercase tracking-wide text-[#1A3351] break-words">
                      {item.title}
                    </h5>
                  </div>
                  <span
                    className={`shrink-0 px-1.5 py-0.5 border text-[9px] font-bold uppercase ${styles.badge}`}
                  >
                    {styles.label}
                  </span>
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase leading-relaxed text-slate-700">
                  {item.summary}
                </p>
                <p className="mt-2 text-[10px] font-medium uppercase leading-relaxed text-slate-500">
                  {item.evidence}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
