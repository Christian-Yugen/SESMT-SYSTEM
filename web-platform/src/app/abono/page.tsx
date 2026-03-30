"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  Menu,
  ChevronDown,
  ChevronUp,
  History as HistoryIcon,
  BarChart3,
  User,
  ClipboardList,
  Printer,
  TrendingUp,
  PlusCircle,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Loader2 } from "lucide-react";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { AbonoRecord } from "@/types";
import ActionIconButton from "@/components/filters/ActionIconButton";
import CompactFilterBar from "@/components/filters/CompactFilterBar";
import FilterChips from "@/components/filters/FilterChips";
import {
  type FilterState,
  matchesUnifiedNameCpfSearch,
  normalizeSearchTerm,
} from "@/components/filters/filtersUtils";
import StatisticCard from "@/components/statistics/StatisticCard";
import StatisticCardRow from "@/components/statistics/StatisticCardRow";
import SortAlphaToggle from "@/components/filters/SortAlphaToggle";
import RecordItem from "@/components/records/RecordItem";
import RecordDatePeriod from "@/components/records/RecordDatePeriod";
import { maskCpf } from "@/lib/record-utils";

/** Dados de um registro de abono para comparação em logs de auditoria. */
interface AbonoLogData {
  portaria?: string | null;
  assomasul_numero?: string | null;
  assomasul_data?: string | null;
  inicio?: string | null;
  observacoes?: string | null;
}

/** Entrada de log de auditoria do abono salarial. */
interface AbonoLog {
  id: number;
  abono_id: number;
  usuario_email?: string;
  motivo?: string;
  dados_anteriores?: AbonoLogData;
  dados_novos?: AbonoLogData;
  data_alteracao: string;
}

// Normaliza CPF removendo caracteres não numéricos para agrupamento consistente
const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "");

