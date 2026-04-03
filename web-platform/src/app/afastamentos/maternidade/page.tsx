"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  getCIDChapter,
  searchCIDs,
  getCIDDetailsFromDB,
  normalizeCID,
} from "@/lib/cid-utils";
import { supabase } from "@/lib/supabase";
import {
  Activity,
  X,
  Menu,
  ClipboardList,
  Search,
  Printer,
  PlusCircle,
  Clock,
  RotateCcw,
  Eye,
  EyeOff,
  Pencil,
  FileEdit,
  Save,
  FileText,
  Briefcase,
  Baby,
} from "lucide-react";
import CompactFilterBar from "@/components/filters/CompactFilterBar";
import FilterChips from "@/components/filters/FilterChips";
import ActionIconButton from "@/components/filters/ActionIconButton";
import StatisticCard from "@/components/statistics/StatisticCard";
import StatisticCardRow from "@/components/statistics/StatisticCardRow";
import SortAlphaToggle from "@/components/filters/SortAlphaToggle";
import {
  type FilterState,
  countActiveFilters,
  matchesUnifiedNameCpfSearch,
  normalizeSearchTerm,
} from "@/components/filters/filtersUtils";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Loader2 } from "lucide-react";
import { generateServidorReportPDF } from "@/lib/afastamento-report-pdf";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { generateAfastamentoPDF } from "@/lib/afastamento-portaria-pdf";
import type { AfastamentoRecord } from "@/types";
import type { CIDDetails } from "@/lib/cid-utils";
import RecordItem from "@/components/records/RecordItem";
import RecordDatePeriod from "@/components/records/RecordDatePeriod";
import { maskCpf } from "@/lib/record-utils";

/** Entrada de log de auditoria de afastamento. */
interface AfastamentoLog {
  id: number;
  afastamento_id: number;
  usuario_id?: string;
  usuario_email?: string;
  alterado_por: string;
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
  motivo_alteracao?: string;
  hash_auditoria?: string;
  data_alteracao: string;
}

interface CIDRecord {
  id?: number;
  afastamento_id?: number;
  cid_codigo: string;
  cid_descricao: string;
  cid_capitulo: string;
}

const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "");

