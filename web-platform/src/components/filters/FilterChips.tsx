"use client";
import React from "react";

type ReferralOperatorEntry = {
  generated_by: string;
  operator_name?: string;
};

interface Props {
  searchTerm: string;
  searchCpf: string;
  startDate: string;
  endDate: string;
  filterUser: string;
  filterSecretaria: string;
  filterAsoType: string;
  referrals: ReferralOperatorEntry[];
  operatorsMap: Record<string, string>;
}

export default function FilterChips({
  searchTerm,
  searchCpf,
  startDate,
  endDate,
  filterUser,
  filterSecretaria,
  filterAsoType,
  referrals,
  operatorsMap,
}: Readonly<Props>) {
  type Chip = { label: string; key: string };
  const chips: Chip[] = [];

  if (searchTerm.trim())
    chips.push({ key: "nome", label: `Nome: ${searchTerm}` });
  if (searchCpf.trim()) chips.push({ key: "cpf", label: `CPF: ${searchCpf}` });
  if (startDate || endDate)
    chips.push({
      key: "date",
      label: `${startDate || "..."} → ${endDate || "..."}`,
    });
  if (filterUser && filterUser !== "all") {
    const name =
      referrals.find((h) => h.generated_by === filterUser)?.operator_name ||
      operatorsMap[filterUser] ||
      `ID:${filterUser.substring(0, 8)}`;
    chips.push({ key: "user", label: `Op: ${name}` });
  }
  if (filterSecretaria && filterSecretaria !== "all")
    chips.push({ key: "sec", label: filterSecretaria });
  if (filterAsoType && filterAsoType !== "all")
    chips.push({ key: "aso", label: filterAsoType });

  if (chips.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center h-6 px-2 bg-[#1A3351]/10 border border-[#1A3351]/20 text-[9px] font-bold text-[#1A3351] uppercase tracking-wide rounded-none"
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
