"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Calendar,
  Users,
  Building2,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { countActiveFilters } from "./filtersUtils";
import SearchField from "./SearchField";
import SelectFilter from "./SelectFilter";

type ReferralOperatorEntry = {
  generated_by: string;
  operator_name?: string;
};

interface Props {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  isDateFilterOpen: boolean;
  setIsDateFilterOpen: (v: boolean) => void;
  filterUser: string;
  setFilterUser: (v: string) => void;
  filterSecretaria: string;
  setFilterSecretaria: (v: string) => void;
  filterAsoType: string;
  setFilterAsoType: (v: string) => void;
  uniqueUsersList: string[];
  uniqueSecretarias: string[];
  referrals: ReferralOperatorEntry[];
  operatorsMap: Record<string, string>;
  clearAllFilters: () => void;
}

type PopoverId = "date" | "user" | "secretaria" | "asoType" | null;

function FilterIconButton({
  id,
  open,
  onToggle,
  icon,
  title,
  active,
  children,
}: Readonly<{
  id: PopoverId;
  open: boolean;
  onToggle: (id: PopoverId) => void;
  icon: React.ReactNode;
  title: string;
  active: boolean;
  children: React.ReactNode;
}>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onToggle(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onToggle]);

  let buttonStateClass =
    "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-[#1A3351]";
  if (active) {
    buttonStateClass = "bg-[#1A3351] border-[#1A3351] text-white";
  } else if (open) {
    buttonStateClass = "bg-slate-100 border-slate-300 text-[#1A3351]";
  }

  return (
    <div className="relative" ref={ref}>
      <button
        title={title}
        onClick={() => onToggle(open ? null : id)}
        className={`h-9 w-9 flex items-center justify-center border shadow-sm rounded-none transition-all duration-150 hover:scale-110 active:scale-95 ${buttonStateClass}`}
      >
        {icon}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-200 bg-white border border-slate-200 shadow-2xl rounded-none min-w-55 animate-in fade-in slide-in-from-top-2 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

export default function CompactFilterBar(props: Readonly<Props>) {
  const {
    searchTerm,
    setSearchTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    setIsDateFilterOpen,
    filterUser,
    setFilterUser,
    filterSecretaria,
    setFilterSecretaria,
    filterAsoType,
    setFilterAsoType,
    uniqueUsersList,
    uniqueSecretarias,
    referrals,
    operatorsMap,
    clearAllFilters,
  } = props;

  const [openPopover, setOpenPopover] = useState<PopoverId>(null);

  useEffect(() => {
    setIsDateFilterOpen(openPopover === "date");
  }, [openPopover, setIsDateFilterOpen]);

  const activeCount = countActiveFilters({
    searchTerm,
    startDate,
    endDate,
    filterUser,
    filterSecretaria,
    filterAsoType,
  });

  const operatorOptions = ["all", ...uniqueUsersList];
  const secretariaOptions = ["all", ...uniqueSecretarias];

  const togglePopover = (id: PopoverId) => {
    setOpenPopover((current) => (current === id ? null : id));
  };

  return (
    <div className="w-full flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <SearchField
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="NOME OU CPF DO SERVIDOR..."
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <button
            title="Filtros"
            className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-none"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-600" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#E31E24] text-white text-[10px] font-bold px-1 rounded-full">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        <FilterIconButton
          id="date"
          open={openPopover === "date"}
          onToggle={togglePopover}
          title="Período"
          active={Boolean(startDate || endDate)}
          icon={<Calendar className="w-4 h-4" />}
        >
          <div className="w-72 p-4 space-y-3">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">
                Data inicial
              </span>
              <input
                type="date"
                className="w-full h-10 px-3 bg-[#E8E8E8] border border-[#888] text-[10px] font-bold uppercase outline-none focus:border-[#1A3351] rounded-none"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">
                Data final
              </span>
              <input
                type="date"
                className="w-full h-10 px-3 bg-[#E8E8E8] border border-[#888] text-[10px] font-bold uppercase outline-none focus:border-[#1A3351] rounded-none"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setOpenPopover(null);
                }}
                className="flex-1 h-9 border border-slate-200 text-[9px] font-bold uppercase text-slate-500 hover:text-slate-700 rounded-none"
              >
                Limpar
              </button>
              <button
                onClick={() => setOpenPopover(null)}
                className="flex-1 h-9 bg-[#1A3351] text-white text-[9px] font-bold uppercase hover:brightness-110 rounded-none"
              >
                Aplicar
              </button>
            </div>
          </div>
        </FilterIconButton>

        <FilterIconButton
          id="user"
          open={openPopover === "user"}
          onToggle={togglePopover}
          title="Operadores"
          active={filterUser !== "all"}
          icon={<Users className="w-4 h-4" />}
        >
          <div className="w-64 p-3">
            <SelectFilter
              className="w-full"
              value={filterUser}
              onChange={setFilterUser}
              options={operatorOptions}
              labelDefault="OPERADORES"
              renderOption={(uid: string) =>
                referrals.find((referral) => referral.generated_by === uid)
                  ?.operator_name ||
                operatorsMap[uid] ||
                `ID: ${uid.substring(0, 8)}`
              }
            />
          </div>
        </FilterIconButton>

        <FilterIconButton
          id="secretaria"
          open={openPopover === "secretaria"}
          onToggle={togglePopover}
          title="Secretarias"
          active={filterSecretaria !== "all"}
          icon={<Building2 className="w-4 h-4" />}
        >
          <div className="w-64 p-3">
            <SelectFilter
              className="w-full"
              value={filterSecretaria}
              onChange={setFilterSecretaria}
              options={secretariaOptions}
              labelDefault="SECRETARIAS"
            />
          </div>
        </FilterIconButton>

        <FilterIconButton
          id="asoType"
          open={openPopover === "asoType"}
          onToggle={togglePopover}
          title="Tipos ASO"
          active={filterAsoType !== "all"}
          icon={<FileText className="w-4 h-4" />}
        >
          <div className="w-52 p-3">
            <SelectFilter
              className="w-full"
              value={filterAsoType}
              onChange={setFilterAsoType}
              options={["all", "ADMISS", "DEMISS", "RETORNO"]}
              labelDefault="TIPOS ASO"
            />
          </div>
        </FilterIconButton>

        {activeCount > 0 && (
          <button
            onClick={() => {
              clearAllFilters();
              setOpenPopover(null);
            }}
            className="ml-2 h-9 px-3 bg-[#E31E24] text-white text-[10px] font-bold uppercase shadow-sm hover:brightness-110 active:scale-95 transition-all rounded-none"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
