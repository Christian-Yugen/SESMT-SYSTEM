"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  FileSearch,
  Activity,
  X,
  Menu,
  ChevronDown,
  ChevronUp,
  History as HistoryIcon,
  BarChart3,
  User,
  ClipboardList,
  Printer,
  Trash2,
  AlertCircle,
  Building2,
  Loader2,
  Clock3,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { ensureISO } from "@/lib/utils";
import Sidebar from "@/components/layout/Sidebar";
import CompactFilterBar from "@/components/filters/CompactFilterBar";
import FilterChips from "@/components/filters/FilterChips";
import ActionIconButton from "@/components/filters/ActionIconButton";
import {
  type FilterState,
  countActiveFilters,
  matchesUnifiedNameCpfSearch,
  normalizeSearchTerm,
} from "@/components/filters/filtersUtils";
import type { ExamEntry } from "@/types";

/** Entrada de histórico de edições de auditoria do ASO. */
interface EditHistoryEntry {
  user: string;
  timestamp: string;
  motivo?: string;
  changes?: {
    old: Record<string, unknown>;
    new: Record<string, unknown>;
  };
}

/** Registro de função occupacional retornado da tabela `funcoes`. */
interface FuncaoRecord {
  id: number;
  nome: string;
  ghe: string;
  cod?: string;
  aso_type?: string;
}

/** Dados do formulário de edição / reemissão de ASO 2.0. */
interface EditFormData {
  servidor_nome: string;
  servidor_cpf: string;
  servidor_nascimento: string;
  cargo?: string;
  secretaria?: string;
  aso_type: string;
  function_name: string;
  function_ghe: string;
  risks: string;
  exams: ExamEntry[];
  contrato: string;
  motivo_alteracao: string;
}

interface HistoryEntry {
  id: number;
  servidor_cpf: string;
  servidor_nome: string;
  aso_type: string;
  cargo?: string;
  secretaria?: string;
  contrato?: string;
  ghe_conj?: string;
  operator_name?: string;
  generated_at: string;
  generated_by: string;
  deletion_pending?: boolean;
  // Campos ASO 2.0
  servidor_nascimento?: string;
  exams_json?: { name: string; date: string }[];
  risks?: string;
  function_name?: string;
  edit_history?: EditHistoryEntry[];
  // Campo virtual para permissões
  creator_role?: string;
}

