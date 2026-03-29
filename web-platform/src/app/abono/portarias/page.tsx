"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Menu,
  ChevronDown,
  ChevronUp,
  History as HistoryIcon,
  Printer,
  Loader2,
  FileText,
  PlusCircle,
  Download,
  Eye,
  Building2,
  PencilLine,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import CompactFilterBar from "@/components/filters/CompactFilterBar";
import FilterChips from "@/components/filters/FilterChips";
import ActionIconButton from "@/components/filters/ActionIconButton";
import StatisticCard from "@/components/statistics/StatisticCard";
import StatisticCardRow from "@/components/statistics/StatisticCardRow";
import {
  countActiveFilters,
  normalizeSearchTerm,
} from "@/components/filters/filtersUtils";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { AuditLogRecord } from "@/types";
import { generatePortariaPDF, PortariaData } from "@/lib/portaria-pdf";

interface PortariaRecord {
  id: number;
  numero: number;
  ano: number;
  servidor_nome: string;
  servidor_cpf: string;
  servidor_matricula: string;
  servidor_cargo: string;
  servidor_lotacao: string;
  servidor_genero: "M" | "F";
  periodo_inicio: string;
  periodo_fim: string;
  data_portaria: string;
  servidor_contrato?: string;
  criado_por: string;
  criado_por_nome: string;
  created_at: string;
}

