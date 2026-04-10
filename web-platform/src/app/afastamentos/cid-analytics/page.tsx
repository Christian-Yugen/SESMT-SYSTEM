"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  Clock3,
  Filter,
  Info,
  Layers3,
  Loader2,
  Menu,
  RefreshCcw,
  Search,
  TrendingUp,
  Users,
  FileText,
  Printer,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import CompactFilterBar from "@/components/filters/CompactFilterBar";
import ActionIconButton from "@/components/filters/ActionIconButton";
import FilterChips from "@/components/filters/FilterChips";
import StatisticCard from "@/components/statistics/StatisticCard";
import StatisticCardRow from "@/components/statistics/StatisticCardRow";
import CidChapterRankingPanel from "@/components/analytics/cid/CidChapterRankingPanel";
import CidCodeRankingPanel from "@/components/analytics/cid/CidCodeRankingPanel";
import CidClinicalTrendPanel from "@/components/analytics/cid/CidClinicalTrendPanel";
import CidOccupationalRankingPanel from "@/components/analytics/cid/CidOccupationalRankingPanel";
import CidNatureImpactPanel from "@/components/analytics/cid/CidNatureImpactPanel";
import CidOccupationalCrossPanel from "@/components/analytics/cid/CidOccupationalCrossPanel";
import CidRecurrenceSummaryPanel from "@/components/analytics/cid/CidRecurrenceSummaryPanel";
import CidRecurrenceInvestigativeTable from "@/components/analytics/cid/CidRecurrenceInvestigativeTable";
import CidManagerialAlertsPanel from "@/components/analytics/cid/CidManagerialAlertsPanel";
import CidPriorityRankingPanel from "@/components/analytics/cid/CidPriorityRankingPanel";

import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";
import type { AfastamentoRecord } from "@/types";
import {
  buildCidAnalyticsDataset,
  buildCidAnalyticsMetrics,
  CID_ANALYTICS_DEFAULT_POLICY,
} from "@/lib/afastamentos-cid-analytics";
import { buildCidManagerialIntelligence } from "@/lib/afastamentos-cid-managerial";
import { generateAbsenteeismDashboardReportPDF } from "@/lib/afastamento-report-pdf";
import { getCIDChapter, getCIDDetails, normalizeCID } from "@/lib/cid-utils";
import { CID_ANALYTICS_PAGE_ARCHITECTURE } from "@/lib/afastamentos-cid-page-architecture";
import { normalizeSearchTerm } from "@/components/filters/filtersUtils";
import type { CidOccurrenceFact } from "@/types/afastamentos-cid-analytics";
import type {
  ChapterRankingItem,
  CidPanelSortMode,
  CidRankingItem,
  CidTrendPoint,
  NaturezaImpactItem,
  OccupationalCrossMatrixRow,
  OccupationalRankingItem,
} from "@/components/analytics/cid/types";

type TabId =
  | "visao-geral"
  | "cid-capitulos"
  | "visao-ocupacional"
  | "casos-recorrencia";

interface CidCatalogEntry {
  desc: string;
  chapter: string;
}

const CID_LOOKUP_QUERY_CHUNK = 250;

function toUpperNoAccents(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[^\x00-\x7F]/g, "")
    .toUpperCase();
}