type HistoryFilters = FilterState & {
  filterShift: string;
  selectedAsoSubtypes: string[];
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const INITIAL_FILTERS: HistoryFilters = {
    searchTerm: "",
    startDate: "",
    endDate: "",
    filterUser: "all",
    filterSecretaria: "all",
    filterAsoType: "all",
    filterShift: "all",
    selectedAsoSubtypes: [],
  };
  const [filters, setFilters] = useState<HistoryFilters>(INITIAL_FILTERS);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [, setPrintLayout] = useState<"portrait" | "landscape">("landscape");
  const [isPrintPopoverOpen, setIsPrintPopoverOpen] = useState(false);
  const [userName, setUserName] = useState<string>("Usuário");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

  // Estados para o modal de exclusão
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [selectedEntryForDeletion, setSelectedEntryForDeletion] =
    useState<HistoryEntry | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [processingDeletion, setProcessingDeletion] = useState(false);

  const [isAsoSubtypeFilterOpen, setIsAsoSubtypeFilterOpen] = useState(false);
  const [isShiftFilterOpen, setIsShiftFilterOpen] = useState(false);

  const setSearchTerm = (value: string) => {
    setFilters((prev) => ({ ...prev, searchTerm: value }));
  };
  const setFilterUser = (value: string) => {
    setFilters((prev) => ({ ...prev, filterUser: value }));
  };
  const setFilterType = (value: string) => {
    setFilters((prev) => ({ ...prev, filterAsoType: value }));
  };
  const setFilterSecretaria = (value: string) => {
    setFilters((prev) => ({ ...prev, filterSecretaria: value }));
  };
  const setStartDate = (value: string) => {
    setFilters((prev) => ({ ...prev, startDate: value }));
  };
  const setEndDate = (value: string) => {
    setFilters((prev) => ({ ...prev, endDate: value }));
  };
  const setSelectedAsoSubtypes = (value: string[]) => {
    setFilters((prev) => ({ ...prev, selectedAsoSubtypes: value }));
  };
  const setFilterShift = (value: string) => {
    setFilters((prev) => ({ ...prev, filterShift: value }));
  };
  const clearAllFilters = () => {
    setFilters(INITIAL_FILTERS);
    setIsDateFilterOpen(false);
    setIsAsoSubtypeFilterOpen(false);
    setIsShiftFilterOpen(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
    }, 180);
    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  const [sortOrder, setSortOrder] = useState("date-desc");
  const {
    searchTerm,
    startDate,
    endDate,
    filterUser,
    filterSecretaria,
    filterAsoType: filterType,
    filterShift,
    selectedAsoSubtypes,
  } = filters;

  useEffect(() => {
    // Delay para permitir transição suave do popover anterior
    const timer = setTimeout(() => {
      if (filterType === "ASO") {
        setIsAsoSubtypeFilterOpen(true);
        return;
      }

      setSelectedAsoSubtypes([]);
      setIsAsoSubtypeFilterOpen(false);
    }, 200); // Aguarda o popover anterior fechar (150ms) + margem (50ms)

    return () => clearTimeout(timer);
  }, [filterType]);

  const baseActiveFilterCount = countActiveFilters({
    searchTerm,
    startDate,
    endDate,
    filterUser,
    filterSecretaria,
    filterAsoType: filterType,
  });
  const headerActiveFilterCount =
    baseActiveFilterCount +
    (filterShift !== "all" ? 1 : 0) +
    (selectedAsoSubtypes.length > 0 ? 1 : 0);

  // Estados para Edição ASO 2.0
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Estados para o Smart Header (Scroll)
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [scrollUpStart, setScrollUpStart] = useState(0);

  // Estados de busca (UI) e carregamento
  const [cargoSearch, setCargoSearch] = useState("");
  const [filteredCargosSearch, setFilteredCargosSearch] = useState<string[]>(
    [],
  );
  const [isSearchingCargo, setIsSearchingCargo] = useState(false);

  const [secretariaSearch, setSecretariaSearch] = useState("");
  const [filteredSecretariasSearch, setFilteredSecretariasSearch] = useState<
    string[]
  >([]);
  const [isSearchingSecretaria, setIsSearchingSecretaria] = useState(false);

  const [funcoesSearch, setFuncoesSearch] = useState("");
  const [filteredFuncoes, setFilteredFuncoes] = useState<FuncaoRecord[]>([]);
  const [isSearchingFuncao, setIsSearchingFuncao] = useState(false);
  const [profilesData, setProfilesData] = useState<
    Record<string, { email: string; role: string }>
  >({});

  // Busca de Cargo no Servidor com Debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!cargoSearch || cargoSearch.length < 2) {
        setFilteredCargosSearch([]);
        return;
      }

      setIsSearchingCargo(true);
      try {
        const { data } = await supabase
          .from("servidores")
          .select("cargo")
          .ilike("cargo", `%${cargoSearch}%`)
          .not("cargo", "is", null)
          .limit(50);

        if (data) {
          const unique = Array.from(new Set(data.map((s) => s.cargo))).filter(
            Boolean,
          ) as string[];
          // Ordenação inteligente: prefixo primeiro
          const term = cargoSearch.toUpperCase();
          unique.sort((a, b) => {
            const aStart = a.toUpperCase().startsWith(term);
            const bStart = b.toUpperCase().startsWith(term);
            if (aStart && !bStart) return -1;
            if (!aStart && bStart) return 1;
            return a.localeCompare(b);
          });
          setFilteredCargosSearch(unique.slice(0, 20));
        }
      } finally {
        setIsSearchingCargo(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [cargoSearch]);

  // Busca de Secretaria no Servidor com Debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!secretariaSearch || secretariaSearch.length < 2) {
        setFilteredSecretariasSearch([]);
        return;
      }

      setIsSearchingSecretaria(true);
      try {
        const { data } = await supabase
          .from("servidores")
          .select("secretaria")
          .ilike("secretaria", `%${secretariaSearch}%`)
          .not("secretaria", "is", null)
          .limit(50);

        if (data) {
          const unique = Array.from(
            new Set(data.map((s) => s.secretaria)),
          ).filter(Boolean) as string[];
          const term = secretariaSearch.toUpperCase();
          unique.sort((a, b) => {
            const aStart = a.toUpperCase().startsWith(term);
            const bStart = b.toUpperCase().startsWith(term);
            if (aStart && !bStart) return -1;
            if (!aStart && bStart) return 1;
            return a.localeCompare(b);
          });
          setFilteredSecretariasSearch(unique.slice(0, 20));
        }
      } finally {
        setIsSearchingSecretaria(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [secretariaSearch]);

  // Busca de Função no Servidor com Debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!funcoesSearch || funcoesSearch.length < 1) {
        setFilteredFuncoes([]);
        return;
      }

      setIsSearchingFuncao(true);
      try {
        const { data } = await supabase
          .from("funcoes")
          .select("*")
          .or(`nome.ilike.%${funcoesSearch}%,cod.ilike.%${funcoesSearch}%`)
          .limit(100);

        if (data) {
          const term = funcoesSearch.toUpperCase();
          data.sort((a, b) => {
            const aName = (a.nome || "").toUpperCase();
            const bName = (b.nome || "").toUpperCase();
            const aStart = aName.startsWith(term);
            const bStart = bName.startsWith(term);
            if (aStart && !bStart) return -1;
            if (!aStart && bStart) return 1;
            return aName.localeCompare(bName);
          });
          setFilteredFuncoes(data.slice(0, 30));
        }
      } finally {
        setIsSearchingFuncao(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [funcoesSearch]);

  // Efeito para sincronizar riscos e exames quando muda o Tipo de ASO ou a Função
  useEffect(() => {
    async function syncExamsAndRisks() {
      if (
        !isEditModalOpen ||
        !editFormData?.function_ghe ||
        !editFormData?.aso_type
      )
        return;

      // Mapeia tipo do formulário para o tipo no exames_config
      let typeInternal = "admissional";
      const formType = editFormData.aso_type;
      if (formType === "Demissional") typeInternal = "demissional";
      else if (formType === "Periódico")
        typeInternal = "admissional"; // Geralmente segue admissional ou tem campo próprio? page.tsx usa admissional/demissional
      else if (formType === "Mudança de Função") typeInternal = "admissional";
      else if (formType === "Retorno ao Trabalho") typeInternal = "admissional";

      const { data, error } = await supabase
        .from("exames_config")
        .select("*")
        .eq("aso_type", typeInternal)
        .eq("ghe", editFormData.function_ghe)
        .single();

      if (data && !error) {
        // Só atualiza se o usuário realmente trocou algo (para não sobrescrever datas já editadas se apenas abrir o modal)
        // Mas aqui o gatilho é a mudança de GHE ou Tipo, então é seguro.
        const newExams = data.exames.map((name: string) => ({
          name: name,
          date: new Date().toLocaleDateString("pt-BR"),
        }));

        setEditFormData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            risks: data.riscos + (data.detalhes ? `\n${data.detalhes}` : ""),
            exams: newExams,
          };
        });
      }
    }
    syncExamsAndRisks();
  }, [editFormData?.aso_type, editFormData?.function_ghe, isEditModalOpen]);

  const loadHistory = useCallback(async () => {
    setLoading(true);

    // Força o Next.js a atualizar o cache do roteador
    router.refresh();

    // Carrega o histórico com um "cache breaker" manual
    const cacheBreaker = Date.now();

    // Buscamos o histórico e os perfis em paralelo
    const [histRes, profRes] = await Promise.all([
      supabase
        .from("aso_history")
        .select("*")
        .neq("id", -cacheBreaker)
        .order("generated_at", { ascending: false }),
      supabase.from("profiles").select("id, email, role"),
    ]);

    const profMap: Record<string, { email: string; role: string }> = {};
    if (profRes.data) {
      profRes.data.forEach((p) => {
        profMap[p.id] = { email: p.email, role: p.role };
      });
      setProfilesData(profMap);
    }

    if (!histRes.error && histRes.data) {
      // Injetamos o creator_role para facilitar a lógica de UI
      const enrichedHistory = histRes.data.map((h) => ({
        ...h,
        creator_role: profMap[h.generated_by]?.role || "unknown",
      }));
      setHistory(enrichedHistory);
    } else if (histRes.error) {
      console.error("Erro ao carregar histórico:", histRes.error);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { session, error } = await safeGetSession();
        if (error) {
          await handleAuthError(error);
          return;
        }

        if (session) {
          setCurrentUserId(session.user.id);
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
        } else {
          router.push("/login");
          return;
        }
        loadHistory();
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
  }, [router, loadHistory]);

  // Redirecionamento para perfis sem acesso ao histórico
  useEffect(() => {
    if (userRole === "social_assistant") {
      router.push("/abono");
    } else if (userRole === "operator" || userRole === "viewer") {
      router.push("/");
    }
  }, [userRole, router]);

  const uniqueUsersList = useMemo(
    () => Array.from(new Set(history.map((h) => h.generated_by))),
    [history],
  );
  const uniqueSecretarias = useMemo(
    () =>
      Array.from(
        new Set(history.map((h) => h.secretaria).filter(Boolean)),
      ).sort() as string[],
    [history],
  );
  const operatorsMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(profilesData).forEach(([id, profile]) => {
      map[id] = profile.email;
    });
    return map;
  }, [profilesData]);
  const historyTypeOptions = useMemo(
    () => ["all", "ASO", "Encaminhamento"],
    [],
  );

  const filteredHistory = history.filter((entry) => {
    const matchesSearch = matchesUnifiedNameCpfSearch(
      entry.servidor_nome,
      entry.servidor_cpf,
      debouncedSearchTerm,
    );
    const matchesUser =
      filters.filterUser === "all" || entry.generated_by === filters.filterUser;
    const matchesSecretaria =
      filters.filterSecretaria === "all" ||
      entry.secretaria === filters.filterSecretaria;
    const asoTypeRaw = entry.aso_type || "";
    const entryType = asoTypeRaw.toLowerCase().includes("aso")
      ? "ASO"
      : asoTypeRaw.toLowerCase().includes("encaminhamento")
        ? "Encaminhamento"
        : "Outros";
    const matchesType =
      filters.filterAsoType === "all" || entryType === filters.filterAsoType;

    const matchesAsoSubtype =
      filters.selectedAsoSubtypes.length === 0 ||
      (entryType === "ASO" &&
        filters.selectedAsoSubtypes.some((sub) =>
          entry.aso_type.toUpperCase().includes(sub.toUpperCase()),
        ));

    // Filtro de Data
    // Filtro de Data - Proteção contra datas inválidas
    let entryDate = "";
    try {
      if (entry.generated_at) {
        entryDate = new Date(entry.generated_at).toISOString().split("T")[0];
      }
    } catch {
      console.error("Data inválida:", entry.generated_at);
    }
    const matchesStartDate =
      !filters.startDate || entryDate >= filters.startDate;
    const matchesEndDate = !filters.endDate || entryDate <= filters.endDate;

    // Filtro de Turno (Manhã: 07:00-12:59, Tarde: 13:00-18:00)
    let matchesShift = true;
    if (filters.filterShift !== "all") {
      const date = new Date(entry.generated_at);
      // Ajustar para o fuso horário local se necessário, mas o Supabase retorna UTC.
      // Para simplicidade e conforme pedido, vamos checar a hora bruta.
      const hour = date.getHours();
      if (filters.filterShift === "morning") {
        matchesShift = hour >= 7 && hour < 13;
      } else if (filters.filterShift === "afternoon") {
        matchesShift = hour >= 13 && hour <= 18;
      }
    }

    return (
      matchesSearch &&
      matchesUser &&
      matchesType &&
      matchesAsoSubtype &&
      matchesSecretaria &&
      matchesStartDate &&
      matchesEndDate &&
      matchesShift
    );
  });

  // Estatísticas Dinâmicas (Baseadas no Histórico Filtrado)
  const stats = useMemo(() => {
    const total = filteredHistory.length;
    const asos = filteredHistory.filter((h) =>
      h.aso_type.toLowerCase().includes("aso"),
    ).length;
    const encs = filteredHistory.filter((h) =>
      h.aso_type.toLowerCase().includes("encaminhamento"),
    ).length;
    const uniqueUsers = new Set(filteredHistory.map((h) => h.generated_by))
      .size;
    return { total, asos, encs, uniqueUsers };
  }, [filteredHistory]);

  // Ordenação Final
  const sortedHistory = useMemo(() => {
    const base = [...filteredHistory];
    if (sortOrder === "alpha") {
      return base.sort((a, b) =>
        (a.servidor_nome || "").localeCompare(b.servidor_nome || "", "pt-BR"),
      );
    }
    // default: date desc
    return base.sort(
      (a, b) =>
        new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
    );
  }, [filteredHistory, sortOrder]);

  // Funções para exclusão de registros
  const handleRequestDeletion = (entry: HistoryEntry) => {
    setSelectedEntryForDeletion(entry);
    setDeletionReason("");
    setShowDeletionModal(true);
  };

  const confirmDeletionRequest = async () => {
    if (!selectedEntryForDeletion || !currentUserId) return;

    if (!deletionReason.trim()) {
      alert("Por favor, descreva o motivo da exclusão.");
      return;
    }

    if (
      !confirm(
        "Tem certeza que deseja solicitar a exclusão deste registro? Esta solicitação será enviada para aprovação do administrador.",
      )
    ) {
      return;
    }

    setProcessingDeletion(true);
    try {
      // Obter nome do operador atual
      const { data: profileData } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", currentUserId)
        .single();

      // Criar solicitação de exclusão
      const { error: insertError } = await supabase
        .from("deletion_requests")
        .insert({
          history_record_id: selectedEntryForDeletion.id,
          requester_id: currentUserId,
          requester_name: profileData?.email || "Desconhecido",
          deletion_reason: deletionReason.trim(),
          status: "pending",
          original_data: {
            servidor_cpf: selectedEntryForDeletion.servidor_cpf,
            servidor_nome: selectedEntryForDeletion.servidor_nome,
            aso_type: selectedEntryForDeletion.aso_type,
            cargo: selectedEntryForDeletion.cargo,
            secretaria: selectedEntryForDeletion.secretaria,
            generated_at: selectedEntryForDeletion.generated_at,
          },
        });

      if (insertError) {
        console.error("Erro ao criar solicitação:", insertError);
        alert("Erro ao criar solicitação de exclusão: " + insertError.message);
        setProcessingDeletion(false);
        return;
      }

      // Marcar o registro como pendente de exclusão
      const { error: updateError } = await supabase
        .from("aso_history")
        .update({ deletion_pending: true })
        .eq("id", selectedEntryForDeletion.id);

      if (updateError) {
        console.error("Erro ao atualizar registro:", updateError);
      }

      alert(
        "Solicitação de exclusão enviada com sucesso! Aguarde aprovação do administrador.",
      );
      setShowDeletionModal(false);
      setSelectedEntryForDeletion(null);
      setDeletionReason("");
      loadHistory(); // Recarregar histórico
    } catch (err) {
      console.error("Erro ao solicitar exclusão:", err);
      alert("Erro ao processar solicitação de exclusão.");
    }
    setProcessingDeletion(false);
  };

  // Função para gerar relatório de impressão (SEM CPF POR PRIVACIDADE)
  const handlePrintReport = async () => {
    const { session } = await safeGetSession();
    const userName =
      session?.user?.email?.split("@")[0].toUpperCase() || "SISTEMA";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const today = new Date().toLocaleDateString("pt-BR");
    const usedTypesSet = new Set<string>();
    filteredHistory.forEach((h) => {
      const t = (h.aso_type || "").toUpperCase();
      const prefix = t.includes("ENCAMINHAMENTO") ? "ENC" : "ASO";
      let suffix = "";
      if (t.includes("ADMISS")) suffix = "ADM";
      else if (t.includes("DEMISS")) suffix = "DEM";
      else if (t.includes("RETORNO")) suffix = "RET";
      else if (t.includes("MUDANÇA")) suffix = "MUD";
      else if (t.includes("PERIÓDIC")) suffix = "PER";
      if (suffix) usedTypesSet.add(`${prefix}|${suffix}`);
    });

    const dynamicLegendHTML = Array.from(usedTypesSet)
      .sort()
      .map((key) => {
        const [pref, suff] = key.split("|");
        const fullPref = pref === "ENC" ? "ENCAMINHAMENTO" : "ASO";
        let fullSuff = "";
        if (suff === "ADM") fullSuff = "ADMISSIONAL";
        else if (suff === "DEM") fullSuff = "DEMISSIONAL";
        else if (suff === "RET") fullSuff = "RETORNO AO TRABALHO";
        else if (suff === "MUD") fullSuff = "MUDANÇA DE FUNÇÃO";
        else if (suff === "PER") fullSuff = "PERIÓDICO";
        return `<div class="legend-item"><span>${pref} ${suff}:</span> ${fullPref} ${fullSuff}</div>`;
      })
      .join("");

    const abbreviateType = (type: string) => {
      const t = (type || "").toUpperCase();
      const prefix = t.includes("ENCAMINHAMENTO") ? "ENC" : "ASO";
      if (t.includes("ADMISS")) return `${prefix} ADM`;
      if (t.includes("DEMISS")) return `${prefix} DEM`;
      if (t.includes("RETORNO")) return `${prefix} RET`;
      if (t.includes("MUDANÇA")) return `${prefix} MUD`;
      if (t.includes("PERIÓDIC")) return `${prefix} PER`;
      return t.length > 10 ? t.substring(0, 10) + "..." : t;
    };

    const rows = sortedHistory
      .map((entry) => {
        const fullDate = new Date(entry.generated_at).toLocaleString("pt-BR");
        const [date, time] = fullDate.split(" ");
        const timeShort = time ? time.substring(0, 5) : "";

        return `
              <tr>
                <td class="datetime-cell">
                    <span class="date-part">${date}</span>
                    <span class="time-part">${timeShort}</span>
                </td>
                <td>${entry.servidor_nome}</td>
                <td style="color: #1A3351; text-align: center;">${abbreviateType(entry.aso_type)}</td>
                <td>${entry.cargo || "-"}</td>
                <td>${entry.secretaria || "-"}</td>
              </tr>
            `;
      })
      .join("");

    const logoUrl = window.location.origin + "/images/logo.png";

    const formatFilterDate = (dateStr: string) => {
      if (!dateStr) return null;
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    };

    const displayStartDate = formatFilterDate(startDate) || "INÍCIO";
    const displayEndDate = formatFilterDate(endDate) || "HOJE";

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Gerencial SESMT - ${today}</title>
          <style>
            body { font-family: sans-serif; padding: 15px; color: #333; line-height: 1.0; }
            .official-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E31E24; padding-bottom: 8px; margin-bottom: 12px; }
            .logo-area img { height: 35px; width: auto; }
            .report-title-area { text-align: right; }
            .report-title-area h1 { margin: 0; font-size: 13px; color: #1A3351; text-transform: uppercase; font-weight: 900; }
            .report-info { font-size: 7.5px; color: #666; font-weight: bold; text-transform: uppercase; margin-top: 1px; }

            .legend-bar { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 6px; color: #888; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; background: #f8f8f8; padding: 3px 6px; border-radius: 0px; border: 1px solid #f0f0f0; }
            .legend-item { display: flex; gap: 3px; }

            table { width: 100%; border-collapse: collapse; margin-top: 3px; table-layout: fixed; }
            th { background-color: #1A3351; color: white; border: 1px solid #ccc; padding: 4px; text-align: left; font-size: 7.5px; text-transform: uppercase; }
            td { border: 1px solid #eee; padding: 2px 4px; text-transform: uppercase; font-size: 7.5px; word-wrap: break-word; color: #444; vertical-align: middle; }

            .datetime-cell { text-align: center; line-height: 1.0; }
            .date-part { display: block; }
            .time-part { display: block; font-size: 7.5px; color: #777; }

            @media print and (orientation: landscape) {
                body { padding: 8px; }
                .date-part, .time-part { display: inline; font-size: 7.5px; color: inherit; }
                .date-part::after { content: " "; }
                td, th { padding: 1.5px 4px; }
                .official-header { margin-bottom: 5px; padding-bottom: 4px; }
                .legend-bar { margin-bottom: 4px; }
            }

            .stats-bar { font-size: 8px; font-weight: 900; margin-bottom: 5px; color: #1A3351; text-transform: uppercase; border-left: 3px solid #E31E24; padding-left: 8px; }
            .footer { margin-top: 20px; font-size: 7px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
            .lgpd-box { background: #fcfcfc; border: 1px solid #e0e0e0; padding: 10px; margin-top: 15px; border-radius: 0px; }
            .lgpd-title { font-size: 8px; font-weight: 900; color: #1A3351; text-transform: uppercase; margin-bottom: 4px; display: block; }
            .lgpd-text { font-size: 8px; color: #333; text-align: justify; margin: 0; line-height: 1.4; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="official-header">
            <div class="logo-area">
              <img src="${logoUrl}" alt="Logo" />
            </div>
            <div class="report-title-area">
              <h1>Relatório de Emissões Operacionais</h1>
              <div class="report-info">
                Operador: ${userName} | Data: ${today}
              </div>
              <div class="report-info" style="color: #E31E24;">
                FILTRO: ${displayStartDate} À ${displayEndDate}
              </div>
            </div>
          </div>

          <div class="stats-bar">
            Total de registros: ${filteredHistory.length}
          </div>

          ${dynamicLegendHTML ? `<div class="legend-bar">LEGENDA: ${dynamicLegendHTML}</div>` : ""}

          <table>
            <thead>
              <tr>
                <th style="width: 9%; text-align: center;">Data/Hora</th>
                <th style="width: 30%;">Nome do Servidor</th>
                <th style="width: 7%; text-align: center;">Tipo</th>
                <th style="width: 27%;">Cargo</th>
                <th style="width: 27%;">Secretaria</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="lgpd-box">
            <span class="lgpd-title">IMPORTANTE: Privacidade e Proteção de Dados (LGPD)</span>
            <p class="lgpd-text">
                Este relatório atende à Lei nº 13.709/2018 (LGPD). Uso exclusivo para gestão operacional do SESMT.
                Proibido compartilhamento com terceiros. O uso indevido sujeita o infrator às sanções administrativas e legais previstas na legislação vigente.
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

  void handlePrintReport;

  const handlePrintRequest = (layout: "portrait" | "landscape") => {
    setPrintLayout(layout);
    setIsPrintPopoverOpen(false);
    generatePrintReportWithLayout(layout);
  };

  const generatePrintReportWithLayout = async (
    layout: "portrait" | "landscape",
  ) => {
    const { session } = await safeGetSession();
    const userName =
      session?.user?.email?.split("@")[0].toUpperCase() || "SISTEMA";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const today = new Date().toLocaleDateString("pt-BR");
    const usedTypesSet = new Set<string>();
    filteredHistory.forEach((h) => {
      const t = (h.aso_type || "").toUpperCase();
      const prefix = t.includes("ENCAMINHAMENTO") ? "ENC" : "ASO";
      let suffix = "";
      if (t.includes("ADMISS")) suffix = "ADM";
      else if (t.includes("DEMISS")) suffix = "DEM";
      else if (t.includes("RETORNO")) suffix = "RET";
      else if (t.includes("MUDANÇA")) suffix = "MUD";
      else if (t.includes("PERIÓDIC")) suffix = "PER";
      if (suffix) usedTypesSet.add(`${prefix}|${suffix}`);
    });

    const dynamicLegendHTML = Array.from(usedTypesSet)
      .sort()
      .map((key) => {
        const [pref, suff] = key.split("|");
        const fullPref = pref === "ENC" ? "ENCAMINHAMENTO" : "ASO";
        let fullSuff = "";
        if (suff === "ADM") fullSuff = "ADMISSIONAL";
        else if (suff === "DEM") fullSuff = "DEMISSIONAL";
        else if (suff === "RET") fullSuff = "RETORNO AO TRABALHO";
        else if (suff === "MUD") fullSuff = "MUDANÇA DE FUNÇÃO";
        else if (suff === "PER") fullSuff = "PERIÓDICO";
        return `<div class="legend-item"><span>${pref} ${suff}:</span> ${fullPref} ${fullSuff}</div>`;
      })
      .join("");

    const abbreviateType = (type: string) => {
      const t = (type || "").toUpperCase();
      const prefix = t.includes("ENCAMINHAMENTO") ? "ENC" : "ASO";
      if (t.includes("ADMISS")) return `${prefix} ADM`;
      if (t.includes("DEMISS")) return `${prefix} DEM`;
      if (t.includes("RETORNO")) return `${prefix} RET`;
      if (t.includes("MUDANÇA")) return `${prefix} MUD`;
      if (t.includes("PERIÓDIC")) return `${prefix} PER`;
      return t.length > 10 ? t.substring(0, 10) + "..." : t;
    };

    const rows = sortedHistory
      .map((entry) => {
        const fullDate = new Date(entry.generated_at).toLocaleString("pt-BR");
        const [date, time] = fullDate.split(" ");
        const timeShort = time ? time.substring(0, 5) : "";

        return `
              <tr>
                <td class="datetime-cell">
                    <span class="date-part">${date}</span>
                    <span class="time-part">${timeShort}</span>
                </td>
                <td>${entry.servidor_nome}</td>
                <td style="color: #1A3351; text-align: center;">${abbreviateType(entry.aso_type)}</td>
                <td>${entry.cargo || "-"}</td>
                <td>${entry.secretaria || "-"}</td>
              </tr>
            `;
      })
      .join("");

    const logoUrl = window.location.origin + "/images/logo.png";
    const displayStartDate = startDate
      ? new Date(startDate + "T00:00:00").toLocaleDateString("pt-BR")
      : "INÍCIO";
    const displayEndDate = endDate
      ? new Date(endDate + "T00:00:00").toLocaleDateString("pt-BR")
      : "HOJE";

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Gerencial SESMT - ${today}</title>
          <style>
            @page { size: ${layout}; margin: 1cm; }
            body { font-family: sans-serif; padding: 10px; color: #333; line-height: 1.0; }
            .official-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E31E24; padding-bottom: 8px; margin-bottom: 12px; }
            .logo-area img { height: 35px; width: auto; }
            .report-title-area { text-align: right; }
            .report-title-area h1 { margin: 0; font-size: 13px; color: #1A3351; text-transform: uppercase; font-weight: 900; }
            .report-info { font-size: 7.5px; color: #666; font-weight: bold; text-transform: uppercase; margin-top: 1px; }

            .legend-bar { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 6px; color: #888; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; background: #f8f8f8; padding: 3px 6px; border-radius: 0px; border: 1px solid #f0f0f0; }
            .legend-item { display: flex; gap: 3px; }

            table { width: 100%; border-collapse: collapse; margin-top: 3px; table-layout: fixed; }
            th { background-color: #1A3351; color: white; border: 1px solid #ccc; padding: 4px; text-align: left; font-size: 7.5px; text-transform: uppercase; }
            td { border: 1px solid #eee; padding: 2px 4px; text-transform: uppercase; font-size: 7.5px; word-wrap: break-word; color: #444; vertical-align: middle; }

            .datetime-cell { text-align: center; line-height: 1.0; }
            .date-part { display: block; }
            .time-part { display: block; font-size: 7.5px; color: #777; }

            .stats-bar { font-size: 8px; font-weight: 900; margin-bottom: 5px; color: #1A3351; text-transform: uppercase; border-left: 3px solid #E31E24; padding-left: 8px; }
            .footer { margin-top: 20px; font-size: 7px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="official-header">
            <div class="logo-area">
              <img src="${logoUrl}" alt="Logo" />
            </div>
            <div class="report-title-area">
              <h1>Relatório de Emissões Operacionais</h1>
              <div class="report-info">
                Operador: ${userName} | Data: ${today}
              </div>
              <div class="report-info" style="color: #E31E24;">
                FILTRO: ${displayStartDate} À ${displayEndDate}
              </div>
            </div>
          </div>
          <div class="stats-bar">
            Total de registros: ${filteredHistory.length}
          </div>
          ${dynamicLegendHTML ? `<div class="legend-bar">LEGENDA: ${dynamicLegendHTML}</div>` : ""}
          <table>
            <thead>
              <tr>
                <th style="width: 9%; text-align: center;">Data/Hora</th>
                <th style="width: 30%;">Nome do Servidor</th>
                <th style="width: 7%; text-align: center;">Tipo</th>
                <th style="width: 27%;">Cargo</th>
                <th style="width: 27%;">Secretaria</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="footer">Gerado via SESMT SYSTEM - Powered by UXBRAS®</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
        <p className="text-[#1A3351] uppercase tracking-[0.3em] font-semibold text-xs">
          Atualizando Painel...
        </p>
      </div>
    );
  }

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
        className={`fixed inset-0 z-[45] bg-black/20 backdrop-blur-[2px] transition-all duration-500 pointer-events-none ${expandedId ? "opacity-100" : "opacity-0"}`}
      />

      {/* ÁREA PRINCIPAL */}
      <main
        onClick={() => setExpandedId(null)}
        className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-visible relative"
      >
        {/* HEADER COM DASHBOARD E FILTROS DE DATA */}
        {/* HEADER - Smart Dynamic Header com Colapso de Espaço */}
        <div
          className={`grid transition-all duration-500 ease-in-out ${showHeader ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}
        >
          <div className="overflow-visible">
            <section
              className={`bg-[#B0B0B0] px-4 lg:px-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg transition-all duration-500 ease-in-out transform ${showHeader ? "translate-y-0" : "-translate-y-1/2"}`}
            >
              <div className="flex items-center gap-3 relative z-20">
                <div className="flex items-center gap-2 shrink-0 text-[#1A3351]">
                  <HistoryIcon className="w-5 h-5" />
                  <div>
                    <h2 className="text-base font-bold leading-none uppercase tracking-tight">
                      Histórico
                    </h2>
                    <p className="text-[8px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                      SESMT • Evidências
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
                    filterAsoType={filterType}
                    setFilterAsoType={setFilterType}
                    uniqueUsersList={uniqueUsersList}
                    uniqueSecretarias={uniqueSecretarias}
                    referrals={history}
                    operatorsMap={operatorsMap}
                    clearAllFilters={clearAllFilters}
                    searchPlaceholder="NOME OU CPF DO SERVIDOR..."
                    userLabelDefault="OPERADORES"
                    secretariaLabelDefault="SECRETARIAS"
                    asoTypeLabelDefault="TIPO DOCUMENTO"
                    asoTypeOptions={historyTypeOptions}
                    activeFilterCount={headerActiveFilterCount}
                  />
                </div>

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

                {filterType === "ASO" && (
                  <ActionIconButton
                    icon={<ClipboardList className="w-4 h-4" />}
                    label="Filtro contextual de subtipos ASO"
                    variant="contextual"
                    active={selectedAsoSubtypes.length > 0}
                    open={isAsoSubtypeFilterOpen}
                    onToggle={setIsAsoSubtypeFilterOpen}
                    showMenuIndicator
                  >
                    <div className="w-72 bg-white border-2 border-[#7C2D12] shadow-2xl rounded-none overflow-hidden">
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
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer rounded-none transition-colors group"
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-[#1A3351] cursor-pointer"
                              checked={selectedAsoSubtypes.includes(type.id)}
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
                  icon={<BarChart3 className="w-4 h-4" />}
                  label="Abrir indicadores BI"
                  variant="primary"
                  onClick={() => router.push("/analytics")}
                />
                {(userRole === "admin" || userRole === "nurse") && (
                  <ActionIconButton
                    className="hidden md:block"
                    icon={<Printer className="w-4 h-4" />}
                    label="Gerar relatório"
                    variant="primary"
                    open={isPrintPopoverOpen}
                    onToggle={setIsPrintPopoverOpen}
                    showMenuIndicator
                  >
                    <div className="w-64 bg-white border-2 border-[#1A3351] shadow-2xl animate-in fade-in slide-in-from-top-2 rounded-none overflow-hidden">
                      <div className="p-4 flex flex-col gap-3">
                        <h3 className="text-[11px] font-bold text-[#1A3351] uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
                          <Printer className="w-4 h-4 text-[#E31E24]" />
                          Opções de Relatório
                        </h3>

                        <button
                          onClick={() => handlePrintRequest("portrait")}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 text-slate-700 transition-all group border border-transparent hover:border-slate-200"
                        >
                          <div className="p-2 bg-slate-100 group-hover:bg-[#1A3351] group-hover:text-white transition-colors">
                            <FileSearch className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-bold uppercase leading-none mb-1">
                              Vertical
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">
                              Formato Retrato (A4)
                            </p>
                          </div>
                        </button>

                        <button
                          onClick={() => handlePrintRequest("landscape")}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 text-slate-700 transition-all group border border-transparent hover:border-slate-200"
                        >
                          <div className="p-2 bg-slate-100 group-hover:bg-[#1A3351] group-hover:text-white transition-colors">
                            <Printer className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-bold uppercase leading-none mb-1">
                              Horizontal
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">
                              Formato Paisagem (A4)
                            </p>
                          </div>
                        </button>
                      </div>
                      <div className="bg-[#1A3351]/5 px-4 py-2 border-t border-slate-100 italic text-[8px] text-slate-500 text-center font-bold">
                        SELECIONE A ORIENTAÇÃO PARA IMPRIMIR
                      </div>
                    </div>
                  </ActionIconButton>
                )}
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden h-9 w-9 bg-[#1A3351] text-white active:scale-95 transition-all shadow-md flex items-center justify-center shrink-0"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3 relative z-10 mt-3">
                <FilterChips
                  searchTerm={normalizeSearchTerm(searchTerm)}
                  startDate={startDate}
                  endDate={endDate}
                  filterUser={filterUser}
                  filterSecretaria={filterSecretaria}
                  filterAsoType={filterType}
                  referrals={history}
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
                            key: "subtypes",
                            label:
                              "Subtipos ASO: " + selectedAsoSubtypes.length,
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </section>
          </div>
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div
          onScroll={handleMainScroll}
          className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-6 lg:space-y-8"
        >
          {/* STATS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            <div className="bg-white p-4 lg:p-6 border-l-4 border-blue-600 shadow-lg transform hover:scale-[1.02] transition-all">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-2">
                Total Registros
              </p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl lg:text-3xl font-bold text-[#1A3351] leading-none">
                  {stats.total}
                </h3>
                <HistoryIcon className="w-6 h-6 text-blue-50" />
              </div>
            </div>

            <div className="bg-white p-4 lg:p-6 border-l-4 border-emerald-500 shadow-lg transform hover:scale-[1.02] transition-all">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-2">
                ASOs Emitidos
              </p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl lg:text-3xl font-bold text-[#1A3351] leading-none">
                  {stats.asos}
                </h3>
                <Activity className="w-6 h-6 text-emerald-50" />
              </div>
            </div>

            <div className="bg-white p-4 lg:p-6 border-l-4 border-[#E31E24] shadow-lg transform hover:scale-[1.02] transition-all">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-2">
                ENC Emitidos
              </p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl lg:text-3xl font-bold text-[#1A3351] leading-none">
                  {stats.encs}
                </h3>
                <Building2 className="w-6 h-6 text-red-50" />
              </div>
            </div>

            <div className="bg-white p-4 lg:p-6 border-l-4 border-amber-500 shadow-lg transform hover:scale-[1.02] transition-all">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-2">
                Operadores
              </p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl lg:text-3xl font-bold text-[#1A3351] leading-none">
                  {stats.uniqueUsers}
                </h3>
                <User className="w-6 h-6 text-amber-50" />
              </div>
            </div>
          </div>
          {/* LISTA DE REGISTROS */}
          <div className="bg-white border-2 border-slate-300 shadow-xl overflow-visible">
            <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A3351]">
                Log de Processamento Geral
              </h3>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-slate-600 uppercase">
                    Ordem:
                  </span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-[#D3D3D3] border border-slate-400 text-[9px] font-bold uppercase px-2 py-1 outline-none focus:border-[#1A3351]"
                  >
                    <option value="date-desc">Data e Hora (Recentes)</option>
                    <option value="alpha">Alfabeto (A-Z)</option>
                  </select>
                </div>
                <div className="text-[9px] font-medium text-slate-600 uppercase">
                  Mostrando{" "}
                  <span className="font-bold">{sortedHistory.length}</span>{" "}
                  resultados
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {sortedHistory.length > 0 ? (
                sortedHistory.map((entry) => (
                  <div key={entry.id} className="group">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(
                          expandedId === entry.id ? null : entry.id,
                        );
                      }}
                      className={`px-4 lg:px-6 py-3 lg:py-2.5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4 hover:bg-white cursor-pointer transition-all duration-500 border-l-[6px] relative ${
                        entry.deletion_pending
                          ? "bg-amber-50/50 border-amber-500 opacity-60"
                          : expandedId === entry.id
                            ? "bg-white border-[#1A3351] z-[50] shadow-2xl scale-[1.03] -mx-2 mb-2 rounded-sm ring-1 ring-black/5"
                            : "bg-white border-transparent z-10 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 lg:gap-4 flex-1 w-full">
                        <div
                          className={`p-2 lg:p-1.5 rounded-none transition-colors shrink-0 ${expandedId === entry.id ? "bg-[#1A3351] text-white" : "bg-slate-100 text-slate-400"}`}
                        >
                          <ClipboardList
                            className={`${expandedId === entry.id ? "w-5 h-5" : "w-4 h-4"}`}
                          />
                        </div>
                        <div className="flex flex-col lg:flex-row lg:items-baseline gap-1 lg:gap-3 flex-1 min-w-0">
                          <h4
                            className={`font-bold uppercase text-[#1A3351] leading-tight truncate transition-all duration-300 ${expandedId === entry.id ? "text-lg lg:text-xl" : "text-sm"}`}
                          >
                            <span className="flex items-center gap-2">
                              {entry.servidor_nome}
                              {entry.contrato && (
                                <span className="bg-[#E31E24] text-white text-[9px] px-1.5 py-0.5 font-bold tracking-tighter">
                                  C. {entry.contrato}
                                </span>
                              )}
                            </span>
                          </h4>
                          <div className="flex flex-wrap gap-2 items-center">
                            {entry.deletion_pending && (
                              <span className="bg-amber-500 text-white px-2 py-0.5 rounded-none text-[8px] lg:text-[9px] font-bold tracking-widest shrink-0 animate-pulse">
                                ⚠️ EXCLUSÃO PENDENTE
                              </span>
                            )}
                            {expandedId === entry.id &&
                              !entry.deletion_pending && (
                                <span className="bg-[#1A3351] text-white px-1.5 lg:py-0.5 rounded-none text-[9px] lg:text-[10px] font-bold tracking-widest shrink-0">
                                  REF: #{entry.id}
                                </span>
                              )}
                            <div
                              className={`flex gap-3 font-bold uppercase transition-all duration-300 ${expandedId === entry.id ? "text-[10px] lg:text-xs" : "text-[9px]"}`}
                            >
                              <span className="text-[#E31E24] truncate max-w-[150px] lg:max-w-none">
                                {(() => {
                                  const raw = entry.aso_type || "";
                                  if (
                                    raw.includes("{") ||
                                    raw.includes("<") ||
                                    raw.includes("[")
                                  ) {
                                    return raw
                                      .split(" {")[0]
                                      .split(" <")[0]
                                      .split(" [")[0];
                                  }
                                  return raw;
                                })()}
                              </span>
                              {expandedId !== entry.id && (
                                <span className="text-slate-500 font-bold">
                                  #{entry.id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto lg:shrink-0 lg:text-right transition-all border-t lg:border-t-0 border-slate-100 pt-2 lg:pt-0 ${expandedId === entry.id ? "opacity-100" : "opacity-80"}`}
                      >
                        <div className="flex flex-col">
                          <span
                            className={`font-medium text-slate-400 uppercase transition-all ${expandedId === entry.id ? "text-[10px]" : "text-[8px]"}`}
                          >
                            Registro
                          </span>
                          <span
                            className={`font-semibold text-slate-700 transition-all ${expandedId === entry.id ? "text-xs lg:text-sm" : "text-[10px]"}`}
                          >
                            {new Date(entry.generated_at).toLocaleString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                        {expandedId === entry.id ? (
                          <ChevronUp className="w-5 h-5 text-[#1A3351]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                        )}
                      </div>
                    </div>

                    {/* Detalhes Expandidos */}
                    {expandedId === entry.id && (
                      <div className="px-6 pb-6 pt-4 bg-white border-t border-slate-100 animate-in slide-in-from-top-4 fade-in duration-500 relative z-[50] -mx-2 shadow-2xl mb-4 ring-1 ring-black/5">
                        {entry.deletion_pending && (
                          <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-none animate-in fade-in">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                              <div>
                                <h5 className="text-xs font-bold text-amber-800 uppercase mb-1">
                                  Registro com Solicitação de Exclusão Pendente
                                </h5>
                                <p className="text-xs text-amber-700">
                                  Este registro está aguardando aprovação do
                                  administrador para exclusão definitiva. O
                                  registro permanecerá visível até que a
                                  solicitação seja aprovada ou rejeitada.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2">
                          <div className="lg:col-span-4 flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1">
                              Cargo
                            </span>
                            <p
                              className="text-[12px] lg:text-[13px] font-bold text-[#1A3351] uppercase lg:truncate"
                              title={entry.cargo}
                            >
                              {entry.cargo || "Não registrado"}
                            </p>
                          </div>
                          <div className="lg:col-span-5 flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1">
                              Secretaria
                            </span>
                            <p
                              className="text-[12px] lg:text-[13px] font-bold text-[#1A3351] uppercase lg:truncate"
                              title={entry.secretaria}
                            >
                              {entry.secretaria || "Não registrado"}
                            </p>
                          </div>
                          <div className="lg:col-span-3 flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1 lg:text-right">
                              GHE CONJ
                            </span>
                            <p className="text-[11px] font-bold text-slate-500 uppercase lg:text-right leading-tight">
                              {entry.ghe_conj || "---"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-6 pt-3 border-t border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 uppercase tracking-widest">
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="text-slate-400 font-bold text-[9px]">
                              Operador Responsável:
                            </span>
                            <span className="text-[11px] font-bold text-[#1A3351]">
                              {entry.operator_name ||
                                profilesData[entry.generated_by]?.email ||
                                entry.generated_by}
                            </span>
                          </div>
                          <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                            {/* Botão de Edição ASO / Encaminhamento */}
                            {!entry.deletion_pending &&
                              (userRole === "admin" ||
                                userRole === entry.creator_role) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rawType = entry.aso_type || "";
                                    const isEncaminhamento = rawType
                                      .toLowerCase()
                                      .includes("encaminhamento");

                                    let simplifiedType = isEncaminhamento
                                      ? "Encaminhamento"
                                      : "Admissional";
                                    if (!isEncaminhamento) {
                                      if (rawType.includes("Periódico"))
                                        simplifiedType = "Periódico";
                                      else if (rawType.includes("Demissional"))
                                        simplifiedType = "Demissional";
                                      else if (
                                        rawType.includes("Mudança de Função")
                                      )
                                        simplifiedType = "Mudança de Função";
                                      else if (
                                        rawType.includes("Retorno ao Trabalho")
                                      )
                                        simplifiedType = "Retorno ao Trabalho";
                                    }

                                    setEditingEntry(entry);
                                    setEditFormData({
                                      servidor_nome: entry.servidor_nome,
                                      servidor_cpf: entry.servidor_cpf,
                                      servidor_nascimento:
                                        entry.servidor_nascimento || "",
                                      cargo: entry.cargo,
                                      secretaria: entry.secretaria,
                                      aso_type: simplifiedType,
                                      function_name: entry.function_name || "",
                                      function_ghe: entry.ghe_conj || "",
                                      risks: entry.risks || "",
                                      exams: entry.exams_json || [],
                                      contrato: entry.contrato || "",
                                      motivo_alteracao: "",
                                    });
                                    setIsEditModalOpen(true);
                                  }}
                                  className="flex items-center gap-2 px-4 py-3 lg:py-2 bg-[#1A3351] text-white font-bold text-[10px] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all"
                                >
                                  <Activity className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-blue-400" />
                                  <span>Editar / Reemitir</span>
                                </button>
                              )}
                            <span className="text-[9px] font-medium text-slate-400">
                              Log ID: {entry.id}
                            </span>
                            {currentUserId === entry.generated_by &&
                              userRole !== "analytic_manager" &&
                              (entry.deletion_pending ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-bold text-[9px] uppercase shadow-md cursor-not-allowed">
                                  <AlertCircle className="w-3.5 h-3.5 animate-pulse shrink-0" />
                                  <span>Exclusão em Análise</span>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestDeletion(entry);
                                  }}
                                  className="flex items-center gap-2 px-4 py-3 lg:py-2 bg-[#E31E24] text-white font-bold text-[10px] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all"
                                >
                                  <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                                  <span>Excluir Registro</span>
                                </button>
                              ))}
                          </div>
                        </div>

                        {/* Histórico de Edições (Auditoria) */}
                        {entry.edit_history &&
                          entry.edit_history.length > 0 && (
                            <div className="mt-8 pt-4 border-t border-slate-200">
                              <div className="flex items-center gap-2 mb-4">
                                <HistoryIcon className="w-4 h-4 text-slate-400" />
                                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                                  Histórico de Alterações (Auditoria)
                                </span>
                              </div>
                              <div className="space-y-3">
                                {entry.edit_history.map(
                                  (log: EditHistoryEntry, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-white/40 border border-slate-200 rounded-none p-3 text-[10px] lg:text-[11px] animate-in fade-in slide-in-from-left-2 transition-all"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-[#1A3351] uppercase">
                                            {log.user}
                                          </span>
                                          <span className="text-slate-400">
                                            •
                                          </span>
                                          <span className="font-bold text-slate-500 uppercase">
                                            {new Date(
                                              log.timestamp,
                                            ).toLocaleString("pt-BR")}
                                          </span>
                                        </div>
                                        <div className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-none font-bold uppercase text-[8px]">
                                          Reemitido
                                        </div>
                                      </div>
                                      <p className="font-bold text-[#E31E24] uppercase mb-1">
                                        Motivo:{" "}
                                        <span className="text-slate-700 font-bold">
                                          {log.motivo || "Não informado"}
                                        </span>
                                      </p>
                                      {(() => {
                                        const changes = log.changes;
                                        if (!changes) return null;
                                        return (
                                          <div className="mt-2 pl-2 border-l-2 border-slate-200 flex flex-wrap gap-x-4 gap-y-1">
                                            {Object.keys(changes.new).map(
                                              (key) => {
                                                const oldVal = changes.old[key];
                                                const newVal = changes.new[key];
                                                if (oldVal !== newVal) {
                                                  return (
                                                    <span
                                                      key={key}
                                                      className="text-[9px] font-bold text-slate-500"
                                                    >
                                                      <span className="uppercase text-slate-400">
                                                        {key}:
                                                      </span>{" "}
                                                      {String(oldVal || "---")}{" "}
                                                      →{" "}
                                                      <span className="text-[#1A3351] font-bold">
                                                        {String(
                                                          newVal || "---",
                                                        )}
                                                      </span>
                                                    </span>
                                                  );
                                                }
                                                return null;
                                              },
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-slate-400 uppercase font-bold text-xs italic tracking-widest">
                  Nenhum registro encontrado para o período/filtro selecionado
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#B0B0B0] p-4 text-center border-2 border-slate-300 shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-slate-600">
              Powered by UXBRAS® — Gestão Estratégica SESMT
            </p>
          </div>
        </div>

        {/* MODAL DE SOLICITAÇÃO DE EXCLUSÃO */}
        {showDeletionModal && selectedEntryForDeletion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-none shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-[#E31E24]">
                <AlertCircle className="w-8 h-8 text-[#E31E24]" />
                <h3 className="text-lg font-bold uppercase text-[#1A3351]">
                  Solicitar Exclusão de Registro
                </h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-none border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                    Servidor:
                  </p>
                  <p className="font-bold text-[#1A3351]">
                    {selectedEntryForDeletion.servidor_nome}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-none border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                    Tipo de Documento:
                  </p>
                  <p className="text-sm text-[#E31E24] font-bold">
                    {selectedEntryForDeletion.aso_type}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-none border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                    Log ID:
                  </p>
                  <p className="text-sm text-slate-700 font-mono">
                    #{selectedEntryForDeletion.id}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Motivo da Exclusão <span className="text-[#E31E24]">*</span>
                  </label>
                  <textarea
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                    placeholder="Descreva detalhadamente o motivo da solicitação de exclusão..."
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-none text-sm outline-none focus:border-[#1A3351] transition-all min-h-[120px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-400 mt-1 text-right">
                    {deletionReason.length}/500 caracteres
                  </p>
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-none">
                  <p className="text-xs font-bold text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Esta solicitação será enviada para aprovação do
                      administrador. O registro permanecerá no histórico até que
                      a exclusão seja aprovada.
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeletionModal(false);
                    setSelectedEntryForDeletion(null);
                    setDeletionReason("");
                  }}
                  disabled={processingDeletion}
                  className="flex-1 py-3 px-4 bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-none hover:bg-slate-300 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeletionRequest}
                  disabled={processingDeletion || !deletionReason.trim()}
                  className="flex-[2] py-3 px-4 bg-[#E31E24] text-white font-bold text-xs uppercase rounded-none shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingDeletion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Enviar Solicitação
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* MODAL DE EDIÇÃO ASO 2.0 */}
        {isEditModalOpen && editingEntry && editFormData && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
            <div className="bg-[#D3D3D3] rounded-none shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 border-4 border-[#1A3351]">
              {/* Header do Modal */}
              <div className="bg-[#1A3351] p-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-[#E31E24]" />
                  <div>
                    <h3 className="text-xl font-bold uppercase text-white tracking-tighter">
                      Editor de Evidência Digital
                    </h3>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">
                      Ajuste de dados para reemissão • ID #{editingEntry.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              {/* Corpo do Modal (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 bg-white/20">
                {/* Sessão 1: Dados Pessoais */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-[#1A3351]" />
                    <span className="text-xs font-bold uppercase text-[#1A3351] tracking-widest">
                      Dados do Servidor
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6 space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border-2 border-slate-200 px-4 py-2.5 rounded-none text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all"
                        value={editFormData.servidor_nome}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            servidor_nome: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">
                        CPF
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border-2 border-slate-200 px-4 py-2.5 rounded-none text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all"
                        value={editFormData.servidor_cpf}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            servidor_cpf: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">
                        Data de Nascimento
                      </label>
                      <input
                        type="date"
                        className="w-full bg-white border-2 border-slate-200 px-4 py-2 text-sm font-bold outline-none focus:border-[#E31E24] rounded-none h-[46px]"
                        value={editFormData.servidor_nascimento}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            servidor_nascimento: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-12 flex gap-4">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">
                          Tipo de Documento
                        </label>
                        <select
                          className="w-full bg-white border-2 border-slate-200 px-4 py-2.5 rounded-none text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all cursor-pointer"
                          value={editFormData.aso_type}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              aso_type: e.target.value,
                            })
                          }
                        >
                          <option value="Admissional">ASO Admissional</option>
                          <option value="Periódico">ASO Periódico</option>
                          <option value="Mudança de Função">
                            ASO Mudança de Função
                          </option>
                          <option value="Demissional">ASO Demissional</option>
                          <option value="Retorno ao Trabalho">
                            ASO Retorno ao Trabalho
                          </option>
                          <option value="Encaminhamento">
                            Encaminhamento de Exames
                          </option>
                        </select>
                      </div>
                      <div className="w-32 space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">
                          Contrato
                        </label>
                        <input
                          type="text"
                          className="w-full bg-white border-2 border-slate-200 px-4 py-2.5 rounded-none text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all"
                          value={editFormData.contrato}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              contrato: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sessão 2: Dados Profissionais */}
                <div className="space-y-4 pt-4 border-t border-black/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-[#1A3351]" />
                    <span className="text-xs font-bold uppercase text-[#1A3351] tracking-widest">
                      Dados Profissionais
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 relative">
                      <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 flex items-center justify-between">
                        <span>Cargo</span>
                        {isSearchingCargo && (
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />
                        )}
                      </label>
                      <input
                        type="text"
                        placeholder="Digite para buscar..."
                        className="flex-1 bg-white border-2 border-[#1A3351]/10 px-4 py-2.5 rounded-none text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all shadow-sm"
                        value={cargoSearch || editFormData?.cargo || ""}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setCargoSearch(val);
                          setEditFormData({ ...editFormData, cargo: val });
                        }}
                      />
                      {filteredCargosSearch.length > 0 && (
                        <div className="absolute z-[310] left-0 right-0 mt-1 bg-white border-2 border-[#1A3351] shadow-2xl rounded-none overflow-hidden max-h-48 overflow-y-auto">
                          {filteredCargosSearch.map((c) => (
                            <div
                              key={c}
                              onClick={() => {
                                setEditFormData({ ...editFormData, cargo: c });
                                setCargoSearch("");
                                setFilteredCargosSearch([]);
                              }}
                              className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-xs font-bold text-[#1A3351] uppercase"
                            >
                              {c}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 relative">
                      <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 flex items-center justify-between">
                        <span>Secretaria</span>
                        {isSearchingSecretaria && (
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />
                        )}
                      </label>
                      <input
                        type="text"
                        placeholder="Digite para buscar..."
                        className="flex-1 bg-white border-2 border-[#1A3351]/10 px-4 py-2.5 rounded-none text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all shadow-sm"
                        value={
                          secretariaSearch || editFormData?.secretaria || ""
                        }
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setSecretariaSearch(val);
                          setEditFormData({ ...editFormData, secretaria: val });
                        }}
                      />
                      {filteredSecretariasSearch.length > 0 && (
                        <div className="absolute z-[310] left-0 right-0 mt-1 bg-white border-2 border-[#1A3351] shadow-2xl rounded-none overflow-hidden max-h-48 overflow-y-auto">
                          {filteredSecretariasSearch.map((s) => (
                            <div
                              key={s}
                              onClick={() => {
                                setEditFormData({
                                  ...editFormData,
                                  secretaria: s,
                                });
                                setSecretariaSearch("");
                                setFilteredSecretariasSearch([]);
                              }}
                              className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-xs font-bold text-[#1A3351] uppercase"
                            >
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div className="space-y-1 relative">
                      <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 flex items-center justify-between">
                        <span>Função / GHE (Busque para atualizar riscos)</span>
                        {isSearchingFuncao && (
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />
                        )}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Digite para buscar..."
                          className="flex-1 bg-white border-2 border-[#1A3351]/10 px-4 py-2.5 rounded-none text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all shadow-sm"
                          value={
                            funcoesSearch || editFormData?.function_name || ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setFuncoesSearch(val);
                            setEditFormData({
                              ...editFormData,
                              function_name: val,
                            });
                          }}
                        />
                        {(funcoesSearch || editFormData?.function_name) && (
                          <button
                            onClick={() => {
                              setFuncoesSearch("");
                              setFilteredFuncoes([]);
                              setEditFormData({
                                ...editFormData,
                                function_name: "",
                                function_ghe: "",
                                risks: "",
                                exams: [],
                              });
                            }}
                            className="px-3 bg-white border-2 border-slate-200 rounded-none text-[9px] font-bold uppercase hover:bg-slate-50 transition-colors"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                      {filteredFuncoes.length > 0 && (
                        <div className="absolute z-[310] left-0 right-0 mt-1 bg-white border-2 border-[#1A3351] shadow-2xl rounded-none overflow-hidden max-h-64 overflow-y-auto">
                          {filteredFuncoes.map((f) => (
                            <div
                              key={f.id}
                              onClick={() => {
                                setEditFormData({
                                  ...editFormData,
                                  function_name: f.nome,
                                  function_ghe: f.ghe,
                                });
                                setFuncoesSearch("");
                                setFilteredFuncoes([]);
                              }}
                              className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 group transition-colors"
                            >
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-xs font-bold text-[#1A3351] uppercase group-hover:text-[#E31E24]">
                                  {f.nome}
                                </span>
                                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-none text-slate-500 uppercase">
                                  GHE: {f.ghe}
                                </span>
                              </div>
                              {f.cod && (
                                <div className="text-[9px] font-bold text-slate-400">
                                  CÓD: {f.cod}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">
                        Riscos Ocupacionais (Automático - Não Editável)
                      </label>
                      <textarea
                        readOnly
                        className="w-full bg-slate-50 border-2 border-slate-200 px-4 py-3 rounded-none text-sm font-bold uppercase outline-none min-h-[80px] resize-none text-slate-500 italic"
                        value={editFormData.risks}
                      />
                    </div>
                  </div>
                </div>

                {/* Sessão 3: Exames e Datas */}
                <div className="space-y-4 pt-4 border-t border-black/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-[#1A3351]" />
                    <span className="text-xs font-bold uppercase text-[#1A3351] tracking-widest">
                      Exames e Prazos
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {editFormData.exams.map((exam: ExamEntry, idx: number) => (
                      <div
                        key={idx}
                        className="flex gap-2 p-3 bg-white border-2 border-slate-100 rounded-none shadow-sm"
                      >
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-[#E31E24] uppercase mb-1">
                            {exam.name}
                          </p>
                          <input
                            type="date"
                            className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs font-bold outline-none focus:border-[#E31E24] rounded-none"
                            value={exam.date.split("/").reverse().join("-")}
                            onChange={(e) => {
                              const newExams = [...editFormData.exams];
                              const [y, m, d] = e.target.value.split("-");
                              newExams[idx].date = `${d}/${m}/${y}`;
                              setEditFormData({
                                ...editFormData,
                                exams: newExams,
                              });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {editFormData.exams.length === 0 && (
                      <p className="col-span-2 text-center py-4 text-slate-400 text-[10px] font-bold uppercase italic italic">
                        Registro legado: O sistema usará o mapeamento original.
                      </p>
                    )}
                  </div>
                </div>

                {/* Sessão 4: Motivo da Alteração (Obrigatório para Auditoria) */}
                <div className="space-y-4 pt-4 border-t border-black/5">
                  <div className="flex items-center gap-2 mb-2">
                    <HistoryIcon className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold uppercase text-amber-600 tracking-widest">
                      Justificativa da Alteração (Auditoria)
                    </span>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-none border-2 border-amber-200">
                    <textarea
                      rows={3}
                      placeholder="DESCREVA O MOTIVO DESTA ALTERAÇÃO (OBRIGATÓRIO PARA SEGURANÇA)..."
                      className="w-full bg-white border-2 border-amber-300 px-4 py-3 rounded-none text-sm font-bold uppercase outline-none focus:border-amber-500 transition-all resize-none"
                      value={editFormData.motivo_alteracao}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          motivo_alteracao: e.target.value,
                        })
                      }
                    />
                    <div className="flex items-center gap-2 mt-2 text-amber-700">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <p className="text-[9px] font-bold uppercase">
                        Este registro será vinculado ao seu perfil para
                        auditoria futura.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer do Modal */}
              <div className="bg-[#B0B0B0] p-6 flex flex-col sm:flex-row gap-4 shrink-0">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-4 px-6 bg-slate-300 text-slate-700 font-bold text-xs uppercase rounded-none hover:bg-slate-400 transition-all active:scale-95"
                >
                  Cancelar Alterações
                </button>
                <button
                  onClick={async () => {
                    if (isSavingEdit) return;

                    if (
                      !editFormData.motivo_alteracao ||
                      editFormData.motivo_alteracao.length < 5
                    ) {
                      alert(
                        "Por favor, informe o motivo da alteração (mínimo 5 caracteres) para auditoria.",
                      );
                      return;
                    }

                    setIsSavingEdit(true);

                    try {
                      const { session } = await safeGetSession();
                      const userEmail = session?.user?.email || "desconhecido";

                      // 1. Registrar Auditoria no edit_history (Enriquecido com Motivo)
                      const newAudit = {
                        timestamp: new Date().toISOString(),
                        user: userEmail,
                        motivo: editFormData.motivo_alteracao,
                        changes: {
                          old: {
                            nome: editingEntry.servidor_nome,
                            cpf: editingEntry.servidor_cpf,
                            cargo: editingEntry.cargo,
                            secretaria: editingEntry.secretaria,
                            tipo: editingEntry.aso_type,
                            contrato: editingEntry.contrato,
                          },
                          new: {
                            nome: editFormData.servidor_nome,
                            cpf: editFormData.servidor_cpf,
                            cargo: editFormData.cargo,
                            secretaria: editFormData.secretaria,
                            tipo:
                              editFormData.aso_type === "Encaminhamento"
                                ? "Encaminhamento"
                                : `ASO (${editFormData.aso_type})`,
                            contrato: editFormData.contrato,
                          },
                        },
                      };

                      const updatedHistory = [
                        ...(editingEntry.edit_history || []),
                        newAudit,
                      ];

                      // Detecta tipo selecionado
                      const asoTypeLabel = editFormData.aso_type;
                      const isEncaminhamento =
                        asoTypeLabel === "Encaminhamento";

                      // 2. Salvar no Banco
                      const { error } = await supabase
                        .from("aso_history")
                        .update({
                          aso_type: isEncaminhamento
                            ? "Encaminhamento"
                            : `ASO (${asoTypeLabel})`,
                          servidor_nome: editFormData.servidor_nome,
                          servidor_cpf: editFormData.servidor_cpf,
                          servidor_nascimento: ensureISO(
                            editFormData.servidor_nascimento,
                          ),
                          cargo: editFormData.cargo,
                          secretaria: editFormData.secretaria,
                          ghe_conj: editFormData.function_ghe,
                          function_name: editFormData.function_name,
                          risks: editFormData.risks,
                          exams_json: editFormData.exams,
                          contrato: editFormData.contrato,
                          edit_history: updatedHistory,
                        })
                        .eq("id", editingEntry.id);

                      if (error) throw error;

                      // 3. Reemitir PDF
                      const { generateASOPDF, generateReferralPDF } =
                        await import("@/lib/pdf-generator");

                      const servidorMock = {
                        Nome: editFormData.servidor_nome,
                        CPF: editFormData.servidor_cpf,
                        "CPF.": editFormData.servidor_cpf,
                        "Dt.Nascimento": editFormData.servidor_nascimento,
                        Cargo: editFormData.cargo,
                        Secretaria: editFormData.secretaria,
                        contrato: editFormData.contrato,
                      };

                      const currentExamsMock = {
                        exames: editFormData.exams.map(
                          (e: ExamEntry) => e.name,
                        ),
                        riscos: "",
                        detalhes: editFormData.risks,
                      };

                      const datesMock = editFormData.exams.map(
                        (e: ExamEntry) => e.date,
                      );
                      const operatorName = userName.toUpperCase();

                      if (isEncaminhamento) {
                        generateReferralPDF(
                          servidorMock,
                          currentExamsMock,
                          asoTypeLabel,
                          datesMock,
                          operatorName,
                        );
                      } else {
                        generateASOPDF(
                          servidorMock,
                          currentExamsMock,
                          asoTypeLabel,
                          datesMock,
                          operatorName,
                        );
                      }

                      alert(
                        "Alterações salvas com sucesso! O novo PDF foi gerado.",
                      );
                      setIsEditModalOpen(false);
                      loadHistory();
                    } catch (err) {
                      console.error("Erro ao salvar edição:", err);
                      alert(
                        "Erro ao processar as alterações no banco de dados.",
                      );
                    } finally {
                      setIsSavingEdit(false);
                    }
                  }}
                  disabled={isSavingEdit}
                  className="flex-[2] py-4 px-6 bg-[#1A3351] text-white font-bold text-xs uppercase rounded-none shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processando Registro...
                    </>
                  ) : (
                    <>
                      <Printer className="w-5 h-5" />
                      Salvar e Reemitir PDF Oficial
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
