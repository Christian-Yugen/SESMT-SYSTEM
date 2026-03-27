"use client";

import React from "react";
import { Search, CreditCard, Calendar, ChevronDown, X } from "lucide-react";

import SearchField from "./SearchField";
import CpfField from "./CpfField";
import DateRangePopover from "./DateRangePopover";
import SelectFilter from "./SelectFilter";
import { countActiveFilters } from "./filtersUtils";

interface FilterToolbarProps {
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    searchCpf: string;
    setSearchCpf: (v: string) => void;
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
    referrals: any[];
    operatorsMap: Record<string, string>;
    clearAllFilters: () => void;
}

export default function FilterToolbar(props: FilterToolbarProps) {
    const {
        searchTerm, setSearchTerm,
        searchCpf, setSearchCpf,
        startDate, setStartDate, endDate, setEndDate,
        isDateFilterOpen, setIsDateFilterOpen,
        filterUser, setFilterUser,
        filterSecretaria, setFilterSecretaria,
        filterAsoType, setFilterAsoType,
        uniqueUsersList, uniqueSecretarias, referrals, operatorsMap, clearAllFilters
    } = props;

    const activeCount = countActiveFilters({ searchTerm, searchCpf, startDate, endDate, filterUser, filterSecretaria, filterAsoType });

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 lg:gap-3">
                <div className="md:col-span-5 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="NOME DO SERVIDOR..." />
                </div>
                <div className="md:col-span-3 relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <CpfField value={searchCpf} onChange={setSearchCpf} placeholder="CPF..." />
                </div>
                <div className="md:col-span-4 relative">
                    <DateRangePopover
                        startDate={startDate}
                        endDate={endDate}
                        setStartDate={setStartDate}
                        setEndDate={setEndDate}
                        isOpen={isDateFilterOpen}
                        setIsOpen={setIsDateFilterOpen}
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <SelectFilter value={filterUser} onChange={setFilterUser} className="flex-1 lg:flex-none" options={['all', ...uniqueUsersList]} labelDefault="OPERADORES" renderOption={(uid:string)=> (referrals.find(h=>h.generated_by===uid)?.operator_name || operatorsMap[uid] || `ID: ${uid.substring(0,8)}`)} />

                <SelectFilter value={filterSecretaria} onChange={setFilterSecretaria} className="flex-1 lg:flex-none max-w-[250px]" options={['all', ...uniqueSecretarias]} labelDefault="SECRETARIAS" />

                <SelectFilter value={filterAsoType} onChange={setFilterAsoType} className="flex-1 lg:flex-none" options={["all","ADMISS","DEMISS","RETORNO"]} labelDefault="TIPOS ASO" />

                {activeCount > 0 && (
                    <button onClick={clearAllFilters} className="h-10 px-4 bg-[#E31E24] text-white text-[10px] font-bold uppercase shadow-sm hover:brightness-110 active:scale-95 transition-all rounded-none w-full lg:w-auto mt-2 lg:mt-0">Zerar Filtros</button>
                )}
            </div>
        </div>
    );
}
