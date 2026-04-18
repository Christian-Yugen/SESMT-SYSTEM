"use client"; // Standardized Header Refresh

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity,
  Menu,
  RefreshCw,
  AlertTriangle,
  Info,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  ExternalLink,
  Printer,
  X,
} from "lucide-react";
import ActionIconButton from "@/components/filters/ActionIconButton";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safeGetSession, handleAuthError } from "@/lib/auth-utils";
import Sidebar from "@/components/layout/Sidebar";
import StatisticCard from "@/components/statistics/StatisticCard";
import StatisticCardRow from "@/components/statistics/StatisticCardRow";
import StatisticCardsSection from "@/components/statistics/StatisticCardsSection";
import {
  buildEpidemiologyPageModel,
  buildLoadingPageModel,
  type EpidemiologyPageModel,
  type EpidemiologyFetchError,
  type EpidemiologyCutRow,
  type EpidemiologyTrendModel,
  type EpidemiologyCidChapterRow,
} from "@/lib/afastamentos-epidemiologia-page-utils";
import type { EpidemiologyConsumptionContract } from "@/lib/afastamentos-epidemiologia-contrato";

// ---------------------------------------------------------------------------
// Helpers de data
// ---------------------------------------------------------------------------

function getDefaultDates() {
  const end = new Date();
  const endDate = end.toISOString().split("T")[0];
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const startDate = start.toISOString().split("T")[0];
  return { startDate, endDate };
}

// ---------------------------------------------------------------------------
// Helper: ícone por card id
// ---------------------------------------------------------------------------

function getCardIcon(id: string) {
  if (id === "tad") return <TrendingUp className="w-5 h-5" />;
  if (id === "ifl") return <Activity className="w-5 h-5" />;
  if (id === "dml") return <Clock className="w-5 h-5" />;
  if (id === "ig") return <AlertTriangle className="w-5 h-5" />;
  return null;
}

// ---------------------------------------------------------------------------
// Sub-componente: bloco executivo de capítulos CID
// ---------------------------------------------------------------------------

