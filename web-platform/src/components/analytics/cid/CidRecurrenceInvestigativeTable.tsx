"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import type {
  AfastamentoEventFact,
  CidOccurrenceFact,
} from "@/types/afastamentos-cid-analytics";

interface CidRecurrenceInvestigativeTableProps {
  events: AfastamentoEventFact[];
  nameMap: Map<number, string>;
  cidOccurrences?: CidOccurrenceFact[];
}

function safeText(value: string | null | undefined, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function maskCpf(cpf: string | null | undefined): string {
  const normalizedCpf = safeText(cpf);
  if (!normalizedCpf) return "NAO INFORMADO";

  const digits = normalizedCpf.replaceAll(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
  }
  const formatted = normalizedCpf;
  if (formatted.length > 6) {
    return `${formatted.slice(0, 3)}.***.***-**`;
  }
  return formatted;
}

function formatInterval(days: number | null): string {
  if (days === null) return "—";
  return `${formatNumber(days)}d`;
}

function truncate(text: string | null | undefined, max: number): string {
  const normalized = safeText(text, "NAO INFORMADO");
  return normalized.length > max
    ? `${normalized.slice(0, max)}...`
    : normalized;
}

export default function CidRecurrenceInvestigativeTable({
  events,
  nameMap,
  cidOccurrences,
}: Readonly<CidRecurrenceInvestigativeTableProps>) {
  const safeEvents = Array.isArray(events) ? events : [];

  // Mapa eventId → CID mais relevante (primeiro do capítulo filtrado se houver)
  const relevantCidByEventId = new Map<
    number,
    { cidCode: string; cidDesc: string; cidChapter: string }
  >();
  if (cidOccurrences && cidOccurrences.length > 0) {
    for (const occ of cidOccurrences) {
      if (!relevantCidByEventId.has(occ.eventId)) {
        relevantCidByEventId.set(occ.eventId, {
          cidCode: occ.cidCode,
          cidDesc: occ.cidDesc,
          cidChapter: occ.cidChapter,
        });
      }
    }
  }

  const sorted = [...safeEvents].sort((a, b) => {
    const cpfCmp = safeText(a.event.servidorCpf).localeCompare(
      safeText(b.event.servidorCpf),
    );
    if (cpfCmp !== 0) return cpfCmp;
    return safeText(a.event.startDate).localeCompare(
      safeText(b.event.startDate),
    );
  });

  return (
    <section className="bg-white border border-slate-200 shadow-sm max-w-full">
      <header className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
            Episodios por Servidor
          </h4>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">
            Investigacao de episodios, intervalo e persistencia por servidor
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase text-slate-500">
          {formatNumber(sorted.length)} registro{sorted.length === 1 ? "" : "s"}
        </span>
      </header>

      {sorted.length === 0 ? (
        <div className="p-6 text-center bg-slate-50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Sem episodios para o recorte atual.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-[1240px]">
            <thead>
              <tr className="bg-[#B0B0B0]/35 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Servidor / CPF
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Matricula
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Secretaria
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Cargo
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Capitulo CID
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  CID / Descricao
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Inicio
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Fim
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Dias
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Ep.
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Intervalo
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Acum.
                </th>
                <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]">
                  Recorrente
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((event, idx) => {
                const name = nameMap.get(event.event.afastamentoId) || "";
                const maskedCpf = maskCpf(event.event.servidorCpf);
                const isRecurrent = event.recurrence.isRecurrentPrimary;

                // Usa CID relevante ao filtro de capítulo quando disponível
                const relevantCid = relevantCidByEventId.get(
                  event.event.afastamentoId,
                );
                const displayCidChapter = relevantCid
                  ? relevantCid.cidChapter
                  : event.clinical.cidChapter;
                const displayCidCode = relevantCid
                  ? relevantCid.cidCode
                  : event.clinical.cidCode;
                const displayCidDesc = relevantCid
                  ? relevantCid.cidDesc
                  : event.clinical.cidDesc;

                return (
                  <tr
                    key={`${event.event.eventKey}-${idx}`}
                    className={`border-b border-slate-100 align-top ${isRecurrent ? "bg-orange-50" : "hover:bg-slate-50"}`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="text-[11px] font-bold uppercase text-[#1A3351] leading-tight max-w-[180px] break-words">
                        {name || "NAO INFORMADO"}
                      </div>
                      <div className="text-[10px] font-normal text-slate-500 uppercase mt-0.5 tracking-wide">
                        {maskedCpf}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-normal uppercase text-slate-600 tabular-nums">
                      {safeText(event.occupational.matricula, "NAO INFORMADO")}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] font-normal uppercase text-slate-600 max-w-[160px] break-words">
                      {safeText(event.occupational.secretaria, "NAO INFORMADO")}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] font-normal uppercase text-slate-600 max-w-[140px] break-words">
                      {safeText(event.occupational.cargo, "NAO INFORMADO")}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] font-bold uppercase text-[#1A3351] max-w-[140px] break-words">
                      {safeText(displayCidChapter, "NAO INFORMADO")}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-[11px] font-bold uppercase text-slate-700">
                        {safeText(displayCidCode, "NAO INFORMADO")}
                      </div>
                      <div className="text-[10px] font-normal text-slate-500 uppercase mt-0.5 max-w-[200px] break-words">
                        {truncate(displayCidDesc, 50)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-normal text-right text-slate-700 tabular-nums whitespace-nowrap">
                      {formatDate(event.event.startDate)}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-normal text-right text-slate-700 tabular-nums whitespace-nowrap">
                      {formatDate(event.event.endDate)}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-bold text-right text-[#E31E24] tabular-nums">
                      {formatNumber(event.event.daysAway)}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                      {event.recurrence.episodeNumber}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-normal text-right text-slate-700 tabular-nums">
                      {formatInterval(
                        event.recurrence.daysSincePreviousEpisode,
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-bold text-right text-slate-700 tabular-nums">
                      {formatNumber(event.recurrence.cumulativeDaysByServidor)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {isRecurrent ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 border border-orange-300 text-orange-700 text-[9px] font-bold uppercase">
                          <AlertCircle className="w-3 h-3" />
                          Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold uppercase">
                          <CheckCircle className="w-3 h-3" />
                          1° Ep.
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length > 0 ? (
        <p className="px-3 pb-3 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:hidden">
          Arraste horizontalmente para visualizar todas as colunas
          investigativas.
        </p>
      ) : null}

      <footer className="px-4 py-2 border-t border-slate-200 bg-slate-50">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
          CPF mascarado por protocolo de privacidade. Episodio calculado por
          ordem cronologica por servidor. Intervalo: dias entre fim do episodio
          anterior e inicio do atual.
        </p>
      </footer>
    </section>
  );
}
