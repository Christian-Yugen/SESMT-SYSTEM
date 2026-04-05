"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  Info, 
  AlertTriangle, 
  RefreshCw, 
  Menu
} from "lucide-react";
import { safeGetSession, handleAuthError } from "@/lib/auth-utils";
import Sidebar from "@/components/layout/Sidebar";
import StatisticCard from "@/components/statistics/StatisticCard";
import StatisticCardRow from "@/components/statistics/StatisticCardRow";
import StatisticCardsSection from "@/components/statistics/StatisticCardsSection";
import { 
  buildErgonomicPageModel, 
  buildLoadingPageModel,
  type ErgonomicPageModel
} from "@/lib/afastamentos-ergonomia-page-utils";

// ---------------------------------------------------------------------------
// Helpers e ConfiguraÃƒÂ§ÃƒÂµes
// ---------------------------------------------------------------------------

function getDefaultDates() {
  const end = new Date();
  const endDate = end.toISOString().split("T")[0];
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const startDate = start.toISOString().split("T")[0];
  return { startDate, endDate };
}

type TabId = "visao-geral" | "fatores";

const TABS: { id: TabId; title: string }[] = [
  { id: "visao-geral", title: "VisÃƒÂ£o Geral (IntervenÃƒÂ§ÃƒÂ£o)" },
  { id: "fatores", title: "Mapa de Riscos (NR-17)" },
];

/**
 * Dashboard de InteligÃƒÂªncia ErgonÃƒÂ´mica
 * Autoridade Visual: Psicossocial Analytics (Imagem 2)
 */