function CidChapterExecutiveBlock({
  rows,
  startDate,
  endDate,
}: Readonly<{
  rows: EpidemiologyCidChapterRow[];
  startDate: string;
  endDate: string;
}>) {
  const router = useRouter();
  if (rows.length === 0) return null;

  function handleRowClick(row: EpidemiologyCidChapterRow) {
    const params = new URLSearchParams({ chapter: row.key });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    router.push(`/afastamentos/cid-analytics?${params.toString()}`);
  }
  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between px-0.5">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#1A3351]">
          Agravos Dominantes do Período
        </h4>
        <span className="text-[9px] text-slate-400 uppercase tracking-wide">
          top {rows.length} · ordenado por dias perdidos · leitura bruta
        </span>
      </div>
      <div className="overflow-x-auto border border-slate-200">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-[#1A3351] text-white">
              <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest whitespace-nowrap">
                Capítulo CID
              </th>
              <th
                className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap"
                title="Contagem proporcional: evento com N códigos CID contribui 1/N por capítulo"
              >
                Lic. prop.
              </th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
                % Lic.
              </th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
                Dias
              </th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
                % Dias
              </th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
                DML
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.key}
                onClick={() => handleRowClick(row)}
                className={[
                  "border-b border-slate-100 hover:bg-[#1A3351]/5 hover:cursor-pointer transition-colors",
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                ].join(" ")}
              >
                <td className="px-3 py-2 text-slate-700 max-w-[280px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#1A3351] tabular-nums shrink-0 w-5 text-right">
                      {idx + 1}.
                    </span>
                    <span className="truncate">{row.key}</span>
                    <ExternalLink className="w-3 h-3 text-slate-300 shrink-0 ml-auto" />
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {row.totalLicencas.toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500 text-[10px]">
                  {row.percentualLicencas.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="w-10 bg-slate-100 h-1.5 hidden sm:block">
                      <div
                        className="h-1.5 bg-[#E31E24]/50"
                        style={{ width: `${row.relDias}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-slate-700">
                      {row.totalDiasPerdidos.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500 text-[10px]">
                  {row.percentualDias.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-[#1A3351]">
                  {row.dml}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] text-slate-400 uppercase tracking-wide px-0.5">
        Volume bruto · Lic. prop. = contagem proporcional por CID (evento com N
        códigos contribui 1/N por capítulo) · clique no capítulo para abrir CID
        Analytics filtrado
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: tabela de recorte
// ---------------------------------------------------------------------------

function CutTable({
  rows,
  title,
  showLicencas = false,
}: Readonly<{
  rows: EpidemiologyCutRow[];
  title: string;
  showLicencas?: boolean;
}>) {
  const colSpan = showLicencas ? 6 : 5;
  return (
    <div className="space-y-1">
      <div className="px-0.5">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#1A3351]">
          {title}
        </h4>
        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide mt-0.5">
          {showLicencas
            ? "Lic·Licenças\u2002TAD·Absenteísmo\u2002IFL·Freq.\u2002DML·Dur.Média\u2002IG·Gravidade"
            : "TAD·Absenteísmo\u2002IFL·Freq.\u2002DML·Dur.Média\u2002IG·Gravidade"}
        </p>
      </div>
      <div className="overflow-x-auto border border-slate-200">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-[#1A3351] text-white">
              <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest whitespace-nowrap">
                Grupo
              </th>
              {showLicencas && (
                <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
                  Lic.
                </th>
              )}
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
                TAD
              </th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
                IFL
              </th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
                DML
              </th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
                IG
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.key}
                className={[
                  "border-b border-slate-100 transition-colors hover:bg-slate-50",
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                  !row.available ? "opacity-60" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <td className="px-3 py-2 font-semibold uppercase text-[#1A3351] whitespace-nowrap">
                  {row.key}
                </td>
                {showLicencas && (
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-[#1A3351]">
                    {row.totalLicencas.toLocaleString("pt-BR")}
                  </td>
                )}
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {row.tad}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {row.ifl}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-[#1A3351]">
                  {row.dml}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {row.ig}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-3 py-4 text-center text-slate-400 italic text-[11px]"
                >
                  Sem dados para este recorte no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: tabela de tendência mensal
// ---------------------------------------------------------------------------

function TrendTable({ trend }: Readonly<{ trend: EpidemiologyTrendModel }>) {
  if (!trend.hasSufficientData) {
    return (
      <div className="bg-white border border-slate-200 border-l-4 border-l-[#1A3351]/30 px-4 py-3 flex items-start gap-3">
        <TrendingUp className="w-4 h-4 text-[#1A3351]/40 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1A3351]/60">
            Série temporal insuficiente
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {trend.points.length === 0
              ? "Nenhum mês foi identificado no período."
              : `Apenas ${trend.points.length} mês identificado.`}{" "}
            São necessários ao menos {trend.minimumPointsRequired} meses para
            análise de tendência.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-[#1A3351] text-white">
            <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest whitespace-nowrap">
              Mês
            </th>
            <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
              Licenças
            </th>
            <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
              Dias
            </th>
            <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
              DML
            </th>
            <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
              TAD
            </th>
            <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
              IFL
            </th>
            <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest whitespace-nowrap">
              IG
            </th>
          </tr>
        </thead>
        <tbody>
          {trend.points.map((point, idx) => (
            <tr
              key={point.month}
              className={[
                "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                !point.isValid ? "opacity-60" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <td className="px-3 py-2 font-bold text-[#1A3351] whitespace-nowrap">
                {point.label}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-10 bg-slate-100 h-1.5 hidden sm:block">
                    <div
                      className="h-1.5 bg-[#1A3351]/40"
                      style={{ width: `${point.relLicencas}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-slate-700">
                    {point.totalLicencas}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-10 bg-slate-100 h-1.5 hidden sm:block">
                    <div
                      className="h-1.5 bg-[#1A3351]/20"
                      style={{ width: `${point.relDias}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-slate-700">
                    {point.totalDiasPerdidos}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-[#1A3351]">
                {point.dml}
              </td>
              <td
                className={`px-3 py-2 text-right tabular-nums ${
                  !point.isValid ? "text-slate-400 italic" : "text-slate-700"
                }`}
              >
                {point.tad}
              </td>
              <td
                className={`px-3 py-2 text-right tabular-nums ${
                  !point.isValid ? "text-slate-400 italic" : "text-slate-700"
                }`}
              >
                {point.ifl}
              </td>
              <td
                className={`px-3 py-2 text-right tabular-nums ${
                  !point.isValid ? "text-slate-400 italic" : "text-slate-700"
                }`}
              >
                {point.ig}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabId =
  | "visao-geral"
  | "indicadores"
  | "recortes-populacionais"
  | "analise-organizacional"
  | "tendencia";

const TABS: { id: TabId; title: string }[] = [
  { id: "visao-geral", title: "Visão Geral" },
  { id: "indicadores", title: "Indicadores" },
  { id: "recortes-populacionais", title: "Recortes Populacionais" },
  { id: "analise-organizacional", title: "Análise Organizacional" },
  { id: "tendencia", title: "Tendência do Período" },
];

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function EpidemiologiaPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("Usuário");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isPrintPopoverOpen, setIsPrintPopoverOpen] = useState(false);

  const defaultDatesRef = useRef(getDefaultDates());
  const [startDate, setStartDate] = useState(defaultDatesRef.current.startDate);
  const [endDate, setEndDate] = useState(defaultDatesRef.current.endDate);

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [fetchError, setFetchError] = useState<EpidemiologyFetchError | null>(
    null,
  );
  const [pageModel, setPageModel] = useState<EpidemiologyPageModel>(
    buildLoadingPageModel(),
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("visao-geral");

  // -------------------------------------------------------------------------
  // Fetch do contrato epidemiológico
  // -------------------------------------------------------------------------

  const fetchContract = useCallback(
    async (queryStart: string, queryEnd: string) => {
      setLoading(true);
      setFetchError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          setFetchError({
            code: "UNAUTHORIZED",
            message: "Sessão inválida. Faça login novamente.",
          });
          setLoading(false);
          return;
        }

        const params = new URLSearchParams({
          startDate: queryStart,
          endDate: queryEnd,
        });

        // Permitir requisição de diagnóstico quando a página for aberta com ?debugEpi=1
        const pageUrl =
          typeof window !== "undefined" ? new URL(window.location.href) : null;
        const debugEpi = pageUrl?.searchParams.get("debugEpi") === "1";

        const baseHeaders: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        };
        const headersInit: Record<string, string> = debugEpi
          ? { ...baseHeaders, "x-debug-epidemiologia": "1" }
          : baseHeaders;

        const baseUrl =
          typeof window !== "undefined"
            ? window.location.origin
            : process.env.NEXT_PUBLIC_APP_URL ||
              (process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : "http://localhost:3000");

        const res = await fetch(
          `${baseUrl}/api/absenteismo/epidemiologia-view?${params.toString()}`,
          {
            headers: headersInit,
            cache: "no-store",
          },
        );

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: { code?: string; message?: string };
          };
          const err = body?.error ?? {};
          setFetchError({
            code: err.code ?? "FETCH_ERROR",
            message:
              err.message ?? `Erro ${res.status} ao consultar indicadores.`,
          });
          setLoading(false);
          return;
        }

        const contract = (await res.json()) as EpidemiologyConsumptionContract;
        setPageModel(buildEpidemiologyPageModel(contract));
        setHasLoaded(true);
      } catch {
        setFetchError({
          code: "NETWORK_ERROR",
          message: "Falha de rede ao consultar indicadores epidemiológicos.",
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Inicialização + autenticação
  // -------------------------------------------------------------------------

  useEffect(() => {
    const init = async () => {
      try {
        const { session, error } = await safeGetSession();
        if (error) {
          await handleAuthError(error);
          return;
        }
        if (!session) {
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile) setUserRole(profile.role);

        const name =
          (session.user.user_metadata?.full_name as string | undefined) ||
          session.user.email?.split("@")[0] ||
          "Usuário";
        setUserName(name);
        setInitializing(false);

        await fetchContract(
          defaultDatesRef.current.startDate,
          defaultDatesRef.current.endDate,
        );
      } catch (err) {
        await handleAuthError(err);
      }
    };
    init();
  }, [router, fetchContract]);

  const openPrintWindow = useCallback(
    async (layout: "portrait" | "landscape") => {
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

      try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
      } catch (e) {}

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
          <h1>Relatório Epidemiológico - SESMT</h1>
          <div class="report-info">(Análise Epidemiológica — dados agregados)</div>
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

        try {
          const liveSvgs = Array.from(node.querySelectorAll("svg"));
          const clonedSvgs = Array.from(cloned.querySelectorAll("svg"));
          const svgCount = Math.min(liveSvgs.length, clonedSvgs.length);
          for (let i = 0; i < svgCount; i++) {
            try {
              clonedSvgs[i].outerHTML = (liveSvgs[i] as Element).outerHTML;
            } catch (e) {}
          }
        } catch (e) {}

        try {
          const liveCanvases = Array.from(
            node.querySelectorAll("canvas"),
          ) as HTMLCanvasElement[];
          const clonedCanvases = Array.from(cloned.querySelectorAll("canvas"));
          const canvasCount = Math.min(
            liveCanvases.length,
            clonedCanvases.length,
          );
          for (let i = 0; i < canvasCount; i++) {
            try {
              const data = liveCanvases[i].toDataURL();
              clonedCanvases[i].outerHTML =
                `<img src="${data}" style="max-width:100%;height:auto;" alt="canvas"/>`;
            } catch (e) {}
          }
        } catch (e) {}

        try {
          const rows = Array.from(
            cloned.querySelectorAll(".StatisticCardRow"),
          ) as HTMLElement[];
          rows.forEach((r) => {
            try {
              const childCount = Math.max(
                1,
                Math.min(5, (r.children && r.children.length) || 1),
              );
              r.style.gridTemplateColumns = `repeat(${childCount}, minmax(0, 1fr))`;
              r.style.gap = "8px";
              r.style.width = "100%";
            } catch (e) {}
          });

          try {
            const candidateGrids = Array.from(
              cloned.querySelectorAll(
                '[class*="md:grid-cols-5"], [class*="lg:grid-cols-5"], [class*="grid-cols-5"]',
              ),
            ) as HTMLElement[];
            candidateGrids.forEach((g) => {
              try {
                if (g.classList.contains("StatisticCardRow")) return;
                if (
                  g.querySelector("table") ||
                  (g.matches && g.matches("table"))
                )
                  return;
                const children = Array.from(g.children).filter(
                  (c) => (c as HTMLElement).innerHTML.trim().length > 0,
                );
                if (children.length < 2) return;

                const newRow = cloned.ownerDocument!.createElement("div");
                newRow.className = "StatisticCardRow";
                newRow.style.display = "grid";
                const cols = Math.max(1, Math.min(5, children.length));
                newRow.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
                newRow.style.gap = "8px";

                children.forEach((ch) => {
                  try {
                    const card = cloned.ownerDocument!.createElement("div");
                    card.className = "StatisticCard";
                    card.innerHTML = (ch as HTMLElement).innerHTML;
                    newRow.appendChild(card);
                  } catch (e) {}
                });

                g.parentElement?.replaceChild(newRow, g);
              } catch (e) {}
            });
          } catch (e) {}

          const cards = Array.from(
            cloned.querySelectorAll(".StatisticCard"),
          ) as HTMLElement[];
          cards.forEach((card) => {
            try {
              card.style.padding = "6px 8px";
              const title = card.querySelector("p");
              if (title) (title as HTMLElement).style.fontSize = "10px";
              const value = card.querySelector("h3");
              if (value) (value as HTMLElement).style.fontSize = "16px";
            } catch (e) {}
          });
        } catch (e) {}

        try {
          const tables = Array.from(
            cloned.querySelectorAll("table"),
          ) as HTMLElement[];
          tables.forEach((table) => {
            try {
              (table as HTMLTableElement).style.width = "100%";
              (table as HTMLTableElement).style.tableLayout = "auto";
              table.style.maxWidth = "100%";
              const ths = Array.from(
                table.querySelectorAll("th"),
              ) as HTMLElement[];
              ths.forEach((th, idx) => {
                try {
                  th.style.whiteSpace = "normal";
                  th.style.overflow = "visible";
                  (th as HTMLElement).style.wordBreak = "break-word";
                  if (idx === ths.length - 1) th.style.minWidth = "80px";
                  else if (!th.style.minWidth) th.style.minWidth = "60px";
                } catch (e) {}
              });
              const tds = Array.from(
                table.querySelectorAll("td"),
              ) as HTMLElement[];
              tds.forEach((td) => {
                try {
                  td.style.whiteSpace = "normal";
                  td.style.overflow = "visible";
                  (td as HTMLElement).style.wordBreak = "break-word";
                } catch (e) {}
              });
            } catch (e) {}
          });
        } catch (e) {}

        printContentHtml = cloned.outerHTML;
      } catch (e) {
        printContentHtml = node.outerHTML;
      }

      const printOverrideCss = `
        html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
        #print-area { display:block !important; width: calc(100% - 2cm) !important; max-width: none !important; margin: 0 auto !important; padding: 0 !important; box-sizing: border-box !important; }
        .StatisticCardRow { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(0,1fr)) !important; gap: 8px !important; align-items: stretch !important; }
        /* Ensure the first statistic row stretches its items to fill the available width */
        #print-area .StatisticCardRow:first-of-type { grid-template-columns: repeat(auto-fit, minmax(0,1fr)) !important; }
        .StatisticCard { padding: 6px 8px !important; min-width: 0 !important; width: auto !important; box-sizing: border-box !important; }
        .StatisticCard > .min-w-0 { overflow: visible !important; }
        .StatisticCard p { font-size: 10px !important; white-space: normal !important; }
        .StatisticCard h3 { font-size: 16px !important; }
        .StatisticCard, .StatisticCard * { break-inside: avoid !important; page-break-inside: avoid !important; }
        .StatisticCardRow > * { flex: none !important; }
        #print-area img, #print-area svg { max-width: 100% !important; height: auto !important; }
        /* Ensure tables use available width and cells wrap in print */
        #print-area table { width: 100% !important; table-layout: auto !important; border-collapse: collapse !important; max-width: 100% !important; }
        #print-area th, #print-area td { white-space: normal !important; overflow: visible !important; word-break: break-word !important; }
        #print-area th:last-child, #print-area td:last-child { min-width: 80px !important; }
        #print-area .overflow-x-auto { overflow-x: visible !important; }
        /* Slightly wider 'Unidade / Local' and narrower 'CIDS PRINCIPAIS' for print */
        #print-area table th:nth-of-type(2), #print-area table td:nth-of-type(2) { width: 160px !important; max-width: 200px !important; }
        #print-area table th:nth-of-type(3), #print-area table td:nth-of-type(3) { width: 120px !important; max-width: 140px !important; }
        /* Allow remaining columns (4..) to auto-size using remaining space */
        #print-area table th:nth-of-type(n+4), #print-area table td:nth-of-type(n+4) { width: auto !important; }
        #print-area .StatisticCard .shrink-0, #print-area .StatisticCard svg { display: block !important; opacity: 1 !important; }
        #print-area [class*="md:grid-cols-5"] { gap: 6px !important; }
        #print-area [class*="md:grid-cols-5"] > * { padding: 6px 8px !important; }
        #print-area { padding: 10px 12px !important; }
        .print\\:hidden, .print-hidden, .print-hidden * { display: none !important; }
        @media print { html, body { -webkit-print-color-adjust: exact; color-adjust: exact; } }
      `;

      const pageSize = layout === "landscape" ? "A4 landscape" : "A4 portrait";

      const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><base href="${window.location.origin}/" />
        <title>Relatório Epidemiológico</title>
        ${styles}
        <style>
          ${headerCss}
          ${printOverrideCss}
          @page { size: ${pageSize}; margin: 1cm; }
          body{background:white;margin:0;padding:10px;color:#111;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;}
          #print-area { display: block !important; width:100% !important; max-width:none !important; }
        </style>
      </head><body>${headerHtml}${printContentHtml}${footerHtml}</body></html>`;

      win.document.open();
      win.document.write(html);
      win.document.close();

      setTimeout(() => {
        try {
          win.focus();
          win.print();
          setTimeout(() => {
            try {
              win.close();
            } catch (e) {}
          }, 500);
        } catch (e) {}
      }, 700);
    },
    [userName, fetchContract],
  );

  // -------------------------------------------------------------------------
  // Estado de inicialização
  // -------------------------------------------------------------------------

  if (initializing) {
    return (
      <div className="h-screen w-full bg-[#1A3351] flex flex-col items-center justify-center gap-4">
        <Activity className="w-12 h-12 text-white animate-pulse" />
        <p className="text-white uppercase tracking-[0.3em] font-bold text-xs">
          Carregando Inteligência Epidemiológica...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render principal
  // -------------------------------------------------------------------------

  const { cards, summary, cuts, trend } = pageModel;

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-hidden">
      <div className="print:hidden">
        <Sidebar
          userRole={userRole}
          userName={userName}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
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
        {/* HEADER                                                             */}
        {/* ----------------------------------------------------------------- */}
        <section className="bg-[#B0B0B0] px-2.5 sm:px-4 lg:px-6 py-3 border-b-[6px] border-[#1A3351] shrink-0 shadow-lg print:hidden">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:flex-nowrap md:gap-3">
            {/* Título */}
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#1A3351]" />
                <div className="flex items-center gap-1.5">
                  <h1 className="text-[15px] sm:text-lg md:text-xl font-bold uppercase tracking-tighter leading-none text-[#1A3351]">
                    Epidemiologia <span className="text-[#E31E24]">Geral</span>
                  </h1>
                  <span
                    title="Dados baseados em afastamentos registrados na plataforma (casos com auxílio-doença / afastamentos superiores a 15 dias)."
                    className="text-black/30 hover:text-[#1A3351] transition-colors cursor-help shrink-0"
                  >
                    <Info className="w-3 h-3" />
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 bg-[#1A3351] rounded-none text-white active:scale-95 transition-all shadow-md flex items-center justify-center shrink-0"
                aria-label="Abrir menu"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-[#1A3351]/20 shrink-0 hidden md:block" />

            {/* Controles de data + botão Consultar */}
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 w-full md:flex-1 relative">
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
                        fetchContract(startDate, endDate);
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
                onClick={() => fetchContract(startDate, endDate)}
                disabled={loading || !startDate || !endDate}
                className="flex items-center gap-1.5 h-[34px] px-3 bg-[#1A3351] text-white text-[11px] font-bold uppercase tracking-wider rounded-none shadow-sm hover:bg-[#162943] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 shrink-0 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">
                  {loading ? "Consultando..." : "Consultar"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* CONTEÚDO PRINCIPAL                                                 */}
        {/* ----------------------------------------------------------------- */}
        <div
          id="print-area"
          className="flex-1 overflow-y-auto px-2.5 sm:px-4 lg:px-6 py-4 space-y-6"
        >
          {/* Estado de erro */}
          {fetchError && (
            <div className="flex items-start gap-3 bg-[#E31E24]/5 border border-[#E31E24]/20 border-l-4 border-l-[#E31E24] px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-[#E31E24] shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#E31E24]">
                  {fetchError.code}
                </p>
                <p className="text-[12px] text-slate-700 mt-0.5">
                  {fetchError.message}
                </p>
                <button
                  onClick={() => fetchContract(startDate, endDate)}
                  disabled={loading}
                  className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[#E31E24] underline hover:opacity-70 disabled:opacity-50"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {/* Banner de atualização (durante reconsulta com dados prévios) */}
          {loading && hasLoaded && (
            <div className="flex items-center gap-2 bg-[#1A3351]/5 border border-[#1A3351]/10 border-l-4 border-l-[#1A3351] px-4 py-2">
              <RefreshCw className="w-3.5 h-3.5 text-[#1A3351] animate-spin shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#1A3351]">
                Atualizando indicadores...
              </p>
            </div>
          )}

          {/* Estado de carregamento (antes de qualquer consulta) */}
          {loading && !hasLoaded && (
            <div className="flex items-center justify-center py-16 gap-3">
              <Activity className="w-8 h-8 text-[#1A3351] animate-pulse" />
              <p className="text-[12px] font-bold uppercase tracking-widest text-[#1A3351]">
                Calculando indicadores...
              </p>
            </div>
          )}

          {/* Conteúdo principal (visível após primeiro carregamento) */}
          {hasLoaded && (
            <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden">
              {/* Barra de abas — padrão idêntico ao cid-analytics */}
              <div className="bg-[#B0B0B0] px-4 sm:px-6 py-2.5 border-b-2 border-slate-400 flex items-center justify-between gap-3 flex-wrap min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A3351]">
                  Análise Epidemiológica
                </h3>
                <div className="w-full sm:w-auto min-w-0 max-w-full flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`shrink-0 h-8 px-3 border text-[10px] font-bold uppercase tracking-wide transition-all ${
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

              <div className="p-3 sm:p-4 lg:p-6 space-y-6">
                {/* ---- ABA: VISÃO GERAL ---- */}
                {activeTab === "visao-geral" && (
                  <>
                    <StatisticCardsSection
                      title="Indicadores Executivos"
                      description="Métricas epidemiológicas calculadas para o período consultado"
                    >
                      <StatisticCardRow columns={4}>
                        {cards.map((card) => (
                          <StatisticCard
                            key={card.id}
                            title={card.label}
                            value={
                              loading ? (
                                <span className="animate-pulse text-slate-300">
                                  —
                                </span>
                              ) : (
                                card.value
                              )
                            }
                            subtitle={card.unit || undefined}
                            helperText={card.helperText}
                            accent={card.accent}
                            variant="analytic"
                            icon={getCardIcon(card.id)}
                            className={
                              !card.available ? "opacity-60" : undefined
                            }
                          />
                        ))}
                      </StatisticCardRow>
                    </StatisticCardsSection>

                    <div className="bg-white border border-slate-200 border-l-4 border-l-[#1A3351] px-4 py-3 space-y-3">
                      <div className="grid grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-[#1A3351]/50 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              Período
                            </p>
                            <p className="text-[12px] font-bold text-[#1A3351] mt-0.5">
                              {summary.periodLabel || "—"}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {summary.diasPeriodo} dias
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-[#1A3351]/50 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              Total de Licenças
                              <span className="ml-1 font-normal normal-case tracking-normal text-slate-300">
                                (volume bruto)
                              </span>
                            </p>
                            <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                              {loading
                                ? "—"
                                : summary.totalLicencas.toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-[#1A3351]/50 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              Dias Perdidos
                              <span className="ml-1 font-normal normal-case tracking-normal text-slate-300">
                                (volume bruto)
                              </span>
                            </p>
                            <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                              {loading
                                ? "—"
                                : summary.totalDiasPerdidos.toLocaleString(
                                    "pt-BR",
                                  )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Users className="w-4 h-4 text-[#1A3351]/50 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              População Média
                            </p>
                            <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                              {loading ? "—" : summary.populacaoMedia}
                            </p>
                          </div>
                        </div>
                      </div>
                      {summary.flags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                          {summary.flags.map((flag) => (
                            <span
                              key={flag}
                              className="text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                      {summary.observacoes.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          {summary.observacoes.map((obs, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-[11px] text-slate-600"
                            >
                              <Info className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                              <span>{obs}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {!summary.isValid && (
                        <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                          <p className="text-[11px] text-amber-700">
                            Denominador populacional insuficiente para este
                            período. TAD, IFL e IG não são calculáveis. DML
                            permanece disponível.
                          </p>
                        </div>
                      )}
                    </div>

                    <CidChapterExecutiveBlock
                      rows={cuts.cidCapitulo}
                      startDate={startDate}
                      endDate={endDate}
                    />

                    <section className="space-y-4">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                        Grupos com população inferior ao limiar mínimo aparecem
                        com opacidade reduzida
                      </p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <CutTable rows={cuts.sexo} title="Sexo" />
                        <CutTable
                          rows={cuts.faixaEtaria}
                          title="Faixa Etária"
                        />
                        <CutTable
                          rows={cuts.faixaTempoServico}
                          title="Faixa de Tempo de Serviço"
                        />
                        <CutTable rows={cuts.cargo} title="Natureza do Cargo" />
                      </div>
                      <CutTable
                        rows={cuts.secretaria}
                        title="Secretaria"
                        showLicencas
                      />
                      <CutTable
                        rows={cuts.localTrabalho}
                        title="Local de Trabalho"
                        showLicencas
                      />
                    </section>

                    <section className="space-y-3">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                        Evolução mensal de indicadores · TAD · DML · IFL · IG
                        por janela mensal dentro do período consultado
                      </p>
                      <TrendTable trend={trend} />
                    </section>
                  </>
                )}

                {/* ---- ABA: INDICADORES ---- */}
                {activeTab === "indicadores" && (
                  <>
                    <StatisticCardsSection
                      title="Indicadores Executivos"
                      description="Métricas epidemiológicas calculadas para o período consultado"
                    >
                      <StatisticCardRow columns={4}>
                        {cards.map((card) => (
                          <StatisticCard
                            key={card.id}
                            title={card.label}
                            value={
                              loading ? (
                                <span className="animate-pulse text-slate-300">
                                  —
                                </span>
                              ) : (
                                card.value
                              )
                            }
                            subtitle={card.unit || undefined}
                            helperText={card.helperText}
                            accent={card.accent}
                            variant="analytic"
                            icon={getCardIcon(card.id)}
                            className={
                              !card.available ? "opacity-60" : undefined
                            }
                          />
                        ))}
                      </StatisticCardRow>
                    </StatisticCardsSection>

                    <div className="bg-white border border-slate-200 border-l-4 border-l-[#1A3351] px-4 py-3 space-y-3">
                      <div className="grid grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-[#1A3351]/50 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              Período
                            </p>
                            <p className="text-[12px] font-bold text-[#1A3351] mt-0.5">
                              {summary.periodLabel || "—"}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {summary.diasPeriodo} dias
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-[#1A3351]/50 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              Total de Licenças
                              <span className="ml-1 font-normal normal-case tracking-normal text-slate-300">
                                (volume bruto)
                              </span>
                            </p>
                            <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                              {loading
                                ? "—"
                                : summary.totalLicencas.toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-[#1A3351]/50 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              Dias Perdidos
                              <span className="ml-1 font-normal normal-case tracking-normal text-slate-300">
                                (volume bruto)
                              </span>
                            </p>
                            <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                              {loading
                                ? "—"
                                : summary.totalDiasPerdidos.toLocaleString(
                                    "pt-BR",
                                  )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Users className="w-4 h-4 text-[#1A3351]/50 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              População Média
                            </p>
                            <p className="text-[20px] font-black tabular-nums text-[#1A3351] leading-none mt-0.5">
                              {loading ? "—" : summary.populacaoMedia}
                            </p>
                          </div>
                        </div>
                      </div>
                      {summary.flags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                          {summary.flags.map((flag) => (
                            <span
                              key={flag}
                              className="text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                      {summary.observacoes.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          {summary.observacoes.map((obs, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-[11px] text-slate-600"
                            >
                              <Info className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                              <span>{obs}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {!summary.isValid && (
                        <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                          <p className="text-[11px] text-amber-700">
                            Denominador populacional insuficiente para este
                            período. TAD, IFL e IG não são calculáveis. DML
                            permanece disponível.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ---- ABA: RECORTES POPULACIONAIS ---- */}
                {activeTab === "recortes-populacionais" && (
                  <section className="space-y-4">
                    <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                      Grupos com população inferior ao limiar mínimo aparecem
                      com opacidade reduzida
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <CutTable rows={cuts.sexo} title="Sexo" />
                      <CutTable rows={cuts.faixaEtaria} title="Faixa Etária" />
                      <CutTable
                        rows={cuts.faixaTempoServico}
                        title="Faixa de Tempo de Serviço"
                      />
                      <CutTable rows={cuts.cargo} title="Natureza do Cargo" />
                    </div>
                  </section>
                )}

                {/* ---- ABA: ANÁLISE ORGANIZACIONAL ---- */}
                {activeTab === "analise-organizacional" && (
                  <section className="space-y-6">
                    <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                      Grupos ordenados por número de licenças · maior impacto no
                      topo
                    </p>
                    <CutTable
                      rows={cuts.secretaria}
                      title="Secretaria"
                      showLicencas
                    />
                    <CutTable
                      rows={cuts.localTrabalho}
                      title="Local de Trabalho"
                      showLicencas
                    />
                  </section>
                )}

                {/* ---- ABA: TENDÊNCIA DO PERÍODO ---- */}
                {activeTab === "tendencia" && (
                  <section className="space-y-3">
                    <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                      Evolução mensal de indicadores · TAD · DML · IFL · IG por
                      janela mensal dentro do período consultado
                    </p>
                    <TrendTable trend={trend} />
                  </section>
                )}
              </div>
            </div>
          )}

          {/* Rodapé institucional */}
          <div className="pb-4 text-center">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest">
              Leitura principal padronizada · motor epidemiológico SESMT ·
              aprofundamento clínico por CID: ver CID Analytics
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
