"use client";
import React from "react";
import { Calendar, ChevronDown, X } from "lucide-react";

interface Props {
    startDate: string;
    endDate: string;
    setStartDate: (v: string) => void;
    setEndDate: (v: string) => void;
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
}

export default function DateRangePopover({ startDate, endDate, setStartDate, setEndDate, isOpen, setIsOpen }: Props) {
    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center justify-between w-full h-10 px-4 bg-[#E8E8E8] border border-[#888] shadow-inner font-bold text-[10px] uppercase transition-all rounded-none
                    ${(startDate || endDate) ? 'text-[#E31E24] border-[#E31E24]' : 'text-slate-500'}
                `}
            >
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{(startDate || endDate) ? `${startDate || '...'} → ${endDate || '...'}` : 'Filtrar por Período'}</span>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-12 right-0 bg-white border-2 border-[#1A3351] shadow-2xl p-4 z-[100] w-64 animate-in fade-in slide-in-from-top-2 rounded-none">
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <span className="text-[10px] font-bold text-[#1A3351] uppercase">Definir Período</span>
                            <button onClick={() => setIsOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-red-500" /></button>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Data Inicial</span>
                            <input
                                type="date"
                                className="w-full bg-[#f8f8f8] border border-slate-200 px-3 py-2 text-xs font-bold uppercase outline-none focus:border-[#E31E24] rounded-none"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Data Final</span>
                            <input
                                type="date"
                                className="w-full bg-[#f8f8f8] border border-slate-200 px-3 py-2 text-xs font-bold uppercase outline-none focus:border-[#E31E24] rounded-none"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => { setStartDate(""); setEndDate(""); }}
                                className="flex-1 py-2 text-[9px] font-bold uppercase text-slate-400 hover:text-slate-600 border border-slate-100 rounded-none"
                            >
                                Limpar
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-[2] py-2 bg-[#1A3351] text-white text-[9px] font-bold uppercase hover:brightness-110 shadow-md rounded-none"
                            >
                                Filtrar Agora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
