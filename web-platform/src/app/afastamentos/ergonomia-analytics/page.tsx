"use client"; // Standardized Header Refresh

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
  Menu,
  Printer,
  X,
} from "lucide-react";
import ActionIconButton from "@/components/filters/ActionIconButton";
import { safeGetSession, handleAuthError } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/layout/Sidebar";
import StatisticCard from "@/components/statistics/StatisticCard";
import StatisticCardRow from "@/components/statistics/StatisticCardRow";
import StatisticCardsSection from "@/components/statistics/StatisticCardsSection";
import {
  buildErgonomicPageModel,
  buildLoadingPageModel,
  type ErgonomicPageModel,
} from "@/lib/afastamentos-ergonomia-page-utils";

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
  { id: "fatores", title: "Mapa de Riscos (NR-17)" },
];

/**
 * Dashboard de Inteligência Ergonômica
 * Autoridade Visual: Psicossocial Analytics (Imagem 2)
 */
export default function ErgonomicsAnalyticsPage() {
  const router = useRouter();
  const [model, setModel] = useState<ErgonomicPageModel>(
    buildLoadingPageModel(),
  );
  const initializationRef = useRef(false);
  const defaultDates = useRef(getDefaultDates());
  const [activeTab, setActiveTab] = useState<TabId>("visao-geral");
  const [startDate, setStartDate] = useState(defaultDates.current.startDate);
  const [endDate, setEndDate] = useState(defaultDates.current.endDate);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isPrintPopoverOpen, setIsPrintPopoverOpen] = useState(false);
  const [expandedSecretarias, setExpandedSecretarias] = useState<Set<string>>(
    new Set(),
  );

  const toggleSecretaria = (name: string) => {
    setExpandedSecretarias((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Handlers de Dados
  // -------------------------------------------------------------------------

  const fetchData = useCallback(
    async (token: string, dStart: string, dEnd: string) => {
      setIsRefreshing(true);
      try {
        setModel((prev) => ({ ...prev, isLoading: true, error: null }));

        const params = new URLSearchParams({
          startDate: dStart,
          endDate: dEnd,
        });

        const baseUrl =
          typeof window !== "undefined"
            ? window.location.origin
            : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const url = `${baseUrl}/api/absenteismo/ergonomia-view?${params.toString()}`;

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (!response.ok) {
          const json = await response.json().catch(() => ({}));
          setModel(
            buildErgonomicPageModel(null, {
              code: json?.error?.code || "FETCH_ERROR",
              message:
                json?.error?.message ||
                `Erro ${response.status} ao carregar inteligência ergonômica.`,
            }),
          );
          return;
        }

        const data = await response.json();
        setModel(buildErgonomicPageModel(data));
      } catch (err: any) {
        setModel(
          buildErgonomicPageModel(null, {
            code: "UNEXPECTED_ERROR",
            message: err.message || "Erro ao carregar indicadores ergonômicos.",
          }),
        );
      } finally {
        setIsRefreshing(false);
        setModel((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [],
  );

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
    const checkAuthAndFetch = async () => {
      const { session, error } = await safeGetSession();
      if (error || !session) {
        await handleAuthError(error || new Error("Sessão expirada"));
        router.push("/login");
        return;
      }

      // Fetch role from profiles table (Standard)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const metadata = session.user.user_metadata;
      setUserName(
        metadata.fullName ||
          metadata.name ||
          session.user.email?.split("@")[0] ||
          "Usuário",
      );
      setUserRole(profile?.role || metadata.role || "viewer");

      if (!initializationRef.current) {
        initializationRef.current = true;
        fetchData(session.access_token, startDate, endDate);
      }
    };

    checkAuthAndFetch();
  }, [router, startDate, endDate, fetchData]);

  const openPrintWindow = useCallback(
    (layout: "portrait" | "landscape") => {
      const node = document.getElementById("print-area");
      if (!node) {
        try {
          window.print();
        } catch (e) {}
        return;
      }

      const win = window.open("", "_blank");
      if (!win) {
        try {
          window.print();
        } catch (e) {}
        return;
      }

      const styles = Array.from(
        document.querySelectorAll("link[rel=stylesheet], style"),
      )
        .map((el) => el.outerHTML)
        .join("\n");

      const today = new Date().toLocaleDateString("pt-BR");
      const logoUrl = window.location.origin + "/images/logo.png";
      const operatorName = (typeof userName === "string" && userName) || "";

      const headerCss = `
      .official-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E31E24; padding-bottom: 8px; margin-bottom: 10px; }
      .logo-area img { height: 42px; width: auto; }
      .report-title-area { text-align: center; flex: 1; }
      .report-title-area h1 { margin: 0; font-size: 14px; color: #1A3351; text-transform: uppercase; font-weight: 900; }
      .report-info { font-size: 9px; color: #666; font-weight: 400; margin-top: 4px; }
      @media print { .official-header, .official-header * { visibility: visible !important; } #print-area, #print-area * { visibility: visible !important; } .report-footer { page-break-inside: avoid !important; margin-top: 12px !important; display:block !important; } }
      `;

      const headerHtml = `
      <div class="official-header">
        <div class="logo-area"><img src="${logoUrl}" alt="Logo" /></div>
        <div class="report-title-area">
          <h1>Relatório Ergonômico - SESMT</h1>
          <div class="report-info">(Painel de vigilância ergonômica — dados agregados por NR-17)</div>
        </div>
        <div style="text-align:right;font-size:9px;color:#666;min-width:120px;">
          <div>Operador: ${operatorName}</div>
          <div>Data: ${today}</div>
        </div>
      </div>
    `;

      const footerHtml = `
      <div class="report-footer" style="margin-top:16px;border-top:2px solid #E5E7EB;padding-top:12px;text-align:center;max-width:90%;margin-left:auto;margin-right:auto;">
        <p style="font-size:11px;font-weight:800;color:#111;text-transform:uppercase;margin:0 0 6px;">🛡️ IMPORTANTE: Privacidade e Proteção de Dados (LGPD)</p>
        <p style="font-size:10px;color:#666;margin:0 0 8px;line-height:1.25;">Este relatório gerencial contém dados agregados de produtividade para fins de Business Intelligence. O uso destas informações é restrito à gestão estratégica do SESMT.</p>
        <div style="padding-top:8px;border-top:1px solid #E6E6E6;">
          <p style="font-size:9px;color:#9CA3AF;letter-spacing:0.2em;font-weight:700;margin:6px 0 0;">Gerado via SESMT SYSTEM - Powered by UXBRAS®</p>
        </div>
      </div>
    `;

      let printContentHtml = node.outerHTML;
      try {
        const cloned = node.cloneNode(true) as HTMLElement;
        printContentHtml = cloned.outerHTML;
      } catch (e) {
        printContentHtml = node.outerHTML;
      }

      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Relatório Ergonômico</title>${styles}<style>${headerCss}@media print{ @page { size: ${layout}; margin: 1cm; } } body{background:white;margin:0;padding:10px;color:#111;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;} #print-area { display: block !important; }</style></head><body>${headerHtml}${printContentHtml}${footerHtml}</body></html>`;

      win.document.open();
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        try {
          win.focus();
          win.print();
          win.close();
        } catch (e) {}
      }, 600);
    },
    [userName],
  );

  const cardsList = model.view.cards || [];
  const mid = Math.ceil(cardsList.length / 2);
  const firstRowCards = cardsList.slice(0, mid);
  const secondRowCards = cardsList.slice(mid);

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-hidden relative">
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
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                  Metodologia: Escore Ergonômico
                </h2>
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
                      <th className="px-3 py-1.5 w-[80px] text-center border-r border-slate-200">
                        Peso
                      </th>
                      <th className="px-3 py-1.5 w-[180px] border-r border-slate-200">
                        Indicador Estrutural
                      </th>
                      <th className="px-3 py-1.5">Descrição Técnica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      {
                        weight: "20%",
                        label: "Exposição Média",
                        desc: "Nível de intensidade e frequência de exposição a riscos ergonômicos (NR-17/AET).",
                      },
                      {
                        weight: "10%",
                        label: "Avaliação Técnica",
                        desc: "Nota técnica resultante dos laudos e análises preliminares (AET).",
                      },
                      {
                        weight: "10%",
                        label: "Backlog de Ações",
                        desc: "Razão de planos de ação preventivos em aberto ou em atraso.",
                      },
                      {
                        weight: "10%",
                        label: "Concentração CID M",
                        desc: "Prevalência de afastamentos musculoesqueléticos (Cap. XIII) em relação ao total.",
                      },
                      {
                        weight: "50%",
                        label: "Morbidade Relativa (DEA)",
                        desc: "Impacto absoluto do grupo versus o pior caso da mesma Secretaria: combina dias perdidos (70%) e volume de servidores afetados (30%).",
                      },
                    ].map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-3 py-1 text-center border-r border-slate-100">
                          <span className="text-[11px] font-normal text-[#E31E24] tabular-nums">
                            {row.weight}
                          </span>
                        </td>
                        <td className="px-3 py-1 border-r border-slate-100">
                          <div className="text-[10px] font-normal text-slate-900 uppercase tracking-tighter leading-none">
                            {row.label}
                          </div>
                        </td>
                        <td className="px-3 py-1">
                          <p className="text-[10px] text-slate-700 leading-tight font-normal">
                            {row.desc}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-4">
                <p className="text-[9px] text-slate-500 uppercase tracking-tight text-center mb-2">
                  Matriz de Soma Ponderada NR-17 baseada em dados clínicos e
                  indicadores epidemiológicos.
                </p>
                <div className="w-full bg-slate-50 p-3 border border-slate-200 text-center">
                  <p className="text-[11px] font-bold text-[#1A3351] uppercase mb-1.5 tracking-wider">
                    Algoritmo de Priorização (Matriz Ponderada)
                  </p>
                  <p className="text-[10px] text-slate-900 leading-none font-sans">
                    Score = (Exposição × 0.2) + (Morbidade Relativa DEA × 0.5) +
                    (Avaliação × 0.1) + (Planos Ação × 0.1) + (Concentração CID
                    × 0.1)
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
              <span className="text-[8px] font-bold text-[#1A3351]/40 uppercase tracking-widest leading-none">
                SESMT SYSTEM · GOVERNANÇA DIGITAL
              </span>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[10px] text-slate-400 font-medium">
                  Powered by
                </span>
                <div className="flex items-start">
                  <span className="text-[12px] font-black text-slate-900 tracking-[0.10em] uppercase leading-none">
                    UXBRAS
                  </span>
                  <span className="text-[10px] font-bold text-slate-900 ml-[1px]">
                    ®
                  </span>
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
          userName={userName}
          userRole={userRole}
        />
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>

      <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden relative">
        {/* ----------------------------------------------------------------- */}
        {/* HEADER (PADRÃO IMAGEM 2)                                         */}
        {/* ----------------------------------------------------------------- */}
        <section className="bg-[#B0B0B0] px-4 lg:px-6 py-1.5 border-b-[6px] border-[#1A3351] shrink-0 shadow-lg print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#1A3351]" />
                <h1 className="text-xl font-bold uppercase tracking-tighter leading-none text-[#1A3351]">
                  Vigilância <span className="text-[#E31E24]">Ergonômica</span>
                </h1>
                <span
                  title="Dados baseados em afastamentos registrados na plataforma (casos com auxílio-doença / afastamentos superiores a 15 dias)."
                  className="text-black/30 hover:text-[#1A3351] cursor-help"
                >
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

            <div className="flex flex-wrap items-center justify-end gap-2 flex-1 relative">
              <ActionIconButton
                icon={<Calendar className="w-4 h-4" />}
                label="Período"
                variant="filter"
                open={isDateFilterOpen}
                onToggle={setIsDateFilterOpen}
                active={Boolean(startDate || endDate)}
              >
                <div className="bg-white border border-slate-200 shadow-2x shadow-slate-300 w-72 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">
                      Data Inicial
                    </span>
                    <input
                      type="date"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-[11px] font-bold uppercase outline-none focus:border-[#1A3351] transition-colors"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">
                      Data Final
                    </span>
                    <input
                      type="date"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-[11px] font-bold uppercase outline-none focus:border-[#1A3351] transition-colors"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                        setIsDateFilterOpen(false);
                      }}
                      className="flex-1 h-9 border border-slate-200 text-[9px] font-bold uppercase text-slate-500 hover:text-[#E31E24] hover:bg-red-50 hover:border-red-100 transition-all"
                    >
                      Limpar
                    </button>
                    <button
                      onClick={() => {
                        setIsDateFilterOpen(false);
                        handleRefresh();
                      }}
                      className="flex-1 h-9 bg-[#1A3351] text-white text-[9px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md"
                    >
                      Consultar
                    </button>
                  </div>
                </div>
              </ActionIconButton>

              <ActionIconButton
                icon={<Printer className="w-3.5 h-3.5" />}
                label="Impressão / Relatório"
                variant="filter"
                open={isPrintPopoverOpen}
                onToggle={setIsPrintPopoverOpen}
                showMenuIndicator={true}
              >
                <div className="bg-white border border-slate-200 shadow-sm p-2 w-44 space-y-1">
                  <button
                    onClick={() => {
                      setIsPrintPopoverOpen(false);
                      openPrintWindow("portrait");
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-slate-50"
                  >
                    Relatório — Retrato
                  </button>
                  <button
                    onClick={() => {
                      setIsPrintPopoverOpen(false);
                      openPrintWindow("landscape");
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-slate-50"
                  >
                    Relatório — Paisagem
                  </button>
                </div>
              </ActionIconButton>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 h-[34px] px-3 bg-[#1A3351] text-white text-[11px] font-bold uppercase tracking-wider shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
                {isRefreshing ? "Consultando..." : "Consultar"}
              </button>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* CONTEÚDO                                                         */}
        {/* ----------------------------------------------------------------- */}
        <div
          id="print-area"
          className="flex-1 overflow-y-auto px-4 lg:px-6 py-2 space-y-3"
        >
          {model.error && (
            <div className="flex items-start gap-3 bg-[#E31E24]/5 border border-[#E31E24]/20 border-l-4 border-l-[#E31E24] px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-[#E31E24] mt-0.5" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#E31E24]">
                  {model.error.code}
                </p>
                <p className="text-[12px] text-slate-700 mt-0.5">
                  {model.error.message}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden">
            {/* Barra de Abas (Cinza) */}
            <div className="bg-[#B0B0B0] px-6 py-1 border-b-2 border-slate-400 flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A3351]">
                Análise Ergonômica NR-17 — Vigilância Ativa
              </h3>
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 h-8 px-4 border text-[10px] font-bold uppercase tracking-wide transition-all ${
                      activeTab === tab.id
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
                    Processando Inteligência Ergonômica...
                  </p>
                </div>
              ) : (
                <>
                  {activeTab === "visao-geral" && (
                    <div className="space-y-8">
                      {/* Indicadores Executivos */}
                      <StatisticCardsSection
                        title="Indicadores de Vigilância"
                        description="Métricas ergonômicas calculadas a partir de sinais sentinela (CID M) e NR-17"
                      >
                        <StatisticCardRow columns={3} className="gap-2 lg:gap-3">
                          {firstRowCards.map((card) => {
                            let accent:
                              | "primary"
                              | "success"
                              | "warning"
                              | "danger"
                              | "info" = "primary";

                            if (card.id.includes("events")) accent = "danger";
                            if (card.id.includes("score")) accent = "warning";
                            if (card.id.includes("actions")) accent = "primary";
                            if (card.id.includes("days")) accent = "info";
                            if (card.id.includes("servers")) accent = "info";

                            return (
                              <StatisticCard
                                key={card.id}
                                variant="analytic"
                                accent={accent}
                                title={card.label}
                                value={card.value}
                                subtitle={card.unit}
                                helperText={card.description}
                                compact
                              />
                            );
                          })}
                        </StatisticCardRow>

                        <StatisticCardRow columns={3} className="gap-2 lg:gap-3">
                          {secondRowCards.map((card) => {
                            let accent:
                              | "primary"
                              | "success"
                              | "warning"
                              | "danger"
                              | "info" = "primary";

                            if (card.id.includes("events")) accent = "danger";
                            if (card.id.includes("score")) accent = "warning";
                            if (card.id.includes("actions")) accent = "primary";
                            if (card.id.includes("days")) accent = "info";
                            if (card.id.includes("servers")) accent = "info";

                            return (
                              <StatisticCard
                                key={card.id}
                                variant="analytic"
                                accent={accent}
                                title={card.label}
                                value={card.value}
                                subtitle={card.unit}
                                helperText={card.description}
                                compact
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
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                Recorte
                              </p>
                              <p className="text-[12px] font-bold text-[#1A3351] mt-0.5">
                                {startDate} a {endDate}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <TrendingUp className="w-4 h-4 text-[#1A3351]/50 mt-0.5" />
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                Total Afastamentos M
                              </p>
                              <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                                {model.data?.signalsByAnalyticalGroup
                                  .reduce(
                                    (a, b) => a + b.musculoskeletalEvents,
                                    0,
                                  )
                                  .toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <Clock className="w-4 h-4 text-[#1A3351]/50 mt-0.5" />
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                Dias Perdidos
                              </p>
                              <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                                {model.data?.signalsByAnalyticalGroup
                                  .reduce((a, b) => a + b.lostDays, 0)
                                  .toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <Users className="w-4 h-4 text-[#1A3351]/50 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                População Monitorada
                              </span>
                              <span className="text-lg font-black text-[#1A3351] leading-none">
                                {model.data?.totalMonitoredPopulation?.toLocaleString() ||
                                  "0"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 border-l border-slate-100 pl-4">
                            <TrendingUp className="w-4 h-4 text-[#E31E24] mt-0.5" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-[#E31E24]">
                                Morbidade Ergonômica
                              </span>
                              <span className="text-lg font-black text-[#E31E24] leading-none">
                                {(
                                  ((model.data?.totalImpactedServers || 0) /
                                    (model.data?.totalWorkforceBaseline || 1)) *
                                  100
                                ).toFixed(2)}
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 pb-20">
                        <div className="grid grid-cols-1 gap-6">
                          <div className="bg-white border-2 border-slate-200 shadow-lg overflow-hidden">
                            <div className="bg-[#1A3351] px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">
                                Capítulo CID Dominante (Grupo M)
                              </h4>
                              <span className="text-[9px] text-white/50 font-bold uppercase">
                                Vigilância Ativa NR-17
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-[#1A3351] text-[12px] font-bold uppercase border-b border-slate-200">
                                    <th className="px-4 py-1 border-r border-slate-200 w-[220px]">
                                      Cargo / PGR
                                    </th>
                                    <th className="px-4 py-1 border-r border-slate-200">
                                      Unidade / Local
                                    </th>
                                    <th className="px-4 py-1 border-r border-slate-200 w-[120px]">
                                      CIDS PRINCIPAIS
                                    </th>
                                    <th className="px-4 py-1 text-right w-[60px]">
                                      Freq.
                                    </th>
                                    <th className="px-4 py-1 text-right w-[80px]">
                                      Dias
                                    </th>
                                    <th className="px-4 py-1 text-center w-[140px] relative group overflow-visible">
                                      <div className="flex items-center justify-center gap-1.5 py-1">
                                        Risco Ergonômico
                                        <button
                                          title="Clique para ver o detalhamento do cálculo"
                                          onClick={() =>
                                            setShowMethodology(true)
                                          }
                                          className="flex items-center justify-center transition-all"
                                        >
                                          <Info className="w-4 h-4 text-[#E31E24] hover:text-[#c4191f] cursor-pointer animate-pulse-subtle active:scale-90" />
                                        </button>
                                      </div>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[240px] bg-[#1A3351] text-white p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 normal-case font-normal text-left border border-white/10 backdrop-blur-sm">
                                        <div className="flex items-center gap-2 border-b border-white/20 pb-2 mb-3">
                                          <div className="w-2 h-2 rounded-full bg-[#E31E24] animate-pulse"></div>
                                          <p className="font-black uppercase text-[10px] tracking-widest text-white">
                                            Governança de Risco (NR-17)
                                          </p>
                                        </div>
                                        <ul className="space-y-2 text-[11px]">
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded">
                                            <span>• Exposição Média</span>{" "}
                                            <span className="font-black text-[#E31E24]">
                                              30%
                                            </span>
                                          </li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded">
                                            <span>• Avaliação Técnica</span>{" "}
                                            <span className="font-black text-[#E31E24]">
                                              25%
                                            </span>
                                          </li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded">
                                            <span>• Backlog de Ações</span>{" "}
                                            <span className="font-black text-[#E31E24]">
                                              20%
                                            </span>
                                          </li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded">
                                            <span>• Concentração CID M</span>{" "}
                                            <span className="font-black text-[#E31E24]">
                                              15%
                                            </span>
                                          </li>
                                          <li className="flex justify-between items-center bg-white/5 p-1.5 rounded">
                                            <span>• Gravidade Temporal</span>{" "}
                                            <span className="font-black text-[#E31E24]">
                                              10%
                                            </span>
                                          </li>
                                        </ul>
                                        <div className="mt-4 pt-2 border-t border-white/10 italic text-white/40 text-[9px] leading-tight text-center">
                                          Metodologia de Inteligência
                                          Epidemiológica SESMT
                                        </div>
                                      </div>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(() => {
                                    const groups = (
                                      model.data?.signalsByAnalyticalGroup || []
                                    ).reduce(
                                      (acc, sig) => {
                                        if (!acc[sig.secretaria]) {
                                          acc[sig.secretaria] = {
                                            name: sig.secretaria,
                                            maxScore: 0,
                                            cargos: {} as Record<
                                              string,
                                              {
                                                cargo: string;
                                                unidades: Set<string>;
                                                cids: Set<string>;
                                                totalWeight: number;
                                                totalDays: number;
                                                maxScore: number;
                                                impactedServerCount: number;
                                              }
                                            >,
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
                                            impactedServerCount: 0,
                                          };
                                        }

                                        const c = sec.cargos[sig.cargo];
                                        // Adiciona local apenas se houve afastamento real (nao apenas avaliacao)
                                        if (sig.musculoskeletalEvents > 0)
                                          c.unidades.add(sig.localTrabalho);
                                        sig.associatedCids?.forEach((cid) =>
                                          c.cids.add(cid),
                                        );
                                        c.totalWeight +=
                                          sig.musculoskeletalEvents;
                                        c.totalDays += sig.lostDays;
                                        c.maxScore = Math.max(
                                          c.maxScore,
                                          sig.score,
                                        );
                                        c.impactedServerCount +=
                                          sig.impactedServerCount || 0;

                                        sec.maxScore = Math.max(
                                          sec.maxScore,
                                          sig.score,
                                        );

                                        return acc;
                                      },
                                      {} as Record<string, any>,
                                    );

                                    const sortedSecretarias = Object.values(
                                      groups,
                                    )
                                      .filter((sec: any) =>
                                        Object.values(sec.cargos).some(
                                          (c: any) => c.impactedServerCount > 0,
                                        ),
                                      )
                                      .sort((a: any, b: any) => {
                                        // Primario: Secretaria com mais CASOS lidera o painel
                                        const totalA = Object.values(
                                          a.cargos,
                                        ).reduce(
                                          (s: number, c: any) =>
                                            s + (c.impactedServerCount || 0),
                                          0,
                                        ) as number;
                                        const totalB = Object.values(
                                          b.cargos,
                                        ).reduce(
                                          (s: number, c: any) =>
                                            s + (c.impactedServerCount || 0),
                                          0,
                                        ) as number;
                                        if (totalB !== totalA)
                                          return totalB - totalA;
                                        // Desempate: maior score
                                        return b.maxScore - a.maxScore;
                                      });

                                    return sortedSecretarias.map(
                                      (sec, secIdx) => (
                                        <React.Fragment key={secIdx}>
                                          <tr className="bg-slate-100/90 border-t-2 border-slate-300">
                                            <td
                                              colSpan={6}
                                              className="px-4 py-3 border-y border-slate-200"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                  <div
                                                    className={`w-2 h-5 ${sec.maxScore >= 75 ? "bg-[#E31E24]" : "bg-[#1A3351]"}`}
                                                  ></div>
                                                  <span className="text-[14px] font-black text-[#1A3351] uppercase tracking-normal">
                                                    {sec.name}
                                                  </span>
                                                  <span className="text-[9px] font-bold text-slate-400 border-l border-slate-300 pl-3 ml-1 uppercase tracking-tight">
                                                    {
                                                      Object.values(
                                                        sec.cargos,
                                                      ).filter(
                                                        (c: any) =>
                                                          c.impactedServerCount >
                                                          0,
                                                      ).length
                                                    }{" "}
                                                    CARGOS EM ALERTA
                                                  </span>
                                                </div>
                                                <div className="flex items-center">
                                                  <div className="px-3 py-1 bg-[#1A3351] text-white text-[10px] font-black rounded shadow-sm">
                                                    SCORE MÁXIMO:{" "}
                                                    {sec.maxScore.toFixed(0)}%
                                                  </div>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                          {Object.values(sec.cargos)
                                            .filter(
                                              (cargo: any) =>
                                                cargo.impactedServerCount > 0,
                                            )
                                            .sort((a: any, b: any) => {
                                              const diff =
                                                b.maxScore - a.maxScore;
                                              if (diff !== 0) return diff;
                                              return b.totalDays - a.totalDays;
                                            })
                                            .map((cargo: any, i: number) => {
                                              const rowId = `${sec.name}-${cargo.cargo}`;
                                              const isExpanded =
                                                expandedSecretarias.has(rowId);
                                              const unidadesList = Array.from(
                                                cargo.unidades as Set<string>,
                                              ).sort((a, b) =>
                                                a.localeCompare(b),
                                              );
                                              const displayedUnits = isExpanded
                                                ? unidadesList
                                                : unidadesList.slice(0, 3);

                                              return (
                                                <tr
                                                  key={i}
                                                  className="hover:bg-slate-50 text-[11px] border-b border-slate-200 last:border-0 transition-all"
                                                >
                                                  <td className="px-4 py-2 align-middle w-[270px] max-w-[270px]">
                                                    <div
                                                      className="text-[#1A3351] uppercase leading-tight text-[13px] tracking-tight truncate"
                                                      title={`${cargo.cargo} (${cargo.impactedServerCount} casos)`}
                                                    >
                                                      {cargo.cargo} (
                                                      {
                                                        cargo.impactedServerCount
                                                      }{" "}
                                                      casos)
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-2 align-middle w-[270px] max-w-[270px]">
                                                    <div className="flex flex-col gap-0.5">
                                                      {displayedUnits.map(
                                                        (unidade, idx) => (
                                                          <div
                                                            key={idx}
                                                            className="text-[12px] text-slate-700 leading-tight font-normal truncate"
                                                            title={unidade}
                                                          >
                                                            {unidade}
                                                          </div>
                                                        ),
                                                      )}
                                                      {unidadesList.length >
                                                        3 && (
                                                        <button
                                                          onClick={() =>
                                                            toggleSecretaria(
                                                              rowId,
                                                            )
                                                          }
                                                          className="text-[10px] text-[#1A3351] font-bold mt-1.5 uppercase tracking-tighter hover:underline flex items-center gap-1"
                                                        >
                                                          {isExpanded ? (
                                                            <>
                                                              ▲ RECOLHER LISTA
                                                            </>
                                                          ) : (
                                                            <>
                                                              ▼ +{" "}
                                                              {unidadesList.length -
                                                                3}{" "}
                                                              UNIDADES
                                                              ADICIONAIS (VER
                                                              TODAS)
                                                            </>
                                                          )}
                                                        </button>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-2 align-middle">
                                                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                                                      {Array.from(
                                                        cargo.cids as Set<string>,
                                                      )
                                                        .slice(0, 5)
                                                        .map((cid, idx) => (
                                                          <span
                                                            key={idx}
                                                            className="text-slate-800 text-[12px] font-normal"
                                                          >
                                                            {cid}
                                                          </span>
                                                        ))}
                                                      {cargo.cids.size > 5 && (
                                                        <span className="text-[10px] text-slate-500 font-bold">
                                                          +{cargo.cids.size - 5}
                                                        </span>
                                                      )}
                                                      {cargo.cids.size ===
                                                        0 && (
                                                        <span className="text-[10px] text-slate-400 italic">
                                                          N/A
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-2 text-right tabular-nums text-slate-700 font-normal text-[12px] align-middle">
                                                    {cargo.totalWeight.toFixed(
                                                      0,
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-2 text-right tabular-nums text-slate-800 text-[13px] align-middle">
                                                    {cargo.totalDays.toLocaleString(
                                                      "pt-BR",
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-2 align-middle">
                                                    <div className="flex flex-col gap-1 w-[140px]">
                                                      <div className="flex justify-between text-[11px] font-normal uppercase">
                                                        <span
                                                          className={`text-[13px] ${cargo.maxScore >= 50 ? "text-[#E31E24]" : "text-slate-800"}`}
                                                        >
                                                          {cargo.maxScore.toFixed(
                                                            0,
                                                          )}
                                                          %
                                                        </span>
                                                        <span className="text-slate-800 font-normal">
                                                          {cargo.maxScore >= 75
                                                            ? "Crítico"
                                                            : cargo.maxScore >=
                                                                50
                                                              ? "Alto"
                                                              : "Moderado"}
                                                        </span>
                                                      </div>
                                                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                                        <div
                                                          className={`h-full transition-all duration-700 ${
                                                            cargo.maxScore >= 75
                                                              ? "bg-[#E31E24]"
                                                              : cargo.maxScore >=
                                                                  50
                                                                ? "bg-orange-500"
                                                                : "bg-blue-400"
                                                          }`}
                                                          style={{
                                                            width: `${cargo.maxScore}%`,
                                                          }}
                                                        ></div>
                                                      </div>
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                        </React.Fragment>
                                      ),
                                    );
                                  })()}
                                </tbody>
                              </table>
                            </div>
                            <div className="bg-slate-50 p-3 border-t border-slate-200">
                              <p className="text-[9px] text-slate-400 font-medium text-center uppercase tracking-widest">
                                <span className="font-bold text-slate-500">
                                  PAINEL DE VIGILÂNCIA ERGONÔMICA:
                                </span>{" "}
                                Identificação de riscos sentinela baseada na
                                NR-17. Dados agregados por unidade analítica.
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
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">
                            Inventário de Fatores NR-17
                          </h3>
                          <p className="text-[10px] text-white/60 font-bold uppercase mt-0.5">
                            Catálogo de Riscos Ergonômicos Monitorados
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-white/10 text-white text-[9px] font-black rounded border border-white/20 uppercase">
                          Fase 9 — Ergonomia
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {model.data?.activeFactors.length === 0 ? (
                          <div className="col-span-full py-24 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                            <Activity className="w-16 h-16 mx-auto mb-4 opacity-10" />
                            <p className="text-xs font-bold uppercase tracking-widest text-[#1A3351]/40">
                              Domínios Ergonômicos
                            </p>
                            <p className="text-[10px] mt-2 max-w-[300px] mx-auto text-slate-500">
                              Os fatores ativos serão listados automaticamente
                              após a fase de inventário e parametrização.
                            </p>
                          </div>
                        ) : (
                          model.data?.activeFactors.map((f) => (
                            <div
                              key={f.factorId}
                              className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative border-l-4 border-l-[#1A3351]"
                            >
                              <div className="p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[10px] font-black text-[#1A3351] bg-slate-100 px-2 py-0.5 uppercase rounded">
                                    {f.categoryNR17}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {f.code}
                                  </span>
                                </div>
                                <h4 className="text-[11px] font-black text-[#1A3351] uppercase mb-2 group-hover:text-[#E31E24] transition-colors">
                                  {f.factor}
                                </h4>
                                <p className="text-[10px] text-slate-600 leading-relaxed italic mb-4">
                                  "{f.description}"
                                </p>

                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50 -m-4 mt-0 p-4">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                    Governança Ergonômica
                                  </div>
                                  <div className="text-[11px] font-black text-slate-300 italic uppercase">
                                    Auditável
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
              Vigilância Ergonômica Ativa · SESMT SYSTEM · NR-17
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
