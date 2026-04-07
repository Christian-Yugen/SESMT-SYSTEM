"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
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
  LayoutDashboard,
  LogOut,
  Activity,
  X,
  Menu,
  Building2,
  History as HistoryIcon,
  Users as UsersIcon,
  BarChart3,
  Calendar,
  Filter,
  ClipboardList,
  Printer,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import Sidebar from "@/components/layout/Sidebar";
import CompactFilterBar from "@/components/filters/CompactFilterBar";
import FilterChips from "@/components/filters/FilterChips";
import ActionIconButton from "@/components/filters/ActionIconButton";
import { 
  generateAbsenteeismDashboardReportPDF 
} from "@/lib/afastamento-report-pdf";
import {
  countActiveFilters,
  matchesUnifiedNameCpfSearch,
  normalizeSearchTerm,
} from "@/components/filters/filtersUtils";
import StatisticCard from "@/components/statistics/StatisticCard";
import StatisticCardRow from "@/components/statistics/StatisticCardRow";
import type { AfastamentoRecord } from "@/types";
import type { RechartsTickProps } from "@/components/filters/types";

/** Quebra label em até 2 linhas para tick SVG (Recharts) e limpa prefixos */
function wrapLabel(text: string, maxCharsPerLine: number) {
  const cleanText = text
    .replace(/SECRETARIA MUNICIPAL DE\s+/gi, "")
    .replace(/SECRETARIA MUNICIPAL DA\s+/gi, "")
    .replace(/SECRETARIA MUNICIPAL\s+/gi, "")
    .trim();

  const words = cleanText.split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (test.length <= maxCharsPerLine) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/** Tick customizado para YAxis do ranking */
function SecretariaTick({ x = 0, y = 0, payload }: RechartsTickProps) {
  const lines = wrapLabel(payload?.value ?? "", 20);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="#1A3351"
        fontSize={8}
        fontWeight={900}
      >
        {lines.map((line: string, i: number) => (
          <tspan key={i} x={0} dy={i === 0 ? 0 : 10}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export default function AfastamentosAnalyticsPage() {
  const [records, setRecords] = useState<AfastamentoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");

  // Filtros
  const [filterSecretaria, setFilterSecretaria] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterNatureza, setFilterNatureza] = useState("all");
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isNaturezaFilterOpen, setIsNaturezaFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 180);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
        loadData();
      } catch (err) {
        await handleAuthError(err);
      }
    };
    checkAuth();
  }, [router]);

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("afastamentos")
      .select("*")
      .order("data_inicio", { ascending: true });
    if (!error && data) setRecords(data);
    setLoading(false);
  }

  const uniqueSecretarias = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.servidor_secretaria).filter(Boolean)),
      ).sort() as string[],
    [records],
  );

  const uniqueTipos = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.tipo_afastamento).filter(Boolean)),
      ).sort() as string[],
    [records],
  );

  const uniqueNaturezas = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.natureza_cargo).filter(Boolean)),
      ).sort() as string[],
    [records],
  );

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterSecretaria("all");
    setFilterTipo("all");
    setFilterNatureza("all");
    setStartDate("");
    setEndDate("");
    setIsDateFilterOpen(false);
    setIsNaturezaFilterOpen(false);
  };

  const headerActiveFilterCount =
    countActiveFilters({
      searchTerm,
      startDate,
      endDate,
      filterSecretaria,
      filterAsoType: filterTipo,
    }) + (filterNatureza !== "all" ? 1 : 0);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch = matchesUnifiedNameCpfSearch(
        r.servidor_nome || "",
        r.servidor_cpf || "",
        debouncedSearchTerm,
      );
      const matchesSecretaria =
        filterSecretaria === "all" ||
        r.servidor_secretaria === filterSecretaria;
      const matchesNatureza =
        filterNatureza === "all" || r.natureza_cargo === filterNatureza;
      const matchesTipo =
        filterTipo === "all" || r.tipo_afastamento === filterTipo;

      const entryDate = r.data_inicio;
      const matchesStartDate = !startDate || entryDate >= startDate;
      const matchesEndDate = !endDate || entryDate <= endDate;

      return (
        matchesSearch &&
        matchesSecretaria &&
        matchesNatureza &&
        matchesTipo &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [
    records,
    debouncedSearchTerm,
    filterSecretaria,
    filterNatureza,
    filterTipo,
    startDate,
    endDate,
  ]);

  const getStatus = (record: AfastamentoRecord) => {
    if (record.situacao === "FINALIZADO" || record.situacao === "PRORROGADO")
      return "finished";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (record.data_fim) {
      const end = new Date(record.data_fim + "T00:00:00");
      end.setHours(0, 0, 0, 0);
      if (end < today) return "expired";
    }
    return "active";
  };

  // Processamento para Gráficos
  const chartData = useMemo(() => {
    if (!filteredRecords.length)
      return {
        byMonth: [],
        byStatus: [],
        bySecretaria: [],
        byType: [],
        byImpact: [],
      };

    // Volume por Mês
    const monthMap: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      if (!r.data_inicio) return;
      const [y, m] = r.data_inicio.split("-");
      const label = `${m}/${y.substring(2)}`;
      monthMap[label] = (monthMap[label] || 0) + 1;
    });
    const byMonth = Object.keys(monthMap)
      .map((k) => ({ name: k, total: monthMap[k] }))
      .slice(-12);

    // Status
    let ativos = 0;
    let vencidos = 0;
    let finalizados = 0;
    filteredRecords.forEach((r) => {
      const status = getStatus(r);
      if (status === "active") ativos++;
      else if (status === "expired") vencidos++;
      else finalizados++;
    });
    const byStatus = [
      { name: "Ativos", value: ativos, color: "#10b981" },
      { name: "Vencidos", value: vencidos, color: "#ef4444" },
      { name: "Finalizados", value: finalizados, color: "#2563eb" },
    ].filter((s) => s.value > 0);

    // Tipos de Afastamento
    const typeMap: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const t = r.tipo_afastamento || "OUTROS";
      typeMap[t] = (typeMap[t] || 0) + 1;
    });
    const byType = Object.keys(typeMap)
      .map((k) => ({ name: k, value: typeMap[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Ranking Secretarias (Casos)
    const secMap: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const s = r.servidor_secretaria || "NÃO INFORMADA";
      secMap[s] = (secMap[s] || 0) + 1;
    });
    const bySecretaria = Object.keys(secMap)
      .map((k) => ({ name: k, total: secMap[k] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // Impacto em Dias por Secretaria
    const impactMap: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const s = r.servidor_secretaria || "NÃO INFORMADA";
      const days = r.dias_afastado ?? 0;
      impactMap[s] = (impactMap[s] || 0) + days;
    });
    const byImpact = Object.keys(impactMap)
      .map((k) => ({ name: k, total: impactMap[k] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    return { byMonth, byStatus, bySecretaria, byType, byImpact };
  }, [filteredRecords]);

  const handlePrintReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#1A3351] flex flex-col items-center justify-center gap-4">
        <TrendingUp className="w-12 h-12 text-white animate-pulse" />
        <p className="text-white uppercase tracking-[0.3em] font-bold text-xs">
          Analisando Dados de Afastamento...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A111C] text-white font-sans overflow-x-hidden">
      {/* SIDEBAR */}
      <Sidebar
        userRole={userRole}
        userName={userName}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* MAIN */}
      <main className="flex-1 flex flex-col bg-[#D3D3D3] text-black min-h-screen lg:h-screen lg:overflow-visible relative">
        {/* HEADER */}
        <section className="bg-[#B0B0B0] px-2.5 sm:px-4 lg:px-6 py-3 border-b-[6px] border-[#10b981] shrink-0 shadow-lg">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:flex-nowrap md:gap-3">
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#1A3351]" />
                <div>
                  <h1 className="text-[15px] sm:text-lg md:text-xl font-bold uppercase tracking-tighter leading-none text-[#1A3351]">
                    Afastamentos{" "}
                    <span className="text-emerald-600">Analytics</span>
                  </h1>
                  <p className="text-[8px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                    Saúde e Absenteísmo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 bg-[#1A3351] text-white flex items-center justify-center"
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
                filterAsoType={filterTipo}
                setFilterAsoType={setFilterTipo}
                uniqueUsersList={[]}
                uniqueSecretarias={uniqueSecretarias}
                referrals={[]}
                operatorsMap={{}}
                clearAllFilters={clearAllFilters}
                searchPlaceholder="BUSCAR POR NOME OU CPF..."
                secretariaLabelDefault="SECRETARIAS"
                asoTypeLabelDefault="TIPO AFASTAMENTO"
                asoTypeOptions={["all", ...uniqueTipos]}
                showUserFilter={false}
                activeFilterCount={headerActiveFilterCount}
                extraActions={
                  <>
                    <ActionIconButton
                      icon={<Filter className="w-4 h-4" />}
                      label="Filtro contextual de natureza do cargo"
                      variant="contextual"
                      active={filterNatureza !== "all"}
                      open={isNaturezaFilterOpen}
                      onToggle={setIsNaturezaFilterOpen}
                      showMenuIndicator
                    >
                      <div className="w-72 bg-white border-2 border-[#7C2D12] shadow-2xl rounded-none overflow-hidden">
                        <div className="p-3 space-y-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#7C2D12]">
                            Natureza do Cargo
                          </p>
                          <select
                            value={filterNatureza}
                            onChange={(e) => {
                              setFilterNatureza(e.target.value);
                              setIsNaturezaFilterOpen(false);
                            }}
                            className="w-full px-3 py-2 bg-[#FFF7E6] border border-[#F59E0B] text-[10px] font-bold uppercase outline-none focus:border-[#7C2D12]"
                          >
                            <option value="all">TODAS NATUREZAS</option>
                            {uniqueNaturezas.map((n) => (
                              <option key={n} value={n}>
                                {String(n).toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </ActionIconButton>

                    <ActionIconButton
                      icon={<Printer className="w-4 h-4" />}
                      label="Imprimir vista analítica"
                      variant="primary"
                      onClick={handlePrintReport}
                    />

                    <ActionIconButton
                      icon={<FileText className="w-4 h-4" />}
                      label="Gerar relatório profissional (PDF)"
                      variant="primary"
                      onClick={() => {
                        const reportFilters = {
                          searchTerm: searchTerm,
                          startDate: startDate,
                          endDate: endDate,
                          secretaria: filterSecretaria,
                          natureza: filterNatureza
                        };
                        generateAbsenteeismDashboardReportPDF(filteredRecords, reportFilters);
                      }}
                    />
                  </>
                }
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            <FilterChips
              searchTerm={normalizeSearchTerm(searchTerm)}
              startDate={startDate}
              endDate={endDate}
              filterUser="all"
              filterSecretaria={filterSecretaria}
              filterAsoType={filterTipo}
              referrals={[]}
              operatorsMap={{}}
              extraChips={
                filterNatureza !== "all"
                  ? [{ key: "natureza", label: `Natureza: ${filterNatureza}` }]
                  : []
              }
            />
          </div>
        </section>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-6">
          {/* STAT CARDS */}
          <StatisticCardRow columns={4} className="shrink-0">
            <StatisticCard
              variant="analytic"
              accent="primary"
              title="Total de Registros"
              value={filteredRecords.length}
              icon={<ClipboardList className="w-5 h-5 text-slate-300" />}
            />
            <StatisticCard
              variant="analytic"
              accent="success"
              title="Afastamentos Ativos"
              value={
                chartData.byStatus.find((s) => s.name === "Ativos")?.value || 0
              }
              icon={<Activity className="w-5 h-5 text-emerald-200" />}
            />
            <StatisticCard
              variant="analytic"
              accent="warning"
              title="Total Dias Afastados"
              value={filteredRecords.reduce(
                (acc, r) => acc + (r.dias_afastado ?? 0),
                0,
              )}
              icon={<Calendar className="w-5 h-5 text-amber-200" />}
            />
            <StatisticCard
              variant="analytic"
              accent="neutral"
              title="Servidores Diferentes"
              value={new Set(filteredRecords.map((r) => r.servidor_cpf)).size}
              icon={<UsersIcon className="w-5 h-5 text-slate-300" />}
            />
          </StatisticCardRow>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-8">
            {/* CHART 1: MONTHLY VOLUME */}
            <div className="bg-white p-5 shadow-sm border border-black/5 lg:col-span-8">
              <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Evolução Mensal (Lançamentos)
              </h4>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.byMonth}>
                    <defs>
                      <linearGradient
                        id="colorValue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f0f0f0"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fontWeight: 700, fill: "#999" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fontWeight: 700, fill: "#999" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "0px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#10b981"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 2: STATUS PIE */}
            <div className="bg-white p-5 shadow-sm border border-black/5 lg:col-span-4 relative">
              <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Situação dos Registros
              </h4>
              <div className="h-[280px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.byStatus}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.byStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="outside"
                        style={{
                          fontSize: "11px",
                          fontWeight: 900,
                          fill: "#1A3351",
                        }}
                      />
                    </Pie>
                    <Tooltip
                      formatter={(value) => [String(value), "Registros"]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconSize={10}
                      wrapperStyle={{
                        fontSize: "9px",
                        fontWeight: "black",
                        textTransform: "uppercase",
                        paddingTop: "20px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 3: TYPE PIE */}
            <div className="bg-white p-5 shadow-sm border border-black/5 lg:col-span-4 relative">
              <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Distribuição por Tipo
              </h4>
              <div className="h-[280px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.byType}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.byType.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            [
                              "#1e293b",
                              "#3b82f6",
                              "#f59e0b",
                              "#10b981",
                              "#6366f1",
                            ][index % 5]
                          }
                        />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="outside"
                        style={{
                          fontSize: "11px",
                          fontWeight: 900,
                          fill: "#1A3351",
                        }}
                      />
                    </Pie>
                    <Tooltip formatter={(value) => [String(value), "Casos"]} />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconSize={10}
                      wrapperStyle={{
                        fontSize: "9px",
                        fontWeight: "black",
                        textTransform: "uppercase",
                        paddingTop: "20px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 4: IMPACT BAR RANKING */}
            <div className="bg-white p-6 shadow-sm border border-black/5 lg:col-span-8">
              <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Absenteísmo por Secretaria
                (Total de Dias)
              </h4>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.byImpact}
                    layout="vertical"
                    margin={{ left: 170, right: 40 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f0f0f0"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={<SecretariaTick />}
                      width={160}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{
                        borderRadius: "0px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        fontSize: "11px",
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#ef4444"
                      radius={[0, 0, 0, 0]}
                      barSize={24}
                    >
                      <LabelList
                        dataKey="total"
                        position="right"
                        style={{
                          fontSize: "10px",
                          fontWeight: 900,
                          fill: "#ef4444",
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* RODAPÉ LGPD PADRÃO SESMT-SYSTEM */}
          <div className="mt-12 pb-10 px-6 border-t border-black/5 text-center max-w-4xl mx-auto print:block">
            <p className="text-[9px] font-bold text-slate-800 mb-1 uppercase tracking-tighter">
              🛡️ IMPORTANTE: Privacidade e Proteção de Dados (LGPD)
            </p>
            <p className="text-[8px] text-slate-600 leading-tight mb-4 text-center">
              Este relatório gerencial contém dados agregados de produtividade para fins de Business Intelligence. 
              O uso destas informações é restrito à gestão estratégica do SESMT. 
              Proibida a divulgação pública ou compartilhamento com terceiros sem autorização prévia.
            </p>
            <p className="text-[8px] text-slate-400 tracking-widest pt-2 border-t border-slate-100">
              Gerado via SESMT SYSTEM - Powered by UXBRAS®
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