export default function ErgonomicsAnalyticsPage() {
  const router = useRouter();
  const [model, setModel] = useState<ErgonomicPageModel>(buildLoadingPageModel());
  const initializationRef = useRef(false);
  const defaultDates = useRef(getDefaultDates());
  const [activeTab, setActiveTab] = useState<TabId>("visao-geral");
  const [startDate, setStartDate] = useState(defaultDates.current.startDate);
  const [endDate, setEndDate] = useState(defaultDates.current.endDate);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedSecretarias, setExpandedSecretarias] = useState<Set<string>>(new Set());

  const toggleSecretaria = (name: string) => {
    setExpandedSecretarias(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Handlers de Dados
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async (token: string, dStart: string, dEnd: string) => {
    setIsRefreshing(true);
    try {
      setModel(prev => ({ ...prev, isLoading: true, error: null }));
      
      const params = new URLSearchParams({
        startDate: dStart,
        endDate: dEnd,
      });

      const baseUrl = typeof window !== "undefined" 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const url = `${baseUrl}/api/absenteismo/ergonomia-view?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        setModel(buildErgonomicPageModel(null, {
          code: json?.error?.code || "FETCH_ERROR",
          message: json?.error?.message || `Erro ${response.status} ao carregar inteligÃƒÂªncia ergonÃƒÂ´mica.`
        }));
        return;
      }
      
      const data = await response.json();
      setModel(buildErgonomicPageModel(data));
    } catch (err: any) {
      setModel(buildErgonomicPageModel(null, { 
        code: "UNEXPECTED_ERROR", 
        message: err.message || "Erro ao carregar indicadores ergonÃƒÂ´micos." 
      }));
    } finally {
      setIsRefreshing(false);
      setModel(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    const { session, error } = await safeGetSession();
    if (error || !session) {
      await handleAuthError(error || new Error("SessÃƒÂ£o expirada"));
      return;
    }
    fetchData(session.access_token, startDate, endDate);
  }, [startDate, endDate, fetchData]);

  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    handleRefresh();
  }, [handleRefresh]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-x-hidden relative">
      {/* Metodologia Modal */}
      {showMethodology && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMethodology(false)}
          />
          <div className="relative bg-white w-full max-w-3xl rounded-none shadow-2xl overflow-hidden border-2 border-[#1A3351] animate-in fade-in zoom-in duration-300">
            <div className="bg-[#1A3351] px-4 py-1.5 text-white relative flex justify-between items-center border-b-2 border-[#E31E24]">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#E31E24]" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">Metodologia: Escore ErgonÃƒÂ´mico</h2>
              </div>
              <button 
                onClick={() => setShowMethodology(false)}
                className="h-5 w-5 rounded-none bg-white/5 flex items-center justify-center hover:bg-[#E31E24] transition-all border border-white/10"
              >
                <span className="text-base font-light leading-none">Ãƒâ€”</span>
              </button>
            </div>

            <div className="p-4 font-sans text-black">
              <div className="border border-slate-200 rounded-none overflow-hidden mb-4">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-500 tracking-widest">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-1.5 w-[80px] text-center border-r border-slate-200">Peso</th>
                      <th className="px-3 py-1.5 w-[180px] border-r border-slate-200">Indicador Estrutural</th>
                      <th className="px-3 py-1.5">DescriÃƒÂ§ÃƒÂ£o TÃƒÂ©cnica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { weight: '20%', label: 'ExposiÃƒÂ§ÃƒÂ£o MÃƒÂ©dia', desc: 'NÃƒÂ­vel de intensidade e frequÃƒÂªncia de exposiÃƒÂ§ÃƒÂ£o a riscos ergonÃƒÂ´micos (NR-17/AET).' },
                      { weight: '10%', label: 'AvaliaÃƒÂ§ÃƒÂ£o TÃƒÂ©cnica', desc: 'Nota tÃƒÂ©cnica resultante dos laudos e anÃƒÂ¡lises preliminares (AET).' },
                      { weight: '10%', label: 'Backlog de AÃƒÂ§ÃƒÂµes', desc: 'RazÃƒÂ£o de planos de aÃƒÂ§ÃƒÂ£o preventivos em aberto ou em atraso.' },
                      { weight: '10%', label: 'ConcentraÃƒÂ§ÃƒÂ£o CID M', desc: 'PrevalÃƒÂªncia de afastamentos musculoesquelÃƒÂ©ticos (Cap. XIII) em relaÃƒÂ§ÃƒÂ£o ao total.' },
                      { weight: '50%', label: 'Morbidade Relativa (DEA)', desc: 'Impacto absoluto do grupo versus o pior caso da mesma Secretaria: combina dias perdidos (70%) e volume de servidores afetados (30%).' }
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-1 text-center border-r border-slate-100">
                          <span className="text-[11px] font-normal text-[#E31E24] tabular-nums">{row.weight}</span>
                        </td>
                        <td className="px-3 py-1 border-r border-slate-100">
                          <div className="text-[10px] font-normal text-slate-900 uppercase tracking-tighter leading-none">{row.label}</div>
                        </td>
                        <td className="px-3 py-1">
                          <p className="text-[10px] text-slate-700 leading-tight font-normal">{row.desc}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-4">
                <p className="text-[9px] text-slate-500 uppercase tracking-tight text-center mb-2">
                  Matriz de Soma Ponderada NR-17 baseada em dados clÃƒÂ­nicos e indicadores epidemiolÃƒÂ³gicos.
                </p>
                <div className="w-full bg-slate-50 p-3 border border-slate-200 text-center">
                   <p className="text-[11px] font-bold text-[#1A3351] uppercase mb-1.5 tracking-wider">Algoritmo de PriorizaÃƒÂ§ÃƒÂ£o (Matriz Ponderada)</p>
                   <p className="text-[10px] text-slate-900 leading-none font-sans">
                     Score = (ExposiÃƒÂ§ÃƒÂ£o Ãƒâ€” 0.2) + (Morbidade Relativa DEA Ãƒâ€” 0.5) + (AvaliaÃƒÂ§ÃƒÂ£o Ãƒâ€” 0.1) + (Planos AÃƒÂ§ÃƒÂ£o Ãƒâ€” 0.1) + (ConcentraÃƒÂ§ÃƒÂ£o CID Ãƒâ€” 0.1)
                   </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => setShowMethodology(false)}
                  className="px-5 py-2 bg-[#1A3351] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-none shadow-md hover:bg-[#E31E24] transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[8px] font-bold text-[#1A3351]/40 uppercase tracking-widest leading-none">SESMT SYSTEM Ã‚Â· GOVERNANÃƒâ€¡A DIGITAL</span>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[10px] text-slate-400 font-medium">Powered by</span>
                <div className="flex items-start">
                  <span className="text-[12px] font-black text-slate-900 tracking-[0.10em] uppercase leading-none">UXBRAS</span>
                  <span className="text-[10px] font-bold text-slate-900 ml-[1px]">Ã‚Â®</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="print:hidden">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          userName="Gestor SESMT"
          userRole="admin"
        />
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>

      <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-visible relative">

        {/* ----------------------------------------------------------------- */}
        {/* HEADER (PADRÃƒÆ’O IMAGEM 2)                                         */}
        {/* ----------------------------------------------------------------- */}
        <section className="bg-[#B0B0B0] px-4 lg:px-6 py-1.5 border-b-[6px] border-[#1A3351] shrink-0 shadow-lg print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#1A3351]" />
                <h1 className="text-xl font-bold uppercase tracking-tighter leading-none text-[#1A3351]">
                  VigilÃƒÂ¢ncia <span className="text-[#E31E24]">ErgonÃƒÂ´mica</span>
                </h1>
                <span className="text-black/30 hover:text-[#1A3351] cursor-help">
                  <Info className="w-3 h-3" />
                </span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden h-8 w-8 bg-[#1A3351] text-white flex items-center justify-center shrink-0"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-[#1A3351]/20 hidden md:block" />

            {/* Filtros de Data */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 shadow-sm">
                <Calendar className="w-3 h-3 text-slate-400" />
                <label className="text-[9px] font-bold uppercase text-slate-400">De</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-[11px] font-medium text-[#1A3351] bg-transparent border-0 outline-none w-32"
                />
              </div>

              <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 shadow-sm">
                <Calendar className="w-3 h-3 text-slate-400" />
                <label className="text-[9px] font-bold uppercase text-slate-400">AtÃƒÂ©</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-[11px] font-medium text-[#1A3351] bg-transparent border-0 outline-none w-32"
                />
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 h-[34px] px-3 bg-[#1A3351] text-white text-[11px] font-bold uppercase tracking-wider shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Consultando..." : "Consultar"}
              </button>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* CONTEÃƒÅ¡DO                                                         */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-2 space-y-3">

          {model.error && (
            <div className="flex items-start gap-3 bg-[#E31E24]/5 border border-[#E31E24]/20 border-l-4 border-l-[#E31E24] px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-[#E31E24] mt-0.5" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#E31E24]">{model.error.code}</p>
                <p className="text-[12px] text-slate-700 mt-0.5">{model.error.message}</p>
              </div>
            </div>
          )}

          <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden">

            {/* Barra de Abas (Cinza) */}
            <div className="bg-[#B0B0B0] px-6 py-1 border-b-2 border-slate-400 flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A3351]">
                AnÃƒÂ¡lise ErgonÃƒÂ´mica NR-17 Ã¢â‚¬â€ VigilÃƒÂ¢ncia Ativa
              </h3>
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 h-8 px-4 border text-[10px] font-bold uppercase tracking-wide transition-all ${activeTab === tab.id
                        ? "bg-[#1A3351] text-white border-[#1A3351]"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                      }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-8">
              {model.isLoading ? (
                <div className="flex items-center justify-center py-20 gap-3">
                  <Activity className="w-8 h-8 text-[#1A3351] animate-pulse" />
                  <p className="text-[12px] font-bold uppercase tracking-widest text-[#1A3351]">
                    Processando InteligÃƒÂªncia ErgonÃƒÂ´mica...
                  </p>
                </div>
              ) : (
                <>
                  {activeTab === "visao-geral" && (
                    <div className="space-y-8">
                      {/* Indicadores Executivos */}
                      <StatisticCardsSection
                        title="Indicadores de VigilÃƒÂ¢ncia"
                        description="MÃƒÂ©tricas ergonÃƒÂ´micas calculadas a partir de sinais sentinela (CID M) e NR-17"
                      >
                        <StatisticCardRow columns={5}>
                          {model.view.cards.map((card) => {
                            let accent: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'primary';
                            
                            if (card.id.includes('events')) accent = 'danger';
                            if (card.id.includes('score')) accent = 'warning';
                            if (card.id.includes('actions')) accent = 'primary';
                            if (card.id.includes('days')) accent = 'info';
                            if (card.id.includes('servers')) accent = 'info';

                            return (
                               <StatisticCard
                                 key={card.id}
                                 variant="analytic"
                                 accent={accent}
                                 title={card.label}
                                 value={card.value}
                                 subtitle={card.unit}
                                 helperText={card.description}
                               />
                            );
                          })}
                        </StatisticCardRow>
                      </StatisticCardsSection>

                      {/* Bloco de Resumo (Ouro) */}
                      <div className="bg-white border border-slate-200 border-l-4 border-l-[#1A3351] px-4 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-[#1A3351]/50 mt-0.5" />
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Recorte</p>
                              <p className="text-[12px] font-bold text-[#1A3351] mt-0.5">{startDate} a {endDate}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <TrendingUp className="w-4 h-4 text-[#1A3351]/50 mt-0.5" />
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total Afastamentos M</p>
                              <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                                {model.data?.signalsByAnalyticalGroup.reduce((a, b) => a + b.musculoskeletalEvents, 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <Clock className="w-4 h-4 text-[#1A3351]/50 mt-0.5" />
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Dias Perdidos</p>
                              <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                                {model.data?.signalsByAnalyticalGroup.reduce((a, b) => a + b.lostDays, 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <Users className="w-4 h-4 text-[#1A3351]/50 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">PopulaÃƒÂ§ÃƒÂ£o Monitorada</span>
                              <span className="text-lg font-black text-[#1A3351] leading-none">
                                {model.data?.totalMonitoredPopulation?.toLocaleString() || "0"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <TrendingUp className="w-4 h-4 text-[#E31E24] mt-0.5" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-[#E31E24]">Morbidade ErgonÃƒÂ´mica</span>
                              <span className="text-lg font-black text-[#E31E24] leading-none">
                                {((model.data?.totalImpactedServers || 0) / (model.data?.totalWorkforceBaseline || 1) * 100).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 pb-20">
                        <div className="grid grid-cols-1 gap-6">
                          <div className="bg-white border-2 border-slate-200 shadow-lg overflow-hidden">
                            <div className="bg-[#1A3351] px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">CapÃƒÂ­tulo CID Dominante (Grupo M)</h4>
                              <span className="text-[9px] text-white/50 font-bold uppercase">VigilÃƒÂ¢ncia Ativa NR-17</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-[#1A3351] text-[12px] font-bold uppercase border-b border-slate-200">
                                    <th className="px-4 py-1 border-r border-slate-200 w-[220px]">Cargo / PGR</th>
                                    <th className="px-4 py-1 border-r border-slate-200">Unidade / Local</th>
                                    <th className="px-4 py-1 border-r border-slate-200 w-[120px]">CIDS PRINCIPAIS</th>
                                    <th className="px-4 py-1 text-right w-[60px]">Freq.</th>
                                    <th className="px-4 py-1 text-right w-[80px]">Dias</th>
                                    <th className="px-4 py-1 text-center w-[140px] relative group overflow-visible">
                                      <div className="flex items-center justify-center gap-1.5 py-1">
                                        Risco ErgonÃƒÂ´mico
                                        <button 
                                          title="Clique para ver o detalhamento do cÃƒÂ¡lculo"
                                          onClick={() => setShowMethodology(true)}
                                          className="flex items-center justify-center transition-all"
                                        >
                                          <Info className="w-4 h-4 text-[#E31E24] hover:text-[#c4191f] cursor-pointer animate-pulse-subtle active:scale-90" />
                                        </button>
                                      </div>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[240px] bg-[#1A3351] text-white p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 normal-case font-normal text-left border border-white/10 backdrop-blur-sm">
                                        <div className="flex items-center gap-2 border-b border-white/20 pb-2 mb-3">
                                          <div className="w-2 h-2 rounded-full bg-[#E31E24] animate-pulse"></div>
                                          <p className="font-black uppercase text-[10px] tracking-widest text-white">GovernanÃƒÂ§a de Risco (NR-17)</p>
                                        </div>
                                        <ul className="space-y-2 text-[11px]">
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded"><span>Ã¢â‚¬Â¢ ExposiÃƒÂ§ÃƒÂ£o MÃƒÂ©dia</span> <span className="font-black text-[#E31E24]">30%</span></li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded"><span>Ã¢â‚¬Â¢ AvaliaÃƒÂ§ÃƒÂ£o TÃƒÂ©cnica</span> <span className="font-black text-[#E31E24]">25%</span></li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded"><span>Ã¢â‚¬Â¢ Backlog de AÃƒÂ§ÃƒÂµes</span> <span className="font-black text-[#E31E24]">20%</span></li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded"><span>Ã¢â‚¬Â¢ ConcentraÃƒÂ§ÃƒÂ£o CID M</span> <span className="font-black text-[#E31E24]">15%</span></li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded"><span>Ã¢â‚¬Â¢ Gravidade Temporal</span> <span className="font-black text-[#E31E24]">10%</span></li>
                                        </ul>
                                        <div className="mt-4 pt-2 border-t border-white/10 italic text-white/40 text-[9px] leading-tight text-center">
                                          Metodologia de InteligÃƒÂªncia EpidemiolÃƒÂ³gica SESMT
                                        </div>
                                      </div>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(() => {
                                    const groups = (model.data?.signalsByAnalyticalGroup || []).reduce((acc, sig) => {
                                      if (!acc[sig.secretaria]) {
                                        acc[sig.secretaria] = {
                                          name: sig.secretaria,
                                          maxScore: 0,
                                          cargos: {} as Record<string, {
                                            cargo: string,
                                            unidades: Set<string>,
                                            cids: Set<string>,
                                            totalWeight: number,
                                            totalDays: number,
                                            maxScore: number,
                                            impactedServerCount: number
                                          }>
                                        };
                                      }

                                      const sec = acc[sig.secretaria];
                                      if (!sec.cargos[sig.cargo]) {
                                        sec.cargos[sig.cargo] = {
                                          cargo: sig.cargo,
                                          unidades: new Set(),
                                          cids: new Set(),
                                          totalWeight: 0,
                                          totalDays: 0,
                                          maxScore: 0,
                                          impactedServerCount: 0
                                        };
                                      }

                                      const c = sec.cargos[sig.cargo];
                                      // Adiciona local apenas se houve afastamento real (nao apenas avaliacao)
                                      if (sig.musculoskeletalEvents > 0) c.unidades.add(sig.localTrabalho);
                                      sig.associatedCids?.forEach(cid => c.cids.add(cid));
                                      c.totalWeight += sig.musculoskeletalEvents;
                                      c.totalDays += sig.lostDays;
                                      c.maxScore = Math.max(c.maxScore, sig.score);
                                      c.impactedServerCount += (sig.impactedServerCount || 0);

                                      sec.maxScore = Math.max(sec.maxScore, sig.score);

                                      return acc;
                                    }, {} as Record<string, any>);

                                    const sortedSecretarias = Object.values(groups)
                                      .filter((sec: any) => Object.values(sec.cargos).some((c: any) => c.impactedServerCount > 0))
                                      .sort((a: any, b: any) => {
                                       // Primario: Secretaria com mais CASOS lidera
                                       const totalA = Object.values(a.cargos).reduce((s: number, c: any) => s + (c.impactedServerCount || 0), 0) as number;
                                       const totalB = Object.values(b.cargos).reduce((s: number, c: any) => s + (c.impactedServerCount || 0), 0) as number;
                                       if (totalB !== totalA) return totalB - totalA;
                                       return b.maxScore - a.maxScore;
                                    });

                                    return sortedSecretarias.map((sec, secIdx) => (
                                      <React.Fragment key={secIdx}>
                                        <tr className="bg-slate-100/90 border-t-2 border-slate-300">
                                          <td colSpan={6} className="px-4 py-3 border-y border-slate-200">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                <div className={`w-2 h-5 ${sec.maxScore >= 75 ? 'bg-[#E31E24]' : 'bg-[#1A3351]'}`}></div>
                                                <span className="text-[14px] font-black text-[#1A3351] uppercase tracking-normal">{sec.name}</span>
                                                <span className="text-[9px] font-bold text-slate-400 border-l border-slate-300 pl-3 ml-1 uppercase tracking-tight">{Object.values(sec.cargos).filter((c: any) => c.impactedServerCount > 0).length} CARGOS EM ALERTA</span>
                                              </div>
                                              <div className="flex items-center">
                                                <div className="px-3 py-1 bg-[#1A3351] text-white text-[10px] font-black rounded shadow-sm">SCORE MÃƒÂXIMO: {sec.maxScore.toFixed(0)}%</div>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                        {Object.values(sec.cargos)
                                          .filter((cargo: any) => cargo.impactedServerCount > 0)
                                          .sort((a: any, b: any) => {
                                            const diff = b.maxScore - a.maxScore;
                                            if (diff !== 0) return diff;
                                            return b.totalDays - a.totalDays;
                                          })
                                          .map((cargo: any, i: number) => {
                                            const rowId = `${sec.name}-${cargo.cargo}`;
                                            const isExpanded = expandedSecretarias.has(rowId);
                                            const unidadesList = Array.from(cargo.unidades as Set<string>).sort((a, b) => a.localeCompare(b));
                                            const displayedUnits = isExpanded ? unidadesList : unidadesList.slice(0, 3);

                                            return (
                                              <tr key={i} className="hover:bg-slate-50 text-[11px] border-b border-slate-200 last:border-0 transition-all">
                                                <td className="px-4 py-2 align-middle w-[270px] max-w-[270px]">
                                                  <div className="text-[#1A3351] uppercase leading-tight text-[13px] tracking-tight truncate" title={`${cargo.cargo} (${cargo.impactedServerCount} casos)`}>
                                                    {cargo.cargo} ({cargo.impactedServerCount} casos)
                                                  </div>
                                                </td>
                                                <td className="px-4 py-2 align-middle w-[270px] max-w-[270px]">
                                                  <div className="flex flex-col gap-0.5">
                                                    {displayedUnits.map((unidade, idx) => (
                                                      <div key={idx} className="text-[12px] text-slate-700 leading-tight font-normal truncate" title={unidade}>
                                                        {unidade}
                                                      </div>
                                                    ))}
                                                    {unidadesList.length > 3 && (
                                                      <button
                                                        onClick={() => toggleSecretaria(rowId)}
                                                        className="text-[10px] text-[#1A3351] font-bold mt-1.5 uppercase tracking-tighter hover:underline flex items-center gap-1"
                                                      >
                                                        {isExpanded ? (
                                                          <>Ã¢â€“Â² RECOLHER LISTA</>
                                                        ) : (
                                                          <>Ã¢â€“Â¼ + {unidadesList.length - 3} UNIDADES ADICIONAIS (VER TODAS)</>
                                                        )}
                                                      </button>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="px-4 py-2 align-middle">
                                                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                                                    {Array.from(cargo.cids as Set<string>).slice(0, 5).map((cid, idx) => (
                                                      <span key={idx} className="text-slate-800 text-[12px] font-normal">
                                                        {cid}
                                                      </span>
                                                    ))}
                                                    {cargo.cids.size > 5 && (
                                                      <span className="text-[10px] text-slate-500 font-bold">+{cargo.cids.size - 5}</span>
                                                    )}
                                                    {cargo.cids.size === 0 && (
                                                      <span className="text-[10px] text-slate-400 italic">N/A</span>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="px-4 py-2 text-right tabular-nums text-slate-700 font-normal text-[12px] align-middle">{cargo.totalWeight.toFixed(0)}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-slate-800 text-[13px] align-middle">{cargo.totalDays.toLocaleString('pt-BR')}</td>
                                                <td className="px-4 py-2 align-middle">
                                                  <div className="flex flex-col gap-1 w-[140px]">
                                                    <div className="flex justify-between text-[11px] font-normal uppercase">
                                                      <span className={`text-[13px] ${cargo.maxScore >= 50 ? 'text-[#E31E24]' : 'text-slate-800'}`}>{cargo.maxScore.toFixed(0)}%</span>
                                                      <span className="text-slate-800 font-normal">{cargo.maxScore >= 75 ? 'CrÃƒÂ­tico' : cargo.maxScore >= 50 ? 'Alto' : 'Moderado'}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                                      <div
                                                        className={`h-full transition-all duration-700 ${cargo.maxScore >= 75 ? 'bg-[#E31E24]' :
                                                            cargo.maxScore >= 50 ? 'bg-orange-500' :
                                                              'bg-blue-400'
                                                          }`}
                                                        style={{ width: `${cargo.maxScore}%` }}
                                                      ></div>
                                                    </div>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                      </React.Fragment>
                                    ));
                                  })()}
                                </tbody>
                              </table>
                            </div>
                            <div className="bg-slate-50 p-3 border-t border-slate-200">
                              <p className="text-[9px] text-slate-400 font-medium text-center uppercase tracking-widest">
                                <span className="font-bold text-slate-500">PAINEL DE VIGILÃƒâ€šNCIA ERGONÃƒâ€MICA:</span> IdentificaÃƒÂ§ÃƒÂ£o de riscos sentinela baseada na NR-17. Dados agregados por unidade analÃƒÂ­tica.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "fatores" && (
                    <div className="space-y-6">
                      <div className="bg-[#1A3351] px-4 py-3 flex justify-between items-center shadow-lg border-b-4 border-[#E31E24]">
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">InventÃƒÂ¡rio de Fatores NR-17</h3>
                          <p className="text-[10px] text-white/60 font-bold uppercase mt-0.5">CatÃƒÂ¡logo de Riscos ErgonÃƒÂ´micos Monitorados</p>
                        </div>
                        <span className="px-3 py-1 bg-white/10 text-white text-[9px] font-black rounded border border-white/20 uppercase">Fase 9 Ã¢â‚¬â€ Ergonomia</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {model.data?.activeFactors.length === 0 ? (
                          <div className="col-span-full py-24 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                            <Activity className="w-16 h-16 mx-auto mb-4 opacity-10" />
                            <p className="text-xs font-bold uppercase tracking-widest text-[#1A3351]/40">DomÃƒÂ­nios ErgonÃƒÂ´micos</p>
                            <p className="text-[10px] mt-2 max-w-[300px] mx-auto text-slate-500">
                              Os fatores ativos serÃƒÂ£o listados automaticamente apÃƒÂ³s a fase de inventÃƒÂ¡rio e parametrizaÃƒÂ§ÃƒÂ£o.
                            </p>
                          </div>
                        ) : (
                          model.data?.activeFactors.map(f => (
                            <div key={f.factorId} className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative border-l-4 border-l-[#1A3351]">
                              <div className="p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[10px] font-black text-[#1A3351] bg-slate-100 px-2 py-0.5 uppercase rounded">{f.categoryNR17}</span>
                                  <span className="text-[10px] font-bold text-slate-400">{f.code}</span>
                                </div>
                                <h4 className="text-[11px] font-black text-[#1A3351] uppercase mb-2 group-hover:text-[#E31E24] transition-colors">{f.factor}</h4>
                                <p className="text-[10px] text-slate-600 leading-relaxed italic mb-4">"{f.description}"</p>

                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50 -m-4 mt-0 p-4">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                    GovernanÃƒÂ§a ErgonÃƒÂ´mica
                                  </div>
                                  <div className="text-[11px] font-black text-slate-300 italic uppercase">
                                    AuditÃƒÂ¡vel
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <footer className="pt-8 pb-4 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">
              VigilÃƒÂ¢ncia ErgonÃƒÂ´mica Ativa Ã‚Â· SESMT SYSTEM Ã‚Â· NR-17
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
