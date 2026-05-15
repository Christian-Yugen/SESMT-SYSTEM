"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen,
  Search,
  Archive,
  X,
  Menu,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Loader2,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import CompactFilterBar from "@/components/filters/CompactFilterBar";
import FilterChips from "@/components/filters/FilterChips";
import ActionIconButton from "@/components/filters/ActionIconButton";
import {
  countActiveFilters,
  normalizeSearchTerm,
} from "@/components/filters/filtersUtils";

interface MedicalFolder {
  id: string;
  servidor_cpf: string;
  servidor_nome: string;
  armario: number;
  gaveta: number;
  pasta: number;
  status: "ARQUIVADO" | "RETIRADO";
  posse_nome?: string;
  motivo_saida?: string;
  data_saida?: string;
  ultima_movimentacao: string;
}

interface FolderLocationConflict {
  id: string;
  servidor_nome: string;
  armario: number;
  gaveta: number;
  pasta: number;
}

interface FolderLog {
  id: string;
  folder_id: string;
  tipo_acao: "RETIRADA" | "DEVOLUCAO";
  servidor_nome: string;
  motivo: string;
  anotacoes_devolucao?: string;
  data_hora: string;
  operador_sistema: string;
}

/** Campos atualizáveis de uma pasta médica ao devolver ao arquivo. */
interface MedicalFolderUpdate {
  status: "ARQUIVADO";
  posse_nome: null;
  motivo_saida: null;
  data_saida: null;
  ultima_movimentacao: string;
  armario?: number;
  gaveta?: number;
  pasta?: number;
}

