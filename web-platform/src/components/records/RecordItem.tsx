"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface RecordItemProps {
  /** Expanded/collapsed state — drives all visual transitions. */
  expanded: boolean;
  onClick: (e: React.MouseEvent) => void;

  // ── Line 1 ──────────────────────────────────────────
  name: string;
  /** Pre-masked CPF string. Use maskCpf() before passing. */
  cpf?: string;

  // ── Line 2 ──────────────────────────────────────────
  cargo?: string;
  matricula?: string;
  natureza?: string;

  // ── Line 3 ──────────────────────────────────────────
  secretaria?: string;
  contrato?: string;
  /** Module-specific badges rendered at the end of line 3. */
  badges?: React.ReactNode;

  // ── Right area ──────────────────────────────────────
  /** Date meta block. Caller controls visibility (e.g. hide when expanded). */
  rightMeta?: React.ReactNode;
  /** Action buttons (report, etc.) — always rendered when provided. */
  actions?: React.ReactNode;

  // ── Special states ──────────────────────────────────
  alert?: boolean;
  alertClass?: string;
}

export default function RecordItem({
  expanded,
  onClick,
  name,
  cpf,
  cargo,
  matricula,
  natureza,
  secretaria,
  contrato,
  badges,
  rightMeta,
  actions,
  alert = false,
  alertClass,
}: Readonly<RecordItemProps>) {
  const rowClass = alert
    ? (alertClass ?? "bg-amber-50/50 border-amber-500 opacity-60")
    : expanded
      ? "bg-white border-[#1A3351] z-[50] shadow-2xl scale-[1.01] -mx-2 ring-1 ring-black/5"
      : "bg-white border-transparent hover:bg-slate-50/50 hover:border-slate-300";

  const asText = (value: string | undefined) => {
    if (!value) return "Não informado";
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "Não informado";
  };

  const cargoText = asText(cargo);
  const matriculaText = asText(matricula);
  const naturezaText = asText(natureza);
  const secretariaText = asText(secretaria);
  const contratoText = asText(contrato);
  const cpfText = cpf && cpf !== "---" ? cpf : "---";

  return (
    <div
      onClick={onClick}
      className={`px-4 lg:px-6 py-4 md:py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 cursor-pointer transition-all duration-300 border-l-[6px] relative ${rowClass}`}
    >
      {/* ── LEFT: textual 3-line canonical block (no icons) ── */}
      <div className="flex flex-col min-w-0 flex-1 gap-1.5">
        {/* Line 1: Name · CPF */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 min-w-0">
          <h4
            className={`font-bold uppercase text-[#1A3351] leading-tight transition-all duration-300 min-w-0 ${
              expanded ? "text-lg md:text-xl" : "text-base md:text-lg"
            }`}
          >
            {name}
          </h4>
          <span className="text-[12px] md:text-[13px] font-normal text-slate-600 uppercase leading-tight whitespace-nowrap">
            CPF: {cpfText}
          </span>
        </div>

        {/* Line 2: Cargo · Matrícula · Natureza */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] md:text-[13px] font-normal text-slate-600 uppercase leading-tight">
          <span className="whitespace-nowrap">Cargo: {cargoText}</span>
          <span className="text-slate-300 select-none">·</span>
          <span className="whitespace-nowrap">Matrícula: {matriculaText}</span>
          <span className="text-slate-300 select-none">·</span>
          <span className="whitespace-nowrap">Natureza: {naturezaText}</span>
        </div>

        {/* Line 3: Secretaria · Contrato · module badges */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] md:text-[13px] font-normal text-slate-600 uppercase leading-tight">
          <span className="whitespace-nowrap">
            Secretaria: {secretariaText}
          </span>
          <span className="text-slate-300 select-none">·</span>
          <span className="whitespace-nowrap">Contrato: {contratoText}</span>
          {badges}
        </div>
      </div>

      {/* ── RIGHT: actions + meta + chevron ── */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0 md:self-center w-full md:w-auto justify-between md:justify-end">
        {actions}
        {rightMeta}
        <div className="shrink-0">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-[#1A3351]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-300" />
          )}
        </div>
      </div>
    </div>
  );
}
