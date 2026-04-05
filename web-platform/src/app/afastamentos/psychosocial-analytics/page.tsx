"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Brain,
  Activity,
  Calendar,
  Clock,
  Users,
  Target,
  ShieldCheck,
  TrendingUp,
  Info,
  AlertTriangle,
  RefreshCw,
  Menu
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safeGetSession, handleAuthError } from "@/lib/auth-utils";
import Sidebar from "@/components/layout/Sidebar";
import StatisticCard from "@/components/statistics/StatisticCard";
import StatisticCardRow from "@/components/statistics/StatisticCardRow";
import StatisticCardsSection from "@/components/statistics/StatisticCardsSection";
import {
  buildPsychosocialPageModel,
  buildLoadingPageModel,
  type PsychosocialPageModel,
} from "@/lib/afastamentos-psychosocial-page-utils";
import type {
  PsychosocialAnalysisOutput,
} from "@/lib/afastamentos-psychosocial";

// ---------------------------------------------------------------------------
// Helpers e Configurações
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
  { id: "visao-geral", title: "Visão Geral (Intervenção)" },
  { id: "fatores", title: "Mapa de Fatores (NR-17)" },
];

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Componente Principal
export default function PsychosocialAnalyticsPage() {
  const router = useRouter();
  const [model, setModel] = useState<PsychosocialPageModel>(buildLoadingPageModel());
  const initializationRef = useRef(false);
  const defaultDates = useRef(getDefaultDates());
  const [activeTab, setActiveTab] = useState<TabId>("visao-geral");
  const [startDate, setStartDate] = useState(defaultDates.current.startDate);
  const [endDate, setEndDate] = useState(defaultDates.current.endDate);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedCargos, setExpandedCargos] = useState<Set<string>>(new Set());

  const toggleCargoExpansion = (id: string) => {
    setExpandedCargos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Handlers de Dados
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async (token: string, dStart: string, dEnd: string) => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/absenteismo/psychosocial-view?startDate=${dStart}&endDate=${dEnd}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        setModel(buildPsychosocialPageModel(null, {
          code: json?.error?.code || "FETCH_ERROR",
          message: json?.error?.message || `Erro ${response.status} ao carregar inteligência psicossocial.`
        }));
        return;
      }

      const json = await response.json();
      setModel(buildPsychosocialPageModel(json as PsychosocialAnalysisOutput));
    } catch (err: any) {
      setModel(buildPsychosocialPageModel(null, {
        code: "UNEXPECTED_ERROR",
        message: err.message || "Falha na comunicação com o motor de inteligência."
      }));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    const { session, error } = await safeGetSession();
    if (error || !session) {
      await handleAuthError(error || new Error("Sessão expirada"));
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
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">Metodologia: Escore Psicossocial</h2>
              </div>
              <button 
                onClick={() => setShowMethodology(false)}
                className="h-5 w-5 rounded-none bg-white/5 flex items-center justify-center hover:bg-[#E31E24] transition-all border border-white/10"
              >
                <span className="text-base font-light leading-none">×</span>
              </button>
            </div>

            <div className="p-4 font-sans text-black">
              <div className="border border-slate-200 rounded-none overflow-hidden mb-4">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-500 tracking-widest">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2 w-[80px] text-center border-r border-slate-200">Peso</th>
                      <th className="px-3 py-2 w-[180px] border-r border-slate-200">Indicador Estrutural</th>
                      <th className="px-3 py-2">Descrição Técnica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { weight: '20%', label: 'Concentração CID F', desc: 'Prevalência de afastamentos por transtornos mentais (F) em relação ao total de eventos clínicos compatíveis.' },
                      { weight: '20%', label: 'Exposição Estimada', desc: 'Média de escores em avaliações e questionários de vigilância ativa (NR-1/PGR).' },
                      { weight: '5%', label: 'Recorrência', desc: 'Fração de servidores com episódios repetidos no período. Usado como sinal sentinela complementar.' },
                      { weight: '5%', label: 'Tendência Temporal', desc: 'Razão de evolução da patologia entre a primeira e segunda metade do período monitorado.' },
                      { weight: '50%', label: 'Morbidade Relativa (DEA)', desc: 'Impacto absoluto do grupo em relação ao pior caso da mesma Secretaria: combina dias perdidos (70%) e volume de servidores afetados (30%).' }
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
                  Matriz de Soma Ponderada NR-1 baseada em dados clínicos e indicadores epidemiológicos.
                </p>
                <div className="w-full bg-slate-50 p-3 border border-slate-200 text-center">
                   <p className="text-[11px] font-bold text-[#1A3351] uppercase mb-1.5 tracking-wider">Algoritmo de Vigilância (Matriz Ponderada)</p>
                   <p className="text-[10px] text-slate-900 leading-none font-sans">
                     Score = (CID F × 0.2) + (Exposição × 0.2) + (Morbidade Relativa DEA × 0.5) + (Tendência × 0.05) + (Recorrência × 0.05)
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
              <span className="text-[8px] font-bold text-[#1A3351]/40 uppercase tracking-widest leading-none">SESMT SYSTEM · GOVERNANÇA DIGITAL</span>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[10px] text-slate-400 font-medium">Powered by</span>
                <div className="flex items-start">
                  <span className="text-[12px] font-black text-slate-900 tracking-[0.10em] uppercase leading-none">UXBRAS</span>
                  <span className="text-[10px] font-bold text-slate-900 ml-[1px]">®</span>
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
        {/* HEADER (PADRÃO IMAGEM 2)                                         */}
        {/* ----------------------------------------------------------------- */}
        <section className="bg-[#B0B0B0] px-4 lg:px-6 py-1.5 border-b-[6px] border-[#1A3351] shrink-0 shadow-lg print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#1A3351]" />
                <h1 className="text-xl font-bold uppercase tracking-tighter leading-none text-[#1A3351]">
                  Vigilância <span className="text-[#E31E24]">Psicossocial</span>
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
                <label className="text-[9px] font-bold uppercase text-slate-400">Até</label>
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
        {/* CONTEÚDO (CONTAINER BRANCO COM ABAS)                              */}
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
                Análise Psicossocial NR-1 — Vigilância Ativa
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
                    Processando Inteligência Psicossocial...
                  </p>
                </div>
              ) : (
                <>
                  {activeTab === "visao-geral" && (
                    <div className="space-y-8">
                      {/* Indicadores Executivos */}
                      <StatisticCardsSection
                        title="Indicadores de Vigilância"
                        description="Métricas psicossociais calculadas a partir de sinais sentinela (CID F)"
                      >
                        <StatisticCardRow columns={4}>
                          {model.view.cards.map((card) => {
                            let accent: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'primary';

                            if (card.id === 'absentismo-f') accent = 'primary';
                            if (card.id === 'frequencia-psi') accent = 'success';
                            if (card.id === 'duracao-media-psi') accent = 'warning';
                            if (card.id === 'gravidade-psi') accent = 'danger';
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
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Período</p>
                              <p className="text-[12px] font-bold text-[#1A3351] mt-0.5">{startDate} a {endDate}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <TrendingUp className="w-4 h-4 text-[#1A3351]/50 mt-0.5" />
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total de Sinais</p>
                              <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                                {model.data?.signalsByAnalyticalGroup.reduce((a, b) => a + b.cidCompatibleWeight, 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <Clock className="w-4 h-4 text-[#1A3351]/50 mt-0.5" />
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Dias de Impacto</p>
                              <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                                {model.data?.signalsByAnalyticalGroup.reduce((a, b) => a + b.lostDays, 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <Users className="w-4 h-4 text-[#1A3351]/50 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">População Monitorada</span>
                              <span className="text-lg font-black text-[#1A3351] leading-none">
                                {model.view.cards.find(c => c.id === 'affected-servers')?.value || '0'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <TrendingUp className="w-4 h-4 text-[#E31E24] mt-0.5" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-[#E31E24]">Morbidade Psicossocial</span>
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
                              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Capítulo CID Dominante (Grupo F)</h4>
                              <span className="text-[9px] text-white/50 font-bold uppercase">Vigilância Ativa NR-1</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-[#1A3351] text-[12px] font-bold uppercase border-b border-slate-200">
                                    <th className="px-4 py-1 border-r border-slate-200 w-[240px]">Cargo / PGR</th>
                                    <th className="px-4 py-1 border-r border-slate-200">Unidade / Local</th>
                                    <th className="px-4 py-1 border-r border-slate-200 w-[120px]">CIDS PRINCIPAIS</th>
                                    <th className="px-4 py-1 text-right w-[60px]">Freq.</th>
                                    <th className="px-4 py-1 text-right w-[80px]">Dias</th>
                                    <th className="px-4 py-1 text-center w-[140px] relative group overflow-visible">
                                      <div className="flex items-center justify-center gap-1.5 py-1">
                                        Risco Psicossocial
                                        <button 
                                          title="Clique para ver o detalhamento do cálculo"
                                          onClick={() => setShowMethodology(true)}
                                          className="flex items-center justify-center transition-all"
                                        >
                                          <Info className="w-4 h-4 text-[#E31E24] hover:text-[#c4191f] cursor-pointer animate-pulse-subtle active:scale-90" />
                                        </button>
                                      </div>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[240px] bg-[#1A3351] text-white p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 normal-case font-normal text-left border border-white/10 backdrop-blur-sm">
                                        <div className="flex items-center gap-2 border-b border-white/20 pb-2 mb-3">
                                          <div className="w-2 h-2 rounded-full bg-[#E31E24] animate-pulse"></div>
                                          <p className="font-black uppercase text-[10px] tracking-widest text-white">Governança de Risco (NR-1)</p>
                                        </div>
                                        <ul className="space-y-2 text-[11px]">
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded"><span>• Concentração CID F</span> <span className="font-black text-[#E31E24]">30%</span></li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded"><span>• Exposição Estimada</span> <span className="font-black text-[#E31E24]">20%</span></li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded"><span>• Recorrência de Casos</span> <span className="font-black text-[#E31E24]">20%</span></li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded"><span>• Tendência Temporal</span> <span className="font-black text-[#E31E24]">15%</span></li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded"><span>• Dias Perdidos Totais</span> <span className="font-black text-[#E31E24]">15%</span></li>
                                        </ul>
                                        <div className="mt-4 pt-2 border-t border-white/10 italic text-white/40 text-[9px] leading-tight text-center">
                                          Metodologia de Inteligência Epidemiológica SESMT
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
                                      // Adiciona local apenas se houve evento clinico real (nao apenas avaliacao psicossocial)
                                      if (sig.cidCompatibleWeight > 0) c.unidades.add(sig.localTrabalho);
                                      sig.associatedCids?.forEach(cid => c.cids.add(cid));
                                      c.totalWeight += sig.cidCompatibleWeight;
                                      c.totalDays += sig.lostDays;
                                      c.maxScore = Math.max(c.maxScore, sig.score);
                                      c.impactedServerCount += (sig.impactedServerCount || 0);

                                      sec.maxScore = Math.max(sec.maxScore, sig.score);

                                      return acc;
                                    }, {} as Record<string, any>);

                                    const sortedSecretarias = Object.values(groups).sort((a: any, b: any) => {
                                      // Primario: maior numero total de casos
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
                                                <div className="px-3 py-1 bg-[#1A3351] text-white text-[10px] font-black rounded shadow-sm">SCORE MÁXIMO: {sec.maxScore.toFixed(0)}%</div>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                        {Object.values(sec.cargos)
                                          .sort((a: any, b: any) => {
                                            const diff = b.maxScore - a.maxScore;
                                            if (diff !== 0) return diff;
                                            return b.totalDays - a.totalDays;
                                          })
                                          .map((cargo: any, i: number) => {
                                            const rowId = `${sec.name}-${cargo.cargo}`;
                                            const isExpanded = expandedCargos.has(rowId);
                                            const unidadesList = Array.from(cargo.unidades as Set<string>).sort((a, b) => a.localeCompare(b));
                                            const displayedUnits = isExpanded ? unidadesList : unidadesList.slice(0, 3);

                                            return (
                                              <tr key={i} className="hover:bg-slate-50 text-[11px] border-b border-slate-200 last:border-0 transition-all">
                                                <td className="px-4 py-2 align-middle w-[320px]">
                                                  <div className="text-[#1A3351] uppercase leading-tight text-[13px] tracking-tight whitespace-nowrap">
                                                    {cargo.cargo}
                                                    <span className="ml-2">({cargo.impactedServerCount} casos)</span>
                                                  </div>
                                                </td>
                                                <td className="px-4 py-2 align-middle max-w-[400px]">
                                                  <div className="flex flex-col gap-0.5">
                                                    {displayedUnits.map((unidade, idx) => (
                                                      <div key={idx} className="text-[12px] text-slate-700 leading-tight font-normal truncate" title={unidade}>
                                                        {unidade}
                                                      </div>
                                                    ))}
                                                    {unidadesList.length > 3 && (
                                                      <button
                                                        onClick={() => toggleCargoExpansion(rowId)}
                                                        className="text-[10px] text-[#1A3351] font-bold mt-1.5 uppercase tracking-tighter hover:underline flex items-center gap-1"
                                                      >
                                                        {isExpanded ? (
                                                          <>▲ RECOLHER LISTA</>
                                                        ) : (
                                                          <>▼ + {unidadesList.length - 3} UNIDADES ADICIONAIS (VER TODAS)</>
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
                                                <td className="px-4 py-2 text-right tabular-nums text-slate-700 font-normal text-[12px] align-middle">{cargo.totalWeight.toFixed(1)}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-slate-800 text-[13px] align-middle">{cargo.totalDays.toLocaleString('pt-BR')}</td>
                                                <td className="px-4 py-2 align-middle">
                                                  <div className="flex flex-col gap-1 w-[140px]">
                                                    <div className="flex justify-between text-[11px] font-normal uppercase">
                                                      <span className={`text-[13px] ${cargo.maxScore >= 50 ? 'text-[#E31E24]' : 'text-slate-800'}`}>{cargo.maxScore.toFixed(0)}%</span>
                                                      <span className="text-slate-800 font-normal">{cargo.maxScore >= 75 ? 'Crítico' : cargo.maxScore >= 50 ? 'Alto' : 'Moderado'}</span>
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
                              <p className="text-[9px] text-slate-400 font-medium">
                                <span className="font-bold text-slate-500">DIRETRIZES NR-1:</span> Este painel atende aos requisitos de vigilância ativa de riscos psicossociais. Dados anonimizados e agregados para fins de planejamento ergonômico.
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
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">Catálogo de Domínios NR-17</h3>
                          <p className="text-[10px] text-white/60 font-bold uppercase mt-0.5">Estrutura de Orientação Preventiva</p>
                        </div>
                        <span className="px-3 py-1 bg-white/10 text-white text-[9px] font-black rounded border border-white/20 uppercase">Aguardando Coleta Ativa</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {model.data?.activeFactors.length === 0 ? (
                          <div className="col-span-full py-24 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                            <Brain className="w-16 h-16 mx-auto mb-4 opacity-10" />
                            <p className="text-xs font-bold uppercase tracking-widest text-[#1A3351]/40">Domínios Psicossociais</p>
                            <p className="text-[10px] mt-2 max-w-[300px] mx-auto text-slate-500">
                              As orientações serão populadas automaticamente após o lançamento dos questionários de vigilância ativa.
                            </p>
                          </div>
                        ) : (
                          model.data?.activeFactors.map(f => (
                            <div key={f.factorId} className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative border-l-4 border-l-[#1A3351]">
                              <div className="p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[10px] font-black text-[#1A3351] bg-slate-100 px-2 py-0.5 uppercase rounded">{f.domain}</span>
                                  <span className="text-[10px] font-bold text-slate-400">{f.code}</span>
                                </div>
                                <h4 className="text-[11px] font-black text-[#1A3351] uppercase mb-2 group-hover:text-[#E31E24] transition-colors">{f.factor}</h4>
                                <p className="text-[10px] text-slate-600 leading-relaxed italic mb-4">"{f.description}"</p>

                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50 -m-4 mt-0 p-4">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                    Vigilância Preventiva
                                  </div>
                                  <div className="text-[11px] font-black text-slate-300 italic uppercase">
                                    0 Unidades em Alerta
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
              Monitoramento Psicossocial · Sistema SESMT Integrado · PGR NR-1
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function RankingTable({ title, items }: { title: string, items: any[] }) {
  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1A3351] bg-[#B0B0B0] px-3 py-2">{title}</h4>
      <div className="space-y-3">
        {items.slice(0, 8).map((item, idx) => (
          <div key={idx} className="flex items-end justify-between border-b border-slate-100 pb-2">
            <span className="text-[11px] font-bold text-[#1A3351] uppercase truncate max-w-[70%]">{item.key}</span>
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-black text-[#1A3351]">{item.maxScore.toFixed(0)}%</span>
              <div className="w-32 h-1 bg-slate-100 mt-1">
                <div
                  className={`h-full ${item.criticality === 'CRITICA' ? 'bg-[#E31E24]' : 'bg-[#1A3351]'}`}
                  style={{ width: `${Math.min(100, item.maxScore)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