export default function AbonoPage() {
  const INITIAL_FILTERS: FilterState = {
    searchTerm: "",
    startDate: "",
    endDate: "",
    filterUser: "all",
    filterSecretaria: "all",
    filterAsoType: "all",
  };

  const [records, setRecords] = useState<AbonoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [expandedCpf, setExpandedCpf] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");
  const [logs, setLogs] = useState<Record<number, AbonoLog[]>>({});
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "expired" | "finished"
  >("all");
  const [sortBy, setSortBy] = useState<"alphabetical" | "newest" | "oldest">(
    "newest",
  );
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [printLayout, setPrintLayout] = useState<"portrait" | "landscape">(
    "landscape",
  );
  const [isPrintPopoverOpen, setIsPrintPopoverOpen] = useState(false);
  const [operatorsMap] = useState<Record<string, string>>({});

  const {
    searchTerm,
    startDate,
    endDate,
    filterSecretaria: secretariaFilter,
    filterAsoType: naturezaCargoFilter,
  } = filters;

  const setSearchTerm = (value: string) => {
    setFilters((prev) => ({ ...prev, searchTerm: value }));
  };
  const setStartDate = (value: string) => {
    setFilters((prev) => ({ ...prev, startDate: value }));
  };
  const setEndDate = (value: string) => {
    setFilters((prev) => ({ ...prev, endDate: value }));
  };
  const setFilterSecretaria = (value: string) => {
    setFilters((prev) => ({ ...prev, filterSecretaria: value }));
  };
  const setNaturezaCargoFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, filterAsoType: value }));
  };
  const clearAllFilters = () => {
    setFilters(INITIAL_FILTERS);
    setIsDateFilterOpen(false);
  };

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
    }, 180);

    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  const loadRecords = async () => {
    setLoading(true);

    // Cache breaker para evitar dados viciados
    const cacheBreaker = Date.now();

    const { data, error } = await supabase
      .from("abono_salarial")
      .select("*")
      .neq("id", -cacheBreaker)
      .order("inicio", { ascending: false });

    if (!error && data) {
      // Enriquecer com dados do servidor (matricula, contrato, secretaria)
      const cpfs = Array.from(
        new Set(data.map((r) => r.cpf?.replace(/\D/g, "")).filter(Boolean)),
      );
      const { data: servData } = await supabase
        .from("servidores")
        .select("cpf, matricula, contrato, secretaria, natureza_cargo")
        .in("cpf", cpfs);

      if (servData) {
        const servMap: Record<string, (typeof servData)[0]> = {};
        servData.forEach((s) => {
          const key = s.cpf?.replace(/\D/g, "");
          if (key && !servMap[key]) servMap[key] = s;
        });
        const enriched = data.map((r) => {
          const key = r.cpf?.replace(/\D/g, "") || "";
          const srv = servMap[key];
          return {
            ...r,
            servidor_matricula:
              srv?.matricula || r.servidor_matricula || undefined,
            servidor_contrato:
              srv?.contrato || r.servidor_contrato || undefined,
            secretaria: r.secretaria || srv?.secretaria || undefined,
            natureza_cargo:
              r.natureza_cargo || srv?.natureza_cargo || undefined,
          };
        });
        setRecords(enriched);
      } else {
        setRecords(data);
      }

      // Buscar Logs de Auditoria
      const { data: logsData } = await supabase
        .from("abono_salarial_logs")
        .select("*")
        .order("data_alteracao", { ascending: false });

      if (logsData) {
        const logsMap: Record<number, AbonoLog[]> = {};
        logsData.forEach((log: AbonoLog) => {
          if (!logsMap[log.abono_id]) logsMap[log.abono_id] = [];
          logsMap[log.abono_id].push(log);
        });
        setLogs(logsMap);
      }
    } else if (error) {
      console.error("Erro ao carregar abonos:", error);
    }
    setLoading(false);
  };

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
          if (data) {
            setUserRole(data.role);
            if (
              data.role === "nurse" ||
              data.role === "operator" ||
              data.role === "viewer"
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
        } else {
          router.push("/login");
          return;
        }
        loadRecords();
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
  }, [router]);

  const secretarias = useMemo(() => {
    const unique = new Set(
      records
        .map((r) => r.secretaria)
        .filter((value): value is string => Boolean(value)),
    );
    return Array.from(unique).sort();
  }, [records]);

  const naturezas = useMemo(() => {
    const unique = new Set(
      records
        .map((r) => r.natureza_cargo)
        .filter((value): value is string => Boolean(value)),
    );
    return Array.from(unique).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch = matchesUnifiedNameCpfSearch(
        record.nome,
        record.cpf,
        debouncedSearchTerm,
      );

      const matchesSecretaria =
        secretariaFilter === "all" || record.secretaria === secretariaFilter;
      const matchesNatureza =
        naturezaCargoFilter === "all" ||
        record.natureza_cargo === naturezaCargoFilter;

      let matchesPeriod = true;
      if (startDate || endDate) {
        const recDate = record.inicio
          ? new Date(record.inicio + "T00:00:00")
          : null;
        if (recDate) {
          if (startDate && recDate < new Date(startDate + "T00:00:00"))
            matchesPeriod = false;
          if (endDate && recDate > new Date(endDate + "T00:00:00"))
            matchesPeriod = false;
        } else {
          matchesPeriod = false;
        }
      }

      return (
        matchesSearch && matchesSecretaria && matchesNatureza && matchesPeriod
      );
    });
  }, [
    records,
    debouncedSearchTerm,
    secretariaFilter,
    naturezaCargoFilter,
    startDate,
    endDate,
  ]);

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr || dateStr === "None" || dateStr === "null") return "---";
    try {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return "---";
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const date = new Date(year, month, day);
      return date.toLocaleDateString("pt-BR");
    } catch {
      return "---";
    }
  };

  const getDiff = (
    prev: AbonoLogData | null | undefined,
    next: AbonoLogData | null | undefined,
  ) => {
    if (!prev || !next) return null;
    const changes: string[] = [];

    const labels: Record<string, string> = {
      portaria: "PORTARIA",
      assomasul_numero: "Nº ASSOMASUL",
      assomasul_data: "DATA ASSOMASUL",
      inicio: "DATA INÍCIO",
      observacoes: "OBSERVAÇÕES",
    };

    Object.keys(labels).forEach((key) => {
      let pVal = prev[key as keyof AbonoLogData] ?? "---";
      let nVal = next[key as keyof AbonoLogData] ?? "---";

      // Formatar datas para exibição no log
      if (key.includes("data") || key === "inicio") {
        if (pVal !== "---") pVal = formatDate(pVal);
        if (nVal !== "---") nVal = formatDate(nVal);
      }

      if (pVal !== nVal) {
        changes.push(`${labels[key]}: "${pVal}" ➞ "${nVal}"`);
      }
    });

    return changes;
  };

  // IDs de registros que nasceram de uma renovação
  const renewalTargetIds = useMemo(() => {
    return new Set(
      records.map((r) => r.renovado_por_id).filter((id): id is number => !!id),
    );
  }, [records]);

  // Utility to check if a benefit is active
  const getBenefitStatus = (record: AbonoRecord, rIds: Set<number>) => {
    if (!record.inicio) return "inactive";
    try {
      const parts = record.inicio.split("-");
      const endDate = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
      );
      endDate.setFullYear(endDate.getFullYear() + 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Se já foi substituído por uma nova renovação -> FINALIZADO (Histórico)
      if (record.renovado_por_id) return "finished";

      // 2. Se a vigência acabou e NÃO foi renovado -> VENCIDO
      if (today > endDate) return "expired";

      // 3. Se está na vigência:
      // É fruto de uma renovação recente (< 90 dias)?
      const isRenewalResult = rIds.has(record.id);
      const createdAt = new Date(record.created_at);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      if (isRenewalResult && createdAt > ninetyDaysAgo) return "renewed";

      // Novo lançamento ou renovação antiga -> ATIVO
      return "active";
    } catch {
      return "inactive";
    }
  };

  const groupedRecords = useMemo(() => {
    const groups: Record<
      string,
      { nome: string; cpf: string; benefits: AbonoRecord[] }
    > = {};

    filteredRecords.forEach((record) => {
      const status = getBenefitStatus(record, renewalTargetIds);

      // Filter by Status individualmente
      if (
        statusFilter === "active" &&
        status !== "active" &&
        status !== "renewed"
      )
        return;
      if (statusFilter === "expired" && status !== "expired") return;
      if (statusFilter === "finished" && status !== "finished") return;

      const key = normalizeCpf(record.cpf);
      if (!groups[key]) {
        groups[key] = {
          nome: record.nome,
          cpf: record.cpf,
          benefits: [],
        };
      }
      groups[key].benefits.push(record);
    });

    // Ordenar benefícios dentro de cada grupo
    Object.values(groups).forEach((group) => {
      group.benefits.sort((a, b) =>
        (b.inicio || "").localeCompare(a.inicio || ""),
      );
    });

    const result = Object.values(groups);

    // Apply Sorting do grupo (baseado no benefício mais recente do grupo filtrado)
    if (sortBy === "alphabetical") {
      result.sort((a, b) => a.nome.localeCompare(b.nome));
    } else if (sortBy === "newest") {
      result.sort((a, b) =>
        (b.benefits[0]?.inicio || "").localeCompare(
          a.benefits[0]?.inicio || "",
        ),
      );
    } else if (sortBy === "oldest") {
      result.sort((a, b) =>
        (a.benefits[0]?.inicio || "").localeCompare(
          b.benefits[0]?.inicio || "",
        ),
      );
    }

    return result;
  }, [filteredRecords, statusFilter, sortBy, renewalTargetIds]);

  const stats = useMemo(() => {
    // finalRecords para a lista e PDF (aplica o filtro de status atual sobre o que já foi filtrado por busca/sec/data)
    const finalRecords = filteredRecords.filter((r) => {
      if (statusFilter === "all") return true;
      const s = getBenefitStatus(r, renewalTargetIds);
      if (statusFilter === "active") return s === "active" || s === "renewed";
      return s === statusFilter;
    });

    // Totais Dinâmicos: Respondem a TODOS os filtros (Search, Sec, Date E Status)
    const totalBenefits = finalRecords.length;
    const totalServidores = new Set(
      finalRecords.map((r) => normalizeCpf(r.cpf)),
    ).size;

    // Contadores de Categoria: Respondem a Busca, Sec e Data, mas mostram o total daquela categoria
    // Isso permite que o usuário veja quantos existem de cada antes de clicar
    const ativosCount = filteredRecords.filter((r) => {
      const s = getBenefitStatus(r, renewalTargetIds);
      return s === "active" || s === "renewed";
    }).length;
    const vencidosCount = filteredRecords.filter(
      (r) => getBenefitStatus(r, renewalTargetIds) === "expired",
    ).length;
    const finalizadosCount = filteredRecords.filter(
      (r) => getBenefitStatus(r, renewalTargetIds) === "finished",
    ).length;

    // Dados formatados para o cabeçalho do PDF
    const printFilters = [
      searchTerm ? `Busca: "${searchTerm}"` : null,
      secretariaFilter !== "all"
        ? `Secretaria: ${secretariaFilter}`
        : "Todas as Secretarias",
      naturezaCargoFilter !== "all"
        ? `Natureza: ${naturezaCargoFilter}`
        : "Todas as Naturezas",
      startDate || endDate
        ? `Período: ${formatDate(startDate)} até ${formatDate(endDate)}`
        : "Início até Hoje",
      statusFilter !== "all"
        ? `Status: ${statusFilter.toUpperCase() === "ACTIVE" ? "ATIVOS (E RENOVADOS)" : statusFilter.toUpperCase()}`
        : "Todos os Status",
    ]
      .filter(Boolean)
      .join(" | ");

    return {
      totalBenefits,
      totalServidores,
      ativos: ativosCount,
      vencidos: vencidosCount,
      finalizados: finalizadosCount,
      finalRecords,
      printFilters,
    };
  }, [
    filteredRecords,
    statusFilter,
    searchTerm,
    secretariaFilter,
    naturezaCargoFilter,
    startDate,
    endDate,
    renewalTargetIds,
  ]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
        <p className="text-[#1A3351] uppercase tracking-[0.3em] font-bold text-xs">
          Carregando Abono Salarial...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-x-hidden">
      {/* SIDEBAR */}
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

      {/* Overlay de Foco Progressivo */}
      {/* Overlay de Foco Progressivo - Agora com pointer-events-none para não bloquear o scroll */}
      <div
        className={`fixed inset-0 z-[45] bg-black/20 backdrop-blur-[2px] transition-all duration-500 pointer-events-none ${expandedCpf ? "opacity-100" : "opacity-0"}`}
      />

      {/* ÁREA PRINCIPAL */}
      <main
        onClick={() => setExpandedCpf(null)}
        className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-visible relative"
      >
        <div className="flex-1 flex flex-col relative overflow-visible">
          {/* HEADER */}
          {/* HEADER - Smart Dynamic Header com Colapso de Espaço */}
          <div
            className={`grid transition-all duration-500 ease-in-out ${showHeader ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}
          >
            <div className="overflow-visible">
              <section
                className={`bg-[#B0B0B0] px-2.5 sm:px-4 lg:px-6 py-3 border-b-[6px] border-[#10b981] shrink-0 shadow-lg print:hidden transition-all duration-500 ease-in-out transform ${showHeader ? "translate-y-0" : "-translate-y-1/2"}`}
              >
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:flex-nowrap md:gap-3">
                  <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0 text-[#1A3351]">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      <div>
                        <h2 className="text-[15px] sm:text-lg md:text-xl font-bold leading-none uppercase tracking-tight">
                          Abono Salarial
                        </h2>
                        <p className="text-[8px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                          SESMT • Beneficios
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 bg-[#1A3351] rounded-none text-white active:scale-95 transition-all shadow-md flex items-center justify-center shrink-0"
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
                      filterUser={"all"}
                      setFilterUser={() => {}}
                      filterSecretaria={secretariaFilter}
                      setFilterSecretaria={setFilterSecretaria}
                      filterAsoType={naturezaCargoFilter}
                      setFilterAsoType={setNaturezaCargoFilter}
                      uniqueUsersList={[]}
                      uniqueSecretarias={secretarias}
                      referrals={[]}
                      operatorsMap={operatorsMap}
                      clearAllFilters={clearAllFilters}
                      searchPlaceholder="BUSCAR POR NOME OU CPF..."
                      secretariaLabelDefault="SECRETARIAS"
                      asoTypeLabelDefault="NATUREZA CARGO"
                      asoTypeOptions={["all", ...naturezas]}
                      showUserFilter={false}
                      extraActions={
                        <>
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
                                      window.print();
                                      setIsPrintPopoverOpen(false);
                                    }, 100);
                                  }}
                                  className={`w-full text-left p-3 rounded-none flex items-center justify-between transition-colors ${printLayout === "portrait" ? "bg-[#E31E24]/10 text-[#E31E24]" : "hover:bg-slate-100 text-slate-600"}`}
                                >
                                  <span className="text-[10px] font-bold uppercase">
                                    ↗ Vertical (Retrato)
                                  </span>
                                  {printLayout === "portrait" && (
                                    <div className="w-1.5 h-1.5 rounded-none-none bg-[#E31E24]" />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setPrintLayout("landscape");
                                    setTimeout(() => {
                                      window.print();
                                      setIsPrintPopoverOpen(false);
                                    }, 100);
                                  }}
                                  className={`w-full text-left p-3 rounded-none flex items-center justify-between transition-colors ${printLayout === "landscape" ? "bg-[#E31E24]/10 text-[#E31E24]" : "hover:bg-slate-100 text-slate-600"}`}
                                >
                                  <span className="text-[10px] font-bold uppercase">
                                    ➡ Horizontal (Paisagem)
                                  </span>
                                  {printLayout === "landscape" && (
                                    <div className="w-1.5 h-1.5 rounded-none-none bg-[#E31E24]" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </ActionIconButton>

                          <ActionIconButton
                            icon={<BarChart3 className="w-4 h-4" />}
                            label="Abrir indicadores BI"
                            variant="primary"
                            onClick={() => router.push("/abono/analytics")}
                          />
                          {userRole !== "analytic_manager" && (
                            <ActionIconButton
                              icon={<PlusCircle className="w-4 h-4" />}
                              label="Novo lançamento"
                              variant="success"
                              onClick={() => router.push("/abono/new")}
                            />
                          )}
                        </>
                      }
                    />
                  </div>
                </div>

                <FilterChips
                  searchTerm={normalizeSearchTerm(searchTerm)}
                  startDate={startDate}
                  endDate={endDate}
                  filterUser={"all"}
                  filterSecretaria={secretariaFilter}
                  filterAsoType={naturezaCargoFilter}
                  referrals={[]}
                  operatorsMap={operatorsMap}
                  extraChips={
                    statusFilter !== "all"
                      ? [
                          {
                            key: "status",
                            label:
                              statusFilter === "active"
                                ? "Status: Ativos"
                                : statusFilter === "expired"
                                  ? "Status: Vencidos"
                                  : "Status: Finalizados",
                          },
                        ]
                      : []
                  }
                />
              </section>
            </div>
          </div>

          {/* CONTEÚDO */}
          <div
            onScroll={handleMainScroll}
            className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8"
          >
            {/* STATS CARDS - DINÂMICOS E INTERATIVOS */}
            <StatisticCardRow columns={5} className="shrink-0">
              {[
                {
                  label: "Total Servidores",
                  value: stats.totalServidores,
                  filter: "all" as const,
                  accent: "primary" as const,
                  activeClass: "bg-[#1A3351]/10",
                },
                {
                  label: "Benefícios",
                  value: stats.totalBenefits,
                  filter: "all" as const,
                  accent: "info" as const,
                  activeClass: "bg-blue-50",
                },
                {
                  label: "Abonos Ativos",
                  value: stats.ativos,
                  filter: "active" as const,
                  accent: "success" as const,
                  activeClass: "bg-emerald-50",
                },
                {
                  label: "Vencidos",
                  value: stats.vencidos,
                  filter: "expired" as const,
                  accent: "danger" as const,
                  activeClass: "bg-red-50",
                },
                {
                  label: "Finalizados",
                  value: stats.finalizados,
                  filter: "finished" as const,
                  accent: "primary" as const,
                  activeClass: "bg-[#1A3351]/10",
                },
              ].map((card) => {
                const selected = statusFilter === card.filter;

                return (
                  <StatisticCard
                    key={card.label}
                    variant="interactive"
                    accent={card.accent}
                    title={card.label}
                    value={card.value}
                    active={selected}
                    onClick={() => setStatusFilter(card.filter)}
                    className={selected ? card.activeClass : "bg-white"}
                  />
                );
              })}
            </StatisticCardRow>

            {/* LISTA DE REGISTROS */}
            <div className="bg-white border-2 border-slate-300 shadow-xl overflow-visible">
              <div className="bg-[#B0B0B0] px-4 sm:px-6 py-2.5 border-b-2 border-slate-400 flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A3351]">
                  Registros de Abono
                </h3>
                <SortAlphaToggle
                  active={sortBy === "alphabetical"}
                  onToggle={() =>
                    setSortBy(
                      sortBy === "alphabetical" ? "newest" : "alphabetical",
                    )
                  }
                  count={groupedRecords.length}
                />
              </div>
              <div className="divide-y divide-slate-200 transition-colors duration-500">
                {groupedRecords.length > 0 ? (
                  groupedRecords.map((group) => (
                    <div
                      key={group.cpf}
                      className={`transition-all duration-500 relative ${expandedCpf === group.cpf ? "z-[50] scale-[1.02] shadow-2xl ring-1 ring-black/5 bg-white" : "z-10 transition-opacity opacity-100"}`}
                    >
                      <RecordItem
                        expanded={expandedCpf === group.cpf}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCpf(
                            expandedCpf === group.cpf ? null : group.cpf,
                          );
                        }}
                        name={group.nome}
                        cpf={maskCpf(group.cpf)}
                        cargo={
                          typeof group.benefits[0].natureza_cargo === "string"
                            ? group.benefits[0].natureza_cargo
                            : undefined
                        }
                        matricula={
                          typeof group.benefits[0].servidor_matricula ===
                          "string"
                            ? group.benefits[0].servidor_matricula
                            : undefined
                        }
                        natureza={
                          typeof group.benefits[0].natureza_cargo === "string"
                            ? group.benefits[0].natureza_cargo
                            : undefined
                        }
                        secretaria={
                          typeof group.benefits[0].secretaria === "string"
                            ? group.benefits[0].secretaria
                            : undefined
                        }
                        contrato={
                          typeof group.benefits[0].servidor_contrato ===
                          "string"
                            ? group.benefits[0].servidor_contrato
                            : undefined
                        }
                        badges={
                          <span className="text-[11px] font-normal px-1.5 py-0.5 bg-slate-200 text-slate-600 uppercase whitespace-nowrap">
                            {group.benefits.length}{" "}
                            {group.benefits.length === 1
                              ? "Benefício"
                              : "Benefícios"}
                          </span>
                        }
                        actions={
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.print();
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#1A3351] hover:bg-slate-100 transition-colors shrink-0"
                            title="Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        }
                        rightMeta={
                          expandedCpf !== group.cpf ? (
                            <RecordDatePeriod
                              startDate={formatDate(group.benefits[0].inicio)}
                              endDate={
                                group.benefits[0].inicio
                                  ? (() => {
                                      const parts =
                                        group.benefits[0].inicio.split("-");
                                      const d = new Date(
                                        parseInt(parts[0]),
                                        parseInt(parts[1]) - 1,
                                        parseInt(parts[2]),
                                      );
                                      d.setFullYear(d.getFullYear() + 1);
                                      return d.toLocaleDateString("pt-BR");
                                    })()
                                  : "---"
                              }
                              endColor={
                                group.benefits[0].inicio
                                  ? (() => {
                                      const parts =
                                        group.benefits[0].inicio.split("-");
                                      const d = new Date(
                                        parseInt(parts[0]),
                                        parseInt(parts[1]) - 1,
                                        parseInt(parts[2]),
                                      );
                                      d.setFullYear(d.getFullYear() + 1);
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      return d < today
                                        ? "text-[#E31E24]"
                                        : "text-green-600";
                                    })()
                                  : "text-slate-400"
                              }
                            />
                          ) : undefined
                        }
                      />

                      {expandedCpf === group.cpf && (
                        <div className="px-6 md:px-12 py-8 bg-white border-t border-slate-100 animate-in slide-in-from-top-2 duration-300 relative z-[50] -mx-2 shadow-2xl">
                          <div className="space-y-6">
                            <h5 className="text-[11px] font-bold uppercase text-slate-400 tracking-[0.2em] border-b pb-2">
                              Histórico de Benefícios
                            </h5>

                            <div className="bg-white border-2 border-slate-200 shadow-sm overflow-visible">
                              {group.benefits.map((record, index) => (
                                <div key={record.id}>
                                  <div className="p-6 relative overflow-visible group/card transition-colors hover:bg-slate-50/50">
                                    <div className="absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 bg-[#1A3351]/5 rounded-none-none group-hover/card:bg-[#1A3351]/10 transition-colors" />

                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6 relative z-10">
                                      <div className="space-y-1.5 md:col-span-2">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                          Vigência
                                        </p>
                                        <div className="flex flex-col gap-2 mt-1">
                                          <div className="flex items-center gap-2.5">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase min-w-[60px]">
                                              Início:
                                            </span>
                                            <span className="text-sm font-bold text-[#1A3351]">
                                              {formatDate(record.inicio)}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2.5 whitespace-nowrap">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase min-w-[60px]">
                                              Término:
                                            </span>
                                            <span className="text-sm font-bold">
                                              {record.inicio
                                                ? (() => {
                                                    const parts =
                                                      record.inicio.split("-");
                                                    const endDate = new Date(
                                                      parseInt(parts[0]),
                                                      parseInt(parts[1]) - 1,
                                                      parseInt(parts[2]),
                                                    );
                                                    endDate.setFullYear(
                                                      endDate.getFullYear() + 1,
                                                    );

                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const status =
                                                      getBenefitStatus(
                                                        record,
                                                        renewalTargetIds,
                                                      );

                                                    return (
                                                      <span className="flex items-center gap-2 translate-y-[1px]">
                                                        <span
                                                          className={
                                                            status ===
                                                              "active" ||
                                                            status === "renewed"
                                                              ? "text-green-600"
                                                              : status ===
                                                                  "expired"
                                                                ? "text-[#E31E24]"
                                                                : "text-slate-500"
                                                          }
                                                        >
                                                          {endDate.toLocaleDateString(
                                                            "pt-BR",
                                                          )}
                                                        </span>
                                                        <span
                                                          className={`text-[10px] px-2 py-0.5 rounded-none shadow-sm border font-bold ${
                                                            status === "active"
                                                              ? "bg-green-500 text-white border-green-600 animate-pulse"
                                                              : status ===
                                                                  "renewed"
                                                                ? "bg-blue-600 text-white border-blue-700"
                                                                : status ===
                                                                    "finished"
                                                                  ? "bg-slate-300 text-slate-600 border-slate-400"
                                                                  : "bg-[#E31E24] text-white border-[#E31E24]"
                                                          }`}
                                                        >
                                                          {status === "active"
                                                            ? "VIGENTE"
                                                            : status ===
                                                                "renewed"
                                                              ? "RENOVADO"
                                                              : status ===
                                                                  "finished"
                                                                ? "FINALIZADO"
                                                                : "VENCIDO"}
                                                        </span>
                                                      </span>
                                                    );
                                                  })()
                                                : "---"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="space-y-1.5 md:col-span-2 text-center md:text-left">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                          Beneficiário e Natureza
                                        </p>
                                        <p className="text-base font-bold text-slate-700 uppercase truncate">
                                          {record.beneficiario_nome ||
                                            "PRÓPRIO"}
                                        </p>
                                        {record.natureza_cargo && (
                                          <span className="text-[11px] font-bold text-[#1A3351] bg-[#1A3351]/5 px-2.5 py-1 rounded-none uppercase border border-[#1A3351]/20 inline-block mt-1">
                                            {record.natureza_cargo}
                                          </span>
                                        )}
                                        <p className="text-[10px] text-slate-400 italic mt-2.5">
                                          Atualizado em:{" "}
                                          {new Date(
                                            record.updated_at,
                                          ).toLocaleDateString("pt-BR")}
                                        </p>
                                      </div>
                                      <div className="space-y-1.5">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase border-b border-slate-100 pb-1 mb-2 tracking-widest">
                                          Documento Oficial
                                        </p>
                                        <div className="space-y-1">
                                          {record.assomasul_data && (
                                            <p className="text-[11px] font-bold text-[#1A3351] uppercase tracking-tighter whitespace-nowrap">
                                              Pub. Assomasul:{" "}
                                              {formatDate(
                                                record.assomasul_data,
                                              )}
                                            </p>
                                          )}
                                          {record.assomasul_numero && (
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                              Nº Assomasul:{" "}
                                              {record.assomasul_numero}
                                            </p>
                                          )}
                                          <div className="h-px bg-slate-100 my-1.5" />
                                          <p className="text-sm font-bold text-[#1A3351] uppercase tracking-tighter leading-tight">
                                            {record.portaria || "---"}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-2 items-end justify-center">
                                        {userRole !== "analytic_manager" && (
                                          <>
                                            <button
                                              onClick={() =>
                                                router.push(
                                                  `/abono/edit/${record.id}`,
                                                )
                                              }
                                              className="px-6 py-2.5 bg-[#1A3351] text-white text-[11px] font-bold uppercase rounded-none shadow-sm hover:brightness-110 active:scale-95 transition-all w-full md:w-40"
                                            >
                                              Editar Dados
                                            </button>
                                            {getBenefitStatus(
                                              record,
                                              renewalTargetIds,
                                            ) === "expired" &&
                                              !record.renovado_por_id && (
                                                <button
                                                  onClick={() =>
                                                    router.push(
                                                      `/abono/new?renew_from=${record.id}&cpf=${record.cpf}&beneficiario=${record.beneficiario_nome || ""}`,
                                                    )
                                                  }
                                                  className="px-6 py-2.5 bg-green-600 text-white text-[11px] font-bold uppercase rounded-none shadow-sm hover:brightness-110 active:scale-95 transition-all w-full md:w-40 flex items-center justify-center gap-2"
                                                >
                                                  <TrendingUp className="w-4 h-4" />
                                                  Renovar
                                                </button>
                                              )}
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {record.observacoes && (
                                      <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                          <ClipboardList className="w-3.5 h-3.5" />{" "}
                                          Informações Adicionais
                                        </p>
                                        <div className="bg-slate-50 p-3 rounded-none border border-slate-200">
                                          <p className="text-sm text-slate-700 font-bold uppercase leading-relaxed italic">
                                            &ldquo;{record.observacoes}&rdquo;
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {logs[record.id] &&
                                      logs[record.id].length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                          <button
                                            onClick={() =>
                                              setExpandedLogId(
                                                expandedLogId === record.id
                                                  ? null
                                                  : record.id,
                                              )
                                            }
                                            className={`w-full flex items-center justify-between p-3 rounded-none border transition-all ${expandedLogId === record.id ? "bg-[#E31E24] text-white border-[#E31E24] shadow-md" : "bg-slate-50 text-[#E31E24] border-slate-200 hover:bg-slate-100"}`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <HistoryIcon
                                                className={`w-4 h-4 ${expandedLogId === record.id ? "text-white" : "text-[#E31E24]"}`}
                                              />
                                              <span className="text-[10px] font-bold uppercase tracking-wider">
                                                {expandedLogId === record.id
                                                  ? "Ocultar Histórico de Auditoria"
                                                  : `Ver Histórico de Auditoria (${logs[record.id].length})`}
                                              </span>
                                            </div>
                                            {expandedLogId === record.id ? (
                                              <ChevronUp className="w-4 h-4" />
                                            ) : (
                                              <ChevronDown className="w-4 h-4" />
                                            )}
                                          </button>

                                          {expandedLogId === record.id && (
                                            <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                              {logs[record.id].map((log) => {
                                                const diff = getDiff(
                                                  log.dados_anteriores,
                                                  log.dados_novos,
                                                );
                                                return (
                                                  <div
                                                    key={log.id}
                                                    className="text-[10px] p-3 bg-white rounded-none border border-slate-200 shadow-sm relative overflow-hidden group/log"
                                                  >
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                                                    <div className="flex justify-between font-bold uppercase text-slate-500 mb-2 border-b border-slate-200 pb-1">
                                                      <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />{" "}
                                                        {log.usuario_email}
                                                      </span>
                                                      <span className="text-slate-400">
                                                        {new Date(
                                                          log.data_alteracao,
                                                        ).toLocaleDateString(
                                                          "pt-BR",
                                                        )}{" "}
                                                        {new Date(
                                                          log.data_alteracao,
                                                        ).toLocaleTimeString(
                                                          "pt-BR",
                                                          {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                          },
                                                        )}
                                                      </span>
                                                    </div>
                                                    <div className="space-y-2">
                                                      <p className="font-bold text-[#1A3351] uppercase leading-tight">
                                                        <span className="text-amber-600">
                                                          MOTIVO:
                                                        </span>{" "}
                                                        {log.motivo}
                                                      </p>
                                                      {diff &&
                                                        diff.length > 0 && (
                                                          <div className="bg-slate-50 p-2 rounded-none border border-slate-100 space-y-1">
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">
                                                              Mudanças
                                                              Realizadas:
                                                            </p>
                                                            {diff.map(
                                                              (change, i) => (
                                                                <p
                                                                  key={i}
                                                                  className="text-[9px] font-bold text-slate-600 flex items-center gap-2"
                                                                >
                                                                  <ArrowRight className="w-2.5 h-2.5 text-amber-500" />{" "}
                                                                  {change}
                                                                </p>
                                                              ),
                                                            )}
                                                          </div>
                                                        )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                  {index < group.benefits.length - 1 && (
                                    <div className="mx-6 h-px bg-slate-200" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center text-slate-400 flex flex-col items-center gap-4">
                    <ClipboardList className="w-16 h-16 opacity-20" />
                    <p className="font-bold uppercase tracking-[0.2em]">
                      Nenhum registro encontrado
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RELATÓRIO PDF (OCULTO NA TELA, VISÍVEL NA IMPRESSÃO) */}
        <div
          id="print-area"
          className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 pt-1 overflow-y-auto"
        >
          {/* CABEÇALHO OFICIAL - ULTRA COMPACTO */}
          <div className="flex justify-between items-center border-b-[1px] border-slate-200 pb-1.5 mb-2">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt="Logo"
                width={160}
                height={48}
                className="h-12 w-auto object-contain"
                priority
              />
              <div className="h-10 w-[1px] bg-slate-200 mx-1" />
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-0.5">
                  Prefeitura Três Lagoas
                </p>
                <p className="text-[9px] font-medium text-slate-400 uppercase leading-none">
                  SESMT - Saúde Ocupacional
                </p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-base font-bold text-[#1A3351] uppercase tracking-tighter leading-tight">
                Relatório Gerencial de Abono
              </h1>
              <div className="text-[8px] font-bold text-slate-400 uppercase">
                OP: {userName} | {new Date().toLocaleDateString("pt-BR")}{" "}
                {new Date().toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          {/* RESUMO DOS FILTROS - MAIS DISCRETO */}
          <div className="flex items-center justify-between bg-slate-50/50 p-1 mb-2 border border-slate-100 rounded-none">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3.5 bg-[#E31E24]" />
              <p className="text-[8px] font-bold uppercase text-[#1A3351]">
                REGISTROS:{" "}
                <span className="text-[#E31E24]">
                  {stats.finalRecords.length}
                </span>
              </p>
            </div>
            <p className="text-[7.5px] font-medium uppercase text-slate-400 truncate max-w-[60%] italic">
              FILTROS: {stats.printFilters}
            </p>
          </div>

          {/* TABELA DE DADOS - MÁXIMA COMPACTAÇÃO E SEM NEGRITOS DESNECESSÁRIOS */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-300">
                <th className="p-1 px-2 text-[8px] font-bold uppercase text-slate-500 text-left border border-slate-200">
                  Nome do Servidor
                </th>
                <th className="p-1 px-2 text-[8px] font-bold uppercase text-slate-500 text-left border border-slate-200">
                  Portaria
                </th>
                <th className="p-1 text-[8px] font-bold uppercase text-slate-500 text-center border border-slate-200">
                  Início
                </th>
                <th className="p-1 text-[8px] font-bold uppercase text-slate-500 text-center border border-slate-200">
                  Término
                </th>
                <th className="p-1 px-2 text-[8px] font-bold uppercase text-slate-500 text-left border border-slate-200">
                  Secretaria
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.finalRecords
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((record, index) => {
                  const endDate = record.inicio
                    ? (() => {
                        const d = new Date(record.inicio + "T00:00:00");
                        d.setFullYear(d.getFullYear() + 1);
                        return d.toISOString().split("T")[0];
                      })()
                    : null;

                  return (
                    <tr
                      key={record.id}
                      className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"} border-b border-slate-100`}
                    >
                      <td className="p-0.5 px-2 border border-slate-100 font-medium">
                        <p className="text-[9px] text-slate-600 uppercase leading-tight">
                          {record.nome}
                        </p>
                      </td>
                      <td className="p-0.5 px-2 border border-slate-100 uppercase">
                        <div className="flex flex-col leading-tight">
                          <span className="text-[9px] font-bold text-[#1A3351]">
                            {record.portaria}
                          </span>
                          {(record.assomasul_numero ||
                            record.assomasul_data) && (
                            <span className="text-[7.5px] text-slate-400 font-medium">
                              AS: {record.assomasul_numero || "---"}{" "}
                              {record.assomasul_data
                                ? `(${formatDate(record.assomasul_data)})`
                                : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-0.5 text-[8px] font-bold text-[#1A3351] border border-slate-100 text-center whitespace-nowrap">
                        {formatDate(record.inicio)}
                      </td>
                      <td className="p-0.5 text-[8px] font-bold text-[#E31E24] border border-slate-100 text-center whitespace-nowrap">
                        {formatDate(endDate)}
                      </td>
                      <td className="p-0.5 px-2 text-[8px] font-normal text-slate-400 border border-slate-100 uppercase leading-tight truncate max-w-[180px]">
                        {record.secretaria || "---"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {/* RODAPÉ DO PDF */}
          <div className="mt-4 pt-1 border-t border-slate-100 flex justify-center items-center opacity-60">
            <p className="text-[7.5px] font-normal text-slate-500">
              Gerado via SESMT SYSTEM - Powered by UXBRAS®
            </p>
          </div>
        </div>

        <style jsx global>{`
          @media print {
            #print-area {
              display: block !important;
              position: relative !important;
              z-index: 9999 !important;
            }
            #print-area table {
              display: table !important;
              width: 100% !important;
            }
            #print-area tr {
              display: table-row !important;
            }
            #print-area td,
            #print-area th {
              display: table-cell !important;
            }
            @page {
              size: ${printLayout};
              margin: 0.5cm;
            }
          }
        `}</style>
      </main>
    </div>
  );
}