function sortStrings(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDays(value: number): string {
  return `${value.toFixed(1)} dia(s)`;
}

function normalizeLegacyLabel(
  value: string,
  fallback = "NAO CLASSIFICADO",
): string {
  const cleanValue = (value || "").trim();
  if (
    cleanValue.length === 0 ||
    /NAO INFORMADO|SEM CID|LEGADO|DESCRICAO NAO INFORMADA|CAPITULO NAO INFORMADO|N\/A/i.test(
      cleanValue,
    )
  ) {
    return fallback;
  }
  return cleanValue;
}

function formatDominantCidLabel(value: string): string {
  const normalized = normalizeLegacyLabel(value);
  if (normalized === "NAO CLASSIFICADO") return normalized;

  const [cidCode, ...descParts] = normalized.split(" - ");
  const desc = descParts.join(" - ").trim();

  if (!desc) return cidCode;
  const shortDesc = desc.length > 64 ? `${desc.slice(0, 64)}...` : desc;
  return `${cidCode} - ${shortDesc}`;
}

function chunkCodes(items: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function isPlaceholderCidLabel(value: string): boolean {
  const cleanValue = (value || "").trim();
  return (
    cleanValue.length === 0 ||
    /NAO INFORMADO|SEM CID|LEGADO|DESCRICAO NAO INFORMADA|CAPITULO NAO INFORMADO|N\/A/i.test(
      cleanValue,
    )
  );
}

function resolveCidFromCatalog(
  cidCode: string,
  cidDesc: string,
  cidChapter: string,
  cidCatalogByCode: Record<string, CidCatalogEntry>,
) {
  const normalizedCode = normalizeCID(cidCode || "");
  const catalogEntry = cidCatalogByCode[normalizedCode];
  const canonical = normalizedCode ? getCIDDetails(normalizedCode) : null;
  const canonicalDesc = canonical?.desc || "DESCRICAO NAO INFORMADA";

  const resolvedDescFromCatalog =
    catalogEntry && !isPlaceholderCidLabel(catalogEntry.desc)
      ? catalogEntry.desc
      : canonical?.desc;
  const resolvedChapterFromCatalog =
    catalogEntry && !isPlaceholderCidLabel(catalogEntry.chapter)
      ? catalogEntry.chapter
      : canonical?.chapter;

  let sanitizedDesc = cidDesc;
  if (isPlaceholderCidLabel(sanitizedDesc)) {
    sanitizedDesc = isPlaceholderCidLabel(resolvedDescFromCatalog || "")
      ? canonicalDesc
      : (resolvedDescFromCatalog as string);
  }

  const sanitizedChapter = isPlaceholderCidLabel(cidChapter)
    ? resolvedChapterFromCatalog || "CAPITULO NAO INFORMADO"
    : cidChapter;

  if (!catalogEntry) {
    return {
      code: normalizedCode || cidCode,
      desc: sanitizedDesc,
      chapter: sanitizedChapter,
    };
  }

  return {
    code: normalizedCode || cidCode,
    desc: sanitizedDesc,
    chapter: sanitizedChapter,
  };
}

function toChapterRanking(items: CidOccurrenceFact[]): ChapterRankingItem[] {
  const totalOccurrences = items.length;
  const chapterMap = new Map<
    string,
    { occurrences: number; daysLost: number; eventIds: Set<number> }
  >();

  items.forEach((occ) => {
    const current = chapterMap.get(occ.cidChapter) || {
      occurrences: 0,
      daysLost: 0,
      eventIds: new Set<number>(),
    };
    current.occurrences += 1;
    current.daysLost += occ.allocatedDays;
    current.eventIds.add(occ.eventId);
    chapterMap.set(occ.cidChapter, current);
  });

  return Array.from(chapterMap.entries()).map(([chapter, value]) => ({
    chapter,
    occurrences: value.occurrences,
    afastamentos: value.eventIds.size,
    daysLost: value.daysLost,
    participationPct:
      totalOccurrences > 0 ? (value.occurrences / totalOccurrences) * 100 : 0,
  }));
}

function toCidRanking(items: CidOccurrenceFact[]): CidRankingItem[] {
  const totalOccurrences = items.length;
  const cidMap = new Map<
    string,
    {
      cidCode: string;
      cidDesc: string;
      cidChapter: string;
      occurrences: number;
      daysLost: number;
      eventIds: Set<number>;
    }
  >();

  items.forEach((occ) => {
    const key = `${occ.cidCode}|${occ.cidChapter}`;
    const current = cidMap.get(key) || {
      cidCode: occ.cidCode,
      cidDesc: occ.cidDesc,
      cidChapter: occ.cidChapter,
      occurrences: 0,
      daysLost: 0,
      eventIds: new Set<number>(),
    };
    current.occurrences += 1;
    current.daysLost += occ.allocatedDays;
    current.eventIds.add(occ.eventId);
    cidMap.set(key, current);
  });

  return Array.from(cidMap.values()).map((value) => ({
    cidCode: value.cidCode,
    cidDesc: value.cidDesc,
    cidChapter: value.cidChapter,
    occurrences: value.occurrences,
    afastamentos: value.eventIds.size,
    daysLost: value.daysLost,
    participationPct:
      totalOccurrences > 0 ? (value.occurrences / totalOccurrences) * 100 : 0,
  }));
}

function sortChapterRanking(
  items: ChapterRankingItem[],
  mode: CidPanelSortMode,
): ChapterRankingItem[] {
  const sorted = [...items];
  if (mode === "impact") {
    return sorted.sort((a, b) => b.daysLost - a.daysLost);
  }
  return sorted.sort((a, b) => b.occurrences - a.occurrences);
}

function sortCidRanking(
  items: CidRankingItem[],
  mode: CidPanelSortMode,
): CidRankingItem[] {
  const sorted = [...items];
  const comparator =
    mode === "impact"
      ? (a: CidRankingItem, b: CidRankingItem) =>
          b.daysLost - a.daysLost || b.occurrences - a.occurrences
      : (a: CidRankingItem, b: CidRankingItem) =>
          b.occurrences - a.occurrences || b.daysLost - a.daysLost;
  return sorted.sort(comparator);
}

function sortOccupationalRanking(
  items: OccupationalRankingItem[],
  mode: CidPanelSortMode,
): OccupationalRankingItem[] {
  const sorted = [...items];
  if (mode === "impact") {
    return sorted.sort((a, b) => b.daysLost - a.daysLost);
  }
  return sorted.sort((a, b) => b.afastamentos - a.afastamentos);
}

function getDurationBandLabel(daysAway: number): string {
  const band = CID_ANALYTICS_DEFAULT_POLICY.durationBands.find((entry) => {
    if (daysAway < entry.minDays) return false;
    if (entry.maxDays === null) return true;
    return daysAway <= entry.maxDays;
  });
  return band?.label || "91+ dias";
}

function CidAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");

  const [records, setRecords] = useState<AfastamentoRecord[]>([]);
  const [cidCatalogByCode, setCidCatalogByCode] = useState<
    Record<string, CidCatalogEntry>
  >({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>("visao-geral");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(
    () => searchParams.get("startDate") ?? "",
  );
  const [endDate, setEndDate] = useState(
    () => searchParams.get("endDate") ?? "",
  );
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isPrintPopoverOpen, setIsPrintPopoverOpen] = useState(false);
  const [printLayout, setPrintLayout] = useState<"portrait" | "landscape">(
    "landscape",
  );

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

      // Collect styles (link and style tags) to preserve visual fidelity
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
      /* Ensure header and footer stay visible when original page print CSS hides everything except #print-area */
      @media print {
        .official-header, .official-header * { visibility: visible !important; }
        #print-area, #print-area * { visibility: visible !important; }
        .report-footer, .report-footer * { visibility: visible !important; }
          /* Prefer to place footer in the physical bottom of the last page.
            JS will insert a spacer before the footer when possible; fallback CSS class
            .report-footer--force-break can be applied to force a new page when needed. */
        .report-footer { page-break-inside: avoid !important; margin-top: 12px !important; display:block !important; }
        .report-footer--force-break { page-break-before: always !important; break-before: page !important; }
      }
      `;

      const headerHtml = `
      <div class="official-header">
        <div class="logo-area"><img src="${logoUrl}" alt="Logo" /></div>
        <div class="report-title-area">
          <h1>Gestão Analítica de Afastamentos por CID</h1>
          <div class="report-info">(Dados baseados em afastamentos registrados na plataforma (casos com auxílio-doença / afastamentos superiores a 15 dias)).</div>
        </div>
        <div style="text-align:right;font-size:9px;color:#666;min-width:120px;">
          <div>Operador: ${operatorName}</div>
          <div>Data: ${today}</div>
        </div>
      </div>
    `;

      const footerHtml = `
      <div class="report-footer" style="margin-top:16px;border-top:2px solid #E5E7EB;padding-top:12px;text-align:center;max-width:90%;margin-left:auto;margin-right:auto;">
        <p style="font-size:11px;font-weight:800;color:#111;text-transform:uppercase;margin:0 0 6px;">
          🛡️ IMPORTANTE: Privacidade e Proteção de Dados (LGPD)
        </p>
        <p style="font-size:10px;color:#666;margin:0 0 8px;line-height:1.25;">
          Este relatório gerencial contém dados agregados de produtividade para fins de Business Intelligence. O uso destas informações é restrito à gestão estratégica do SESMT. Proibida a divulgação pública ou compartilhamento com terceiros sem autorização prévia.
        </p>
        <div style="padding-top:8px;border-top:1px solid #E6E6E6;">
          <p style="font-size:9px;color:#9CA3AF;letter-spacing:0.2em;font-weight:700;margin:6px 0 0;">
            Gerado via SESMT SYSTEM - Powered by UXBRAS®
          </p>
        </div>
      </div>
    `;

      // Clone print area and inject explicit colgroup for the CidCodeRankingPanel table
      let printContentHtml = node.outerHTML;
      try {
        const cloned = node.cloneNode(true) as HTMLElement;
        // Replace live-rendered SVG charts into the cloned DOM so printed SVGs keep
        // their computed sizes, gradients and paths (fixes Recharts distortion in print).
        try {
          const panelClasses = [
            ".CidClinicalTrendPanel",
            ".CidRecurrenceSummaryPanel",
          ];
          panelClasses.forEach((panelClass) => {
            const livePanels = Array.from(
              node.querySelectorAll(panelClass) as NodeListOf<HTMLElement>,
            );
            const clonedPanels = Array.from(
              cloned.querySelectorAll(panelClass) as NodeListOf<HTMLElement>,
            );
            const count = Math.min(livePanels.length, clonedPanels.length);
            for (let i = 0; i < count; i++) {
              try {
                const liveSvgs = Array.from(
                  livePanels[i].querySelectorAll(
                    "svg",
                  ) as NodeListOf<SVGElement>,
                );
                const clonedSvgs = Array.from(
                  clonedPanels[i].querySelectorAll(
                    "svg",
                  ) as NodeListOf<SVGElement>,
                );
                const sc = Math.min(liveSvgs.length, clonedSvgs.length);
                for (let j = 0; j < sc; j++) {
                  try {
                    const liveOuter = (liveSvgs[j] as Element).outerHTML;
                    // Use the live SVG markup directly in the cloned DOM (simpler and more reliable)
                    clonedSvgs[j].outerHTML = liveOuter;
                  } catch (e) {
                    // ignore per-svg errors
                  }
                }
              } catch (e) {
                // ignore per-panel svg replacement errors
              }
            }
          });
        } catch (e) {
          // ignore svg replacement errors
        }
        // Inject colgroup for key tables so printed layout matches screen proportions
        try {
          const selectors = [
            ".CidCodeRankingPanel table",
            ".CidChapterRankingPanel table",
          ];
          selectors.forEach((sel) => {
            const table = cloned.querySelector(sel) as HTMLTableElement | null;
            const liveTable = node.querySelector(
              sel,
            ) as HTMLTableElement | null;
            if (!table) return;
            let colgroupHtml = "<colgroup>";
            if (liveTable) {
              const headerCells = Array.from(
                (liveTable.querySelectorAll(
                  "thead th",
                ) as NodeListOf<HTMLElement>) || [],
              );
              if (headerCells.length > 0) {
                const widths = headerCells.map((th) =>
                  Math.max(
                    1,
                    Math.round(
                      th.getBoundingClientRect().width || th.offsetWidth || 0,
                    ),
                  ),
                );
                const total = widths.reduce((s, v) => s + v, 0) || 1;
                widths.forEach((w) => {
                  const pct = Math.max(
                    1,
                    Math.round((w / total) * 10000) / 100,
                  );
                  colgroupHtml += `<col style="width:${pct}% !important">`;
                });
              } else {
                colgroupHtml +=
                  '<col style="width:8% !important"><col style="width:52% !important"><col style="width:6% !important"><col style="width:8% !important"><col style="width:8% !important"><col style="width:10% !important"><col style="width:8% !important">';
              }
            } else {
              colgroupHtml +=
                '<col style="width:8% !important"><col style="width:52% !important"><col style="width:6% !important"><col style="width:8% !important"><col style="width:8% !important"><col style="width:10% !important"><col style="width:8% !important">';
            }
            colgroupHtml += "</colgroup>";
            table.insertAdjacentHTML("afterbegin", colgroupHtml);
            (table as HTMLElement).setAttribute(
              "style",
              "table-layout: fixed !important; width: 100% !important;",
            );
          });
        } catch (err) {
          // ignore and continue with cloned outerHTML
        }
        // Replace colored progress bars with inline SVGs so they print even when "background graphics" are disabled
        try {
          const barPanelSelectors = [
            ".CidCodeRankingPanel",
            ".CidChapterRankingPanel",
            ".CidRecurrenceSummaryPanel",
          ];
          barPanelSelectors.forEach((panelSel) => {
            const liveBars = Array.from(
              (node.querySelectorAll(
                `${panelSel} table td div > div[style*="width"]`,
              ) as NodeListOf<HTMLElement>) || [],
            );
            const clonedBars = Array.from(
              (cloned.querySelectorAll(
                `${panelSel} table td div > div[style*="width"]`,
              ) as NodeListOf<HTMLElement>) || [],
            );
            for (let i = 0; i < clonedBars.length; i++) {
              const liveBar = liveBars[i];
              const clonedBar = clonedBars[i];
              if (!clonedBar) continue;
              let pct = 0;
              try {
                const styleWidth =
                  liveBar?.style?.width ||
                  clonedBar.getAttribute("style") ||
                  "";
                const m = (styleWidth || "").match(/([0-9.]+)\s*%/);
                if (m) {
                  pct = parseFloat(m[1]);
                } else if (liveBar && liveBar.parentElement) {
                  const pw =
                    liveBar.parentElement.getBoundingClientRect().width || 0;
                  const w = liveBar.getBoundingClientRect().width || 0;
                  pct = pw ? Math.round((w / pw) * 100) : 0;
                }
              } catch (e) {
                pct = 0;
              }
              if (!isFinite(pct) || pct < 0) pct = 0;
              if (pct > 100) pct = 100;
              const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 8" preserveAspectRatio="none" width="100%" height="8" style="display:block"><rect x="0" y="0" width="100" height="8" fill="#F1F5F9"/><rect x="0" y="0" width="${pct}" height="8" fill="#E31E24"/></svg>`;
              const parent = clonedBar.parentElement;
              if (parent) parent.innerHTML = svg;
            }
          });
        } catch (e) {
          // ignore bar replacement errors
        }
        printContentHtml = cloned.outerHTML;
      } catch (e) {
        // fallback to original outerHTML
        printContentHtml = node.outerHTML;
      }

      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Relatório CID</title>${styles}<style>${headerCss}@media print{ @page { size: ${layout}; margin: 1cm; } } body{background:white;margin:0;padding:10px;color:#111;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;} #print-area { display: block !important; }</style></head><body>${headerHtml}${printContentHtml}${footerHtml}</body></html>`;

      win.document.open();
      win.document.write(html);
      win.document.close();
      // Small delay to let resources load
      setTimeout(() => {
        try {
          win.focus();
          win.print();
          // close the window after printing
          win.close();
        } catch (e) {
          // ignore
        }
      }, 600);
    },
    [userName],
  );

  const [filterSecretaria, setFilterSecretaria] = useState("all");
  const [filterCidChapter, setFilterCidChapter] = useState(
    () => searchParams.get("chapter") ?? "all",
  );
  const [filterCargo, setFilterCargo] = useState("all");
  const [filterNatureza, setFilterNatureza] = useState("all");
  const [filterCidCode, setFilterCidCode] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDurationBand, setFilterDurationBand] = useState("all");
  const [filterRecurrence, setFilterRecurrence] = useState("all");
  const [chapterSortMode, setChapterSortMode] =
    useState<CidPanelSortMode>("frequency");
  const [cidSortMode, setCidSortMode] = useState<CidPanelSortMode>("impact");
  const [secretariaSortMode, setSecretariaSortMode] =
    useState<CidPanelSortMode>("impact");
  const [cargoSortMode, setCargoSortMode] =
    useState<CidPanelSortMode>("impact");
  const [selectedChapterDrill, setSelectedChapterDrill] = useState<string>("");

  const [isCargoOpen, setIsCargoOpen] = useState(false);
  const [isNaturezaOpen, setIsNaturezaOpen] = useState(false);
  const [isCidOpen, setIsCidOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDurationOpen, setIsDurationOpen] = useState(false);
  const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 180);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("afastamentos")
      .select("*, afastamento_cids (*)")
      .not("tipo_afastamento", "ilike", "%MATERNIDADE%")
      .order("data_inicio", { ascending: false });

    if (error) {
      setErrorMessage(
        "Não foi possível carregar os dados analíticos de afastamentos.",
      );
      setRecords([]);
      setLoading(false);
      return;
    }

    const loadedRecords = (data || []) as AfastamentoRecord[];
    setRecords(loadedRecords);

    const cidCodes = Array.from(
      new Set(
        loadedRecords
          .flatMap((record) => record.afastamento_cids || [])
          .map((cid) => normalizeCID(cid.cid_codigo || ""))
          .filter((code) => code.length > 0),
      ),
    );

    if (cidCodes.length === 0) {
      setCidCatalogByCode({});
      setLoading(false);
      return;
    }

    const cidLookup: Record<string, CidCatalogEntry> = {};
    const codeChunks = chunkCodes(cidCodes, CID_LOOKUP_QUERY_CHUNK);

    for (const chunk of codeChunks) {
      const withChapter = await supabase
        .from("cid10")
        .select("codigo, descricao, capitulo")
        .in("codigo", chunk);

      let cidData: Array<Record<string, unknown>> | null =
        withChapter.data as Array<Record<string, unknown>> | null;
      let cidError = withChapter.error;

      if (cidError) {
        const fallback = await supabase
          .from("cid10")
          .select("codigo, descricao")
          .in("codigo", chunk);
        cidData = fallback.data as Array<Record<string, unknown>> | null;
        cidError = fallback.error;
      }

      if (cidError) {
        continue;
      }

      (cidData || []).forEach((item) => {
        const normalizedCode = normalizeCID(
          (item.codigo as string | undefined) || "",
        );
        if (!normalizedCode) return;

        const canonical = getCIDDetails(normalizedCode);
        const dbChapter = ((item.capitulo as string | undefined) || "").trim();
        const dbDesc = ((item.descricao as string | undefined) || "").trim();

        const canonicalChapter = canonical.chapter;
        const canonicalDesc = canonical.desc;
        const rangeChapter = getCIDChapter(normalizedCode)?.capitulo;

        let chapter = dbChapter;
        if (isPlaceholderCidLabel(chapter)) {
          if (isPlaceholderCidLabel(canonicalChapter)) {
            chapter = rangeChapter || "CAPITULO NAO INFORMADO";
          } else {
            chapter = canonicalChapter;
          }
        }

        let desc = dbDesc;
        if (isPlaceholderCidLabel(desc)) {
          if (isPlaceholderCidLabel(canonicalDesc)) {
            desc = "DESCRICAO NAO INFORMADA";
          } else {
            desc = canonicalDesc;
          }
        }

        cidLookup[normalizedCode] = {
          desc,
          chapter,
        };
      });
    }

    setCidCatalogByCode(cidLookup);
    setLoading(false);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
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

        if (profile) {
          setUserRole(profile.role);
          if (
            profile.role !== "admin" &&
            profile.role !== "nurse" &&
            profile.role !== "analytic_manager" &&
            profile.role !== "doctor"
          ) {
            router.push("/");
            return;
          }
        }

        const name =
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "Usuário";
        setUserName(name);

        await loadData();
      } catch (err) {
        await handleAuthError(err);
      }
    };

    checkAuth();
  }, [loadData, router]);

  const baseDataset = useMemo(
    () => buildCidAnalyticsDataset(records),
    [records],
  );

  const dataset = useMemo(() => {
    const hasCatalog = Object.keys(cidCatalogByCode).length > 0;
    if (!hasCatalog) return baseDataset;

    const events = baseDataset.events.map((fact) => {
      const resolved = resolveCidFromCatalog(
        fact.clinical.cidCode,
        fact.clinical.cidDesc,
        fact.clinical.cidChapter,
        cidCatalogByCode,
      );

      return {
        ...fact,
        clinical: {
          ...fact.clinical,
          cidCode: resolved.code,
          cidDesc: resolved.desc,
          cidChapter: resolved.chapter,
        },
      };
    });

    const cidOccurrences = baseDataset.cidOccurrences.map((occ) => {
      const resolved = resolveCidFromCatalog(
        occ.cidCode,
        occ.cidDesc,
        occ.cidChapter,
        cidCatalogByCode,
      );

      return {
        ...occ,
        cidCode: resolved.code,
        cidDesc: resolved.desc,
        cidChapter: resolved.chapter,
      };
    });

    return {
      ...baseDataset,
      events,
      cidOccurrences,
    };
  }, [baseDataset, cidCatalogByCode]);

  const eventNameMap = useMemo(() => {
    const map = new Map<number, string>();
    records.forEach((record) => {
      map.set(record.id, record.servidor_nome || "");
    });
    return map;
  }, [records]);

  const occurrencesByEventId = useMemo(() => {
    const map = new Map<number, CidOccurrenceFact[]>();
    dataset.cidOccurrences.forEach((occ) => {
      const current = map.get(occ.eventId) || [];
      current.push(occ);
      map.set(occ.eventId, current);
    });
    return map;
  }, [dataset.cidOccurrences]);

  const filtered = useMemo(() => {
    const normalizedSearch = toUpperNoAccents(debouncedSearchTerm.trim());

    const events = dataset.events.filter((event) => {
      const occs = occurrencesByEventId.get(event.event.afastamentoId) || [];

      if (normalizedSearch.length > 0) {
        const cpfText = toUpperNoAccents(event.event.servidorCpf);
        const nameText = toUpperNoAccents(
          eventNameMap.get(event.event.afastamentoId) || "",
        );
        const searchMatch =
          cpfText.includes(normalizedSearch) ||
          nameText.includes(normalizedSearch);
        if (!searchMatch) return false;
      }

      if (startDate && event.event.startDate < startDate) return false;
      if (endDate && event.event.startDate > endDate) return false;

      if (
        filterSecretaria !== "all" &&
        event.occupational.secretaria !== filterSecretaria
      ) {
        return false;
      }

      if (filterCargo !== "all" && event.occupational.cargo !== filterCargo) {
        return false;
      }

      if (
        filterNatureza !== "all" &&
        event.occupational.naturezaCargo !== filterNatureza
      ) {
        return false;
      }

      if (filterStatus !== "all" && event.event.situacao !== filterStatus) {
        return false;
      }

      if (filterDurationBand !== "all") {
        const band = getDurationBandLabel(event.event.daysAway);
        if (band !== filterDurationBand) return false;
      }

      if (filterRecurrence !== "all") {
        const recurrent = event.recurrence.isRecurrentPrimary;
        if (filterRecurrence === "recurrent" && !recurrent) return false;
        if (filterRecurrence === "non-recurrent" && recurrent) return false;
      }

      if (filterCidChapter !== "all") {
        const hasChapter = occs.some(
          (occ) => occ.cidChapter === filterCidChapter,
        );
        if (!hasChapter) return false;
      }

      if (filterCidCode !== "all") {
        const hasCid = occs.some((occ) => occ.cidCode === filterCidCode);
        if (!hasCid) return false;
      }

      return true;
    });

    const eventIds = new Set(events.map((event) => event.event.afastamentoId));
    const cidOccurrences = dataset.cidOccurrences.filter((occ) => {
      if (!eventIds.has(occ.eventId)) return false;
      if (filterCidChapter !== "all" && occ.cidChapter !== filterCidChapter)
        return false;
      if (filterCidCode !== "all" && occ.cidCode !== filterCidCode)
        return false;
      return true;
    });

    return { events, cidOccurrences };
  }, [
    dataset.events,
    dataset.cidOccurrences,
    occurrencesByEventId,
    eventNameMap,
    debouncedSearchTerm,
    startDate,
    endDate,
    filterSecretaria,
    filterCargo,
    filterNatureza,
    filterCidChapter,
    filterCidCode,
    filterStatus,
    filterDurationBand,
    filterRecurrence,
  ]);

  const filteredMetrics = useMemo(
    () =>
      buildCidAnalyticsMetrics(
        filtered.events,
        filtered.cidOccurrences,
        dataset.policy,
      ),
    [filtered.events, filtered.cidOccurrences, dataset.policy],
  );

  const chapterRanking = useMemo(
    () => toChapterRanking(filtered.cidOccurrences),
    [filtered.cidOccurrences],
  );

  const chapterRankingSorted = useMemo(
    () => sortChapterRanking(chapterRanking, chapterSortMode),
    [chapterRanking, chapterSortMode],
  );

  const effectiveChapterDrill = useMemo(() => {
    if (!selectedChapterDrill) return "";
    const stillExists = chapterRanking.some(
      (entry) => entry.chapter === selectedChapterDrill,
    );
    return stillExists ? selectedChapterDrill : "";
  }, [chapterRanking, selectedChapterDrill]);

  const cidBase = useMemo(() => {
    if (!effectiveChapterDrill) return filtered.cidOccurrences;
    return filtered.cidOccurrences.filter(
      (occ) => occ.cidChapter === effectiveChapterDrill,
    );
  }, [effectiveChapterDrill, filtered.cidOccurrences]);

  const cidRanking = useMemo(() => toCidRanking(cidBase), [cidBase]);

  const cidRankingSorted = useMemo(
    () => sortCidRanking(cidRanking, cidSortMode),
    [cidRanking, cidSortMode],
  );

  const trendChapterFocus = useMemo(() => {
    if (effectiveChapterDrill) return effectiveChapterDrill;
    return chapterRankingSorted[0]?.chapter || "";
  }, [chapterRankingSorted, effectiveChapterDrill]);

  const chapterTrendPoints = useMemo(() => {
    if (!trendChapterFocus) return [] as CidTrendPoint[];
    const trendMap = new Map<string, CidTrendPoint>();

    filtered.cidOccurrences
      .filter((occ) => occ.cidChapter === trendChapterFocus)
      .forEach((occ) => {
        const current = trendMap.get(occ.competency) || {
          competency: occ.competency,
          occurrences: 0,
          daysLost: 0,
        };
        current.occurrences += 1;
        current.daysLost += occ.allocatedDays;
        trendMap.set(occ.competency, current);
      });

    return Array.from(trendMap.values()).sort((a, b) =>
      a.competency.localeCompare(b.competency),
    );
  }, [filtered.cidOccurrences, trendChapterFocus]);

  const occsByEventId = useMemo(() => {
    const map = new Map<number, CidOccurrenceFact[]>();
    filtered.cidOccurrences.forEach((occ) => {
      const current = map.get(occ.eventId) || [];
      current.push(occ);
      map.set(occ.eventId, current);
    });
    return map;
  }, [filtered.cidOccurrences]);

  const secretariaRanking = useMemo(() => {
    const totalEvents = filtered.events.length;
    const byGroup = new Map<
      string,
      {
        afastamentos: number;
        daysLost: number;
        chapterMap: Map<string, number>;
        cidMap: Map<string, number>;
      }
    >();

    filtered.events.forEach((event) => {
      const group = event.occupational.secretaria;
      const current = byGroup.get(group) || {
        afastamentos: 0,
        daysLost: 0,
        chapterMap: new Map<string, number>(),
        cidMap: new Map<string, number>(),
      };

      current.afastamentos += 1;
      current.daysLost += event.event.daysAway;

      const occs = occsByEventId.get(event.event.afastamentoId) || [];
      occs.forEach((occ) => {
        current.chapterMap.set(
          occ.cidChapter,
          (current.chapterMap.get(occ.cidChapter) || 0) + 1,
        );
        const cidLabel = `${occ.cidCode} - ${occ.cidDesc}`;
        current.cidMap.set(cidLabel, (current.cidMap.get(cidLabel) || 0) + 1);
      });

      byGroup.set(group, current);
    });

    return Array.from(byGroup.entries()).map(([label, value]) => {
      const dominantChapter =
        Array.from(value.chapterMap.entries()).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] || "NAO CLASSIFICADO";
      const dominantCid =
        Array.from(value.cidMap.entries()).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] || "NAO CLASSIFICADO";

      return {
        label,
        afastamentos: value.afastamentos,
        daysLost: value.daysLost,
        avgDays:
          value.afastamentos > 0 ? value.daysLost / value.afastamentos : 0,
        participationPct:
          totalEvents > 0 ? (value.afastamentos / totalEvents) * 100 : 0,
        dominantChapter: normalizeLegacyLabel(dominantChapter),
        dominantCid: formatDominantCidLabel(dominantCid),
      } satisfies OccupationalRankingItem;
    });
  }, [filtered.events, occsByEventId]);

  const cargoRanking = useMemo(() => {
    const totalEvents = filtered.events.length;
    const byGroup = new Map<
      string,
      {
        afastamentos: number;
        daysLost: number;
        chapterMap: Map<string, number>;
        cidMap: Map<string, number>;
      }
    >();

    filtered.events.forEach((event) => {
      const group = event.occupational.cargo;
      const current = byGroup.get(group) || {
        afastamentos: 0,
        daysLost: 0,
        chapterMap: new Map<string, number>(),
        cidMap: new Map<string, number>(),
      };

      current.afastamentos += 1;
      current.daysLost += event.event.daysAway;

      const occs = occsByEventId.get(event.event.afastamentoId) || [];
      occs.forEach((occ) => {
        current.chapterMap.set(
          occ.cidChapter,
          (current.chapterMap.get(occ.cidChapter) || 0) + 1,
        );
        const cidLabel = `${occ.cidCode} - ${occ.cidDesc}`;
        current.cidMap.set(cidLabel, (current.cidMap.get(cidLabel) || 0) + 1);
      });

      byGroup.set(group, current);
    });

    return Array.from(byGroup.entries()).map(([label, value]) => {
      const dominantChapter =
        Array.from(value.chapterMap.entries()).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] || "NAO CLASSIFICADO";
      const dominantCid =
        Array.from(value.cidMap.entries()).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] || "NAO CLASSIFICADO";

      return {
        label,
        afastamentos: value.afastamentos,
        daysLost: value.daysLost,
        avgDays:
          value.afastamentos > 0 ? value.daysLost / value.afastamentos : 0,
        participationPct:
          totalEvents > 0 ? (value.afastamentos / totalEvents) * 100 : 0,
        dominantChapter: normalizeLegacyLabel(dominantChapter),
        dominantCid: formatDominantCidLabel(dominantCid),
      } satisfies OccupationalRankingItem;
    });
  }, [filtered.events, occsByEventId]);

  const naturezaImpact = useMemo(() => {
    const totalEvents = filtered.events.length;
    const byNature = new Map<
      string,
      { afastamentos: number; daysLost: number }
    >();

    filtered.events.forEach((event) => {
      const natureza = event.occupational.naturezaCargo;
      const current = byNature.get(natureza) || {
        afastamentos: 0,
        daysLost: 0,
      };
      current.afastamentos += 1;
      current.daysLost += event.event.daysAway;
      byNature.set(natureza, current);
    });

    return Array.from(byNature.entries())
      .map(([natureza, value]) => ({
        natureza,
        afastamentos: value.afastamentos,
        daysLost: value.daysLost,
        avgDays:
          value.afastamentos > 0 ? value.daysLost / value.afastamentos : 0,
        participationPct:
          totalEvents > 0 ? (value.afastamentos / totalEvents) * 100 : 0,
      }))
      .sort((a, b) => b.daysLost - a.daysLost) as NaturezaImpactItem[];
  }, [filtered.events]);

  const recurrenceWindowSummary = useMemo(() => {
    const total = filtered.events.length;
    const r90 = filtered.events.filter(
      (e) => e.recurrence.isRecurrent90,
    ).length;
    const r180 = filtered.events.filter(
      (e) => e.recurrence.isRecurrent180,
    ).length;
    const r365 = filtered.events.filter(
      (e) => e.recurrence.isRecurrent365,
    ).length;
    return [
      {
        label: "90 dias",
        days: 90,
        count: r90,
        pct: total > 0 ? (r90 / total) * 100 : 0,
      },
      {
        label: "180 dias",
        days: 180,
        count: r180,
        pct: total > 0 ? (r180 / total) * 100 : 0,
      },
      {
        label: "365 dias",
        days: 365,
        count: r365,
        pct: total > 0 ? (r365 / total) * 100 : 0,
      },
    ];
  }, [filtered.events]);

  const managerialIntelligence = useMemo(
    () =>
      buildCidManagerialIntelligence(filtered.events, filtered.cidOccurrences),
    [filtered.events, filtered.cidOccurrences],
  );

  const secretariaRankingSorted = useMemo(
    () => sortOccupationalRanking(secretariaRanking, secretariaSortMode),
    [secretariaRanking, secretariaSortMode],
  );

  const cargoRankingSorted = useMemo(
    () => sortOccupationalRanking(cargoRanking, cargoSortMode),
    [cargoRanking, cargoSortMode],
  );

  const occupationalCross = useMemo(() => {
    const topSecretarias = secretariaRankingSorted
      .slice(0, 6)
      .map((row) => row.label);
    const chapterTotals = new Map<string, number>();
    filtered.cidOccurrences.forEach((occ) => {
      chapterTotals.set(
        occ.cidChapter,
        (chapterTotals.get(occ.cidChapter) || 0) + occ.allocatedDays,
      );
    });

    const topChapters = Array.from(chapterTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([chapter]) => chapter);

    const matrixKey = (chapter: string, secretaria: string) =>
      `${chapter}|||${secretaria}`;
    const matrix = new Map<string, { occurrences: number; daysLost: number }>();
    const eventsById = new Map(
      filtered.events.map((e) => [e.event.afastamentoId, e]),
    );

    filtered.cidOccurrences.forEach((occ) => {
      if (!topChapters.includes(occ.cidChapter)) return;
      const event = eventsById.get(occ.eventId);
      if (!event) return;
      const secretaria = event.occupational.secretaria;
      if (!topSecretarias.includes(secretaria)) return;
      const key = matrixKey(occ.cidChapter, secretaria);
      const current = matrix.get(key) || { occurrences: 0, daysLost: 0 };
      current.occurrences += 1;
      current.daysLost += occ.allocatedDays;
      matrix.set(key, current);
    });

    const rows: OccupationalCrossMatrixRow[] = topChapters.map((chapter) => ({
      chapter,
      values: topSecretarias.map((secretaria) => {
        const key = matrixKey(chapter, secretaria);
        const value = matrix.get(key) || { occurrences: 0, daysLost: 0 };
        return {
          group: secretaria,
          occurrences: value.occurrences,
          daysLost: value.daysLost,
        };
      }),
    }));

    return {
      columns: topSecretarias,
      rows,
    };
  }, [filtered.cidOccurrences, filtered.events, secretariaRankingSorted]);

  const uniqueSecretarias = useMemo(
    () =>
      sortStrings(
        Array.from(
          new Set(dataset.events.map((event) => event.occupational.secretaria)),
        ),
      ),
    [dataset.events],
  );

  const uniqueChapters = useMemo(
    () =>
      sortStrings(
        Array.from(
          new Set(dataset.cidOccurrences.map((occ) => occ.cidChapter)),
        ),
      ),
    [dataset.cidOccurrences],
  );

  const uniqueCargos = useMemo(
    () =>
      sortStrings(
        Array.from(
          new Set(dataset.events.map((event) => event.occupational.cargo)),
        ),
      ),
    [dataset.events],
  );

  const uniqueNaturezas = useMemo(
    () =>
      sortStrings(
        Array.from(
          new Set(
            dataset.events.map((event) => event.occupational.naturezaCargo),
          ),
        ),
      ),
    [dataset.events],
  );

  const uniqueCidOptions = useMemo(() => {
    const map = new Map<string, string>();
    dataset.cidOccurrences.forEach((occ) => {
      if (!map.has(occ.cidCode)) {
        map.set(occ.cidCode, `${occ.cidCode} - ${occ.cidDesc}`);
      }
    });
    return Array.from(map.entries())
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [dataset.cidOccurrences]);

  const statusOptions = useMemo(
    () =>
      sortStrings(
        Array.from(
          new Set(dataset.events.map((event) => event.event.situacao)),
        ),
      ),
    [dataset.events],
  );

  const durationOptions = useMemo(
    () => dataset.policy.durationBands.map((band) => band.label),
    [dataset.policy.durationBands],
  );

  const activeFilterCount =
    (debouncedSearchTerm.trim() ? 1 : 0) +
    (startDate || endDate ? 1 : 0) +
    (filterSecretaria === "all" ? 0 : 1) +
    (filterCidChapter === "all" ? 0 : 1) +
    (filterCargo === "all" ? 0 : 1) +
    (filterNatureza === "all" ? 0 : 1) +
    (filterCidCode === "all" ? 0 : 1) +
    (filterStatus === "all" ? 0 : 1) +
    (filterDurationBand === "all" ? 0 : 1) +
    (filterRecurrence === "all" ? 0 : 1);

  const clearAllFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setStartDate("");
    setEndDate("");
    setFilterSecretaria("all");
    setFilterCidChapter("all");
    setFilterCargo("all");
    setFilterNatureza("all");
    setFilterCidCode("all");
    setFilterStatus("all");
    setFilterDurationBand("all");
    setFilterRecurrence("all");
  };

  const extraChips = [
    ...(filterCargo === "all"
      ? []
      : [{ key: "cargo", label: `Cargo: ${filterCargo}` }]),
    ...(filterNatureza === "all"
      ? []
      : [{ key: "natureza", label: `Natureza: ${filterNatureza}` }]),
    ...(filterCidCode === "all"
      ? []
      : [{ key: "cid", label: `CID: ${filterCidCode}` }]),
    ...(filterStatus === "all"
      ? []
      : [{ key: "status", label: `Situação: ${filterStatus}` }]),
    ...(filterDurationBand === "all"
      ? []
      : [{ key: "duracao", label: `Faixa: ${filterDurationBand}` }]),
    ...(filterRecurrence === "all"
      ? []
      : [
          {
            key: "recorrencia",
            label:
              filterRecurrence === "recurrent"
                ? "Recorrência: Sim"
                : "Recorrência: Não",
          },
        ]),
  ];

  const tabs = CID_ANALYTICS_PAGE_ARCHITECTURE.tabs;

  const content = (() => {
    if (errorMessage) {
      return (
        <div className="border border-red-200 bg-red-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">
            {errorMessage}
          </p>
        </div>
      );
    }

    if (records.length === 0) {
      return (
        <div className="border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Nenhum afastamento encontrado para análise.
          </p>
        </div>
      );
    }

    if (filtered.events.length === 0) {
      return (
        <div className="border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Sem resultados para os filtros aplicados.
          </p>
        </div>
      );
    }

    if (activeTab !== "visao-geral") {
      if (activeTab === "cid-capitulos") {
        return (
          <div className="space-y-4">
            <StatisticCardRow columns={4}>
              <StatisticCard
                variant="analytic"
                accent="primary"
                title="Capítulos no recorte"
                value={formatNumber(chapterRanking.length)}
                icon={<Layers3 className="w-5 h-5 text-slate-300" />}
              />
              <StatisticCard
                variant="analytic"
                accent="neutral"
                title="CIDs no recorte"
                value={formatNumber(cidRanking.length)}
                icon={<Search className="w-5 h-5 text-slate-300" />}
              />
              <StatisticCard
                variant="analytic"
                accent="warning"
                title="Capítulo líder"
                value={chapterRankingSorted[0]?.chapter || "N/A"}
                subtitle={`${formatNumber(chapterRankingSorted[0]?.afastamentos || 0)} licenças`}
                helperText="Licenças = eventos distintos com ao menos 1 CID do capítulo"
                icon={<BarChart3 className="w-5 h-5 text-amber-300" />}
              />
              <StatisticCard
                variant="analytic"
                accent="danger"
                title="CID de maior impacto"
                value={cidRankingSorted[0]?.cidCode || "N/A"}
                subtitle={`${formatNumber(Math.round(cidRankingSorted[0]?.daysLost || 0))} dias`}
                icon={<Clock3 className="w-5 h-5 text-red-300" />}
              />
            </StatisticCardRow>

            <CidChapterRankingPanel
              items={chapterRankingSorted}
              sortMode={chapterSortMode}
              onSortModeChange={setChapterSortMode}
              selectedChapter={effectiveChapterDrill}
              onSelectChapter={(chapter) =>
                setSelectedChapterDrill((prev) =>
                  prev === chapter ? "" : chapter,
                )
              }
            />

            <CidCodeRankingPanel
              items={cidRankingSorted}
              sortMode={cidSortMode}
              onSortModeChange={setCidSortMode}
              chapterFocusLabel={effectiveChapterDrill || null}
              onClearChapterFocus={() => setSelectedChapterDrill("")}
            />

            {chapterTrendPoints.length > 1 ? (
              <CidClinicalTrendPanel
                points={chapterTrendPoints}
                chapterLabel={`Capítulo em foco: ${trendChapterFocus}`}
              />
            ) : null}
          </div>
        );
      }

      if (activeTab === "visao-ocupacional") {
        return (
          <div className="space-y-4">
            <StatisticCardRow columns={4}>
              <StatisticCard
                variant="analytic"
                accent="primary"
                title="Secretarias no recorte"
                value={formatNumber(secretariaRanking.length)}
                icon={<Building2 className="w-5 h-5 text-slate-300" />}
              />
              <StatisticCard
                variant="analytic"
                accent="neutral"
                title="Cargos no recorte"
                value={formatNumber(cargoRanking.length)}
                icon={<Users className="w-5 h-5 text-slate-300" />}
              />
              <StatisticCard
                variant="analytic"
                accent="danger"
                title="Secretaria maior impacto"
                value={secretariaRankingSorted[0]?.label || "N/A"}
                subtitle={`${formatNumber(Math.round(secretariaRankingSorted[0]?.daysLost || 0))} dias`}
                icon={<Clock3 className="w-5 h-5 text-red-300" />}
              />
              <StatisticCard
                variant="analytic"
                accent="warning"
                title="Natureza mais critica"
                value={naturezaImpact[0]?.natureza || "N/A"}
                subtitle={`${formatNumber(Math.round(naturezaImpact[0]?.daysLost || 0))} dias`}
                icon={<Layers3 className="w-5 h-5 text-amber-300" />}
              />
            </StatisticCardRow>

            <CidOccupationalRankingPanel
              title="Impacto por Secretaria"
              subtitle="Onde a carga ocupacional e os agravos se concentram"
              items={secretariaRankingSorted}
              sortMode={secretariaSortMode}
              onSortModeChange={setSecretariaSortMode}
            />

            <CidOccupationalRankingPanel
              title="Impacto por Cargo"
              subtitle="Priorizacao tecnica por funcao e gravidade"
              items={cargoRankingSorted}
              sortMode={cargoSortMode}
              onSortModeChange={setCargoSortMode}
            />

            <CidNatureImpactPanel items={naturezaImpact} />

            <CidOccupationalCrossPanel
              title="Cruzamento Capitulo CID x Secretaria"
              subtitle="Top capitulos de maior impacto versus top secretarias"
              columns={occupationalCross.columns}
              rows={occupationalCross.rows}
            />
          </div>
        );
      }

      if (activeTab === "casos-recorrencia") {
        return (
          <div className="space-y-4">
            <StatisticCardRow columns={4}>
              <StatisticCard
                variant="analytic"
                accent="primary"
                title="Licenças no recorte"
                value={formatNumber(
                  filteredMetrics.magnitude.totalAfastamentos,
                )}
                icon={<ClipboardList className="w-5 h-5 text-slate-300" />}
              />
              <StatisticCard
                variant="analytic"
                accent="warning"
                title="Recorrentes (180 dias)"
                value={formatNumber(
                  filteredMetrics.persistence
                    .totalEventosRecorrentesPrimaryWindow,
                )}
                subtitle={`${filteredMetrics.persistence.percentualRecorrenciaPrimaryWindow.toFixed(1)}% do total`}
                icon={<RefreshCcw className="w-5 h-5 text-amber-300" />}
              />
              <StatisticCard
                variant="analytic"
                accent="danger"
                title="Dias em recorrentes"
                value={formatNumber(
                  filteredMetrics.persistence
                    .diasAcumuladosServidoresRecorrentes,
                )}
                icon={<Clock3 className="w-5 h-5 text-red-300" />}
              />
              <StatisticCard
                variant="analytic"
                accent="neutral"
                title="Servidores afastados"
                value={formatNumber(
                  filteredMetrics.magnitude.totalServidoresAfastados,
                )}
                icon={<Users className="w-5 h-5 text-slate-300" />}
              />
            </StatisticCardRow>

            <CidRecurrenceSummaryPanel
              totalEvents={filteredMetrics.magnitude.totalAfastamentos}
              windows={recurrenceWindowSummary}
              primaryWindowDays={dataset.policy.recurrencePrimaryWindowDays}
              daysAccumulated={
                filteredMetrics.persistence.diasAcumuladosServidoresRecorrentes
              }
            />

            <CidRecurrenceInvestigativeTable
              events={filtered.events}
              nameMap={eventNameMap}
              cidOccurrences={filtered.cidOccurrences}
            />
          </div>
        );
      }

      return (
        <div className="border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Aba nao reconhecida.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <StatisticCardRow columns={5}>
          <StatisticCard
            variant="analytic"
            accent="neutral"
            title="Servidores afastados"
            value={formatNumber(
              filteredMetrics.magnitude.totalServidoresAfastados,
            )}
            icon={<Users className="w-5 h-5 text-slate-400" />}
          />
          <StatisticCard
            variant="analytic"
            accent="danger"
            title="Dias perdidos"
            value={formatNumber(filteredMetrics.magnitude.totalDiasPerdidos)}
            icon={<Clock3 className="w-5 h-5 text-red-300" />}
          />
          <StatisticCard
            variant="analytic"
            accent="info"
            title="Duração média"
            value={formatDays(filteredMetrics.magnitude.duracaoMedia)}
            icon={<TrendingUp className="w-5 h-5 text-blue-300" />}
          />
          <StatisticCard
            variant="analytic"
            accent="warning"
            title="Duração mediana"
            value={formatDays(filteredMetrics.magnitude.duracaoMediana)}
            icon={<BarChart3 className="w-5 h-5 text-amber-300" />}
          />
          <StatisticCard
            variant="analytic"
            accent="success"
            title="Recorrência (180d)"
            value={`${filteredMetrics.persistence.percentualRecorrenciaPrimaryWindow.toFixed(1)}%`}
            subtitle={`${formatNumber(filteredMetrics.persistence.totalEventosRecorrentesPrimaryWindow)} eventos`}
            icon={<Activity className="w-5 h-5 text-emerald-300" />}
          />
        </StatisticCardRow>

        <CidManagerialAlertsPanel
          items={managerialIntelligence.alerts}
          trendWindowLabel={managerialIntelligence.trendWindowLabel}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <CidPriorityRankingPanel
            title="Secretarias mais criticas"
            subtitle="Prioridade composta por volume, dias perdidos, recorrencia e tendencia"
            items={managerialIntelligence.secretariaRanking}
            volumeLabel="Licenças"
            scoreFormulaLabel={managerialIntelligence.scoreFormulaLabel}
          />

          <CidPriorityRankingPanel
            title="Cargos mais criticos"
            subtitle="Leitura gerencial para priorizacao ocupacional e preventiva"
            items={managerialIntelligence.cargoRanking}
            volumeLabel="Licenças"
            scoreFormulaLabel={managerialIntelligence.scoreFormulaLabel}
          />

          <CidPriorityRankingPanel
            title="Capitulos mais criticos"
            subtitle="Combinacao de frequencia, impacto, recorrencia e variacao recente"
            items={managerialIntelligence.chapterRanking}
            volumeLabel="Entradas CID"
            scoreFormulaLabel={managerialIntelligence.scoreFormulaLabel}
          />

          <CidPriorityRankingPanel
            title="CIDs mais criticos"
            subtitle="Priorizacao auditavel dos agravos mais sensiveis no recorte atual"
            items={managerialIntelligence.cidRanking}
            volumeLabel="Entradas CID"
            scoreFormulaLabel={managerialIntelligence.scoreFormulaLabel}
          />
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Regra de Prioridade Gerencial
          </h4>
          <p className="text-xs font-medium text-slate-600 leading-relaxed uppercase">
            O score desta fase nao usa modelo opaco. Cada ranking combina volume
            relativo, dias perdidos relativos, recorrencia relativa e tendencia
            positiva recente para apoiar priorizacao tecnica e preventiva com
            leitura auditavel.
          </p>
          <p className="mt-2 text-[10px] font-medium text-slate-500 leading-relaxed uppercase">
            Leitura de volume bruto. Rankings ordenados por concentracao de
            eventos no dataset filtrado. Nao equivalem a taxas padronizadas por
            populacao. Grupos maiores tendem a pontuar mais alto. N/D: TAD, IFL
            e IG nao sao calculaveis neste modulo (sem denominador padronizado)
            — para esses indicadores, consulte Epidemiologia Geral.
          </p>
        </div>
      </div>
    );
  })();

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#10b981] animate-spin" />
        <p className="text-[#1A3351] uppercase tracking-[0.3em] font-bold text-xs">
          Carregando inteligência CID...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-hidden">
      <div className="print:hidden">
        <Sidebar
          userRole={userRole}
          userName={userName}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
      </div>

      <main className="flex-1 min-w-0 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden relative">
        <section className="bg-[#B0B0B0] px-2.5 sm:px-4 lg:px-6 py-3 border-b-[6px] border-[#10b981] shrink-0 shadow-lg print:hidden">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:flex-nowrap md:gap-3">
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#1A3351]" />
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[13px] min-[360px]:text-[14px] sm:text-lg md:text-xl font-bold leading-tight uppercase tracking-tight text-[#1A3351]">
                    Gestão Analítica de Afastamentos por CID
                  </h2>
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
                className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 bg-[#1A3351] text-white flex items-center justify-center shadow-md"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-[#1A3351]/20 shrink-0 hidden md:block" />

            <div className="w-full md:flex-1 md:w-auto min-w-0">
              <CompactFilterBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                isDateFilterOpen={isDateFilterOpen}
                setIsDateFilterOpen={setIsDateFilterOpen}
                filterUser="all"
                setFilterUser={() => {}}
                filterSecretaria={filterSecretaria}
                setFilterSecretaria={setFilterSecretaria}
                filterAsoType={filterCidChapter}
                setFilterAsoType={setFilterCidChapter}
                uniqueUsersList={[]}
                uniqueSecretarias={uniqueSecretarias}
                referrals={[]}
                operatorsMap={{}}
                clearAllFilters={clearAllFilters}
                searchPlaceholder="NOME OU CPF DO SERVIDOR..."
                secretariaLabelDefault="SECRETARIAS"
                asoTypeLabelDefault="CAPÍTULO CID"
                asoTypeOptions={["all", ...uniqueChapters]}
                showUserFilter={false}
                activeFilterCount={activeFilterCount}
                extraActions={
                  <>
                    <ActionIconButton
                      icon={<Building2 className="w-4 h-4" />}
                      label="Filtrar por cargo"
                      variant="contextual"
                      active={filterCargo !== "all"}
                      open={isCargoOpen}
                      onToggle={setIsCargoOpen}
                      showMenuIndicator
                    >
                      <div className="w-[min(18rem,calc(100vw-2.5rem))] bg-white border-2 border-[#7C2D12] shadow-2xl rounded-none overflow-hidden">
                        <div className="p-3 space-y-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#7C2D12]">
                            Cargo
                          </p>
                          <select
                            value={filterCargo}
                            onChange={(e) => {
                              setFilterCargo(e.target.value);
                              setIsCargoOpen(false);
                            }}
                            className="w-full px-3 py-2 bg-[#FFF7E6] border border-[#F59E0B] text-[10px] font-bold uppercase outline-none focus:border-[#7C2D12]"
                          >
                            <option value="all">TODOS CARGOS</option>
                            {uniqueCargos.map((cargo) => (
                              <option key={cargo} value={cargo}>
                                {cargo}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </ActionIconButton>

                    <ActionIconButton
                      icon={<Layers3 className="w-4 h-4" />}
                      label="Filtrar por natureza do cargo"
                      variant="contextual"
                      active={filterNatureza !== "all"}
                      open={isNaturezaOpen}
                      onToggle={setIsNaturezaOpen}
                      showMenuIndicator
                    >
                      <div className="w-[min(18rem,calc(100vw-2.5rem))] bg-white border-2 border-[#7C2D12] shadow-2xl rounded-none overflow-hidden">
                        <div className="p-3 space-y-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#7C2D12]">
                            Natureza do Cargo
                          </p>
                          <select
                            value={filterNatureza}
                            onChange={(e) => {
                              setFilterNatureza(e.target.value);
                              setIsNaturezaOpen(false);
                            }}
                            className="w-full px-3 py-2 bg-[#FFF7E6] border border-[#F59E0B] text-[10px] font-bold uppercase outline-none focus:border-[#7C2D12]"
                          >
                            <option value="all">TODAS NATUREZAS</option>
                            {uniqueNaturezas.map((natureza) => (
                              <option key={natureza} value={natureza}>
                                {natureza}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </ActionIconButton>

                    <ActionIconButton
                      icon={<Search className="w-4 h-4" />}
                      label="Filtrar por CID"
                      variant="filter"
                      active={filterCidCode !== "all"}
                      open={isCidOpen}
                      onToggle={setIsCidOpen}
                      showMenuIndicator
                    >
                      <div className="w-[min(20rem,calc(100vw-2.5rem))] bg-white border-2 border-[#1A3351] shadow-2xl rounded-none overflow-hidden">
                        <div className="p-3 space-y-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#1A3351]">
                            CID
                          </p>
                          <select
                            value={filterCidCode}
                            onChange={(e) => {
                              setFilterCidCode(e.target.value);
                              setIsCidOpen(false);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-[10px] font-bold uppercase outline-none focus:border-[#1A3351]"
                          >
                            <option value="all">TODOS CIDs</option>
                            {uniqueCidOptions.map((cid) => (
                              <option key={cid.code} value={cid.code}>
                                {cid.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </ActionIconButton>

                    <ActionIconButton
                      icon={<Activity className="w-4 h-4" />}
                      label="Filtrar por situação"
                      variant="filter"
                      active={filterStatus !== "all"}
                      open={isStatusOpen}
                      onToggle={setIsStatusOpen}
                      showMenuIndicator
                    >
                      <div className="w-[min(18rem,calc(100vw-2.5rem))] bg-white border-2 border-[#1A3351] shadow-2xl rounded-none overflow-hidden">
                        <div className="p-3 space-y-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#1A3351]">
                            Situação
                          </p>
                          <select
                            value={filterStatus}
                            onChange={(e) => {
                              setFilterStatus(e.target.value);
                              setIsStatusOpen(false);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-[10px] font-bold uppercase outline-none focus:border-[#1A3351]"
                          >
                            <option value="all">TODAS SITUAÇÕES</option>
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </ActionIconButton>

                    <ActionIconButton
                      icon={<Clock3 className="w-4 h-4" />}
                      label="Filtrar por faixa de duração"
                      variant="filter"
                      active={filterDurationBand !== "all"}
                      open={isDurationOpen}
                      onToggle={setIsDurationOpen}
                      showMenuIndicator
                    >
                      <div className="w-[min(18rem,calc(100vw-2.5rem))] bg-white border-2 border-[#1A3351] shadow-2xl rounded-none overflow-hidden">
                        <div className="p-3 space-y-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#1A3351]">
                            Faixa de Duração
                          </p>
                          <select
                            value={filterDurationBand}
                            onChange={(e) => {
                              setFilterDurationBand(e.target.value);
                              setIsDurationOpen(false);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-[10px] font-bold uppercase outline-none focus:border-[#1A3351]"
                          >
                            <option value="all">TODAS FAIXAS</option>
                            {durationOptions.map((duration) => (
                              <option key={duration} value={duration}>
                                {duration}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </ActionIconButton>

                    <ActionIconButton
                      icon={<Filter className="w-4 h-4" />}
                      label="Filtrar por recorrência"
                      variant="filter"
                      active={filterRecurrence !== "all"}
                      open={isRecurrenceOpen}
                      onToggle={setIsRecurrenceOpen}
                      showMenuIndicator
                    >
                      <div className="w-[min(18rem,calc(100vw-2.5rem))] bg-white border-2 border-[#1A3351] shadow-2xl rounded-none overflow-hidden">
                        <div className="p-3 space-y-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#1A3351]">
                            Recorrência (180 dias)
                          </p>
                          <select
                            value={filterRecurrence}
                            onChange={(e) => {
                              setFilterRecurrence(e.target.value);
                              setIsRecurrenceOpen(false);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-[10px] font-bold uppercase outline-none focus:border-[#1A3351]"
                          >
                            <option value="all">TODOS</option>
                            <option value="recurrent">RECORRENTE</option>
                            <option value="non-recurrent">
                              NÃO RECORRENTE
                            </option>
                          </select>
                        </div>
                      </div>
                    </ActionIconButton>

                    <ActionIconButton
                      icon={<Printer className="w-4 h-4" />}
                      label="Gerar relatório PDF"
                      variant="primary"
                      open={isPrintPopoverOpen}
                      onToggle={setIsPrintPopoverOpen}
                      showMenuIndicator
                    >
                      <div className="w-56 bg-white border-2 border-[#1A3351] shadow-2xl animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 border-b border-slate-100 bg-slate-50">
                          <p className="text-[9px] font-bold text-[#1A3351] uppercase tracking-wider">
                            Escolha a Orientação
                          </p>
                        </div>
                        <div className="p-2 space-y-1">
                          <button
                            onClick={() => {
                              setPrintLayout("portrait");
                              setTimeout(() => {
                                openPrintWindow("portrait");
                                setIsPrintPopoverOpen(false);
                              }, 100);
                            }}
                            className={`w-full text-left p-3 rounded-none flex items-center justify-between transition-colors ${printLayout === "portrait" ? "bg-[#E31E24]/10 text-[#E31E24]" : "hover:bg-slate-100 text-slate-600"}`}
                          >
                            <span className="text-[10px] font-bold uppercase">
                              ↗ Vertical (Retrato)
                            </span>
                            {printLayout === "portrait" && (
                              <div className="w-1.5 h-1.5 rounded-none bg-[#E31E24]" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setPrintLayout("landscape");
                              setTimeout(() => {
                                openPrintWindow("landscape");
                                setIsPrintPopoverOpen(false);
                              }, 100);
                            }}
                            className={`w-full text-left p-3 rounded-none flex items-center justify-between transition-colors ${printLayout === "landscape" ? "bg-[#E31E24]/10 text-[#E31E24]" : "hover:bg-slate-100 text-slate-600"}`}
                          >
                            <span className="text-[10px] font-bold uppercase">
                              ➡ Horizontal (Paisagem)
                            </span>
                            {printLayout === "landscape" && (
                              <div className="w-1.5 h-1.5 rounded-none bg-[#E31E24]" />
                            )}
                          </button>
                        </div>
                      </div>
                    </ActionIconButton>

                    <ActionIconButton
                      icon={<FileText className="w-4 h-4" />}
                      label="Gerar relatório profissional (PDF)"
                      variant="primary"
                      onClick={() => {
                        const filteredIds = new Set(
                          filtered.events.map((e) => e.event.afastamentoId),
                        );
                        const filteredAfastamentos = records.filter((r) =>
                          filteredIds.has(r.id),
                        );

                        const reportFilters = {
                          searchTerm: searchTerm,
                          startDate: startDate,
                          endDate: endDate,
                          secretaria: filterSecretaria,
                          natureza: filterNatureza,
                        };

                        generateAbsenteeismDashboardReportPDF(
                          filteredAfastamentos,
                          reportFilters,
                        );
                      }}
                    />
                  </>
                }
              />
            </div>
          </div>

          <FilterChips
            searchTerm={normalizeSearchTerm(searchTerm)}
            startDate={startDate}
            endDate={endDate}
            filterUser="all"
            filterSecretaria={filterSecretaria}
            filterAsoType={filterCidChapter}
            referrals={[]}
            operatorsMap={{}}
            extraChips={extraChips}
          />
        </section>

        <div className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4">
          {(searchParams.get("chapter") || searchParams.get("startDate")) && (
            <div className="border border-[#1A3351]/20 border-l-4 border-l-[#1A3351] bg-[#1A3351]/4 px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#1A3351]">
                Contexto de origem
              </span>
              <div className="h-3 w-px bg-slate-300 shrink-0 hidden sm:block" />
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                Epidemiologia Geral
              </span>
              {searchParams.get("chapter") && (
                <>
                  <div className="h-3 w-px bg-slate-300 shrink-0 hidden sm:block" />
                  <span className="text-[9px] font-semibold text-[#1A3351] uppercase tracking-wider">
                    {searchParams.get("chapter")}
                  </span>
                </>
              )}
              {searchParams.get("startDate") && searchParams.get("endDate") && (
                <>
                  <div className="h-3 w-px bg-slate-300 shrink-0 hidden sm:block" />
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">
                    {searchParams.get("startDate")} –{" "}
                    {searchParams.get("endDate")}
                  </span>
                </>
              )}
            </div>
          )}

          <div
            id="print-area"
            className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden max-w-full"
          >
            <div className="bg-[#B0B0B0] px-4 sm:px-6 py-2.5 border-b-2 border-slate-400 flex items-center justify-between gap-3 flex-wrap min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A3351]">
                Núcleo Analítico CID
              </h3>
              <div className="w-full sm:w-auto min-w-0 max-w-full flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabId)}
                    className={`shrink-0 h-8 px-3 border text-[10px] font-bold uppercase tracking-wide transition-all ${activeTab === tab.id ? "bg-[#1A3351] text-white border-[#1A3351]" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 sm:p-4 lg:p-6">{content}</div>
          </div>
        </div>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              html, body { height: auto !important; overflow: visible !important; }
              body * { visibility: hidden !important; }
              #print-area, #print-area * { visibility: visible !important; }

              /* Base compacting and font sizing */
              #print-area { 
                position: static !important; 
                left: 0 !important; 
                top: 0 !important; 
                width: auto !important; 
                max-width: ${printLayout === "portrait" ? "190mm" : "277mm"} !important;
                display: block !important;
                background: white !important;
                overflow: visible !important;
                height: auto !important;
                padding: 0 !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
                font-size: 9px !important;
                line-height: 1.05 !important;
                color: #111 !important;
              }

              /* Force wrapping and breaking rules so long lines/tables don't overflow */
              #print-area * { box-sizing: border-box !important; white-space: normal !important; overflow-wrap: anywhere !important; word-break: break-word !important; hyphens: auto !important; }

              /* Remove bold: force normal weight for all print-area elements */
              #print-area, #print-area * { font-weight: 400 !important; }

              /* Headings: keep compact but not bold */
              #print-area h1, #print-area h2, #print-area h3, #print-area h4 { font-weight: 400 !important; margin: 2px 0 !important; padding: 0 !important; }
              #print-area h3 { font-size: 12px !important; }

              /* Tables: fit to container and allow row breaks; repeat header/footer on new pages */
              table { width: 100% !important; table-layout: fixed !important; page-break-inside: auto !important; break-inside: auto !important; min-width: 0 !important; }
              /* Override utility min-width classes used in components */
              #print-area [class*="min-w-"] { min-width: 0 !important; }
              /* Make overflow wrappers visible for print */
              #print-area .overflow-x-auto { overflow: visible !important; }
              th, td { white-space: normal !important; overflow-wrap: anywhere !important; word-break: break-word !important; padding: 4px !important; }
              thead { display: table-header-group !important; }
              tfoot { display: table-footer-group !important; }

              /* Column width hints for portrait to avoid overflow (applies when printLayout is portrait) */
              #print-area table th:nth-child(1), #print-area table td:nth-child(1) { width: 40% !important; }
              #print-area table th:nth-child(2), #print-area table td:nth-child(2) { width: 8% !important; }
              #print-area table th:nth-child(3), #print-area table td:nth-child(3) { width: 12% !important; }
              #print-area table th:nth-child(4), #print-area table td:nth-child(4) { width: 8% !important; }
              #print-area table th:nth-child(5), #print-area table td:nth-child(5) { width: 10% !important; }
              #print-area table th:nth-child(6), #print-area table td:nth-child(6) { width: 10% !important; }
              #print-area table th:nth-child(7), #print-area table td:nth-child(7) { width: 12% !important; }

                /* Specific override for the CidCodeRankingPanel table used in "Ranking de CIDs Específicos".
                  The page-level generic nth-child widths above may not match this table's column order,
                  so set explicit widths here so the 'Descrição Clínica' column gets the majority space.
                */
                #print-area .CidCodeRankingPanel table { table-layout: fixed !important; width: 100% !important; }
                /* Reduce vertical padding and font-size in the CidCodeRankingPanel for print so columns fit */
                #print-area .CidCodeRankingPanel table th, #print-area .CidCodeRankingPanel table td { padding: 3px 6px !important; font-size: 8.8px !important; }
                /* Keep numeric columns on a single line */
                #print-area .CidCodeRankingPanel table th:nth-child(n+4), #print-area .CidCodeRankingPanel table td:nth-child(n+4) { white-space: nowrap !important; overflow: visible !important; }
                /* Allow clinical description to break and wrap tightly */
                #print-area .CidCodeRankingPanel table th:nth-child(2), #print-area .CidCodeRankingPanel table td:nth-child(2) { white-space: normal !important; overflow-wrap: anywhere !important; word-break: break-word !important; line-height: 1.05 !important; }
                #print-area .CidCodeRankingPanel table th:nth-child(1), #print-area .CidCodeRankingPanel table td:nth-child(1) { width: 8% !important; }
                #print-area .CidCodeRankingPanel table th:nth-child(2), #print-area .CidCodeRankingPanel table td:nth-child(2) { width: 52% !important; }
                #print-area .CidCodeRankingPanel table th:nth-child(3), #print-area .CidCodeRankingPanel table td:nth-child(3) { width: 6% !important; }
                #print-area .CidCodeRankingPanel table th:nth-child(4), #print-area .CidCodeRankingPanel table td:nth-child(4) { width: 8% !important; }
                #print-area .CidCodeRankingPanel table th:nth-child(5), #print-area .CidCodeRankingPanel table td:nth-child(5) { width: 8% !important; }
                #print-area .CidCodeRankingPanel table th:nth-child(6), #print-area .CidCodeRankingPanel table td:nth-child(6) { width: 10% !important; }
                #print-area .CidCodeRankingPanel table th:nth-child(7), #print-area .CidCodeRankingPanel table td:nth-child(7) { width: 8% !important; }

              /* Prevent full-screen containers from creating empty space (but keep fixed pixel heights like h-[260px]) */
              #print-area [class*="h-screen"], #print-area [class*="min-h-screen"] { min-height: auto !important; height: auto !important; max-height: none !important; }

                /* (No forced fixed height for clinical trend panel — keep natural layout) */

              /* Compact spacing for print: reduce large paddings/margins */
              #print-area [class*="p-"], #print-area [class*="px-"], #print-area [class*="py-"], #print-area [class*="pt-"], #print-area [class*="pb-"], #print-area [class*="pl-"], #print-area [class*="pr-"] { padding: 4px !important; }
              #print-area [class*="m-"], #print-area [class*="mt-"], #print-area [class*="mb-"], #print-area [class*="mx-"], #print-area [class*="my-"] { margin: 4px !important; }
              #print-area [class*="space-y-"] > * + * { margin-top: 4px !important; }

              /* Reduce heading spacing */
              #print-area h1, #print-area h2, #print-area h3, #print-area h4 { margin: 2px 0 !important; padding: 0 !important; }

              /* Remove heavy shadows for cleaner print */
              #print-area .shadow-xl, #print-area .shadow-2xl, #print-area .shadow-lg, #print-area .shadow-md { box-shadow: none !important; }

              /* Images scaled to container */
              #print-area img { max-width: 100% !important; height: auto !important; }

              /* Try to keep small cards together (avoid splitting tiny blocks), but allow large sections to flow */
              #print-area .StatisticCard, #print-area .StatisticCardRow, #print-area .CidChapterRankingPanel, #print-area .CidCodeRankingPanel, #print-area .CidClinicalTrendPanel, #print-area .CidOccupationalRankingPanel, #print-area .CidNatureImpactPanel, #print-area .CidOccupationalCrossPanel, #print-area .CidRecurrenceSummaryPanel, #print-area .CidRecurrenceInvestigativeTable, #print-area .CidManagerialAlertsPanel, #print-area .CidPriorityRankingPanel { page-break-inside: avoid !important; break-inside: avoid !important; }

              /* StatisticCard compact rules */
              #print-area .StatisticCard { padding: 4px !important; gap: 8px !important; }
              #print-area .StatisticCard p, #print-area .StatisticCard h3, #print-area .StatisticCard span { font-weight: 400 !important; }
              #print-area .StatisticCard p { font-size: 9px !important; margin: 0 !important; }
              #print-area .StatisticCard h3 { font-size: 12px !important; }

              /* Force compact statistic cards: hide icons, stack content vertically and allocate narrow equal widths so 5 cards fit a single row */
              #print-area .StatisticCardRow { display: flex !important; flex-wrap: nowrap !important; gap: 2px !important; grid-template-columns: none !important; align-items: stretch !important; justify-content: space-between !important; }
              /* give each card ~18% width so five fit in one row with smaller gaps */
              #print-area .StatisticCardRow > * { min-width: 0 !important; flex: 0 0 17% !important; max-width: 17% !important; box-sizing: border-box !important; }
              /* vertical card layout to reduce horizontal footprint */
              #print-area .StatisticCard { display: flex !important; flex-direction: column !important; align-items: flex-start !important; justify-content: center !important; padding: 4px 6px !important; gap: 4px !important; border-left-width: 1px !important; }
              /* hide decorative icons to save space */
              #print-area .StatisticCard .shrink-0, #print-area .StatisticCard svg { display: none !important; }
              /* ensure content fits: single line with ellipsis */
              #print-area .StatisticCard h3, #print-area .StatisticCard p, #print-area .StatisticCard span { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; text-transform: none !important; letter-spacing: normal !important; }
              /* compact typography: make value heading smaller to fit */
              #print-area .StatisticCard h3 { font-size: 9px !important; margin: 0 !important; font-weight: 400 !important; }
              #print-area .StatisticCard p, #print-area .StatisticCard span { font-size: 8px !important; }
              /* hide subtitle and helperText inside StatisticCard for print */
              #print-area .StatisticCard h3 + span { display: none !important; }
              #print-area .StatisticCard p.mt-1 { display: none !important; }

              /* Priority ranking table compact */
              #print-area .CidPriorityRankingPanel table, #print-area .CidPriorityRankingPanel th, #print-area .CidPriorityRankingPanel td { font-size: 9px !important; font-weight: 400 !important; padding: 4px !important; }
              /* Make the small 'Faixa' badge more compact in portrait prints */
              #print-area .CidPriorityRankingPanel td:nth-child(3) .inline-flex,
              #print-area .CidPriorityRankingPanel th:nth-child(3) .inline-flex {
                font-size: 7.5px !important;
                padding: 2px 6px !important;
                line-height: 1 !important;
              }

              /* Reduce general table font slightly to help fit */
              #print-area table, #print-area th, #print-area td { font-size: 8.5px !important; }

              @page { size: ${printLayout}; margin: 1cm; }
            }
          `,
        }}
      />
    </div>
  );
}
export default function CidAnalyticsPageWrapper() {
  return (
    <Suspense>
      <CidAnalyticsPage />
    </Suspense>
  );
}
