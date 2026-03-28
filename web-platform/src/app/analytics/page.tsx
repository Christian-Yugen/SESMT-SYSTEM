"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LabelList,
} from "recharts";
import {
  Activity,
  FileSearch,
  Menu,
  Building2,
  History as HistoryIcon,
  BarChart3,
  ClipboardList,
  TrendingUp,
  Printer,
  Clock3,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import Sidebar from "@/components/layout/Sidebar";
import CompactFilterBar from "@/components/filters/CompactFilterBar";
import FilterChips from "@/components/filters/FilterChips";
import ActionIconButton from "@/components/filters/ActionIconButton";
import {
  countActiveFilters,
  type FilterState,
  matchesUnifiedNameCpfSearch,
  normalizeSearchTerm,
} from "@/components/filters/filtersUtils";

/** Quebra label em até 2 linhas para tick SVG (Recharts) */
function wrapLabel(text: string, maxCharsPerLine: number) {
  const words = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (test.length <= maxCharsPerLine) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;

      // Se uma palavra for grande demais, corta duro
      if (line.length > maxCharsPerLine) {
        lines.push(line.slice(0, Math.max(1, maxCharsPerLine - 1)) + "…");
        line = "";
      }
    }
  }
  if (line) lines.push(line);

  return lines.slice(0, 2); // máximo 2 linhas
}

