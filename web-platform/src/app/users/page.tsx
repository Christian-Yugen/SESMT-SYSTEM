"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  X,
  Menu,
  UserPlus,
  Shield,
  UserRound,
  Trash2,
  Edit,
  Save,
  ShieldCheck,
  Mail,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import CompactFilterBar from "@/components/filters/CompactFilterBar";
import FilterChips from "@/components/filters/FilterChips";
import ActionIconButton from "@/components/filters/ActionIconButton";
import {
  countActiveFilters,
  normalizeSearchTerm,
} from "@/components/filters/filtersUtils";
import {
  generateUUID,
  handleAuthError,
  safeGetSession,
} from "@/lib/auth-utils";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const router = useRouter();

  // Invite user state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("admin");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [userName, setUserName] = useState<string>("Usuário");
  const [userRole, setUserRole] = useState<string | null>(null);

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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { session, error } = await safeGetSession();
        if (error) {
          await handleAuthError(error);
          return;
        }

        if (session) {
          // Verifica se é administrador
          const { data: prof } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (!prof || (prof.role !== "admin" && prof.role !== "analytic_manager")) {
            router.push("/");
            return;
          }
          setUserRole(prof.role);

          const name =
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "Administrador";
          setUserName(name);
          loadProfiles();
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

  async function loadProfiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProfiles(data);
    }
    setLoading(false);
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (!error) {
      router.refresh();
      loadProfiles();
    } else {
      console.error("Erro ao atualizar role:", error.message);
      alert("Erro ao atualizar nível de acesso: " + error.message);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail) return;

    const normalized = inviteEmail.trim().toLowerCase();
    const fullInviteEmail = normalized.includes("@")
      ? normalized
      : `${normalized}@treslagoas.ms.gov.br`;

    if (!fullInviteEmail.endsWith("@treslagoas.ms.gov.br")) {
      alert(
        "Apenas e-mails corporativos @treslagoas.ms.gov.br são permitidos.",
      );
      return;
    }

    setInviteLoading(true);

    try {
      // Verifica se já existe
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", fullInviteEmail)
        .maybeSingle();

      if (existing) {
        alert("Este e-mail já possui um perfil cadastrado ou pré-autorizado.");
        setInviteLoading(false);
        return;
      }

      // Cria perfil pré-autorizado com um ID temporário (UUID) usando utility compatível
      const tempId = generateUUID();
      const { error } = await supabase.from("profiles").insert({
        id: tempId,
        email: fullInviteEmail,
        role: inviteRole,
        full_name: "CONVITE PENDENTE",
      });

      if (error) {
        alert("Erro ao criar convite: " + error.message);
      } else {
        setInviteEmail("");
        setIsInviteModalOpen(false);
        router.refresh();
        loadProfiles();
      }
    } catch (err: unknown) {
      console.error("Erro no processamento:", err);
      alert("Erro inesperado ao criar operador.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteProfile = async (userId: string) => {
    if (!confirm("Tem certeza que deseja remover este acesso?")) return;

    const { error } = await supabase.from("profiles").delete().eq("id", userId);

    if (!error) {
      router.refresh();
      loadProfiles();
    } else {
      alert("Erro ao remover: " + error.message);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
  };

  const headerActiveFilterCount = countActiveFilters({ searchTerm });

  const filteredProfiles = profiles.filter(
    (p) =>
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
        <p className="text-[#1A3351] uppercase tracking-[0.3em] font-bold text-xs">
          Acessando Banco de Dados...
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
      <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-visible relative">
        <div
          onScroll={handleMainScroll}
          className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative"
        >
          {/* HEADER */}
          <section
            className={`bg-[#B0B0B0] px-2.5 sm:px-4 lg:px-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg sticky top-0 z-[110] transition-all duration-500 ease-in-out transform ${showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}
          >
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:flex-nowrap md:gap-3">
              <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0 text-[#1A3351]">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <div>
                    <h2 className="text-[15px] sm:text-lg md:text-xl font-bold leading-none uppercase tracking-tight">
                      Operadores
                    </h2>
                    <p className="text-[8px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                      Administração de Acessos
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
                  searchPlaceholder="PESQUISAR USUÁRIO..."
                  showUserFilter={false}
                  showDateFilter={false}
                  showSecretariaFilter={false}
                  showAsoTypeFilter={false}
                  activeFilterCount={headerActiveFilterCount}
                  extraActions={
                    userRole !== "analytic_manager" && (
                      <ActionIconButton
                        icon={<UserPlus className="w-4 h-4" />}
                        label="Novo operador"
                        variant="danger"
                        onClick={() => setIsInviteModalOpen(true)}
                      />
                    )
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
          <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-8">
            <div className="bg-white border-2 border-slate-300 shadow-xl overflow-visible rounded-none">
              <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400 flex justify-between items-center text-black">
                <h3 className="text-xs font-bold uppercase tracking-widest">
                  Base de Acessos Autorizados
                </h3>
                <div className="text-[9px] font-bold text-slate-600 uppercase">
                  Total: {filteredProfiles.length} Usuários
                </div>
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Usuário / E-mail
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Nível de Acesso
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Data Cadastro
                      </th>
                      <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProfiles.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-none flex items-center justify-center border border-slate-200">
                              <UserRound className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#1A3351] uppercase leading-none mb-1">
                                {user.full_name || user.email.split("@")[0]}
                              </p>
                              <p className="text-[10px] font-medium text-slate-400">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <select
                              disabled={userRole === "analytic_manager"}
                              value={user.role || "operator"}
                              onChange={(e) =>
                                handleUpdateRole(user.id, e.target.value)
                              }
                              className={`
                                                            px-3 py-1.5 rounded-none text-[9px] font-bold uppercase 
                                                            ${
                                                              user.role ===
                                                              "admin"
                                                                ? "bg-red-50 text-[#E31E24] border border-[#E31E24]/20"
                                                                : user.role ===
                                                                    "nurse"
                                                                  ? "bg-green-50 text-green-700 border border-green-200"
                                                                  : user.role ===
                                                                      "social_assistant"
                                                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                    : user.role ===
                                                                        "analytic_manager"
                                                                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                                      : user.role === "doctor"
                                                                        ? "bg-teal-50 text-teal-700 border border-teal-200"
                                                                        : user.role === "operator"
                                                                          ? "bg-blue-50 text-blue-600 border border-blue-100"
                                                                          : "bg-slate-50 text-slate-500 border border-slate-200"
                                                            }
                                                            outline-none cursor-pointer disabled:cursor-default disabled:opacity-80
                                                        `}
                            >
                              <option value="admin">
                                ADMINISTRADOR (TOTAL)
                              </option>
                              <option value="nurse">
                                ENFERMAGEM (ASO/ENC/RELAT)
                              </option>
                              <option value="social_assistant">
                                ASSISTENTE SOCIAL (ABONO)
                              </option>
                              <option value="analytic_manager">
                                GERENTE ANALÍTICO (CONSULTA TOTAL)
                              </option>
                              <option value="operator">
                                OPERADOR (APENAS ENCAMINHAM.)
                              </option>
                              <option value="doctor">
                                MÉDICO (AUDITOR CLÍNICO)
                              </option>
                              <option value="viewer">
                                VISUALIZADOR (CONSULTA)
                              </option>
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">
                          {new Date(user.created_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </td>
                        <td className="px-6 py-4">
                            {userRole !== "analytic_manager" && (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="p-2 text-slate-400 hover:text-[#1A3351] transition-colors"
                                  title="Editar Perfil"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProfile(user.id)}
                                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                  title="Revogar Acesso"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE LIST */}
              <div className="lg:hidden divide-y divide-slate-200">
                {filteredProfiles.map((user) => (
                  <div key={user.id} className="p-4 flex flex-col gap-4">
                     <div className="flex items-start justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-100 rounded-none flex items-center justify-center shrink-0 border border-slate-200">
                           <UserRound className="w-5 h-5 text-slate-400" />
                         </div>
                         <div>
                           <p className="text-sm font-bold text-[#1A3351] uppercase leading-tight mb-1">
                             {user.full_name || user.email.split("@")[0]}
                           </p>
                           <p className="text-[10px] font-medium text-slate-400 truncate max-w-[180px]">
                             {user.email}
                           </p>
                         </div>
                       </div>
                       {userRole !== "analytic_manager" && (
                         <button
                           onClick={() => handleDeleteProfile(user.id)}
                           className="p-2 text-red-500/80 hover:text-red-500 transition-colors bg-red-50 rounded-none border border-red-100"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                     </div>

                    <div className="flex flex-col gap-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Acesso:
                      </p>
                      <select
                        disabled={userRole === "analytic_manager"}
                        value={user.role || "operator"}
                        onChange={(e) =>
                          handleUpdateRole(user.id, e.target.value)
                        }
                        className={`
                                                w-full px-4 h-10 rounded-none text-[10px] font-bold uppercase 
                                                ${
                                                  user.role === "admin"
                                                    ? "bg-red-50 text-[#E31E24] border border-[#E31E24]/20"
                                                    : user.role === "nurse"
                                                      ? "bg-green-50 text-green-700 border border-green-200"
                                                      : user.role ===
                                                          "social_assistant"
                                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                        : user.role ===
                                                            "analytic_manager"
                                                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                          : user.role === "doctor"
                                                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                                                            : user.role === "operator"
                                                              ? "bg-blue-50 text-blue-600 border border-blue-100"
                                                              : "bg-slate-50 text-slate-500 border border-slate-200"
                                                }
                                                outline-none focus:ring-2 focus:ring-[#1A3351]/10 disabled:opacity-80
                                            `}
                      >
                        <option value="admin">ADMINISTRADOR</option>
                        <option value="nurse">ENFERMAGEM</option>
                        <option value="social_assistant">ASSIST. SOCIAL</option>
                        <option value="analytic_manager">GERENTE BI</option>
                        <option value="operator">OPERADOR</option>
                        <option value="doctor">MÉDICO</option>
                        <option value="viewer">VISUALIZADOR</option>
                      </select>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase bg-slate-50 p-2 border border-slate-200 rounded-none">
                      <span>Cadastro:</span>
                      <span>
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProfiles.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-slate-400 uppercase font-bold text-xs tracking-widest italic">
                    Nenhum operador encontrado.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-[#B0B0B0] p-4 text-center border-2 border-slate-300 shadow-md rounded-none">
              <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-slate-600">
                Powered by UXBRAS® — Controle de Segurança SESMT
              </p>
            </div>
          </div>

          {/* MODAL DE CONVITE (NOVO OPERADOR) */}
          {isInviteModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 text-black">
              <div className="bg-white w-full max-w-md border-2 border-[#1A3351] shadow-2xl animate-in zoom-in-95 duration-200 rounded-none">
                <div className="bg-[#1A3351] p-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    <h3 className="font-bold uppercase text-xs tracking-widest">
                      Novo Operador SESMT
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="rounded-none hover:bg-white/10 p-1"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        E-mail Corporativo
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ex: joao.silva (apenas usuário)"
                          className="w-full h-10 px-10 bg-[#f8f8f8] border border-slate-200 font-bold text-sm outline-none focus:border-[#E31E24] uppercase rounded-none"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value.trim().toLowerCase())}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        Perfil de Acesso
                      </label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          className="w-full h-10 px-10 bg-[#f8f8f8] border border-slate-200 font-bold text-sm outline-none focus:border-[#E31E24] uppercase appearance-none rounded-none"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                        >
                          <option value="admin">ADMINISTRADOR (TOTAL)</option>
                          <option value="nurse">
                            ENFERMAGEM (ASO/ENC/RELAT)
                          </option>
                          <option value="social_assistant">
                            ASSISTENTE SOCIAL (ABONO)
                          </option>
                          <option value="analytic_manager">
                            GERENTE ANALÍTICO (CONSULTA TOTAL)
                          </option>
                          <option value="operator">
                            OPERADOR (APENAS ENCAMINHAM.)
                          </option>
                          <option value="doctor">
                            MÉDICO (AUDITOR CLÍNICO)
                          </option>
                          <option value="viewer">
                            VISUALIZADOR (CONSULTA)
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border-l-4 border-[#1A3351] rounded-none">
                    <p className="text-[10px] text-blue-800 leading-relaxed italic font-medium">
                      * O perfil será criado como &ldquo;PRÉ-AUTORIZADO&rdquo;.
                      Quando o usuário realizar o primeiro acesso com este
                      e-mail, o sistema vinculará automaticamente o acesso à
                      role escolhida.
                    </p>
                  </div>

                  <button
                    disabled={inviteLoading || !inviteEmail}
                    onClick={handleInviteUser}
                    className="w-full h-12 bg-[#1A3351] text-white font-bold uppercase tracking-widest text-xs shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 rounded-none border-b-4 border-blue-950"
                  >
                    {inviteLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Confirmar Pré-Autorização</span>
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