function CIDDetailItem({ cid }: { cid: CIDRecord }) {
  const [details, setDetails] = useState<CIDDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const normalized = normalizeCID(cid.cid_codigo);
    getCIDDetailsFromDB(normalized).then((res) => {
      setDetails(res);
      setLoading(false);
    });
  }, [cid.cid_codigo]);

  if (loading)
    return (
      <div className="py-2 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-3 animate-pulse">
        <div className="w-[50px] h-[32px] bg-slate-100 rounded-none" />
        <div className="space-y-1.5 flex-1">
          <div className="h-2 bg-slate-100 rounded-none w-1/4" />
          <div className="h-3 bg-slate-100 rounded-none w-3/4" />
        </div>
      </div>
    );

  const displayCode = details?.code || normalizeCID(cid.cid_codigo);

  return (
    <div className="py-3 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 group/cid border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-2 -mx-2">
      <div className="flex flex-col items-center justify-center bg-[#1A3351]/5 text-[#1A3351] rounded-none px-3 py-2 min-w-[70px] border border-[#1A3351]/10 group-hover/cid:bg-[#1A3351] group-hover/cid:text-white transition-all shadow-sm">
        <span className="text-[8px] font-bold uppercase opacity-60 tracking-wider mb-1">
          Código
        </span>
        <span className="text-base font-black tracking-tight leading-none">
          {displayCode}
        </span>
      </div>
      <div className="flex flex-col justify-center gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
            Descrição:
          </span>
          <p className="text-sm font-bold text-[#1A3351] leading-snug uppercase">
            {details?.desc || cid.cid_descricao || "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase">
              Capitulo:
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-100">
              {details?.chapter || cid.cid_capitulo || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase">
              Grupo:
            </span>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
              {details?.chapter_desc || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaternidadeAfastamentosPage() {
  const [records, setRecords] = useState<AfastamentoRecord[]>([]);
  const [logs, setLogs] = useState<Record<number, AfastamentoLog[]>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const setSearchTerm = (value: string) =>
    setFilters((prev) => ({ ...prev, searchTerm: value }));
  const setStartDate = (value: string) =>
    setFilters((prev) => ({ ...prev, startDate: value }));
  const setEndDate = (value: string) =>
    setFilters((prev) => ({ ...prev, endDate: value }));
  const setFilterSecretaria = (value: string) =>
    setFilters((prev) => ({ ...prev, filterSecretaria: value }));
  const setFilterAsoType = (value: string) =>
    setFilters((prev) => ({ ...prev, filterAsoType: value }));
  const clearAllFilters = () => {
    setFilters(INITIAL_FILTERS);
    setIsDateFilterOpen(false);
    setCargoFilter("all");
  };
  const {
    startDate,
    endDate,
    filterSecretaria: secretariaFilter,
    filterAsoType: naturezaCargoFilter,
  } = filters;
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
      if (scrollUpStart - scrollTop > 250 || scrollTop < 50) {
        if (!showHeader) setShowHeader(true);
      }
    }
    setLastScrollTop(scrollTop);
  };

  const [expandedCpf, setExpandedCpf] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "expired" | "alert" | "finished"
  >("all");
  const [sortBy, setSortBy] = useState<"alphabetical" | "newest" | "oldest">(
    "newest",
  );
  const [cargoFilter, setCargoFilter] = useState<string>("all");
  const [isCargoFilterOpen, setIsCargoFilterOpen] = useState(false);
  const [isPrintPopoverOpen, setIsPrintPopoverOpen] = useState(false);
  const [printLayout, setPrintLayout] = useState<"portrait" | "landscape">(
    "landscape",
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [revealedCids, setRevealedCids] = useState<Set<number>>(new Set());

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AfastamentoRecord | null>(
    null,
  );
  const [editFormData, setEditFormData] = useState({
    data_inicio: "",
    dias_afastado: "",
    is_acidente_trabalho: false,
    cids: [] as CIDDetails[],
  });
  const [noteFormData, setNoteFormData] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [cidEditInput, setCidEditInput] = useState("");
  const [foundCids, setFoundCids] = useState<CIDDetails[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
    }, 180);
    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const normalized = normalizeCID(cidEditInput);
      if (normalized.length >= 1) {
        const results = await searchCIDs(normalized);
        setFoundCids(results);
      } else setFoundCids([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [cidEditInput]);

  const runAutoRepair = useCallback(async (data: AfastamentoRecord[]) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const toProrrogar = data.filter(
        (r) => r.situacao === "EM_ANDAMENTO" && r.renovado_por_id !== null,
      );

      const toFinalize = data.filter((r) => {
        if (r.situacao !== "EM_ANDAMENTO") return false;
        if (!r.data_fim) return false;
        const end = new Date(r.data_fim + "T00:00:00");
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return end < thirtyDaysAgo;
      });

      if (toProrrogar.length > 0) {
        await supabase
          .from("afastamentos")
          .update({ situacao: "PRORROGADO" })
          .in(
            "id",
            toProrrogar.map((r) => r.id),
          );
        toProrrogar.forEach((r) => (r.situacao = "PRORROGADO"));
      }

      if (toFinalize.length > 0) {
        await supabase
          .from("afastamentos")
          .update({ situacao: "FINALIZADO" })
          .in(
            "id",
            toFinalize.map((r) => r.id),
          );
        toFinalize.forEach((r) => (r.situacao = "FINALIZADO"));
      }
    } catch (err) {
      console.error("Error in auto-repair:", err);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("afastamentos")
      .select(
        "*, afastamento_cids (*), portarias_afastamento (numero, ano, data_emissao)",
      )
      .eq("status", "ATIVO")
      .ilike("tipo_afastamento", "%MATERNIDADE%")
      .order("data_inicio", { ascending: false });

    if (!error && data) {
      await runAutoRepair(data);

      const withDays = data.map((r) => {
        if (r.data_inicio && r.data_fim) {
          const diff = Math.abs(
            new Date(r.data_fim).getTime() - new Date(r.data_inicio).getTime(),
          );
          return { ...r, dias_afastado: Math.ceil(diff / 86400000) + 1 };
        }
        return { ...r, dias_afastado: null };
      });
      setRecords(withDays);

      const { data: logsData } = await supabase
        .from("afastamentos_logs")
        .select("*")
        .order("data_alteracao", { ascending: false });

      if (logsData) {
        const logsMap: Record<number, AfastamentoLog[]> = {};
        logsData.forEach((log: AfastamentoLog) => {
          if (!logsMap[log.afastamento_id]) logsMap[log.afastamento_id] = [];
          logsMap[log.afastamento_id].push(log);
        });
        setLogs(logsMap);
      }

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      if (profilesData) {
        const pMap: Record<string, string> = {};
        profilesData.forEach((p) => {
          pMap[p.id] = p.full_name || p.email || p.id;
        });
        setProfilesMap(pMap);
      }
    }
    setLoading(false);
  }, [runAutoRepair]);

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
            if (data.role !== "admin" && data.role !== "nurse") {
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
  }, [router, loadRecords]);

  const openEditModal = async (record: AfastamentoRecord) => {
    setUpdatingId(record.id);
    const resolvedCids = await Promise.all(
      (record.afastamento_cids || []).map((c) =>
        getCIDDetailsFromDB(c.cid_codigo),
      ),
    );
    setEditingRecord(record);
    setEditFormData({
      data_inicio: record.data_inicio,
      dias_afastado: String(record.dias_afastado || ""),
      is_acidente_trabalho: record.is_acidente_trabalho || false,
      cids: resolvedCids,
    });
    setUpdatingId(null);
    setIsEditModalOpen(true);
  };

  const openNotesModal = (record: AfastamentoRecord) => {
    setEditingRecord(record);
    setNoteFormData(record.observacoes || "");
    setIsNotesModalOpen(true);
  };

  async function handleEditSave() {
    if (!editingRecord) return;
    setIsSavingEdit(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const days = parseInt(editFormData.dias_afastado);
      if (isNaN(days) || days <= 0) {
        alert("Dias inválidos.");
        setIsSavingEdit(false);
        return;
      }
      const start = new Date(editFormData.data_inicio);
      const end = new Date(start);
      end.setDate(start.getDate() + days - 1);
      const newDataFim = end.toISOString().split("T")[0];

      const oldData = {
        data_inicio: editingRecord.data_inicio,
        data_fim: editingRecord.data_fim,
        is_acidente_trabalho: editingRecord.is_acidente_trabalho,
        cids: editingRecord.afastamento_cids?.map((c) => c.cid_codigo) || [],
      };
      const newData = {
        data_inicio: editFormData.data_inicio,
        data_fim: newDataFim,
        is_acidente_trabalho: editFormData.is_acidente_trabalho,
        cids: editFormData.cids.map((c) => c.code),
      };

      const auditHash = `AF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      await supabase
        .from("afastamentos")
        .update({
          data_inicio: editFormData.data_inicio,
          data_fim: newDataFim,
          dias_afastado: days,
          is_acidente_trabalho: editFormData.is_acidente_trabalho,
          hash_auditoria: auditHash,
        })
        .eq("id", editingRecord.id);
      await supabase
        .from("afastamento_cids")
        .delete()
        .eq("afastamento_id", editingRecord.id);
      for (const cid of editFormData.cids) {
        const chapter = getCIDChapter(cid.code);
        await supabase.from("afastamento_cids").insert({
          afastamento_id: editingRecord.id,
          cid_codigo: cid.code,
          cid_descricao: cid.desc,
          cid_capitulo: chapter?.capitulo || "Desconhecido",
        });
      }
      await supabase.from("afastamentos_logs").insert({
        afastamento_id: editingRecord.id,
        usuario_id: user?.id,
        usuario_email: user?.email,
        alterado_por:
          user?.user_metadata?.full_name || user?.email || "Sistema",
        dados_anteriores: oldData,
        dados_novos: { ...newData, hash_auditoria: auditHash },
        motivo_alteracao: "Edição manual",
        hash_auditoria: auditHash,
      });
      loadRecords();
      setIsEditModalOpen(false);
      alert("Alterações salvas com sucesso!");
    } catch (err: unknown) {
      alert(
        "Erro ao salvar: " + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleNoteSave() {
    if (!editingRecord) return;
    setIsSavingNote(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const auditHash = `AF-NOTE-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase
        .from("afastamentos")
        .update({
          observacoes: noteFormData,
          hash_auditoria: auditHash,
        })
        .eq("id", editingRecord.id);

      if (error) throw error;

      await supabase.from("afastamentos_logs").insert({
        afastamento_id: editingRecord.id,
        usuario_id: user?.id,
        usuario_email: user?.email,
        alterado_por:
          user?.user_metadata?.full_name || user?.email || "Sistema",
        dados_anteriores: { observacoes: editingRecord.observacoes },
        dados_novos: { observacoes: noteFormData, hash_auditoria: auditHash },
        motivo_alteracao: "Atualização de anotações",
        hash_auditoria: auditHash,
      });

      loadRecords();
      setIsNotesModalOpen(false);
      alert("Anotação salva com sucesso!");
    } catch (err: unknown) {
      alert(
        "Erro ao salvar anotação: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsSavingNote(false);
    }
  }

  const handleViewPortaria = (record: AfastamentoRecord) => {
    const portaria = record.portarias_afastamento?.[0];
    if (!portaria) {
      alert("Portaria não encontrada para este registro.");
      return;
    }
    generateAfastamentoPDF(
      {
        numero: portaria.numero,
        ano: portaria.ano,
        servidor_nome: record.servidor_nome,
        servidor_matricula: record.servidor_matricula,
        servidor_cargo: record.natureza_cargo,
        servidor_lotacao: record.servidor_secretaria,
        tipo_afastamento: record.tipo_afastamento,
        data_inicio: new Date(record.data_inicio).toLocaleDateString("pt-BR"),
        data_fim: record.data_fim
          ? new Date(record.data_fim).toLocaleDateString("pt-BR")
          : "---",
        data_portaria: new Date(portaria.data_emissao).toLocaleDateString(
          "pt-BR",
        ),
        perito_nome: record.perito_nome,
        perito_crm: record.perito_crm,
        servidor_contrato: record.servidor_contrato,
      },
      "view",
    );
  };

  const formatDate = (d: string) => {
    if (!d || d === "None" || d === "null") return "---";
    const p = d.split("-");
    if (p.length !== 3) return "---";
    return new Date(
      parseInt(p[0]),
      parseInt(p[1]) - 1,
      parseInt(p[2]),
    ).toLocaleDateString("pt-BR");
  };

  // Para licença maternidade: vencida = finalizada (não há status "expirado")
  const getStatus = (record: AfastamentoRecord) => {
    if (record.situacao === "FINALIZADO" || record.situacao === "PRORROGADO")
      return "finished";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (record.data_fim) {
      const p = record.data_fim.split("-");
      const end = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      end.setHours(0, 0, 0, 0);
      // Maternidade: prazo encerrado = finalizada (nunca "vencida")
      if (end < today) return "finished";
      if (Math.ceil((end.getTime() - today.getTime()) / 86400000) <= 10)
        return "alert";
    }
    return "active";
  };

  const getDaysRemaining = (dateFim: string) => {
    if (!dateFim) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const p = dateFim.split("-");
    const end = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const VencimentoAlerta = ({
    dateFim,
    compact = false,
  }: {
    dateFim: string;
    compact?: boolean;
  }) => {
    const days = getDaysRemaining(dateFim);
    if (days === null || days < 0 || days >= 11) return null;

    return (
      <div
        className={`flex items-center gap-1.5 text-red-600 font-bold animate-pulse ${compact ? "text-[8px]" : "text-xs"} uppercase tracking-tight`}
      >
        <Clock
          className={compact ? "w-2 h-2 text-red-400" : "w-4 h-4 text-red-500"}
        />
        {days === 0
          ? "VENCE HOJE"
          : `Faltam ${days} ${days === 1 ? "dia" : "dias"} para vencer`}
      </div>
    );
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch = matchesUnifiedNameCpfSearch(
        record.servidor_nome,
        record.servidor_cpf,
        debouncedSearchTerm,
      );

      const matchesSecretaria =
        secretariaFilter === "all" ||
        record.servidor_secretaria === secretariaFilter;
      const matchesNatureza =
        naturezaCargoFilter === "all" ||
        record.natureza_cargo === naturezaCargoFilter;
      const matchesCargo =
        cargoFilter === "all" || record.servidor_cargo === cargoFilter;

      let matchesStatus = true;
      if (statusFilter !== "all") {
        const s = getStatus(record);
        matchesStatus = s === statusFilter;
      }

      let matchesPeriod = true;
      if (startDate || endDate) {
        const recDate = record.data_inicio
          ? new Date(record.data_inicio + "T00:00:00")
          : null;
        if (recDate) {
          if (startDate && recDate < new Date(startDate + "T00:00:00"))
            matchesPeriod = false;
          if (endDate && recDate > new Date(endDate + "T00:00:00"))
            matchesPeriod = false;
        } else matchesPeriod = false;
      }

      return (
        matchesSearch &&
        matchesSecretaria &&
        matchesNatureza &&
        matchesCargo &&
        matchesPeriod &&
        matchesStatus
      );
    });
  }, [
    records,
    debouncedSearchTerm,
    secretariaFilter,
    naturezaCargoFilter,
    cargoFilter,
    startDate,
    endDate,
    statusFilter,
  ]);

  const printFiltersDesc = useMemo(() => {
    const activeFilters = [];
    if (secretariaFilter !== "all") activeFilters.push(secretariaFilter);
    if (naturezaCargoFilter !== "all") activeFilters.push(naturezaCargoFilter);
    if (cargoFilter !== "all") activeFilters.push(cargoFilter);
    if (startDate || endDate) {
      const start = startDate ? formatDate(startDate) : "INÍCIO";
      const end = endDate ? formatDate(endDate) : "HOJE";
      activeFilters.push(`${start} ATÉ ${end}`);
    }
    if (statusFilter !== "all") {
      const statusMap = {
        active: "ATIVAS",
        expired: "VENCIDAS",
        alert: "EM ALERTA",
        finished: "FINALIZADAS",
      };
      activeFilters.push(
        statusMap[statusFilter as keyof typeof statusMap] ||
          statusFilter.toUpperCase(),
      );
    }
    return activeFilters.length > 0
      ? activeFilters.join(" | ").toUpperCase()
      : "NENHUM FILTRO APLICADO";
  }, [
    secretariaFilter,
    naturezaCargoFilter,
    cargoFilter,
    startDate,
    endDate,
    statusFilter,
  ]);

  const groupedRecords = useMemo(() => {
    const groups: Record<
      string,
      { nome: string; cpf: string; items: AfastamentoRecord[] }
    > = {};
    filteredRecords.forEach((record) => {
      const key = normalizeCpf(record.servidor_cpf);
      if (!groups[key])
        groups[key] = {
          nome: record.servidor_nome,
          cpf: record.servidor_cpf,
          items: [],
        };
      groups[key].items.push(record);
    });
    Object.values(groups).forEach((g) =>
      g.items.sort((a, b) => b.data_inicio.localeCompare(a.data_inicio)),
    );
    const result = Object.values(groups);
    if (sortBy === "alphabetical")
      result.sort((a, b) => a.nome.localeCompare(b.nome));
    else if (sortBy === "newest")
      result.sort((a, b) =>
        (b.items[0]?.data_inicio || "").localeCompare(
          a.items[0]?.data_inicio || "",
        ),
      );
    else if (sortBy === "oldest")
      result.sort((a, b) =>
        (a.items[0]?.data_inicio || "").localeCompare(
          b.items[0]?.data_inicio || "",
        ),
      );
    return result;
  }, [filteredRecords, sortBy]);

  const uniqueSecretarias = useMemo(() => {
    const unique = new Set(
      records
        .map((r) => r.servidor_secretaria)
        .filter((v): v is string => Boolean(v)),
    );
    return Array.from(unique).sort();
  }, [records]);

  const uniqueNaturezas = useMemo(() => {
    const unique = new Set(
      records
        .map((r) => r.natureza_cargo)
        .filter((v): v is string => Boolean(v)),
    );
    return Array.from(unique).sort();
  }, [records]);

  const uniqueCargos = useMemo(() => {
    const unique = new Set(
      records
        .map((r) => r.servidor_cargo)
        .filter((v): v is string => Boolean(v)),
    );
    return Array.from(unique).sort();
  }, [records]);

  const stats = useMemo(() => {
    return {
      totalServidoras: new Set(filteredRecords.map((r) => r.servidor_cpf)).size,
      totalRegistros: filteredRecords.length,
      active: filteredRecords.filter((r) => getStatus(r) === "active").length,
      alert: filteredRecords.filter((r) => getStatus(r) === "alert").length,
      finished: filteredRecords.filter((r) => getStatus(r) === "finished")
        .length,
    };
  }, [filteredRecords]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
        <p className="text-[#1A3351] uppercase tracking-[0.3em] font-bold text-xs">
          Carregando Licenças Maternidade...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-x-hidden">
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

      <div
        className={`fixed inset-0 z-[45] bg-black/20 backdrop-blur-[2px] transition-all duration-500 pointer-events-none ${expandedCpf ? "opacity-100" : "opacity-0"}`}
      />

      <main
        onClick={() => setExpandedCpf(null)}
        className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-visible relative"
      >
        {/* HEADER */}
        <div
          className={`grid transition-all duration-500 ease-in-out ${showHeader ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}
        >
          <div className="overflow-visible">
            <section
              className={`bg-[#B0B0B0] px-2.5 sm:px-4 lg:px-6 py-3 border-b-[6px] border-pink-500 shrink-0 shadow-lg print:hidden transition-all duration-500 ease-in-out transform ${showHeader ? "translate-y-0" : "-translate-y-1/2"}`}
            >
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:flex-nowrap md:gap-3">
                {/* Título */}
                <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Baby className="w-5 h-5 text-[#1A3351]" />
                    <div>
                      <h2 className="text-[15px] sm:text-lg md:text-xl font-bold leading-none uppercase tracking-tight text-[#1A3351]">
                        Licenças Maternidade
                      </h2>
                      <p className="text-[8px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                        SESMT • Licença Maternidade
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
                {/* Toolbar compacta de filtros */}
                <div className="w-full md:flex-1 md:w-auto min-w-0">
                  <CompactFilterBar
                    searchTerm={filters.searchTerm}
                    setSearchTerm={setSearchTerm}
                    startDate={filters.startDate}
                    setStartDate={setStartDate}
                    endDate={filters.endDate}
                    setEndDate={setEndDate}
                    isDateFilterOpen={isDateFilterOpen}
                    setIsDateFilterOpen={setIsDateFilterOpen}
                    filterUser="all"
                    setFilterUser={() => {}}
                    filterSecretaria={filters.filterSecretaria}
                    setFilterSecretaria={setFilterSecretaria}
                    filterAsoType={filters.filterAsoType}
                    setFilterAsoType={setFilterAsoType}
                    uniqueUsersList={[]}
                    uniqueSecretarias={uniqueSecretarias}
                    referrals={[]}
                    operatorsMap={{}}
                    clearAllFilters={clearAllFilters}
                    searchPlaceholder="BUSCAR POR NOME OU CPF..."
                    secretariaLabelDefault="SECRETARIAS"
                    asoTypeLabelDefault="NATUREZA CARGO"
                    asoTypeOptions={["all", ...uniqueNaturezas]}
                    showUserFilter={false}
                    activeFilterCount={
                      countActiveFilters(filters) +
                      (cargoFilter !== "all" ? 1 : 0)
                    }
                    extraActions={
                      <>
                        <ActionIconButton
                          icon={<Briefcase className="w-4 h-4" />}
                          label="Filtrar por cargo"
                          variant="filter"
                          active={cargoFilter !== "all"}
                          open={isCargoFilterOpen}
                          onToggle={setIsCargoFilterOpen}
                          showMenuIndicator
                        >
                          <div className="w-56 bg-white border border-slate-200 shadow-2xl p-3 space-y-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              Cargo
                            </p>
                            <select
                              value={cargoFilter}
                              onChange={(e) => {
                                setCargoFilter(e.target.value);
                                setIsCargoFilterOpen(false);
                              }}
                              className="w-full h-10 px-3 bg-[#E8E8E8] border border-[#888] text-[10px] font-bold uppercase outline-none focus:border-[#1A3351] rounded-none"
                            >
                              <option value="all">TODOS OS CARGOS</option>
                              {uniqueCargos.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
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
                                  <div className="w-1.5 h-1.5 rounded-none bg-[#E31E24]" />
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
                                  <div className="w-1.5 h-1.5 rounded-none bg-[#E31E24]" />
                                )}
                              </button>
                            </div>
                          </div>
                        </ActionIconButton>
                        <ActionIconButton
                          icon={<PlusCircle className="w-4 h-4" />}
                          label="Nova licença maternidade"
                          variant="success"
                          onClick={() =>
                            router.push("/afastamentos/new?tipo=maternidade")
                          }
                        />
                      </>
                    }
                  />
                </div>
              </div>
              {/* Chips de filtros ativos */}
              <FilterChips
                searchTerm={normalizeSearchTerm(filters.searchTerm)}
                startDate={filters.startDate}
                endDate={filters.endDate}
                filterUser="all"
                filterSecretaria={filters.filterSecretaria}
                filterAsoType={filters.filterAsoType}
                referrals={[]}
                operatorsMap={{}}
                extraChips={[
                  ...(statusFilter !== "all"
                    ? [
                        {
                          key: "status",
                          label:
                            statusFilter === "active"
                              ? "Status: Ativas"
                              : statusFilter === "expired"
                                ? "Status: Vencidas"
                                : statusFilter === "alert"
                                  ? "Status: Em Alerta"
                                  : "Status: Finalizadas",
                        },
                      ]
                    : []),
                  ...(cargoFilter !== "all"
                    ? [{ key: "cargo", label: `Cargo: ${cargoFilter}` }]
                    : []),
                ]}
              />
            </section>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div
          onScroll={handleMainScroll}
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 print:hidden"
        >
          {/* STATS CARDS */}
          <StatisticCardRow columns={5} className="shrink-0">
            {[
              {
                label: "Servidoras",
                value: stats.totalServidoras,
                filter: "all" as const,
                accent: "primary" as const,
                activeClass: "bg-[#1A3351]/10",
              },
              {
                label: "Registros",
                value: stats.totalRegistros,
                filter: "all" as const,
                accent: "neutral" as const,
                activeClass: "bg-slate-100",
              },
              {
                label: "Ativas",
                value: stats.active,
                filter: "active" as const,
                accent: "success" as const,
                activeClass: "bg-emerald-50",
              },
              {
                label: "Vencendo",
                value: stats.alert,
                filter: "alert" as const,
                accent: "warning" as const,
                activeClass: "bg-amber-50",
              },
              {
                label: "Finalizadas",
                value: stats.finished,
                filter: "finished" as const,
                accent: "info" as const,
                activeClass: "bg-blue-50",
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

          {/* LISTA */}
          <div className="bg-white border-2 border-slate-300 shadow-xl overflow-visible">
            <div className="bg-[#B0B0B0] px-4 sm:px-6 py-2.5 border-b-2 border-slate-400 flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A3351]">
                Registros de Licença Maternidade
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

            <div className="divide-y divide-slate-200">
              {groupedRecords.length > 0 ? (
                groupedRecords.map((group) => (
                  <div key={group.cpf}>
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
                      cargo={group.items[0].servidor_cargo}
                      matricula={group.items[0].servidor_matricula}
                      natureza={group.items[0].natureza_cargo}
                      secretaria={group.items[0].servidor_secretaria}
                      contrato={group.items[0].servidor_contrato}
                      badges={
                        <>
                          <span className="text-[11px] font-normal px-1.5 h-5 bg-emerald-100 text-emerald-700 uppercase border border-emerald-200 flex items-center whitespace-nowrap">
                            {
                              group.items.filter(
                                (i) =>
                                  getStatus(i) === "active" ||
                                  getStatus(i) === "alert",
                              ).length
                            }{" "}
                            VIGENTE(S)
                          </span>
                          <span className="text-[11px] font-normal px-1.5 h-5 bg-slate-200 text-slate-600 uppercase border border-slate-300 flex items-center whitespace-nowrap">
                            {group.items.length} TOTAL
                          </span>
                        </>
                      }
                      actions={
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const { data: servantBonds } = await supabase
                                .from("servidores")
                                .select(
                                  "matricula, cargo, contrato, natureza_cargo, secretaria",
                                )
                                .eq("cpf", group.cpf);

                              const bonds =
                                servantBonds?.map((b) => ({
                                  matricula: b.matricula,
                                  cargo: b.cargo || b.natureza_cargo,
                                  contrato: b.contrato,
                                  natureza: b.natureza_cargo,
                                  secretaria: b.secretaria,
                                })) || [];

                              generateServidorReportPDF(
                                { nome: group.nome, cpf: group.cpf },
                                group.items,
                                bonds,
                              );
                            } catch (err) {
                              console.error("Erro ao gerar relatório:", err);
                              generateServidorReportPDF(
                                { nome: group.nome, cpf: group.cpf },
                                group.items,
                                [],
                              );
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 h-8 bg-white text-[#1A3351] hover:bg-slate-50 font-bold border border-slate-200 text-[9px] uppercase transition-all shadow-sm active:scale-95 shrink-0"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />{" "}
                          Relatório
                        </button>
                      }
                      rightMeta={
                        expandedCpf !== group.cpf ? (
                          <RecordDatePeriod
                            startDate={formatDate(group.items[0].data_inicio)}
                            endDate={formatDate(group.items[0].data_fim)}
                            endColor={
                              group.items[0].data_fim
                                ? (() => {
                                    const e = new Date(group.items[0].data_fim);
                                    e.setHours(0, 0, 0, 0);
                                    const t = new Date();
                                    t.setHours(0, 0, 0, 0);
                                    return e < t
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
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 md:px-12 py-8 bg-white border-t border-slate-100 animate-in slide-in-from-top-4 fade-in duration-500 relative z-[50] -mx-2 shadow-2xl ring-1 ring-black/5"
                      >
                        <div className="space-y-6">
                          <h5 className="text-[11px] font-bold uppercase text-slate-400 tracking-[0.2em] border-b pb-2">
                            Histórico de Licenças Maternidade
                          </h5>

                          <div className="grid grid-cols-1 gap-6">
                            {group.items.map((record) => {
                              const status = getStatus(record);
                              return (
                                <div
                                  key={record.id}
                                  className="bg-white p-6 border-2 border-slate-200 shadow-sm hover:border-[#1A3351]/30 transition-all relative overflow-visible group/card"
                                >
                                  <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-[#1A3351]/5 group-hover/card:bg-[#1A3351]/10 transition-colors" />

                                  {/* INFO GRID - 3 colunas */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                    {/* COLUNA 1: VÍNCULO */}
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                                        Vínculo do Afastamento
                                      </p>
                                      <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-medium text-slate-500 uppercase min-w-[60px]">
                                            Matrícula:
                                          </span>
                                          <span className="text-sm font-semibold text-[#1A3351]">
                                            {record.servidor_matricula}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-medium text-slate-500 uppercase min-w-[60px]">
                                            Contrato:
                                          </span>
                                          <span className="text-sm font-semibold text-[#1A3351]">
                                            {record.servidor_contrato}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-medium text-slate-500 uppercase min-w-[60px]">
                                            Cargo:
                                          </span>
                                          <span className="text-[11px] font-semibold text-[#1A3351] uppercase">
                                            {record.servidor_cargo || "---"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-medium text-slate-500 uppercase min-w-[60px]">
                                            Natureza:
                                          </span>
                                          <span className="text-[11px] font-semibold text-[#1A3351] uppercase">
                                            {record.natureza_cargo}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* COLUNA 2: DADOS ADICIONAIS */}
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                                        Dados Adicionais
                                      </p>
                                      <div className="flex flex-col gap-2 mt-1">
                                        <div>
                                          <span className="text-[10px] font-medium text-slate-500 block uppercase">
                                            Duração
                                          </span>
                                          <span className="text-sm font-semibold text-[#1A3351] flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 opacity-50" />{" "}
                                            {record.dias_afastado || "N/D"} Dias
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] font-medium text-slate-500 block uppercase">
                                            Diagnóstico (CID-10)
                                          </span>
                                          <span className="text-xs font-semibold text-[#1A3351]">
                                            {record.afastamento_cids?.length ||
                                              0}{" "}
                                            código(s) registrado(s)
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* COLUNA 3: VIGÊNCIA E TIPO */}
                                    <div className="space-y-1 md:text-right flex flex-col md:items-end">
                                      <div className="flex items-center gap-2 md:justify-end">
                                        <p className="text-sm font-semibold text-[#1A3351] uppercase truncate">
                                          {record.tipo_afastamento}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1 md:justify-end">
                                        <span className="text-xs font-medium text-slate-500 uppercase">
                                          Início:
                                        </span>
                                        <span className="text-sm font-semibold text-[#1A3351]">
                                          {formatDate(record.data_inicio)}
                                        </span>
                                      </div>
                                      <div className="flex flex-col md:items-end gap-1">
                                        <div className="flex items-center gap-2 md:justify-end">
                                          <span className="text-xs font-medium text-slate-500 uppercase">
                                            Término:
                                          </span>
                                          {record.data_fim ? (
                                            <span className="flex flex-wrap items-center gap-1.5 md:justify-end">
                                              <span
                                                className={
                                                  status === "finished"
                                                    ? "text-sm font-bold text-slate-500"
                                                    : "text-sm font-bold text-green-600"
                                                }
                                              >
                                                {formatDate(record.data_fim)}
                                              </span>
                                              <span
                                                className={`text-[9px] px-1.5 py-0.5 rounded-none border font-bold ${status === "active" || status === "alert" ? "bg-green-500 text-white border-green-600" : "bg-slate-300 text-slate-600 border-slate-400"}`}
                                              >
                                                {status === "active"
                                                  ? "VIGENTE"
                                                  : status === "alert"
                                                    ? "VENCENDO"
                                                    : "FINALIZADA"}
                                              </span>
                                            </span>
                                          ) : (
                                            <span className="text-sm font-semibold text-slate-400">
                                              ---
                                            </span>
                                          )}
                                        </div>
                                        {record.situacao !== "FINALIZADO" &&
                                          record.data_fim && (
                                            <VencimentoAlerta
                                              dateFim={record.data_fim}
                                            />
                                          )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* BOTÕES */}
                                  <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100 relative z-10 justify-start">
                                    <button
                                      onClick={() => handleViewPortaria(record)}
                                      className="flex items-center gap-1.5 px-2 py-1 bg-slate-200 text-slate-800 hover:bg-slate-300 font-bold rounded-none border border-slate-300 text-[10px] uppercase transition-all"
                                    >
                                      <Printer className="w-3 h-3" /> Portaria
                                    </button>
                                    <button
                                      onClick={() => openEditModal(record)}
                                      className="flex items-center gap-1.5 px-2 py-1 bg-[#1A3351] text-white font-bold rounded-none border border-[#0f2035] text-[10px] uppercase hover:bg-[#0f2035] active:scale-95 transition-all"
                                    >
                                      <Pencil className="w-3 h-3" /> Editar
                                    </button>
                                    <button
                                      onClick={() => openNotesModal(record)}
                                      className="flex items-center gap-1.5 px-2 py-1 bg-[#1A3351] text-white font-bold rounded-none border border-[#0f2035] text-[10px] uppercase hover:bg-[#0f2035] active:scale-95 transition-all"
                                    >
                                      <ClipboardList className="w-3 h-3" />{" "}
                                      Anotações
                                    </button>
                                    {record.situacao === "EM_ANDAMENTO" && (
                                      <button
                                        onClick={() =>
                                          router.push(
                                            `/afastamentos/new?renew_from=${record.id}&cpf=${record.servidor_cpf}&tipo=maternidade`,
                                          )
                                        }
                                        className="flex items-center gap-1.5 px-2 py-1 bg-amber-400 text-amber-900 text-[10px] font-bold rounded-none border border-amber-500 hover:bg-amber-600 hover:text-white uppercase transition-all"
                                      >
                                        <RotateCcw className="w-3 h-3" />{" "}
                                        PRORROGAR
                                      </button>
                                    )}
                                    {/* Botão CID */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const s = new Set(revealedCids);
                                        if (s.has(record.id))
                                          s.delete(record.id);
                                        else s.add(record.id);
                                        setRevealedCids(s);
                                      }}
                                      className="flex items-center gap-1.5 px-2 py-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-none text-[10px] uppercase transition-all ml-auto"
                                    >
                                      {revealedCids.has(record.id) ? (
                                        <>
                                          <EyeOff className="w-3 h-3 text-emerald-600" />{" "}
                                          Ocultar CID
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="w-3 h-3 text-emerald-600" />{" "}
                                          Revelar CID
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {/* PAINEL CID EXPANDIDO */}
                                  {revealedCids.has(record.id) && (
                                    <div className="mt-4 border-t border-slate-100 pt-3 relative z-10">
                                      <div className="flex flex-col gap-3">
                                        {record.afastamento_cids &&
                                          record.afastamento_cids.length >
                                            0 && (
                                            <div className="divide-y divide-slate-100">
                                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                                Diagnósticos CID-10
                                              </p>
                                              {record.afastamento_cids.map(
                                                (cid) => (
                                                  <CIDDetailItem
                                                    key={cid.id}
                                                    cid={cid}
                                                  />
                                                ),
                                              )}
                                            </div>
                                          )}

                                        <div className="bg-slate-50/50 p-3 rounded-none border border-slate-200/50">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                            <ClipboardList className="w-3 h-3" />{" "}
                                            Anotações do Registro
                                          </p>
                                          {record.observacoes ? (
                                            <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                                              {record.observacoes}
                                            </p>
                                          ) : (
                                            <p className="text-[10px] font-medium text-slate-400 italic">
                                              Nenhuma anotação registrada para
                                              este afastamento.
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* INFO DE AUDITORIA */}
                                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end text-[10px] items-center gap-1.5 font-normal text-slate-500 uppercase tracking-tighter relative z-10 transition-opacity hover:opacity-100 opacity-80">
                                    <span>Criado por:</span>
                                    <span className="text-slate-600">
                                      {profilesMap[record.criado_por] ||
                                        record.criado_por ||
                                        "Sistema"}
                                    </span>
                                    <span className="lowercase">
                                      (
                                      {new Date(
                                        record.criado_em,
                                      ).toLocaleString("pt-BR")}
                                      )
                                    </span>

                                    {logs[record.id] &&
                                      logs[record.id].length > 0 && (
                                        <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200">
                                          <span>Modificado por:</span>
                                          <span className="text-slate-600">
                                            {profilesMap[
                                              logs[record.id][0].alterado_por
                                            ] ||
                                              logs[record.id][0].alterado_por}
                                          </span>
                                          <span className="lowercase">
                                            (
                                            {new Date(
                                              logs[record.id][0].data_alteracao,
                                            ).toLocaleString("pt-BR")}
                                            )
                                          </span>
                                        </div>
                                      )}

                                    <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200">
                                      <span>Audit ID</span>
                                      <span className="text-slate-700 tracking-tight">
                                        #
                                        {record.hash_auditoria ||
                                          `AF-${record.id}`}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs">
                  Nenhum registro encontrado para os filtros selecionados.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL DE EDIÇÃO */}
        {isEditModalOpen && editingRecord && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-none shadow-2xl border-4 border-[#1A3351] w-full max-w-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-none-t-lg">
                <div>
                  <h3 className="text-sm font-bold text-[#1A3351] uppercase flex items-center gap-2">
                    <FileEdit className="w-5 h-5" /> Editar Licença Maternidade
                  </h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                    Auditoria ativada — alterações serão registradas.
                  </p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 text-left">
                <div className="bg-slate-100 p-4 rounded-none">
                  <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Servidor
                  </p>
                  <p className="text-base font-bold text-[#1A3351]">
                    {editingRecord.servidor_nome}
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    Matrícula: {editingRecord.servidor_matricula}
                  </p>
                </div>
                <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">
                      Data de Início
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-none font-bold text-slate-700 outline-none"
                      value={editFormData.data_inicio}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          data_inicio: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">
                      Dias de Licença
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-none font-bold text-slate-700 outline-none"
                      value={editFormData.dias_afastado}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          dias_afastado: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">
                    Diagnósticos CID-10
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-none min-h-[60px]">
                    {editFormData.cids.map((cid, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-none border border-emerald-200"
                      >
                        <span className="text-xs font-bold text-emerald-800">
                          {cid.code}
                        </span>
                        <button
                          onClick={() =>
                            setEditFormData({
                              ...editFormData,
                              cids: editFormData.cids.filter(
                                (_, idx) => idx !== i,
                              ),
                            })
                          }
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {editFormData.cids.length === 0 && (
                      <span className="text-xs font-bold text-slate-400 italic">
                        Nenhum CID selecionado.
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="BUSCAR NOVO CID..."
                      className="w-full px-10 py-3 bg-slate-50 border border-slate-300 rounded-none font-bold text-slate-700 text-xs outline-none uppercase"
                      value={cidEditInput}
                      onChange={(e) =>
                        setCidEditInput(e.target.value.toUpperCase())
                      }
                    />
                    {foundCids.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 shadow-xl rounded-none max-h-[200px] overflow-y-auto z-[160]">
                        {foundCids.map((cid, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              const normalized = normalizeCID(cid.code);
                              if (
                                !editFormData.cids.find(
                                  (c) => normalizeCID(c.code) === normalized,
                                )
                              ) {
                                setEditFormData({
                                  ...editFormData,
                                  cids: [
                                    ...editFormData.cids,
                                    { ...cid, code: normalized },
                                  ],
                                });
                              }
                              setCidEditInput("");
                              setFoundCids([]);
                            }}
                            className="w-full text-left px-4 py-3 border-b hover:bg-emerald-50 transition-colors flex flex-col gap-1"
                          >
                            <span className="text-xs font-bold text-emerald-700">
                              {cid.code}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 truncate">
                              {cid.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-none-b-lg flex justify-end gap-3">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-[#1A3351] text-white font-bold text-xs uppercase rounded-none flex items-center gap-2"
                >
                  {isSavingEdit ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}{" "}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE ANOTAÇÕES */}
        {isNotesModalOpen && editingRecord && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
            <div className="bg-white rounded-none shadow-2xl border-4 border-[#1A3351] w-full max-w-lg flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-none-t-lg">
                <h3 className="text-sm font-bold text-[#1A3351] uppercase flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" /> Anotações da Licença
                </h3>
                <button
                  onClick={() => setIsNotesModalOpen(false)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-slate-100 px-4 py-3 rounded-none border border-slate-200 mb-2">
                  <p className="text-[10px] font-bold uppercase text-slate-500 leading-none mb-1">
                    Servidor
                  </p>
                  <p className="text-sm font-bold text-[#1A3351]">
                    {editingRecord.servidor_nome}
                  </p>
                </div>
                <textarea
                  className="w-full p-4 bg-slate-50 border border-slate-300 rounded-none font-bold text-slate-700 text-xs outline-none min-h-[200px] resize-none focus:border-[#1A3351] focus:ring-1 focus:ring-[#1A3351] transition-all"
                  placeholder="INSIRA AQUI OBSERVAÇÕES ADICIONAIS SOBRE ESTA LICENÇA..."
                  value={noteFormData}
                  onChange={(e) =>
                    setNoteFormData(e.target.value.toUpperCase())
                  }
                  autoFocus
                />
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-none-b-lg flex justify-end gap-3">
                <button
                  onClick={() => setIsNotesModalOpen(false)}
                  disabled={isSavingNote}
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleNoteSave}
                  disabled={isSavingNote}
                  className="px-6 py-2.5 bg-[#1A3351] text-white font-bold text-xs uppercase rounded-none flex items-center gap-2"
                >
                  {isSavingNote ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}{" "}
                  Salvar Anotação
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RELATÓRIO PDF */}
        <div
          id="print-area"
          className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 pt-1 overflow-y-auto"
        >
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
                Relatório Gerencial de Licenças Maternidade
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

          <div className="flex items-center justify-between bg-slate-50/50 p-1 mb-2 border border-slate-100 rounded-none">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3.5 bg-[#E31E24]" />
              <p className="text-[8px] font-bold uppercase text-[#1A3351]">
                REGISTROS:{" "}
                <span className="text-[#E31E24]">{filteredRecords.length}</span>
              </p>
            </div>
            <p className="text-[7.5px] font-medium uppercase text-slate-400 truncate max-w-[60%] italic">
              FILTROS: {printFiltersDesc}
            </p>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-300">
                <th className="p-1 px-2 text-[8px] font-bold uppercase text-slate-500 text-left border border-slate-200">
                  Nome do Servidor
                </th>
                <th className="p-1 px-2 text-[8px] font-bold uppercase text-slate-500 text-left border border-slate-200">
                  Identificação
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
              {filteredRecords
                .sort((a, b) => a.servidor_nome.localeCompare(b.servidor_nome))
                .map((record, index) => (
                  <tr
                    key={index}
                    className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"} border-b border-slate-100`}
                  >
                    <td className="p-0.5 px-2 border border-slate-100 font-medium max-w-[200px]">
                      <p className="text-[9px] font-bold text-slate-700 uppercase leading-tight truncate">
                        {record.servidor_nome}
                      </p>
                      <p className="text-[7.5px] text-slate-400 font-medium mt-0.5 uppercase tracking-tighter truncate">
                        {record.servidor_cargo ||
                          record.natureza_cargo ||
                          "---"}
                      </p>
                    </td>
                    <td className="p-0.5 px-2 border border-slate-100 uppercase">
                      <div className="flex flex-col leading-tight">
                        <span className="text-[8px] text-slate-500 mb-0.5">
                          <span className="font-bold text-slate-400">
                            MATRI:
                          </span>{" "}
                          {record.servidor_matricula}
                        </span>
                        {record.servidor_contrato && (
                          <span className="text-[8px] text-slate-500">
                            <span className="font-bold text-slate-400">
                              CONTRATO:
                            </span>{" "}
                            {record.servidor_contrato}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-0.5 text-[8px] font-bold text-[#1A3351] border border-slate-100 text-center whitespace-nowrap">
                      {formatDate(record.data_inicio)}
                    </td>
                    <td className="p-0.5 text-[8px] font-bold text-[#E31E24] border border-slate-100 text-center whitespace-nowrap">
                      {formatDate(record.data_fim)}
                    </td>
                    <td className="p-0.5 px-2 text-[8px] font-normal text-slate-400 border border-slate-100 uppercase leading-tight truncate max-w-[180px]">
                      {record.servidor_secretaria || "---"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="mt-4 pt-1 border-t border-slate-100 flex justify-center items-center opacity-60">
            <p className="text-[7.5px] font-normal text-slate-500">
              Gerado via SESMT SYSTEM - Powered by UXBRAS®
            </p>
          </div>
        </div>

        <style jsx global>{`
          @media print {
            html,
            body {
              height: auto !important;
              overflow: visible !important;
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            #print-area {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              z-index: 99999 !important;
              background: white !important;
            }

            #print-area table {
              width: 100% !important;
              border-collapse: collapse !important;
            }

            #print-area tr {
              page-break-inside: avoid !important;
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