/** Tick customizado para YAxis do ranking */
function SecretariaTick(props: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const { x = 0, y = 0, payload } = props;
  const lines = wrapLabel(payload?.value ?? "", 22); // ajuste fino: 20–26

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="#1A3351"
        fontSize={9}
        fontWeight={900}
      >
        {lines.map((line: string, i: number) => (
          <tspan key={i} x={0} dy={i === 0 ? 0 : 12}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

type HistoryEntry = {
  generated_at: string;
  servidor_nome: string;
  servidor_cpf?: string;
  generated_by?: string;
  operator_name?: string;
  secretaria?: string;
  aso_type?: string;
};

export default function AnalyticsPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");

  const INITIAL_FILTERS: FilterState = {
    searchTerm: "",
    startDate: "",
    endDate: "",
    filterUser: "all",
    filterSecretaria: "all",
    filterAsoType: "all",
  };
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Filtros avançados específicos da analytics
  const [filterShift, setFilterShift] = useState("all");
  const [selectedAsoSubtypes, setSelectedAsoSubtypes] = useState<string[]>([]);
  const [isAsoSubtypeFilterOpen, setIsAsoSubtypeFilterOpen] = useState(false);
  const [isShiftFilterOpen, setIsShiftFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

  const setSearchTerm = (value: string) =>
    setFilters((prev) => ({ ...prev, searchTerm: value }));
  const setStartDate = (value: string) =>
    setFilters((prev) => ({ ...prev, startDate: value }));
  const setEndDate = (value: string) =>
    setFilters((prev) => ({ ...prev, endDate: value }));
  const setFilterUser = (value: string) =>
    setFilters((prev) => ({ ...prev, filterUser: value }));
  const setFilterSecretaria = (value: string) =>
    setFilters((prev) => ({ ...prev, filterSecretaria: value }));
  const setFilterAsoType = (value: string) =>
    setFilters((prev) => ({ ...prev, filterAsoType: value }));

  const {
    searchTerm,
    startDate,
    endDate,
    filterUser,
    filterSecretaria,
    filterAsoType,
  } = filters;

  const clearAllFilters = () => {
    setFilters(INITIAL_FILTERS);
    setFilterShift("all");
    setSelectedAsoSubtypes([]);
    setIsDateFilterOpen(false);
    setIsAsoSubtypeFilterOpen(false);
    setIsShiftFilterOpen(false);
  };

  const [operatorsMap, setOperatorsMap] = useState<Record<string, string>>({});

  // Extrair operadores únicos presentes no histórico
  const uniqueOperators = useMemo(() => {
    const operatorsMapLocal: Record<string, string> = {};
    history.forEach((h) => {
      if (h.generated_by && h.operator_name) {
        operatorsMapLocal[h.generated_by] = h.operator_name;
      }
    });

    const ids = Array.from(
      new Set(
        history
          .map((h) => h.generated_by)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    return ids
      .map((id) => ({
        id,
        name: (operatorsMapLocal[id] || operatorsMap[id] || id).toUpperCase(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [history, operatorsMap]);
  const [showHourAnalysis, setShowHourAnalysis] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");

  const baseActiveFilterCount = countActiveFilters({
    searchTerm,
    startDate,
    endDate,
    filterUser,
    filterSecretaria,
    filterAsoType,
  });
  const headerActiveFilterCount =
    baseActiveFilterCount +
    (filterShift !== "all" ? 1 : 0) +
    (selectedAsoSubtypes.length > 0 ? 1 : 0);

  // Smart Header Logic
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [scrollUpStart, setScrollUpStart] = useState(0);

  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const isScrollingDown = scrollTop > lastScrollTop;

    if (isScrollingDown) {
      setScrollUpStart(scrollTop);
      if (scrollTop > 150 && showHeader) setShowHeader(false);
    } else {
      // Só mostra se subiu mais de 250px desde o ponto mais baixo ou chegou no topo
      if (scrollUpStart - scrollTop > 250 || scrollTop < 50) {
        if (!showHeader) setShowHeader(true);
      }
    }
    setLastScrollTop(scrollTop);
  };

  async function loadHistory() {
    setLoading(true);

    const { data, error } = await supabase
      .from("aso_history")
      .select("*")
      .order("generated_at", { ascending: true });

    if (!error && data) setHistory(data as HistoryEntry[]);

    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
    }, 180);
    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { session, error } = await safeGetSession();
        if (error) {
          await handleAuthError(error);
          return;
        }

        if (session) {
          const { data } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (data) setUserRole(data.role);

          const name =
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "Usuário";
          setUserName(name);
          loadHistory();

          const { data: profData } = await supabase
            .from("profiles")
            .select("id, full_name, role");
          if (profData) {
            const map: Record<string, string> = {};
            profData.forEach((p) => {
              map[p.id] = p.full_name || p.id;
            });
            setOperatorsMap(map);
          }
        } else {
          router.push("/login");
          return;
        }
      } catch (err) {
        await handleAuthError(err);
      }
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.push("/login");
    });

    return () => subscription.unsubscribe();
  }, [router, userRole]);

  // Redirecionamento para perfis sem acesso
  useEffect(() => {
    if (userRole === "social_assistant") {
      router.push("/abono");
    } else if (userRole === "operator" || userRole === "viewer") {
      router.push("/");
    }
  }, [userRole, router]);

  const uniqueSecretarias = useMemo(
    () =>
      Array.from(
        new Set(
          history
            .map((h) => h.secretaria)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [history],
  );

  const uniqueUsersList = useMemo(
    () => uniqueOperators.map((operator) => operator.id as string),
    [uniqueOperators],
  );

  const referralOperators = useMemo(
    () =>
      history
        .filter((entry): entry is HistoryEntry & { generated_by: string } =>
          Boolean(entry.generated_by),
        )
        .map((entry) => ({
          generated_by: entry.generated_by,
          operator_name: entry.operator_name,
        })),
    [history],
  );

  const filteredHistory = useMemo(() => {
    return history.filter((entry) => {
      const matchesSearch = matchesUnifiedNameCpfSearch(
        entry.servidor_nome || "",
        entry.servidor_cpf,
        debouncedSearchTerm,
      );

      const matchesUser =
        filterUser === "all" || entry.generated_by === filterUser;

      const matchesSecretaria =
        filterSecretaria === "all" || entry.secretaria === filterSecretaria;

      const entryType = entry.aso_type?.toLowerCase()?.includes("aso")
        ? "ASO"
        : entry.aso_type?.toLowerCase()?.includes("encaminhamento")
          ? "Encaminhamento"
          : "Outros";

      const matchesType =
        filterAsoType === "all" || entryType === filterAsoType;

      const entryDate = new Date(entry.generated_at)
        .toISOString()
        .split("T")[0];
      const matchesStartDate = !startDate || entryDate >= startDate;
      const matchesEndDate = !endDate || entryDate <= endDate;

      // Filtro de Turno (Manhã: 07:00-12:59, Tarde: 13:00-18h)
      let matchesShift = true;
      if (filterShift !== "all") {
        const hour = new Date(entry.generated_at).getHours();
        if (filterShift === "morning") {
          matchesShift = hour >= 7 && hour < 13;
        } else if (filterShift === "afternoon") {
          matchesShift = hour >= 13 && hour <= 18;
        }
      }

      // Filtro de Subtipo de ASO (procura na string aso_type)
      const asoTypeUpper = entry.aso_type?.toUpperCase() ?? "";
      const matchesAsoSubtype =
        selectedAsoSubtypes.length === 0 ||
        selectedAsoSubtypes.some((subtype) => asoTypeUpper.includes(subtype));

      return (
        matchesSearch &&
        matchesUser &&
        matchesType &&
        matchesSecretaria &&
        matchesStartDate &&
        matchesEndDate &&
        matchesShift &&
        matchesAsoSubtype
      );
    });
  }, [
    history,
    debouncedSearchTerm,
    filterUser,
    filterAsoType,
    filterSecretaria,
    startDate,
    endDate,
    filterShift,
    selectedAsoSubtypes,
  ]);

  // Processamento de dados para Gráficos
  const chartData = useMemo(() => {
    if (!filteredHistory.length)
      return { byDate: [], byType: [], bySecretaria: [] };

    // Volume por data (últimos 15 pontos)
    const dateMap: Record<string, number> = {};
    filteredHistory.forEach((h) => {
      const date = new Date(h.generated_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      dateMap[date] = (dateMap[date] || 0) + 1;
    });
    const byDate = Object.keys(dateMap)
      .map((key) => ({ name: key, total: dateMap[key] }))
      .slice(-15);

    // Tipo
    const typeMap = { ASO: 0, Encaminhamento: 0 };
    filteredHistory.forEach((h) => {
      if (h.aso_type?.toLowerCase?.().includes("aso")) typeMap.ASO++;
      else typeMap.Encaminhamento++;
    });
    const byType = [
      { name: "ASOs", value: typeMap.ASO, color: "#1A3351" },
      {
        name: "Encaminhamentos",
        value: typeMap.Encaminhamento,
        color: "#E31E24",
      },
    ];

    // Ranking secretarias (Top 10)
    const secMap: Record<string, number> = {};
    filteredHistory.forEach((h) => {
      const sec = h.secretaria || "NÃO INFORMADA";
      secMap[sec] = (secMap[sec] || 0) + 1;
    });
    const bySecretaria = Object.keys(secMap)
      .map((key) => ({ name: key, total: secMap[key] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Fluxo por Intervalo (30 min - 07h às 18h) - Respeitando o dia selecionado
    const hourMap: Record<string, number> = {};
    for (let i = 7; i <= 18; i++) {
      const hStr = i.toString().padStart(2, "0");
      hourMap[`${hStr}:00`] = 0;
      // Só adiciona 30 min se não for 18h
      if (i < 18) {
        hourMap[`${hStr}:30`] = 0;
      }
    }

    // Fluxo por Dia da Semana (1-5: Seg-Sex)
    const dayMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    filteredHistory.forEach((h) => {
      const hDate = new Date(h.generated_at);
      const day = hDate.getDay();
      const hour = hDate.getHours();
      const minutes = hDate.getMinutes();

      if (day >= 1 && day <= 5) {
        dayMap[day] = (dayMap[day] || 0) + 1;
      }

      // Considerar das 07:00:00 até 18:00:59
      if (hour >= 7 && hour <= 18) {
        let slot = "";
        if (hour === 18) {
          slot = "18:00"; // Agrupa qualquer registro das 18h no ponto final
        } else {
          slot = `${hour.toString().padStart(2, "0")}:${minutes < 30 ? "00" : "30"}`;
        }

        if (selectedDay === "all" || day === selectedDay) {
          if (hourMap.hasOwnProperty(slot)) {
            hourMap[slot] = (hourMap[slot] || 0) + 1;
          }
        }
      }
    });

    const byHour = Object.keys(hourMap)
      .sort()
      .map((slot) => ({
        hour: slot,
        total: hourMap[slot],
      }));

    const weekDays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    const byDayOfWeek = Object.keys(dayMap).map((d) => ({
      dayNum: parseInt(d),
      name: weekDays[parseInt(d)],
      total: dayMap[parseInt(d)],
    }));

    // Cálculos de Pico para evitar erros no render
    const peakHourObj = byHour.reduce(
      (prev, curr) => (curr.total > prev.total ? curr : prev),
      { hour: "--", total: 0 },
    );

    // Define o peakDay: se for 'all', busca o real pico. Se houver seleção, mostra o selecionado.
    let peakDay = "--";
    let peakDayTotal = 0;

    if (selectedDay === "all") {
      const peakDayObj = byDayOfWeek.reduce(
        (prev, curr) => (curr.total > prev.total ? curr : prev),
        { name: "--", total: 0 },
      );
      peakDay = peakDayObj.name;
      peakDayTotal = peakDayObj.total;
    } else {
      peakDay = weekDays[selectedDay as number] || "--";
      peakDayTotal = dayMap[selectedDay as number] || 0;
    }

    // Totais por Turno (Manhã: 07-12h, Tarde: 13-18h)
    const morningTotal = filteredHistory.filter((h) => {
      const hHour = new Date(h.generated_at).getHours();
      return hHour >= 7 && hHour < 13;
    }).length;

    const afternoonTotal = filteredHistory.filter((h) => {
      const hHour = new Date(h.generated_at).getHours();
      return hHour >= 13 && hHour <= 18;
    }).length;

    return {
      byDate,
      byType,
      bySecretaria,
      byHour,
      byDayOfWeek,
      peakHour:
        peakHourObj.total > 0
          ? `${peakHourObj.hour} (${peakHourObj.total})`
          : "--",
      peakDay: peakDayTotal > 0 ? `${peakDay} (${peakDayTotal})` : peakDay,
      peakValue: peakHourObj.total,
      morningTotal,
      afternoonTotal,
    };
  }, [filteredHistory, selectedDay]);

  const COLORS = [
    "#1A3351",
    "#E31E24",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
  ];

  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const today = new Date().toLocaleDateString("pt-BR");
    const logoUrl = window.location.origin + "/images/logo.png";

    const formatFilterDate = (dateStr: string) => {
      if (!dateStr) return null;
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    };

    const displayStartDate = formatFilterDate(startDate) || "INÍCIO";
    const displayEndDate = formatFilterDate(endDate) || "HOJE";

    // Dados para as tabelas
    const secRows = chartData.bySecretaria
      .map(
        (item) => `
            <tr>
                <td>${item.name}</td>
                <td style="text-align: center; font-weight: bold;">${item.total}</td>
                <td style="text-align: center;">${((item.total / (filteredHistory.length || 1)) * 100).toFixed(1)}%</td>
            </tr>
        `,
      )
      .join("");

    const typeRows = chartData.byType
      .map(
        (item) => `
            <tr>
                <td>${item.name}</td>
                <td style="text-align: center; font-weight: bold;">${item.value}</td>
                <td style="text-align: center;">${((item.value / (filteredHistory.length || 1)) * 100).toFixed(1)}%</td>
            </tr>
        `,
      )
      .join("");

    printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório Analítico SESMT - ${today}</title>
                    <style>
                        body { font-family: sans-serif; padding: 15px; color: #333; line-height: 1.1; }
                        .official-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E31E24; padding-bottom: 10px; margin-bottom: 15px; }
                        .logo-area img { height: 40px; width: auto; }
                        .report-title-area { text-align: right; }
                        .report-title-area h1 { margin: 0; font-size: 14px; color: #1A3351; text-transform: uppercase; font-weight: 900; }
                        .report-info { font-size: 8px; color: #666; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
                        
                        .section-title { font-size: 10px; font-weight: 900; color: #1A3351; text-transform: uppercase; margin: 15px 0 8px 0; border-left: 3px solid #E31E24; padding-left: 8px; background: #f9f9f9; padding-top: 4px; padding-bottom: 4px; }
                        
                        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
                        th { background-color: #1A3351; color: white; border: 1px solid #ccc; padding: 6px 4px; text-align: left; font-size: 8px; text-transform: uppercase; }
                        td { border: 1px solid #eee; padding: 5px 4px; text-transform: uppercase; font-size: 8px; word-wrap: break-word; color: #444; }
                        
                        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
                        .stat-card { border: 1px solid #eee; padding: 10px; text-align: center; background: #fff; }
                        .stat-label { font-size: 7px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; }
                        .stat-value { font-size: 16px; font-weight: 900; color: #1A3351; }

                        .footer { margin-top: 30px; font-size: 7.5px; text-align: center; color: #777; border-top: 1px solid #eee; padding-top: 10px; font-weight: normal; }
                        .lgpd-box { background: #fcfcfc; border: 1px solid #e0e0e0; padding: 10px; margin-top: 20px; border-radius: 0px; }
                        .lgpd-title { font-size: 8px; font-weight: 900; color: #1A3351; text-transform: uppercase; margin-bottom: 4px; display: block; }
                        .lgpd-text { font-size: 8px; color: #333; text-align: justify; margin: 0; line-height: 1.4; font-weight: 500; }
                    </style>
                </head>
                <body>
                    <div class="official-header">
                        <div class="logo-area"><img src="${logoUrl}" alt="Logo" /></div>
                        <div class="report-title-area">
                            <h1>Relatório Analítico de Produtividade (BI)</h1>
                            <div class="report-info">Operador: ${userName} | Data: ${today}</div>
                            <div class="report-info" style="color: #E31E24;">FILTRO: ${displayStartDate} À ${displayEndDate}</div>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Total GERAL</div>
                            <div class="stat-value">${filteredHistory.length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Secretarias Atendidas</div>
                            <div class="stat-value">${new Set(filteredHistory.map((h) => h.secretaria)).size}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Média Diária (Período)</div>
                            <div class="stat-value">${(filteredHistory.length / Math.max(1, chartData.byDate.length)).toFixed(1)}</div>
                        </div>
                    </div>

                    <div class="section-title">Distribuição por Tipo de Documento</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 50%;">Tipo de Emissão</th>
                                <th style="width: 25%; text-align: center;">Quantidade</th>
                                <th style="width: 25%; text-align: center;">Percentual</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${typeRows}
                        </tbody>
                    </table>

                    <div class="section-title">Ranking de Produtividade por Secretaria (Top 10)</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 50%;">Secretaria / Órgão</th>
                                <th style="width: 25%; text-align: center;">Total de Emissões</th>
                                <th style="width: 25%; text-align: center;">Participação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${secRows}
                        </tbody>
                    </table>

                    <div class="lgpd-box">
                        <span class="lgpd-title">🛡️ IMPORTANTE: Privacidade e Proteção de Dados (LGPD)</span>
                        <p class="lgpd-text">
                            Este relatório gerencial contém dados agregados de produtividade para fins de Business Intelligence. 
                            O uso destas informações é restrito à gestão estratégica do SESMT. Proibida a divulgação pública ou 
                            compartilhamento com terceiros sem autorização prévia.
                        </p>
                    </div>

                    <div class="footer">Gerado via SESMT SYSTEM - Powered by UXBRAS®</div>
                </body>
            </html>
        `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#1A3351] flex flex-col items-center justify-center gap-4">
        <TrendingUp className="w-12 h-12 text-white animate-pulse" />
        <p className="text-white uppercase tracking-[0.3em] font-bold text-xs">
          Carregando Business Intelligence...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A111C] text-white font-sans overflow-x-hidden">
      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* SIDEBAR */}
      <Sidebar
        userRole={userRole}
        userName={userName}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* MAIN */}
      <main className="flex-1 flex flex-col bg-[#D3D3D3] text-black min-h-screen lg:h-screen lg:overflow-visible relative">
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* HEADER */}
          {/* HEADER - Smart Dynamic Header com Colapso de Espaço */}
          <div
            className={`grid transition-all duration-500 ease-in-out ${showHeader ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}
          >
            <div className="overflow-visible">
              <section
                className={`bg-[#B0B0B0] px-4 lg:px-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg transition-all duration-500 ease-in-out transform ${showHeader ? "translate-y-0" : "-translate-y-1/2"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 shrink-0">
                    <BarChart3 className="w-5 lg:w-6 h-5 lg:h-6 text-[#1A3351]" />
                    <div>
                      <h1 className="text-base lg:text-lg font-bold uppercase tracking-tighter leading-none text-[#1A3351]">
                        SESMT <span className="text-blue-700">Analytics</span>
                      </h1>
                      <p className="text-[8px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                        Business Intelligence
                      </p>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-[#1A3351]/20 shrink-0 hidden sm:block" />

                  <div className="flex-1 min-w-0">
                    <CompactFilterBar
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      startDate={startDate}
                      setStartDate={setStartDate}
                      endDate={endDate}
                      setEndDate={setEndDate}
                      isDateFilterOpen={isDateFilterOpen}
                      setIsDateFilterOpen={setIsDateFilterOpen}
                      filterUser={filterUser}
                      setFilterUser={setFilterUser}
                      filterSecretaria={filterSecretaria}
                      setFilterSecretaria={setFilterSecretaria}
                      filterAsoType={filterAsoType}
                      setFilterAsoType={setFilterAsoType}
                      uniqueUsersList={uniqueUsersList}
                      uniqueSecretarias={uniqueSecretarias}
                      referrals={referralOperators}
                      operatorsMap={operatorsMap}
                      clearAllFilters={clearAllFilters}
                      searchPlaceholder="BUSCAR POR NOME OU CPF..."
                      userLabelDefault="OPERADORES"
                      secretariaLabelDefault="SECRETARIAS"
                      asoTypeLabelDefault="DOCUMENTO"
                      asoTypeOptions={[
                        "all",
                        "ASO",
                        "Encaminhamento",
                        "Outros",
                      ]}
                      activeFilterCount={headerActiveFilterCount}
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <ActionIconButton
                      icon={<Clock3 className="w-4 h-4" />}
                      label="Filtro contextual de turno"
                      variant="contextual"
                      active={filterShift !== "all"}
                      open={isShiftFilterOpen}
                      onToggle={setIsShiftFilterOpen}
                      showMenuIndicator
                    >
                      <div className="w-64 bg-white border-2 border-[#7C2D12] shadow-2xl rounded-none overflow-hidden">
                        <div className="p-3 space-y-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#7C2D12]">
                            Turno de Geração
                          </p>
                          <select
                            value={filterShift}
                            onChange={(e) => {
                              setFilterShift(e.target.value);
                              setIsShiftFilterOpen(false);
                            }}
                            className="w-full px-3 py-2 bg-[#FFF7E6] border border-[#F59E0B] text-[10px] font-bold uppercase outline-none focus:border-[#7C2D12]"
                          >
                            <option value="all">TODOS OS TURNOS</option>
                            <option value="morning">MANHÃ (07h - 13h)</option>
                            <option value="afternoon">TARDE (13h - 18h)</option>
                          </select>
                        </div>
                      </div>
                    </ActionIconButton>

                    {filterAsoType === "ASO" && (
                      <ActionIconButton
                        icon={<ClipboardList className="w-4 h-4" />}
                        label="Filtro contextual de subtipos ASO"
                        variant="contextual"
                        active={selectedAsoSubtypes.length > 0}
                        open={isAsoSubtypeFilterOpen}
                        onToggle={setIsAsoSubtypeFilterOpen}
                        showMenuIndicator
                      >
                        <div className="w-72 bg-white border-2 border-[#7C2D12] shadow-2xl rounded-none overflow-hidden text-black">
                          <div className="p-3 space-y-2">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-1">
                              <span className="text-[9px] font-bold text-[#7C2D12] uppercase tracking-wider">
                                Subtipos ASO
                              </span>
                              {selectedAsoSubtypes.length > 0 && (
                                <button
                                  onClick={() => setSelectedAsoSubtypes([])}
                                  className="text-[8px] font-bold text-[#E31E24] hover:underline uppercase"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>

                            {[
                              { id: "ADMISS", label: "ADMISSIONAL" },
                              { id: "DEMISS", label: "DEMISSIONAL" },
                              { id: "RETORNO", label: "RETORNO AO TRABALHO" },
                              { id: "MUDANÇA", label: "MUDANÇA DE FUNÇÃO" },
                              { id: "PERIÓDIC", label: "PERIÓDICO" },
                            ].map((type) => (
                              <label
                                key={type.id}
                                className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer transition-colors group"
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-[#1A3351] cursor-pointer"
                                  checked={selectedAsoSubtypes.includes(
                                    type.id,
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAsoSubtypes([
                                        ...selectedAsoSubtypes,
                                        type.id,
                                      ]);
                                    } else {
                                      setSelectedAsoSubtypes(
                                        selectedAsoSubtypes.filter(
                                          (s) => s !== type.id,
                                        ),
                                      );
                                    }
                                  }}
                                />
                                <span
                                  className={`text-[10px] font-bold uppercase transition-colors ${selectedAsoSubtypes.includes(type.id) ? "text-[#1A3351]" : "text-slate-500 group-hover:text-slate-700"}`}
                                >
                                  {type.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </ActionIconButton>
                    )}

                    <ActionIconButton
                      className="hidden md:block"
                      icon={<HistoryIcon className="w-4 h-4" />}
                      label="Abrir histórico"
                      variant="primary"
                      onClick={() => router.push("/history")}
                    />
                    <ActionIconButton
                      className="hidden md:block"
                      icon={<Printer className="w-4 h-4" />}
                      label="Gerar relatório"
                      variant="primary"
                      onClick={handlePrintReport}
                    />
                    <ActionIconButton
                      className="hidden md:block"
                      icon={<TrendingUp className="w-4 h-4" />}
                      label={
                        showHourAnalysis
                          ? "Ocultar análise de pico"
                          : "Exibir análise de pico"
                      }
                      variant="primary"
                      active={showHourAnalysis}
                      onClick={() => setShowHourAnalysis(!showHourAnalysis)}
                    />
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="lg:hidden h-9 w-9 bg-[#1A3351] rounded-none text-white active:scale-95 transition-all shadow-md flex items-center justify-center"
                    >
                      <Menu className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <FilterChips
                    searchTerm={normalizeSearchTerm(searchTerm)}
                    startDate={startDate}
                    endDate={endDate}
                    filterUser={filterUser}
                    filterSecretaria={filterSecretaria}
                    filterAsoType={filterAsoType}
                    referrals={referralOperators}
                    operatorsMap={operatorsMap}
                    extraChips={[
                      ...(filterShift !== "all"
                        ? [
                            {
                              key: "shift",
                              label:
                                filterShift === "morning"
                                  ? "Turno: Manhã"
                                  : "Turno: Tarde",
                            },
                          ]
                        : []),
                      ...(selectedAsoSubtypes.length > 0
                        ? [
                            {
                              key: "aso-sub",
                              label: `Subtipos ASO: ${selectedAsoSubtypes.length}`,
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </section>
            </div>
          </div>

          {/* CONTENT */}
          <div
            onScroll={handleMainScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {/* BIG NUMBERS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
              <div className="bg-white p-3 lg:p-4 border-l-4 border-blue-600 shadow-md flex items-center justify-between rounded-none-none lg:rounded-none-none">
                <div>
                  <p className="text-[8px] lg:text-[10px] font-bold text-black/40 uppercase tracking-widest leading-tight">
                    Documentos
                  </p>
                  <h3 className="text-xl lg:text-2xl font-bold text-[#1A3351] leading-none mt-1">
                    {filteredHistory.length}
                  </h3>
                </div>
                <ClipboardList className="w-4 h-4 text-blue-100 hidden sm:block" />
              </div>

              <div className="bg-white p-3 lg:p-4 border-l-4 border-[#1A3351] shadow-md flex items-center justify-between rounded-none-none lg:rounded-none-none">
                <div>
                  <p className="text-[8px] lg:text-[10px] font-bold text-black/40 uppercase tracking-widest leading-tight">
                    ASOs
                  </p>
                  <h3 className="text-xl lg:text-2xl font-bold text-[#1A3351] leading-none mt-1">
                    {
                      filteredHistory.filter((h) =>
                        h.aso_type?.toLowerCase?.().includes("aso"),
                      ).length
                    }
                  </h3>
                </div>
                <HistoryIcon className="w-4 h-4 text-slate-200 hidden sm:block" />
              </div>

              <div className="bg-white p-3 lg:p-4 border-l-4 border-[#E31E24] shadow-md flex items-center justify-between rounded-none-none lg:rounded-none-none">
                <div>
                  <p className="text-[8px] lg:text-[10px] font-bold text-black/40 uppercase tracking-widest leading-tight">
                    Encaminhamentos
                  </p>
                  <h3 className="text-xl lg:text-2xl font-bold text-[#E31E24] leading-none mt-1">
                    {
                      filteredHistory.filter((h) =>
                        h.aso_type?.toLowerCase?.().includes("encaminhamento"),
                      ).length
                    }
                  </h3>
                </div>
                <FileSearch className="w-4 h-4 text-red-100 hidden sm:block" />
              </div>

              <div className="bg-white p-3 lg:p-4 border-l-4 border-emerald-500 shadow-md flex items-center justify-between rounded-none-none lg:rounded-none-none">
                <div>
                  <p className="text-[8px] lg:text-[10px] font-bold text-black/40 uppercase tracking-widest leading-tight">
                    Secretarias
                  </p>
                  <h3 className="text-xl lg:text-2xl font-bold text-emerald-600 leading-none mt-1">
                    {new Set(filteredHistory.map((h) => h.secretaria)).size}
                  </h3>
                </div>
                <Building2 className="w-4 h-4 text-emerald-100 hidden sm:block" />
              </div>

              <div className="bg-white p-3 lg:p-4 border-l-4 border-orange-500 shadow-md flex items-center justify-between rounded-none-none lg:rounded-none-none">
                <div>
                  <p className="text-[8px] lg:text-[10px] font-bold text-black/40 uppercase tracking-widest leading-tight">
                    Período Manhã
                  </p>
                  <h3 className="text-xl lg:text-2xl font-bold text-orange-600 leading-none mt-1">
                    {chartData.morningTotal}
                  </h3>
                </div>
                <Activity className="w-4 h-4 text-orange-100 hidden sm:block" />
              </div>

              <div className="bg-white p-3 lg:p-4 border-l-4 border-purple-500 shadow-md flex items-center justify-between rounded-none-none lg:rounded-none-none">
                <div>
                  <p className="text-[8px] lg:text-[10px] font-bold text-black/40 uppercase tracking-widest leading-tight">
                    Período Tarde
                  </p>
                  <h3 className="text-xl lg:text-2xl font-bold text-purple-600 leading-none mt-1">
                    {chartData.afternoonTotal}
                  </h3>
                </div>
                <Activity className="w-4 h-4 text-purple-100 hidden sm:block" />
              </div>
            </div>

            {/* EXPANDABLE INSIGHTS: FLUXO HORÁRIO */}
            {showHourAnalysis && (
              <div className="bg-[#1A3351] p-4 lg:p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 rounded-none-none lg:rounded-none-none border-b-4 border-blue-500/30">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-white font-bold text-sm lg:text-base uppercase tracking-tight flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      Fluxo Operacional (30 min)
                    </h3>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                      Análise detalhada de picos a cada 30 minutos (07:00 -
                      18:00)
                    </p>
                  </div>
                  <div className="flex flex-col lg:flex-row gap-3 items-end">
                    <div className="bg-white/5 p-3 border border-white/10 rounded-none-none min-w-[140px]">
                      <p className="text-white/40 text-[8px] font-bold uppercase tracking-widest mb-1 text-center lg:text-right">
                        {selectedDay === "all"
                          ? "Dia de Maior Fluxo"
                          : "Dia em Análise"}
                      </p>
                      <p className="text-emerald-400 text-lg font-bold text-center lg:text-right leading-none">
                        {chartData?.peakDay || "--"}
                      </p>
                    </div>
                    <div className="bg-white/5 p-3 border border-white/10 rounded-none-none min-w-[140px]">
                      <p className="text-white/40 text-[8px] font-bold uppercase tracking-widest mb-1 text-center lg:text-right">
                        Horário de Pico
                      </p>
                      <p className="text-blue-400 text-lg font-bold text-center lg:text-right leading-none">
                        {chartData?.peakHour || "--"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SELETOR DE DIA DA SEMANA */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-white/5 pb-4">
                  <button
                    onClick={() => setSelectedDay("all")}
                    className={`px-4 py-2 text-[9px] font-bold uppercase rounded-none transition-all ${selectedDay === "all" ? "bg-blue-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
                  >
                    Visão Geral
                  </button>
                  {chartData?.byDayOfWeek?.map((day) => (
                    <button
                      key={day.dayNum}
                      onClick={() => setSelectedDay(day.dayNum)}
                      className={`px-4 py-2 text-[9px] font-bold uppercase rounded-none transition-all ${selectedDay === day.dayNum ? "bg-blue-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
                    >
                      {day.name}
                    </button>
                  ))}
                </div>

                <div className="h-[250px] lg:h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData.byHour}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorHour"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#E31E24"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#E31E24"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="hour"
                        stroke="rgba(255,255,255,0.3)"
                        fontSize={9}
                        fontWeight={900}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "rgba(255,255,255,0.5)" }}
                        dy={10}
                        minTickGap={5}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1A3351",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          fontSize: "10px",
                          fontWeight: "900",
                          color: "#fff",
                          textTransform: "uppercase",
                        }}
                        itemStyle={{ color: "#3b82f6" }}
                        cursor={{
                          stroke: "rgba(255,255,255,0.1)",
                          strokeWidth: 2,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorHour)"
                        animationDuration={1500}
                      >
                        <LabelList
                          dataKey="total"
                          position="top"
                          style={{
                            fontSize: "9px",
                            fontWeight: 900,
                            fill: "#3b82f6",
                          }}
                        />
                      </Area>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* GRID DE GRÁFICOS (Ranking maior / Tipo menor) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* VOLUME */}
              <div className="bg-white p-4 shadow-md border border-black/5 rounded-none lg:col-span-4">
                <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-4 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" /> Volume por Período
                </h4>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.byDate}>
                      <defs>
                        <linearGradient
                          id="colorTotal"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#eee"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 8, fontWeight: 700, fill: "#888" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 8, fontWeight: 700, fill: "#888" }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "10px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TIPO (menor) */}
              <div className="bg-white p-4 shadow-md border border-black/5 rounded-none lg:col-span-3">
                <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-4 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Tipo de Documento
                </h4>

                <div className="h-[220px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.byType}
                        cx="50%"
                        cy="45%"
                        innerRadius={44}
                        outerRadius={72}
                        paddingAngle={6}
                        dataKey="value"
                      >
                        {chartData.byType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        {/* ✅ Mostra a numeração (quantidade) em cada fatia */}
                        <LabelList
                          dataKey="value"
                          position="outside"
                          style={{
                            fontSize: "10px",
                            fontWeight: 900,
                            fill: "#1A3351",
                          }}
                        />
                      </Pie>
                      {/* ✅ Tooltip mais claro */}
                      <Tooltip
                        formatter={(value: string | number | undefined) => [
                          `${value ?? 0}`,
                          "Quantidade",
                        ]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        iconSize={8}
                        wrapperStyle={{
                          fontSize: "8px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute top-[40%] left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-xl font-bold text-[#1A3351]">
                      {filteredHistory.length}
                    </span>
                    <span className="text-[7px] font-bold text-black/30 uppercase leading-none text-center">
                      Registros
                    </span>
                  </div>
                </div>
              </div>

              {/* RANKING (maior e corrigido) */}
              <div className="bg-white p-4 shadow-md border border-black/5 rounded-none lg:col-span-5">
                <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-4 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" /> Ranking Secretarias
                </h4>

                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.bySecretaria}
                      layout="vertical"
                      margin={{ top: 8, right: 36, left: 6, bottom: 8 }}
                      barCategoryGap={10}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal
                        vertical={false}
                        stroke="#eee"
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        width={140}
                        interval={0}
                        tick={<SecretariaTick />}
                      />
                      <Tooltip cursor={{ fill: "#f0f0f0" }} />
                      <Bar dataKey="total" radius={[0, 0, 0, 0]} barSize={16}>
                        {chartData.bySecretaria.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                        <LabelList
                          dataKey="total"
                          position="right"
                          style={{
                            fontSize: "10px",
                            fontWeight: 900,
                            fill: "#1A3351",
                          }}
                          offset={10}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <footer className="text-center py-6">
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-black/20">
                Powered by UXBRAS® — Executive Intelligence System
              </p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