export default function ArchivePage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");

  // Estados de busca e dados
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"nome" | "cpf">("nome");
  const [folders, setFolders] = useState<MedicalFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<MedicalFolder | null>(
    null,
  );
  const [folderLogs, setFolderLogs] = useState<FolderLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados dos modais
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Smart Header Logic
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  // Controle do filtro de modo de busca (contextual)
  const [isSearchTypeFilterOpen, setIsSearchTypeFilterOpen] = useState(false);

  const clearAllFilters = () => {
    setSearchTerm("");
    setFolders([]);
    setSelectedFolder(null);
  };

  const headerActiveFilterCount =
    countActiveFilters({ searchTerm }) + (searchType === "cpf" ? 1 : 0);

  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > lastScrollTop && scrollTop > 150) {
      if (showHeader) setShowHeader(false);
    } else if (scrollTop < lastScrollTop) {
      if (!showHeader) setShowHeader(true);
    }
    setLastScrollTop(scrollTop);
  };

  // Estados dos formulários
  const [withdrawData, setWithdrawData] = useState({
    servidor_nome: "",
    motivo: "",
  });
  const [returnData, setReturnData] = useState({
    anotacoes: "",
    novo_armario: "",
    nova_gaveta: "",
    nova_pasta: "",
  });

  // Autenticação
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
            if (data.role === "social_assistant") {
              router.push("/abono");
              return;
            } else if (
              (data.role === "operator" || data.role === "viewer") &&
              data.role !== "analytic_manager"
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

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("medical_folders")
        .select("*")
        .ilike(
          searchType === "nome" ? "servidor_nome" : "servidor_cpf",
          `%${searchTerm}%`,
        )
        .order("servidor_nome");

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error("Erro na busca:", error);
      alert("Erro ao buscar prontuários");
    } finally {
      setLoading(false);
    }
  };

  const loadFolderHistory = async (folderId: string) => {
    try {
      const { data, error } = await supabase
        .from("medical_folder_logs")
        .select("*")
        .eq("folder_id", folderId)
        .order("data_hora", { ascending: false });

      if (error) throw error;
      setFolderLogs(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const handleSelectFolder = async (folder: MedicalFolder) => {
    setSelectedFolder(folder);
    await loadFolderHistory(folder.id);
  };

  const handleWithdraw = async () => {
    if (
      !selectedFolder ||
      !withdrawData.servidor_nome ||
      !withdrawData.motivo
    ) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const { session } = await safeGetSession();
      if (!session) return;

      // Atualizar status da pasta
      const { error: updateError } = await supabase
        .from("medical_folders")
        .update({
          status: "RETIRADO",
          posse_nome: withdrawData.servidor_nome,
          motivo_saida: withdrawData.motivo,
          data_saida: new Date().toISOString(),
          ultima_movimentacao: new Date().toISOString(),
        })
        .eq("id", selectedFolder.id);

      if (updateError) throw updateError;

      // Registrar no log
      const { error: logError } = await supabase
        .from("medical_folder_logs")
        .insert({
          folder_id: selectedFolder.id,
          tipo_acao: "RETIRADA",
          servidor_nome: withdrawData.servidor_nome,
          motivo: withdrawData.motivo,
          data_hora: new Date().toISOString(),
          operador_sistema: session.user.id,
        });

      if (logError) throw logError;

      alert("Retirada registrada com sucesso!");
      setShowWithdrawModal(false);
      setWithdrawData({ servidor_nome: "", motivo: "" });
      handleSearch(); // Atualizar lista
    } catch (error) {
      console.error("Erro ao registrar retirada:", error);
      alert("Erro ao registrar retirada");
    }
  };

  const handleReturn = async () => {
    if (!selectedFolder || !returnData.anotacoes) {
      alert("Preencha as anotações da devolução");
      return;
    }

    try {
      const { session } = await safeGetSession();
      if (!session) return;

      const updateData: MedicalFolderUpdate = {
        status: "ARQUIVADO",
        posse_nome: null,
        motivo_saida: null,
        data_saida: null,
        ultima_movimentacao: new Date().toISOString(),
      };

      const isChangingLocation = Boolean(
        returnData.novo_armario ||
        returnData.nova_gaveta ||
        returnData.nova_pasta,
      );

      if (isChangingLocation) {
        if (
          !returnData.novo_armario ||
          !returnData.nova_gaveta ||
          !returnData.nova_pasta
        ) {
          alert(
            "Para realocar a pasta, informe armário, gaveta e pasta completos.",
          );
          return;
        }

        const novoArmario = Number.parseInt(returnData.novo_armario, 10);
        const novaGaveta = Number.parseInt(returnData.nova_gaveta, 10);
        const novaPasta = Number.parseInt(returnData.nova_pasta, 10);

        if (
          Number.isNaN(novoArmario) ||
          Number.isNaN(novaGaveta) ||
          Number.isNaN(novaPasta) ||
          novoArmario <= 0 ||
          novaGaveta <= 0 ||
          novaPasta <= 0
        ) {
          alert(
            "Armário, gaveta e pasta devem ser números válidos maiores que zero.",
          );
          return;
        }

        const sameLocation =
          selectedFolder.armario === novoArmario &&
          selectedFolder.gaveta === novaGaveta &&
          selectedFolder.pasta === novaPasta;

        if (!sameLocation) {
          const { data: conflictFolder, error: conflictError } = await supabase
            .from("medical_folders")
            .select("id, servidor_nome, armario, gaveta, pasta")
            .eq("armario", novoArmario)
            .eq("gaveta", novaGaveta)
            .eq("pasta", novaPasta)
            .neq("id", selectedFolder.id)
            .maybeSingle<FolderLocationConflict>();

          if (conflictError) {
            throw conflictError;
          }

          if (conflictFolder) {
            alert(
              `A localização ${novoArmario}/${novaGaveta}/${novaPasta} já está ocupada pela pasta de ${conflictFolder.servidor_nome}.`,
            );
            return;
          }
        }

        updateData.armario = novoArmario;
        updateData.gaveta = novaGaveta;
        updateData.pasta = novaPasta;
      }

      const { error: updateError } = await supabase
        .from("medical_folders")
        .update(updateData)
        .eq("id", selectedFolder.id);

      if (updateError) {
        const msg = (updateError.message || "").toLowerCase();
        const isUniqueConflict =
          msg.includes("duplicate") ||
          msg.includes("unique") ||
          msg.includes("already exists");

        if (isUniqueConflict) {
          alert(
            "Conflito ao salvar a localização da pasta. O sistema deve validar a combinação armário/gaveta/pasta, não apenas o número da pasta.",
          );
          return;
        }

        throw updateError;
      }

      // Registrar no log
      const { error: logError } = await supabase
        .from("medical_folder_logs")
        .insert({
          folder_id: selectedFolder.id,
          tipo_acao: "DEVOLUCAO",
          servidor_nome: selectedFolder.posse_nome || "",
          motivo: selectedFolder.motivo_saida || "",
          anotacoes_devolucao: returnData.anotacoes,
          data_hora: new Date().toISOString(),
          operador_sistema: session.user.id,
        });

      if (logError) throw logError;

      alert("Devolução registrada com sucesso!");
      setShowReturnModal(false);
      setReturnData({
        anotacoes: "",
        novo_armario: "",
        nova_gaveta: "",
        nova_pasta: "",
      });
      handleSearch();
    } catch (error) {
      console.error("Erro ao registrar devolução:", error);
      alert("Erro ao registrar devolução");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A111C] text-white font-sans overflow-x-hidden">
      {/* SIDEBAR MOBILE OVERLAY */}
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

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col bg-[#D3D3D3] text-black min-h-screen lg:h-screen lg:overflow-visible relative">
        <div
          onScroll={handleMainScroll}
          className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative"
        >
          {/* STICKY HEADER WRAPPER */}
          <div
            className={`sticky top-0 z-[110] transition-all duration-500 ease-in-out transform ${showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}
          >
            {/* HEADER UNIFICADO */}
            <section className="bg-[#B0B0B0] px-2.5 sm:px-4 lg:px-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:flex-nowrap md:gap-3">
                {/* Título */}
                <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0 text-[#1A3351]">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    <div>
                      <h2 className="text-[15px] sm:text-lg md:text-xl font-bold leading-none uppercase tracking-tight">
                        Arquivo Médico
                      </h2>
                      <p className="text-[8px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                        SESMT • Prontuários
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 bg-[#1A3351] text-white flex items-center justify-center active:scale-95 transition-all shadow-md rounded-none"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                </div>

                <div className="h-6 w-px bg-[#1A3351]/20 shrink-0 hidden md:block" />

                {/* Campo de busca principal */}
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
                    searchPlaceholder={
                      searchType === "nome"
                        ? "BUSCAR POR NOME..."
                        : "BUSCAR POR CPF..."
                    }
                    showUserFilter={false}
                    showDateFilter={false}
                    showSecretariaFilter={false}
                    showAsoTypeFilter={false}
                    activeFilterCount={headerActiveFilterCount}
                    onSearchKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    extraActions={
                      <>
                        {/* Filtro contextual: modo de busca (nome / cpf) */}
                        <ActionIconButton
                          icon={<UserIcon className="w-4 h-4" />}
                          label={`Modo de busca: ${searchType === "nome" ? "Nome" : "CPF"}`}
                          variant="contextual"
                          active={searchType === "cpf"}
                          open={isSearchTypeFilterOpen}
                          onToggle={setIsSearchTypeFilterOpen}
                          showMenuIndicator
                        >
                          <div className="w-52 bg-white border-2 border-[#7C2D12] shadow-2xl rounded-none overflow-hidden">
                            <div className="p-3 space-y-2">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-[#7C2D12]">
                                Modo de Busca
                              </p>
                              {(["nome", "cpf"] as const).map((mode) => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => {
                                    setSearchType(mode);
                                    setIsSearchTypeFilterOpen(false);
                                  }}
                                  className={`w-full h-9 text-[10px] font-bold uppercase transition-all rounded-none ${
                                    searchType === mode
                                      ? "bg-[#1A3351] text-white"
                                      : "bg-[#FFF7E6] border border-[#F59E0B] text-[#7C2D12] hover:brightness-95"
                                  }`}
                                >
                                  {mode === "nome" ? "Por Nome" : "Por CPF"}
                                </button>
                              ))}
                            </div>
                          </div>
                        </ActionIconButton>

                        {/* Ação: executar busca */}
                        <ActionIconButton
                          icon={
                            loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )
                          }
                          label="Buscar prontuários"
                          variant="primary"
                          onClick={handleSearch}
                        />
                      </>
                    }
                  />
                </div>
              </div>

              {/* FilterChips */}
              {(searchTerm.trim() || searchType === "cpf") && (
                <div className="mt-2">
                  <FilterChips
                    searchTerm={normalizeSearchTerm(searchTerm)}
                    startDate=""
                    endDate=""
                    filterUser="all"
                    filterSecretaria="all"
                    filterAsoType="all"
                    referrals={[]}
                    operatorsMap={{}}
                    extraChips={
                      searchType === "cpf"
                        ? [{ key: "mode", label: "Modo: CPF" }]
                        : []
                    }
                  />
                </div>
              )}
            </section>
          </div>

          {/* RESULTADOS */}
          <div className="flex-1 p-4 lg:p-6 font-bold uppercase">
            {folders.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50 py-12">
                <Archive className="w-20 lg:w-24 h-20 lg:h-24 mb-4" />
                <p className="text-lg lg:text-xl font-bold uppercase tracking-wider text-center">
                  Aguardando Pesquisa
                </p>
                <p className="text-[10px] lg:text-sm mt-2 text-center uppercase tracking-widest font-bold">
                  Localize prontuários pela barra de busca
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 max-w-7xl mx-auto pb-10">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => handleSelectFolder(folder)}
                  className="bg-white shadow-lg border-2 border-slate-300 p-4 lg:p-6 hover:border-[#1A3351] transition-all cursor-pointer group flex flex-col justify-between rounded-none"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-base lg:text-lg font-bold text-[#1A3351] uppercase group-hover:text-[#E31E24] transition-colors truncate">
                        {folder.servidor_nome}
                      </h3>
                      <p className="text-[10px] lg:text-xs text-slate-500 font-bold mt-1 uppercase">
                        CPF: {folder.servidor_cpf}
                      </p>
                    </div>
                    {folder.status === "ARQUIVADO" ? (
                      <CheckCircle className="w-5 lg:w-6 h-5 lg:h-6 text-green-600 shrink-0 ml-2" />
                    ) : (
                      <AlertCircle className="w-5 lg:w-6 h-5 lg:h-6 text-orange-600 shrink-0 ml-2" />
                    )}
                  </div>

                  {folder.status === "ARQUIVADO" ? (
                    <div className="bg-green-50 border-l-4 border-green-600 p-3 lg:p-4 rounded-none">
                      <p className="text-[10px] lg:text-xs font-bold text-green-900 uppercase mb-2">
                        ✓ Disponível no Arquivo
                      </p>
                      <div className="grid grid-cols-3 gap-1.5 lg:gap-2 text-center text-black">
                        <div className="bg-white p-2 border border-green-100 rounded-none">
                          <p className="text-[8px] lg:text-[10px] font-bold text-slate-500 uppercase">
                            Armário
                          </p>
                          <p className="text-xl lg:text-2xl font-bold text-[#1A3351]">
                            {folder.armario}
                          </p>
                        </div>
                        <div className="bg-white p-2 border border-green-100 rounded-none">
                          <p className="text-[8px] lg:text-[10px] font-bold text-slate-500 uppercase">
                            Gaveta
                          </p>
                          <p className="text-xl lg:text-2xl font-bold text-[#1A3351]">
                            {folder.gaveta}
                          </p>
                        </div>
                        <div className="bg-white p-2 border border-green-100 rounded-none">
                          <p className="text-[8px] lg:text-[10px] font-bold text-slate-500 uppercase">
                            Pasta
                          </p>
                          <p className="text-xl lg:text-2xl font-bold text-[#1A3351]">
                            {folder.pasta}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-orange-50 border-l-4 border-orange-600 p-3 lg:p-4 text-left rounded-none">
                      <p className="text-[10px] lg:text-xs font-bold text-orange-900 uppercase mb-2 block">
                        ⚠ Em Posse de:
                      </p>
                      <p className="text-sm font-bold text-slate-900 truncate uppercase">
                        {folder.posse_nome}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-2 italic leading-tight line-clamp-2 uppercase">
                        Motivo: {folder.motivo_saida}
                      </p>
                      <p className="text-[8px] lg:text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tighter">
                        {new Date(folder.data_saida!).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2">
                    {userRole !== "analytic_manager" && (
                      <>
                        {folder.status === "ARQUIVADO" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFolder(folder);
                              setShowWithdrawModal(true);
                            }}
                            className="flex-1 h-10 bg-[#1A3351] text-white text-[10px] lg:text-xs font-bold uppercase hover:brightness-110 active:scale-95 transition-all shadow-md rounded-none"
                          >
                            Retirada
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFolder(folder);
                              setShowReturnModal(true);
                            }}
                            className="flex-1 h-10 bg-green-600 text-white text-[10px] lg:text-xs font-bold uppercase hover:brightness-110 active:scale-95 transition-all shadow-md rounded-none"
                          >
                            Devolução
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectFolder(folder);
                        setShowHistoryModal(true);
                      }}
                      className={`${userRole === "analytic_manager" ? "w-full" : "w-12"} h-10 bg-slate-600 text-white flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow-md rounded-none`}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      {userRole === "analytic_manager" && "Ver Histórico"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MODAL: REGISTRAR RETIRADA */}
        {showWithdrawModal && selectedFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-black">
            <div className="bg-[#D3D3D3] w-full max-w-xl shadow-2xl border-2 border-[#1A3351] overflow-hidden rounded-none">
              <div className="bg-[#1A3351] p-4 flex justify-between items-center text-white">
                <h3 className="text-xl font-bold uppercase tracking-tight">
                  Registrar Retirada
                </h3>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-white p-4 border-l-4 border-[#1A3351] rounded-none">
                  <p className="text-sm font-bold text-slate-700 uppercase mb-1">
                    Prontuário de:
                  </p>
                  <p className="text-lg font-bold text-[#1A3351]">
                    {selectedFolder.servidor_nome}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-700">
                    Quem está retirando?*
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-4 bg-white border border-slate-400 font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] uppercase rounded-none"
                    value={withdrawData.servidor_nome}
                    onChange={(e) =>
                      setWithdrawData({
                        ...withdrawData,
                        servidor_nome: e.target.value,
                      })
                    }
                    placeholder="EX: DR. JOÃO SILVA"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-700">
                    Motivo da retirada*
                  </label>
                  <textarea
                    className="w-full px-4 py-2 bg-white border border-slate-400 font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] resize-none uppercase rounded-none"
                    rows={3}
                    value={withdrawData.motivo}
                    onChange={(e) =>
                      setWithdrawData({
                        ...withdrawData,
                        motivo: e.target.value,
                      })
                    }
                    placeholder="EX: AVALIAÇÃO MÉDICA PERIÓDICA"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#B0B0B0] flex justify-end gap-4 border-t border-slate-400">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-8 h-10 bg-[#E31E24] text-white font-bold uppercase shadow-md hover:brightness-110 active:scale-95 transition-all text-sm rounded-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWithdraw}
                  className="px-8 h-10 bg-[#1A3351] text-white font-bold uppercase shadow-md hover:brightness-110 active:scale-95 transition-all text-sm rounded-none"
                >
                  Confirmar Retirada
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: REGISTRAR DEVOLUÇÃO */}
        {showReturnModal && selectedFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-black">
            <div className="bg-[#D3D3D3] w-full max-w-2xl shadow-2xl border-2 border-[#1A3351] overflow-hidden rounded-none">
              <div className="bg-[#1A3351] p-4 flex justify-between items-center text-white">
                <h3 className="text-xl font-bold uppercase tracking-tight">
                  Registrar Devolução
                </h3>
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-white p-4 border-l-4 border-green-600 rounded-none">
                  <p className="text-sm font-bold text-slate-700 uppercase mb-1">
                    Prontuário de:
                  </p>
                  <p className="text-lg font-bold text-[#1A3351]">
                    {selectedFolder.servidor_nome}
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    Estava com: {selectedFolder.posse_nome}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-700">
                    Anotações/Mudanças durante a posse*
                  </label>
                  <textarea
                    className="w-full px-4 py-2 bg-white border border-slate-400 font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] resize-none uppercase rounded-none"
                    rows={4}
                    value={returnData.anotacoes}
                    onChange={(e) =>
                      setReturnData({
                        ...returnData,
                        anotacoes: e.target.value,
                      })
                    }
                    placeholder="EX: ADICIONADOS 3 NOVOS LAUDOS DE EXAMES COMPLEMENTARES"
                  />
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-bold text-slate-700 uppercase mb-3">
                    A pasta retornará para o local original?
                  </p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-white p-3 text-center border-2 border-[#1A3351] rounded-none">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Armário
                      </p>
                      <p className="text-xl font-bold text-[#1A3351]">
                        {selectedFolder.armario}
                      </p>
                    </div>
                    <div className="bg-white p-3 text-center border-2 border-[#1A3351] rounded-none">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Gaveta
                      </p>
                      <p className="text-xl font-bold text-[#1A3351]">
                        {selectedFolder.gaveta}
                      </p>
                    </div>
                    <div className="bg-white p-3 text-center border-2 border-[#1A3351] rounded-none">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Pasta
                      </p>
                      <p className="text-xl font-bold text-[#1A3351]">
                        {selectedFolder.pasta}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 uppercase font-bold tracking-tight">
                    Ou realocar para novo endereço:
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="number"
                      placeholder="Armário"
                      className="h-10 px-3 bg-white border border-slate-400 text-center font-bold outline-none focus:border-[#1A3351] rounded-none"
                      value={returnData.novo_armario}
                      onChange={(e) =>
                        setReturnData({
                          ...returnData,
                          novo_armario: e.target.value,
                        })
                      }
                    />
                    <input
                      type="number"
                      placeholder="Gaveta"
                      className="h-10 px-3 bg-white border border-slate-400 text-center font-bold outline-none focus:border-[#1A3351] rounded-none"
                      value={returnData.nova_gaveta}
                      onChange={(e) =>
                        setReturnData({
                          ...returnData,
                          nova_gaveta: e.target.value,
                        })
                      }
                    />
                    <input
                      type="number"
                      placeholder="Pasta"
                      className="h-10 px-3 bg-white border border-slate-400 text-center font-bold outline-none focus:border-[#1A3351] rounded-none"
                      value={returnData.nova_pasta}
                      onChange={(e) =>
                        setReturnData({
                          ...returnData,
                          nova_pasta: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#B0B0B0] flex justify-end gap-4 border-t border-slate-400">
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="px-8 h-10 bg-[#E31E24] text-white font-bold uppercase shadow-md hover:brightness-110 active:scale-95 transition-all text-sm rounded-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReturn}
                  className="px-8 h-10 bg-green-600 text-white font-bold uppercase shadow-md hover:brightness-110 active:scale-95 transition-all text-sm rounded-none"
                >
                  Confirmar Devolução
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: HISTÓRICO */}
        {showHistoryModal && selectedFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-black">
            <div className="bg-[#D3D3D3] w-full max-w-3xl shadow-2xl border-2 border-[#1A3351] overflow-hidden max-h-[90vh] flex flex-col rounded-none">
              <div className="bg-[#1A3351] p-4 flex justify-between items-center text-white">
                <h3 className="text-xl font-bold uppercase tracking-tight">
                  Histórico de Movimentações
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <div className="bg-white p-4 border-l-4 border-[#1A3351] mb-6 rounded-none">
                  <p className="text-sm font-bold text-slate-700 uppercase mb-1">
                    Prontuário de:
                  </p>
                  <p className="text-lg font-bold text-[#1A3351]">
                    {selectedFolder.servidor_nome}
                  </p>
                </div>

                {folderLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="font-bold uppercase">
                      Nenhuma movimentação registrada
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-300"></div>
                    <div className="space-y-6">
                      {folderLogs.map((log) => (
                        <div key={log.id} className="relative pl-16">
                          <div
                            className={`absolute left-0 w-12 h-12 flex items-center justify-center rounded-none ${
                              log.tipo_acao === "RETIRADA"
                                ? "bg-orange-600"
                                : "bg-green-600"
                            }`}
                          >
                            {log.tipo_acao === "RETIRADA" ? (
                              <ArrowUpDown className="w-6 h-6 text-white" />
                            ) : (
                              <CheckCircle className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div className="bg-white p-4 shadow border border-slate-200 rounded-none">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p
                                  className={`text-sm font-bold uppercase ${
                                    log.tipo_acao === "RETIRADA"
                                      ? "text-orange-700"
                                      : "text-green-700"
                                  }`}
                                >
                                  {log.tipo_acao === "RETIRADA"
                                    ? "⬆ Retirada"
                                    : "⬇ Devolução"}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(log.data_hora).toLocaleString(
                                    "pt-BR",
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm uppercase">
                              <p>
                                <span className="font-bold text-slate-700">
                                  Servidor:
                                </span>{" "}
                                {log.servidor_nome}
                              </p>
                              <p>
                                <span className="font-bold text-slate-700">
                                  Motivo:
                                </span>{" "}
                                {log.motivo}
                              </p>
                              {log.anotacoes_devolucao && (
                                <div className="bg-green-50 p-3 border-l-2 border-green-600 mt-2 rounded-none">
                                  <p className="font-bold text-green-900 text-xs uppercase mb-1">
                                    Anotações da Devolução:
                                  </p>
                                  <p className="text-slate-700">
                                    {log.anotacoes_devolucao}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#B0B0B0] border-t border-slate-400">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-full h-10 bg-[#1A3351] text-white font-bold uppercase shadow-md hover:brightness-110 active:scale-95 transition-all text-sm rounded-none"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RODAPÉ LGPD PADRÃO SESMT-SYSTEM */}
        <div className="hidden print:block mt-12 pb-10 px-6 border-t border-black/5 text-center max-w-4xl mx-auto">
          <p className="text-[9px] font-bold text-slate-800 mb-1 uppercase tracking-tighter">
            🛡️ IMPORTANTE: Privacidade e Proteção de Dados (LGPD)
          </p>
          <p className="text-[8px] text-slate-600 leading-tight mb-4 text-center">
            Este relatório gerencial contém dados agregados de produtividade
            para fins de Business Intelligence. O uso destas informações é
            restrito à gestão estratégica do SESMT. Proibida a divulgação
            pública ou compartilhamento com terceiros sem autorização prévia.
          </p>
          <p className="text-[8px] text-slate-400 tracking-widest pt-2 border-t border-slate-100">
            Gerado via SESMT SYSTEM - Powered by UXBRAS®
          </p>
        </div>
      </main>
    </div>
  );
}
