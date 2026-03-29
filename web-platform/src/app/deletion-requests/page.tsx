"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  X,
  Menu,
  ChevronDown,
  ChevronUp,
  History as HistoryIcon,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import FilterChips from "@/components/filters/FilterChips";
import ActionIconButton from "@/components/filters/ActionIconButton";
import StatisticCard from "@/components/statistics/StatisticCard";
import StatisticCardRow from "@/components/statistics/StatisticCardRow";
import { countActiveFilters } from "@/components/filters/filtersUtils";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";

interface DeletionRequest {
  id: number;
  history_record_id: number;
  requester_id: string;
  requester_name: string;
  deletion_reason: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer_name?: string;
  original_data: {
    servidor_cpf?: string;
    servidor_nome?: string;
    aso_type?: string;
    cargo?: string;
    secretaria?: string;
    matricula?: string;
    contrato?: string;
    generated_at?: string;
  };
}

export default function DeletionRequestsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [userName, setUserName] = useState<string>("Administrador");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  // Modal de confirmação para aprovar exclusão
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<DeletionRequest | null>(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Smart Header Logic
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > lastScrollTop && scrollTop > 150) {
      if (showHeader) setShowHeader(false);
    } else if (scrollTop < lastScrollTop) {
      if (!showHeader) setShowHeader(true);
    }
    setLastScrollTop(scrollTop);
  };

  async function loadRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from("deletion_requests")
      .select("*")
      .order("requested_at", { ascending: false });

    if (!error && data) {
      setRequests(data);
    } else {
      console.error("Erro ao carregar solicitações:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { session, error } = await safeGetSession();
        if (error) {
          // Aqui omitimos erro de refresh token silenciosamente
          return;
        }
        if (session) {
          const { data } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (!data || data.role !== "admin") {
            router.push("/");
            return;
          }
          setUserRole(data.role);
          setUserId(session.user.id);

          const name =
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "Administrador";
          setUserName(name);
          loadRequests();
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

  const handleApproveRequest = async (request: DeletionRequest) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  const confirmApproval = async () => {
    if (!selectedRequest || !userId) return;

    setProcessingAction(true);
    try {
      // 1. Obter dados do usuário atual para o reviewer_name
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();

      // 2. Excluir o registro do histórico do banco de dados
      // Usamos { count: 'exact' } para verificar se o registro foi realmente deletado
      const { error: deleteError, count } = await supabase
        .from("aso_history")
        .delete({ count: "exact" })
        .eq("id", selectedRequest.history_record_id);

      if (deleteError) {
        // Se o erro for de permissão, avisamos especificamente sobre o script SQL
        const isPermissionError =
          deleteError.message.includes("permission denied") ||
          deleteError.code === "42501";
        alert(
          "Erro ao excluir registro do histórico: " +
            deleteError.message +
            (isPermissionError
              ? "\n\nIMPORTANTE: Verifique se as políticas SQL de DELETE foram aplicadas no Supabase (fix_deletion_policies.sql)."
              : ""),
        );
        setProcessingAction(false);
        return;
      }

      if (count === 0) {
        console.warn(
          "Nenhum registro encontrado em aso_history com ID:",
          selectedRequest.history_record_id,
        );
        // Mesmo que o registro não exista (talvez já deletado), procedemos para manter a solicitação sincronizada
      }

      // 3. Atualizar a solicitação como aprovada
      const { error: updateError } = await supabase
        .from("deletion_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          reviewer_name: profile?.email || "Admin",
        })
        .eq("id", selectedRequest.id);

      if (updateError) {
        alert(
          "Erro ao atualizar status da solicitação: " + updateError.message,
        );
      } else {
        alert("Registro excluído definitivamente com sucesso!");
        loadRequests();
      }
    } catch (err) {
      console.error("Erro ao aprovar exclusão:", err);
      alert("Erro ao processar exclusão");
    }

    setProcessingAction(false);
    setShowApprovalModal(false);
    setSelectedRequest(null);
  };

  const handleRetroactiveCleanup = async () => {
    const approvedRequests = requests.filter((r) => r.status === "approved");
    if (approvedRequests.length === 0) {
      alert("Não foram encontradas solicitações aprovadas para limpar.");
      return;
    }

    if (
      !confirm(
        `Deseja tentar excluir os registros de histórico para as ${approvedRequests.length} solicitações já aprovadas? Isso ajudará a remover nomes que ainda aparecem no sistema.`,
      )
    )
      return;

    setProcessingAction(true);
    let successCount = 0;
    let failCount = 0;
    let alreadyDeleted = 0;

    for (const req of approvedRequests) {
      try {
        const { error, count } = await supabase
          .from("aso_history")
          .delete({ count: "exact" })
          .eq("id", req.history_record_id);

        if (error) {
          console.error(
            `Falha ao excluir ID ${req.history_record_id}:`,
            error.message,
          );
          failCount++;
        } else if (count === 0) {
          alreadyDeleted++;
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    alert(
      `Processo concluído!\nExcluídos agora: ${successCount}\nJá haviam sido excluídos: ${alreadyDeleted}\nFalhas (verificar permissões): ${failCount}`,
    );
    loadRequests();
    setProcessingAction(false);
  };

  const handleRejectRequest = async (requestId: number) => {
    if (
      !confirm("Tem certeza que deseja REJEITAR esta solicitação de exclusão?")
    )
      return;

    setProcessingAction(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId!)
        .single();

      // 1. Marcar a solicitação como rejeitada
      const { error: updateError } = await supabase
        .from("deletion_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          reviewer_name: profile?.email || "Admin",
        })
        .eq("id", requestId);

      // 2. Remover o flag de deletion_pending do histórico
      const request = requests.find((r) => r.id === requestId);
      if (request) {
        await supabase
          .from("aso_history")
          .update({ deletion_pending: false })
          .eq("id", request.history_record_id);
      }

      if (updateError) {
        alert("Erro ao rejeitar solicitação: " + updateError.message);
      } else {
        alert("Solicitação rejeitada. O registro permanecerá no histórico.");
        loadRequests();
      }
    } catch (err) {
      console.error("Erro ao rejeitar exclusão:", err);
      alert("Erro ao processar rejeição");
    }
    setProcessingAction(false);
  };

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "all") return true;
    return req.status === filterStatus;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;
  const headerActiveFilterCount =
    countActiveFilters({}) + (filterStatus === "pending" ? 0 : 1);
  const statusChipLabels = {
    all: "Status: Todas",
    approved: "Status: Aprovadas",
    rejected: "Status: Rejeitadas",
  } as const;

  const clearAllFilters = () => {
    setFilterStatus("pending");
    setIsStatusFilterOpen(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
        <p className="text-[#1A3351] uppercase tracking-[0.3em] font-bold text-xs">
          Carregando...
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
        className={`fixed inset-0 z-[45] bg-black/20 backdrop-blur-[2px] transition-all duration-500 pointer-events-none ${expandedId ? "opacity-100" : "opacity-0"}`}
      />

      {/* ÁREA PRINCIPAL */}
      <main
        onClick={() => setExpandedId(null)}
        className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-visible relative"
      >
        <div
          onScroll={handleMainScroll}
          className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative"
        >
          {/* HEADER */}
          <section
            className={`bg-[#B0B0B0] px-4 lg:px-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg font-sans sticky top-0 z-[110] transition-all duration-500 ease-in-out transform ${showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}
          >
            <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:gap-3">
              <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0 text-[#1A3351]">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold leading-none uppercase tracking-tight">
                      Gerenciar Exclusões
                    </h2>
                    <p className="text-[8px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                      Governança e Auditoria
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden h-9 w-9 bg-[#1A3351] rounded-none text-white active:scale-95 transition-all shadow-md flex items-center justify-center"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>

              <div className="h-6 w-px bg-[#1A3351]/20 shrink-0 hidden md:block" />

              <div className="w-full md:flex-1 md:w-auto min-w-0 text-[10px] font-bold uppercase tracking-wider text-[#1A3351]/70 hidden md:flex items-center">
                Solicitações críticas com fluxo de aprovação administrativa
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ActionIconButton
                  icon={<ClipboardList className="w-4 h-4" />}
                  label="Filtrar status das solicitações"
                  variant="contextual"
                  active={filterStatus !== "pending"}
                  open={isStatusFilterOpen}
                  onToggle={setIsStatusFilterOpen}
                  showMenuIndicator
                >
                  <div className="w-64 bg-white border-2 border-[#7C2D12] shadow-2xl rounded-none overflow-hidden">
                    <div className="p-3 space-y-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#7C2D12]">
                        Status da Solicitação
                      </p>
                      {[
                        {
                          value: "pending",
                          label: `Pendentes (${pendingCount})`,
                        },
                        { value: "all", label: `Todas (${requests.length})` },
                        {
                          value: "approved",
                          label: `Aprovadas (${approvedCount})`,
                        },
                        {
                          value: "rejected",
                          label: `Rejeitadas (${rejectedCount})`,
                        },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setFilterStatus(
                              option.value as
                                | "all"
                                | "pending"
                                | "approved"
                                | "rejected",
                            );
                            setIsStatusFilterOpen(false);
                          }}
                          className={`w-full h-9 px-3 text-left text-[10px] font-bold uppercase transition-all rounded-none ${
                            filterStatus === option.value
                              ? "bg-[#1A3351] text-white"
                              : "bg-[#FFF7E6] border border-[#F59E0B] text-[#7C2D12] hover:brightness-95"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </ActionIconButton>

                {headerActiveFilterCount > 0 && (
                  <ActionIconButton
                    icon={<X className="w-4 h-4" />}
                    label="Limpar filtros ativos"
                    variant="danger"
                    onClick={clearAllFilters}
                  />
                )}

                {approvedCount > 0 && (
                  <ActionIconButton
                    className="hidden md:block"
                    icon={<HistoryIcon className="w-4 h-4" />}
                    label={`Limpar registros aprovados (${approvedCount})`}
                    variant="primary"
                    onClick={handleRetroactiveCleanup}
                  />
                )}
              </div>
            </div>

            <div className="mt-3">
              <FilterChips
                searchTerm=""
                startDate=""
                endDate=""
                filterUser="all"
                filterSecretaria="all"
                filterAsoType="all"
                referrals={[]}
                operatorsMap={{}}
                extraChips={
                  filterStatus === "pending"
                    ? []
                    : [{ key: "status", label: statusChipLabels[filterStatus] }]
                }
              />
            </div>
          </section>

          {/* CONTEÚDO */}
          <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
            {/* STATS CARDS */}
            <StatisticCardRow
              columns={3}
              className="grid-cols-2 lg:grid-cols-3 shrink-0"
            >
              <StatisticCard
                variant="informative"
                accent="warning"
                title="Pendentes"
                value={pendingCount}
              />
              <StatisticCard
                variant="informative"
                accent="success"
                title="Aprovadas"
                value={approvedCount}
              />
              <StatisticCard
                variant="informative"
                accent="danger"
                title="Rejeitadas"
                value={rejectedCount}
                className="hidden sm:block"
              />
            </StatisticCardRow>

            {/* LISTA DE SOLICITAÇÕES */}
            <div className="bg-white border-2 border-slate-300 shadow-xl overflow-visible rounded-none">
              <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A3351]">
                  Solicitações de Exclusão
                </h3>
              </div>
              <div className="divide-y divide-slate-200">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`group transition-all duration-500 relative ${expandedId === request.id ? "z-[50] bg-white shadow-2xl scale-[1.01] -mx-2" : "z-10"}`}
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(
                            expandedId === request.id ? null : request.id,
                          );
                        }}
                        className={`px-6 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 cursor-pointer transition-all border-l-4 bg-white ${
                          expandedId === request.id
                            ? "border-[#E31E24]"
                            : request.status === "pending"
                              ? "border-[#E31E24]"
                              : request.status === "approved"
                                ? "border-green-500"
                                : "border-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className={`p-2 rounded-none border ${
                              request.status === "pending"
                                ? "bg-[#E31E24]/10 text-[#E31E24] border-[#E31E24]/20"
                                : request.status === "approved"
                                  ? "bg-green-50 text-green-600 border-green-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}
                          >
                            {request.status === "pending" ? (
                              <AlertTriangle className="w-5 h-5" />
                            ) : request.status === "approved" ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold uppercase text-[#1A3351] text-sm leading-tight">
                              {request.original_data?.servidor_nome ||
                                "Nome não disponível"}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                              {request.original_data?.aso_type ||
                                "Tipo não disponível"}
                              {(request.original_data?.matricula ||
                                request.original_data?.contrato) && (
                                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 border border-slate-200 text-[8px] font-bold">
                                  M: {request.original_data?.matricula || "---"}{" "}
                                  | C:{" "}
                                  {request.original_data?.contrato || "---"}
                                </span>
                              )}
                            </p>
                            <p className="text-[9px] font-medium text-slate-400 mt-1">
                              Solicitado por:{" "}
                              <span className="text-[#E31E24] font-bold">
                                {request.requester_name}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">
                              Solicitado em
                            </span>
                            <span className="text-[11px] font-bold text-slate-700">
                              {new Date(request.requested_at).toLocaleString(
                                "pt-BR",
                              )}
                            </span>
                          </div>
                          {expandedId === request.id ? (
                            <ChevronUp className="w-5 h-5 text-[#1A3351]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                      </div>

                      {/* Detalhes Expandidos */}
                      {expandedId === request.id && (
                        <div className="px-6 pb-6 pt-4 bg-white border-t border-slate-200 relative z-[50]">
                          <div className="bg-white p-4 rounded-none border border-slate-200 mb-4">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                              Motivo da Exclusão:
                            </h5>
                            <p className="text-sm text-[#1A3351] font-semibold leading-relaxed">
                              {request.deletion_reason}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-white p-3 rounded-none border border-slate-200">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                                Cargo
                              </span>
                              <p className="text-sm font-bold text-[#1A3351]">
                                {request.original_data?.cargo || "N/A"}
                              </p>
                            </div>
                            <div className="bg-white p-3 rounded-none border border-slate-200">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                                Secretaria
                              </span>
                              <p className="text-sm font-bold text-[#1A3351]">
                                {request.original_data?.secretaria || "N/A"}
                              </p>
                            </div>
                          </div>

                          {request.status === "pending" && (
                            <div className="flex gap-3 mt-4">
                              <button
                                onClick={() => handleApproveRequest(request)}
                                disabled={processingAction}
                                className="flex-1 flex items-center justify-center gap-2 h-12 bg-green-600 text-white font-bold text-xs uppercase rounded-none shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 border-b-4 border-green-800"
                              >
                                <CheckCircle className="w-4 h-4" />
                                {processingAction
                                  ? "Processando..."
                                  : "Aprovar e Excluir"}
                              </button>
                              <button
                                onClick={() => handleRejectRequest(request.id)}
                                disabled={processingAction}
                                className="flex-1 flex items-center justify-center gap-2 h-12 bg-slate-600 text-white font-bold text-xs uppercase rounded-none shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 border-b-4 border-slate-800"
                              >
                                <XCircle className="w-4 h-4" />
                                {processingAction
                                  ? "Processando..."
                                  : "Rejeitar Solicitação"}
                              </button>
                            </div>
                          )}

                          {request.status !== "pending" && (
                            <div className="bg-white p-3 rounded-none border border-slate-200 mt-4">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">
                                Revisado por
                              </p>
                              <p className="text-sm font-bold text-[#1A3351]">
                                {request.reviewer_name || "N/A"}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                em{" "}
                                {request.reviewed_at
                                  ? new Date(
                                      request.reviewed_at,
                                    ).toLocaleString("pt-BR")
                                  : "N/A"}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-slate-400 uppercase font-bold text-xs italic tracking-widest">
                    {filterStatus === "all"
                      ? "Nenhuma solicitação encontrada"
                      : `Nenhuma solicitação ${filterStatus === "pending" ? "pendente" : filterStatus === "approved" ? "aprovada" : "rejeitada"}`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MODAL DE CONFIRMAÇÃO DE APROVAÇÃO */}
          {showApprovalModal && selectedRequest && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 text-black">
              <div className="bg-white rounded-none shadow-2xl max-w-md w-full border-4 border-[#1A3351] animate-in fade-in zoom-in-95">
                <div className="bg-[#1A3351] p-6 flex items-center gap-3 border-b-2 border-white/10">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                  <h3 className="text-lg font-bold uppercase text-white tracking-tight">
                    Confirmar Exclusão
                  </h3>
                </div>

                <div className="p-8 space-y-6">
                  <p className="text-sm font-bold text-slate-700">
                    Esta ação é{" "}
                    <span className="text-[#E31E24] uppercase font-bold">
                      IRREVERSÍVEL
                    </span>
                    . O registro será PERMANENTEMENTE excluído do banco de
                    dados.
                  </p>

                  <div className="bg-slate-50 p-3 rounded-none border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                      Servidor:
                    </p>
                    <p className="font-bold text-[#1A3351]">
                      {selectedRequest.original_data?.servidor_nome}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-none border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                      Motivo da exclusão:
                    </p>
                    <p className="text-sm text-slate-700 font-medium">
                      {selectedRequest.deletion_reason}
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-[#B0B0B0] flex gap-3 border-t border-slate-300">
                  <button
                    onClick={() => {
                      setShowApprovalModal(false);
                      setSelectedRequest(null);
                    }}
                    disabled={processingAction}
                    className="flex-1 h-12 bg-white text-slate-700 font-bold text-xs uppercase rounded-none border border-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmApproval}
                    disabled={processingAction}
                    className="flex-[2] h-12 bg-[#E31E24] text-white font-bold text-xs uppercase rounded-none shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border-b-4 border-red-900"
                  >
                    {processingAction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Confirmar Exclusão
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