export default function PortariasPage() {
  const [records, setRecords] = useState<PortariaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");
  const [, setMounted] = useState(false);
  const [sortOrder, setSortOrder] = useState("date-desc");
  const [logs, setLogs] = useState<Record<number, AuditLogRecord[]>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadLogs = useCallback(async () => {
    const { data: logsData } = await supabase
      .from("portarias_abono_logs")
      .select("*")
      .order("data_alteracao", { ascending: false });

    if (logsData) {
      const logsMap: Record<number, AuditLogRecord[]> = {};
      logsData.forEach((log: AuditLogRecord) => {
        const pid = log.portaria_id;
        if (pid == null) return;
        if (!logsMap[pid]) logsMap[pid] = [];
        logsMap[pid].push(log);
      });
      setLogs(logsMap);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("portarias_abono")
      .select("*")
      .order("numero", { ascending: false });

    if (!error && data) {
      setRecords(data);
      await loadLogs();
    } else if (error) {
      console.error("Erro ao carregar portarias:", error);
    }
    setLoading(false);
  }, [loadLogs]);

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
  }, [router, loadRecords]);

  const clearAllFilters = () => {
    setSearchTerm("");
  };

  const headerActiveFilterCount = countActiveFilters({ searchTerm });

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.servidor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.servidor_cpf.includes(searchTerm) ||
        r.numero.toString().includes(searchTerm);
      return matchesSearch;
    });
  }, [records, searchTerm]);

  const sortedRecords = useMemo(() => {
    const base = [...filteredRecords];
    if (sortOrder === "alpha") {
      return base.sort((a, b) =>
        a.servidor_nome.localeCompare(b.servidor_nome, "pt-BR"),
      );
    }
    if (sortOrder === "numero") {
      return base.sort((a, b) => b.numero - a.numero);
    }
    return base.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [filteredRecords, sortOrder]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonth = filteredRecords.filter((r) => {
      const d = new Date(r.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    return { total, thisMonth };
  }, [filteredRecords]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "---";
    try {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "---";
    try {
      return new Date(dateStr).toLocaleString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  const getDiff = (
    prev: Record<string, string> | undefined,
    next: Record<string, string> | undefined,
  ) => {
    if (!prev || !next) return null;
    const changes: string[] = [];

    // Mapeamento de chaves para labels amigáveis
    // Incluímos variações para suportar logs antigos (lotacao/servidor_lotacao)
    const fieldMapping: Record<
      string,
      { label: string; formatter?: (val: string) => string }
    > = {
      numero: { label: "NÚMERO" },
      servidor_genero: {
        label: "GÊNERO",
        formatter: (val) =>
          val === "M" ? "Masculino" : val === "F" ? "Feminino" : val,
      },
      genero: {
        label: "GÊNERO",
        formatter: (val) =>
          val === "M" ? "Masculino" : val === "F" ? "Feminino" : val,
      }, // Suporte para logs antigos
      periodo_inicio: { label: "DATA INÍCIO", formatter: formatDate },
      periodo_fim: { label: "DATA FIM", formatter: formatDate },
      data_portaria: { label: "DATA EMISSÃO", formatter: formatDate },
      servidor_lotacao: { label: "LOTAÇÃO" },
      lotacao: { label: "LOTAÇÃO" }, // Suporte para logs antigos
    };

    // Para evitar duplicidade com aliases (como lotacao vs servidor_lotacao)
    // rastreamos quais labels já foram processadas
    const processedLabels = new Set<string>();

    // Chaves principais que queremos comparar
    const primaryKeys = [
      "numero",
      "servidor_genero",
      "periodo_inicio",
      "periodo_fim",
      "data_portaria",
      "servidor_lotacao",
    ];

    primaryKeys.forEach((key) => {
      const config = fieldMapping[key];
      if (!config) return;

      // Busca o valor anterior e o novo
      // Tenta a chave principal e tenta o alias se necessário
      let pValInput = prev[key];
      let nValInput = next[key];

      // Fallback para aliases em logs antigos
      if (key === "servidor_lotacao") {
        if (pValInput === undefined) pValInput = prev["lotacao"];
        if (nValInput === undefined) nValInput = next["lotacao"];
      }
      if (key === "servidor_genero") {
        if (pValInput === undefined) pValInput = prev["genero"];
        if (nValInput === undefined) nValInput = next["genero"];
      }

      const pVal = pValInput ?? "---";
      const nVal = nValInput ?? "---";

      // Se for igual (ou ambos nulos/indefinidos), não registra mudança
      if (pVal === nVal) return;

      // Aplicar formatadores
      const formattedPrev = config.formatter ? config.formatter(pVal) : pVal;
      const formattedNext = config.formatter ? config.formatter(nVal) : nVal;

      // Se após formatação for igual, ignora (ex: datas em formatos diferentes mas mesmo valor)
      if (formattedPrev === formattedNext) return;

      changes.push(`${config.label}: "${formattedPrev}" ➞ "${formattedNext}"`);
      processedLabels.add(config.label);
    });

    return changes;
  };

  const handleViewPDF = (record: PortariaRecord) => {
    const portariaData: PortariaData = {
      numero: record.numero,
      ano: record.ano,
      servidor_nome: record.servidor_nome,
      servidor_matricula: record.servidor_matricula,
      servidor_cargo: record.servidor_cargo,
      servidor_lotacao: record.servidor_lotacao,
      servidor_genero: record.servidor_genero,
      periodo_inicio: formatDate(record.periodo_inicio),
      periodo_fim: formatDate(record.periodo_fim),
      data_portaria: formatDate(record.data_portaria),
      servidor_contrato: record.servidor_contrato,
    };
    generatePortariaPDF(portariaData, "view");
  };

  const handleDownloadPDF = (record: PortariaRecord) => {
    const portariaData: PortariaData = {
      numero: record.numero,
      ano: record.ano,
      servidor_nome: record.servidor_nome,
      servidor_matricula: record.servidor_matricula,
      servidor_cargo: record.servidor_cargo,
      servidor_lotacao: record.servidor_lotacao,
      servidor_genero: record.servidor_genero,
      periodo_inicio: formatDate(record.periodo_inicio),
      periodo_fim: formatDate(record.periodo_fim),
      data_portaria: formatDate(record.data_portaria),
      servidor_contrato: record.servidor_contrato,
    };
    generatePortariaPDF(portariaData, "download");
  };

  const handleDownloadDOCX = async (record: PortariaRecord) => {
    const { generatePortariaDOCX } = await import("@/lib/portaria-docx");
    const portariaData: PortariaData = {
      numero: record.numero,
      ano: record.ano,
      servidor_nome: record.servidor_nome,
      servidor_matricula: record.servidor_matricula,
      servidor_cargo: record.servidor_cargo,
      servidor_lotacao: record.servidor_lotacao,
      servidor_genero: record.servidor_genero,
      periodo_inicio: formatDate(record.periodo_inicio),
      periodo_fim: formatDate(record.periodo_fim),
      data_portaria: formatDate(record.data_portaria),
      servidor_contrato: record.servidor_contrato,
    };
    await generatePortariaDOCX(portariaData);
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
        <p className="text-[#1A3351] uppercase tracking-[0.3em] font-bold text-xs">
          Carregando Portarias...
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

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-visible print:hidden">
        {/* HEADER */}
        <section className="bg-[#B0B0B0] p-2.5 sm:p-4 lg:p-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg font-sans">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:flex-nowrap md:gap-3">
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0 text-[#1A3351]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 lg:w-6 h-5 lg:h-6" />
                <div>
                  <h2 className="text-[15px] sm:text-lg md:text-xl font-bold leading-none uppercase tracking-tight">
                    Portarias
                  </h2>
                  <p className="text-[8px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                    Digital Ledger • Portarias Oficiais
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 bg-[#1A3351] rounded-none text-white active:scale-95 transition-all shadow-md flex items-center justify-center"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-[#1A3351]/20 shrink-0 hidden md:block" />

            <div className="w-full md:flex-1 md:w-auto min-w-0">
              <CompactFilterBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                startDate=""
                setStartDate={() => {}}
                endDate=""
                setEndDate={() => {}}
                isDateFilterOpen={false}
                setIsDateFilterOpen={() => {}}
                filterUser="all"
                setFilterUser={() => {}}
                filterSecretaria="all"
                setFilterSecretaria={() => {}}
                filterAsoType="all"
                setFilterAsoType={() => {}}
                uniqueUsersList={[]}
                uniqueSecretarias={[]}
                referrals={[]}
                operatorsMap={{}}
                clearAllFilters={clearAllFilters}
                searchPlaceholder="BUSCAR POR NOME, CPF OU Nº DA PORTARIA..."
                showUserFilter={false}
                showDateFilter={false}
                showSecretariaFilter={false}
                showAsoTypeFilter={false}
                activeFilterCount={headerActiveFilterCount}
                extraActions={
                  userRole !== "analytic_manager" ? (
                    <ActionIconButton
                      icon={<PlusCircle className="w-4 h-4" />}
                      label="Nova portaria"
                      variant="success"
                      onClick={() => router.push("/abono/portarias/new")}
                    />
                  ) : undefined
                }
              />
            </div>
          </div>

          <div className="mt-3">
            <FilterChips
              searchTerm={normalizeSearchTerm(searchTerm)}
              startDate=""
              endDate=""
              filterUser="all"
              filterSecretaria="all"
              filterAsoType="all"
              referrals={[]}
              operatorsMap={{}}
            />
          </div>
        </section>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">
          {/* STATS CARDS */}
          <StatisticCardRow
            columns={3}
            className="grid-cols-2 lg:grid-cols-3 shrink-0"
          >
            <StatisticCard
              variant="informative"
              accent="primary"
              title="Total de Portarias"
              value={stats.total}
            />
            <StatisticCard
              variant="informative"
              accent="info"
              title="Emitidas no Mês"
              value={stats.thisMonth}
            />
            <StatisticCard
              variant="informative"
              accent="success"
              title="Sustentabilidade"
              value={stats.total}
              subtitle="folhas digitais"
              className="col-span-2 lg:col-span-1"
            />
          </StatisticCardRow>

          {/* Mobile Button */}
          {userRole !== "analytic_manager" && (
            <button
              onClick={() => router.push("/abono/portarias/new")}
              className="md:hidden w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-none shadow-md hover:bg-green-700 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
            >
              <PlusCircle className="w-4 h-4" />
              Nova Portaria
            </button>
          )}

          {/* LISTA */}
          <div className="bg-white border-2 border-slate-300 shadow-2xl overflow-hidden rounded-none">
            <div className="bg-[#B0B0B0] px-6 py-4 border-b-2 border-slate-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#1A3351]">
                  Registro Digital de Portarias
                </h3>
                <p className="text-[9px] font-bold text-slate-600 uppercase">
                  Portarias oficiais geradas via SESMT SYSTEM
                </p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">
                    Ordem:
                  </span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-[#D3D3D3] border border-slate-400 text-[10px] font-bold uppercase px-3 py-1.5 outline-none focus:border-[#1A3351]"
                  >
                    <option value="date-desc">Recentes Primeiro</option>
                    <option value="numero">Nº Portaria</option>
                    <option value="alpha">Ordem Alfabética</option>
                  </select>
                </div>
                <div className="text-[10px] font-bold text-slate-700 uppercase bg-slate-200 px-3 py-1.5 border border-slate-300">
                  {sortedRecords.length} ITENS
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {sortedRecords.length > 0 ? (
                sortedRecords.map((entry) => (
                  <div key={entry.id} className="group">
                    <div
                      onClick={() =>
                        setExpandedId(expandedId === entry.id ? null : entry.id)
                      }
                      className={`px-4 lg:px-8 py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6 hover:bg-slate-50 cursor-pointer transition-all border-l-[6px] ${expandedId === entry.id ? "bg-[#1A3351]/5 border-[#1A3351]" : "border-transparent"}`}
                    >
                      <div className="flex items-center gap-3 lg:gap-6 flex-1 w-full">
                        <div
                          className={`p-2 lg:p-2.5 rounded-none shadow-sm transition-all duration-300 shrink-0 ${expandedId === entry.id ? "bg-[#1A3351] text-white" : "bg-slate-100 text-slate-400"}`}
                        >
                          <FileText
                            className={`${expandedId === entry.id ? "w-5 lg:w-6 h-5 lg:h-6" : "w-4 lg:w-5 h-4 lg:h-5"}`}
                          />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 lg:gap-4 overflow-hidden">
                            <h4
                              className={`font-bold uppercase text-[#1A3351] leading-none transition-all duration-300 truncate ${expandedId === entry.id ? "text-lg lg:text-xl" : "text-sm lg:text-base"}`}
                            >
                              {entry.servidor_nome}
                            </h4>
                            <span className="text-[8px] lg:text-[10px] font-bold text-amber-700 uppercase tracking-widest bg-amber-50 px-1.5 lg:px-2 py-0.5 border border-amber-200 shrink-0">
                              Nº {entry.numero}
                            </span>
                          </div>
                          <div className="flex gap-2 lg:gap-4 mt-1.5 lg:mt-2">
                            <span className="text-[8px] lg:text-[10px] font-bold text-[#1A3351] uppercase bg-blue-50 px-1.5 lg:px-2 py-0.5 border border-blue-100 truncate">
                              PORTARIA {entry.numero}/SEGP/DGP/{entry.ano}
                            </span>
                            <span className="text-[8px] lg:text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                              <Building2 className="w-3 h-3 shrink-0" />{" "}
                              {entry.servidor_lotacao || "---"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex items-center justify-between lg:justify-end gap-4 lg:gap-8 w-full lg:w-auto shrink-0 transition-all ${expandedId === entry.id ? "opacity-100" : "opacity-70"}`}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-[8px] lg:text-[9px] text-slate-400 uppercase mb-0.5 block tracking-widest">
                            Data
                          </span>
                          <span
                            className={`font-bold text-slate-800 transition-all ${expandedId === entry.id ? "text-sm lg:text-base" : "text-[10px] lg:text-xs"}`}
                          >
                            {formatDate(entry.data_portaria)}
                          </span>
                        </div>
                        {expandedId === entry.id ? (
                          <ChevronUp className="w-6 h-6 text-[#1A3351]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                    </div>

                    {/* DETALHES */}
                    {expandedId === entry.id && (
                      <div className="px-4 lg:px-8 pb-8 pt-4 bg-[#1A3351]/5 border-t border-slate-200 animate-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 mt-2">
                          <div className="md:col-span-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase mb-1 block border-b border-slate-200 pb-1">
                                  Servidor
                                </span>
                                <p className="text-xs lg:text-sm font-bold text-[#1A3351] uppercase leading-tight">
                                  {entry.servidor_nome}
                                </p>
                              </div>
                              <div>
                                <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase mb-1 block border-b border-slate-200 pb-1">
                                  Matrícula
                                </span>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs lg:text-sm font-bold text-[#1A3351]">
                                    {entry.servidor_matricula}
                                  </p>
                                  {entry.servidor_contrato && (
                                    <span className="bg-[#E31E24] text-white text-[8px] px-1.5 py-0.5 rounded-none font-bold uppercase">
                                      Contrato {entry.servidor_contrato}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase mb-1 block border-b border-slate-200 pb-1">
                                  Cargo
                                </span>
                                <p className="text-xs lg:text-sm font-bold text-[#1A3351] uppercase leading-tight">
                                  {entry.servidor_cargo}
                                </p>
                              </div>
                              <div>
                                <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase mb-1 block border-b border-slate-200 pb-1">
                                  Lotação
                                </span>
                                <p className="text-xs lg:text-sm font-bold text-[#1A3351] uppercase leading-tight">
                                  {entry.servidor_lotacao}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase mb-1 block border-b border-slate-200 pb-1">
                                  Período Início
                                </span>
                                <p className="text-xs lg:text-sm font-bold text-emerald-600">
                                  {formatDate(entry.periodo_inicio)}
                                </p>
                              </div>
                              <div>
                                <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase mb-1 block border-b border-slate-200 pb-1">
                                  Período Fim
                                </span>
                                <p className="text-xs lg:text-sm font-bold text-[#E31E24]">
                                  {formatDate(entry.periodo_fim)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-4 bg-white p-4 lg:p-5 border border-slate-200 shadow-inner rounded-none">
                            <span className="text-xs lg:text-sm font-bold text-[#1A3351] uppercase mb-3 block flex items-center gap-2 border-b border-slate-100 pb-2">
                              <FileText className="w-4 h-4 text-amber-500" />{" "}
                              Documento Oficial
                            </span>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-[#1A3351] uppercase tracking-tighter">
                                PORTARIA Nº {entry.numero}/SEGP/DGP/{entry.ano}
                              </p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">
                                Data Emissão: {formatDate(entry.data_portaria)}
                              </p>
                            </div>
                          </div>

                          <div className="md:col-span-12 flex flex-col lg:flex-row justify-between items-stretch lg:items-center bg-slate-100/50 p-4 border border-slate-200 mt-2 gap-4 lg:gap-10 rounded-none">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-10">
                              <div>
                                <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase mb-0.5 block tracking-widest">
                                  Emitida por
                                </span>
                                <p className="text-[10px] lg:text-[11px] font-bold text-[#1A3351] uppercase">
                                  {entry.criado_por_nome || "SISTEMA"}
                                </p>
                              </div>
                              <div className="h-0.5 lg:h-8 w-full lg:w-px bg-slate-200" />
                              <div>
                                <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase mb-0.5 block tracking-widest">
                                  Status
                                </span>
                                <p className="text-[10px] lg:text-[11px] font-bold text-[#28A745] uppercase flex items-center gap-1">
                                  ✓ REGISTRADA
                                </p>
                              </div>
                            </div>
                            <div className="px-4 py-2 bg-white border-2 border-[#1A3351] text-center shadow-sm">
                              <p className="text-[9px] lg:text-[10px] font-bold text-[#1A3351] uppercase leading-none">
                                REF: {entry.id}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4">
                          <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                            <button
                              onClick={() => handleViewPDF(entry)}
                              className="w-full lg:w-auto px-6 py-3 lg:py-2 bg-[#1A3351] text-white text-[10px] font-bold uppercase hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 rounded-none"
                            >
                              <Eye className="w-3.5 h-3.5" /> Visualizar PDF
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(entry)}
                              className="w-full lg:w-auto px-6 py-3 lg:py-2 bg-[#1A3351] text-white text-[10px] font-bold uppercase hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 rounded-none"
                            >
                              <Printer className="w-3.5 h-3.5" /> Baixar PDF
                            </button>
                            <button
                              onClick={() => handleDownloadDOCX(entry)}
                              className="w-full lg:w-auto px-6 py-3 lg:py-2 bg-[#2B579A] text-white text-[10px] font-bold uppercase hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 rounded-none"
                            >
                              <Download className="w-3.5 h-3.5" /> Exportar Word
                            </button>
                            <button
                              onClick={() =>
                                router.push(`/abono/portarias/edit/${entry.id}`)
                              }
                              className="w-full lg:w-auto px-6 py-3 lg:py-2 bg-[#E31E24] text-white text-[10px] font-bold uppercase hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 rounded-none"
                            >
                              <PencilLine className="w-3.5 h-3.5" /> Editar
                              Portaria
                            </button>
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-full">
                            Audit-Hash:{" "}
                            {Math.random()
                              .toString(36)
                              .substring(7)
                              .toUpperCase()}
                            -{entry.id}
                          </span>
                        </div>

                        {/* SEÇÃO DE LOGS DE AUDITORIA */}
                        {logs[entry.id] && logs[entry.id].length > 0 && (
                          <div className="mt-8 pt-6 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-4">
                              <HistoryIcon className="w-4 h-4 text-slate-400" />
                              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Histórico de Alterações
                              </h5>
                            </div>
                            <div className="space-y-3">
                              {logs[entry.id].map((log) => {
                                const changes = getDiff(
                                  log.dados_anteriores,
                                  log.dados_novos,
                                );
                                return (
                                  <div
                                    key={log.id}
                                    className="bg-white border border-slate-200 p-3 rounded-none shadow-sm"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <p className="text-[10px] font-bold text-[#1A3351] uppercase">
                                          Motivo: {log.motivo}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                          Por: {log.usuario_email} •{" "}
                                          {formatDateTime(log.data_alteracao)}
                                        </p>
                                      </div>
                                    </div>
                                    {changes && changes.length > 0 && (
                                      <div className="bg-slate-50 p-2 rounded-none border border-slate-100 space-y-1">
                                        {changes.map((change, cIdx) => (
                                          <p
                                            key={cIdx}
                                            className="text-[9px] font-bold text-slate-600 flex items-center gap-2"
                                          >
                                            <span className="w-1 h-1 bg-amber-400 rounded-none" />
                                            {change}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-24 text-center flex flex-col items-center gap-4">
                  <FileText className="w-16 h-16 text-slate-200" />
                  <p className="text-slate-400 uppercase font-bold text-xs italic tracking-[0.3em]">
                    Nenhuma portaria registrada
                  </p>
                  {userRole !== "analytic_manager" && (
                    <button
                      onClick={() => router.push("/abono/portarias/new")}
                      className="mt-4 px-8 py-3 bg-green-600 text-white text-[10px] font-bold uppercase rounded-none shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" /> Criar Primeira Portaria
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#B0B0B0] p-6 text-center border-2 border-slate-300 shadow-inner">
            <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-slate-600">
              SESMT SYSTEM — Módulo de Portarias Oficiais — Powered by UXBRAS®
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
