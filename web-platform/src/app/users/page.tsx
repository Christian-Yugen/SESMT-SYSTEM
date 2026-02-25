"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, ChevronUp, UserPlus, Shield, UserRound, Users as UsersIcon,
    Search, Filter, Trash2, Edit, Save, ShieldCheck, Mail, History as HistoryIcon,
    ClipboardList,
    BarChart3,
    TrendingUp,
    FolderOpen
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { generateUUID } from "@/lib/auth-utils";

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
    const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const router = useRouter();

    // Invite user state
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("admin");
    const [inviteLoading, setInviteLoading] = useState(false);
    const [userName, setUserName] = useState<string>("Usuário");

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error("Auth error:", error.message);
                    await supabase.auth.signOut();
                    router.push("/login");
                    return;
                }

                if (session) {
                    // Verifica se é administrador
                    const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                    if (!prof || prof.role !== 'admin') {
                        router.push("/");
                        return;
                    }

                    const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Administrador";
                    setUserName(name);
                    loadProfiles();
                } else {
                    router.push("/login");
                    return;
                }
            } catch (err) {
                console.error("Fatal auth error:", err);
                await supabase.auth.signOut();
                router.push("/login");
            }
        };
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') router.push("/login");
        });

        return () => subscription.unsubscribe();
    }, [router]);

    async function loadProfiles() {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setProfiles(data);
        }
        setLoading(false);
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (!error) {
            router.refresh();
            loadProfiles();
        }
    };

    const handleInviteUser = async () => {
        if (!inviteEmail) return;

        if (!inviteEmail.toLowerCase().endsWith("@treslagoas.ms.gov.br")) {
            alert("Apenas e-mails corporativos @treslagoas.ms.gov.br são permitidos.");
            return;
        }

        setInviteLoading(true);

        try {
            // Verifica se já existe
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', inviteEmail.toLowerCase())
                .maybeSingle();

            if (existing) {
                alert("Este e-mail já possui um perfil cadastrado ou pré-autorizado.");
                return;
            }

            // Cria perfil pré-autorizado com um ID temporário (UUID) usando utility compatível
            const tempId = generateUUID();
            const { error } = await supabase
                .from('profiles')
                .insert({
                    id: tempId,
                    email: inviteEmail.toLowerCase(),
                    role: inviteRole,
                    full_name: 'CONVITE PENDENTE'
                });

            if (error) {
                alert("Erro ao criar convite: " + error.message);
            } else {
                setInviteEmail("");
                setIsInviteModalOpen(false);
                router.refresh();
                loadProfiles();
            }
        } catch (err: any) {
            console.error("Erro no processamento:", err);
            alert("Erro inesperado ao criar operador.");
        } finally {
            setInviteLoading(false);
        }
    };

    const handleDeleteProfile = async (userId: string) => {
        if (!confirm("Tem certeza que deseja remover este acesso?")) return;

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (!error) {
            router.refresh();
            loadProfiles();
        } else {
            alert("Erro ao remover: " + error.message);
        }
    };

    const filteredProfiles = profiles.filter(p =>
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
                <p className="text-[#1A3351] uppercase tracking-[0.3em] font-black text-xs">Acessando Banco de Dados...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-x-hidden">

            {/* SIDEBAR */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 bg-[#1A3351] border-r border-white/10 flex flex-col p-6 lg:p-4 shrink-0 shadow-2xl transition-transform duration-300 transform ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="mb-8 flex flex-col items-center">
                    <div className="flex justify-between items-center w-full lg:hidden mb-4">
                        <span className="text-white font-bold text-xs uppercase">Menu</span>
                        <button onClick={() => setIsSidebarOpen(false)}>
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>
                    <div className="w-full h-16 mt-2 mb-2 flex items-center justify-center">
                        <img src="/images/logo_white.png" alt="SESMT" className="h-14 w-auto object-contain" />
                    </div>
                    <div className="text-center w-full px-1 mt-2">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">SESMT SYSTEM</p>
                        <p className="text-xs font-bold text-white/70 uppercase tracking-wider truncate whitespace-nowrap">
                            Olá, <span className="text-white">{userName}</span>
                        </p>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                    <button onClick={() => router.push('/')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                        <LayoutDashboard className="w-4 h-4 shrink-0" />
                        <span>Criar documentos</span>
                    </button>

                    <button onClick={() => router.push('/referrals')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                        <ClipboardList className="w-4 h-4 shrink-0" />
                        <span>Central de Evidências</span>
                    </button>

                    <div className="space-y-1">
                        <button
                            onClick={() => setIsBenefitsOpen(!isBenefitsOpen)}
                            className="w-full flex items-center justify-between p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
                        >
                            <div className="flex items-center gap-1.5">
                                <HeartPulse className="w-4 h-4 shrink-0" />
                                <span>Benefícios</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isBenefitsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {(isBenefitsOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
                            <div className={`${isBenefitsOpen ? 'flex' : 'hidden lg:group-hover:flex'} flex-col space-y-1`}>
                                <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <Database className="w-3.5 h-3.5 shrink-0" />
                                    <span>Auxílio Doença</span>
                                </button>
                                <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <FileSearch className="w-3.5 h-3.5 shrink-0" />
                                    <span>Readaptação</span>
                                </button>
                                <button
                                    onClick={() => router.push('/abono')}
                                    className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap"
                                >
                                    <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                                    <span>Abono Salarial</span>
                                </button>
                                <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                    <span>Redução de Jornada</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <button
                            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            className="w-full flex items-center justify-between p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
                        >
                            <div className="flex items-center gap-1.5">
                                <HistoryIcon className="w-4 h-4 shrink-0" />
                                <span>Histórico</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {(isHistoryOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
                            <div className={`${isHistoryOpen ? 'flex' : 'hidden lg:group-hover:flex'} flex-col space-y-1`}>
                                <button onClick={() => router.push('/history')} className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <HistoryIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span>Log Principal</span>
                                </button>
                                <button onClick={() => router.push('/analytics')} className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                                    <span>Indicadores</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={() => router.push('/archive')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                        <FolderOpen className="w-4 h-4 shrink-0" />
                        <span>Arquivo Médico</span>
                    </button>

                    <button onClick={() => router.push('/users')} className="w-full flex items-center gap-1.5 p-3 rounded-lg bg-white/10 text-white font-bold text-xs uppercase tracking-wider shadow-sm border border-white/5">
                        <UsersIcon className="w-4 h-4 shrink-0" />
                        <span>Usuários</span>
                    </button>

                    <button onClick={() => router.push('/deletion-requests')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span>Exclusões Pendentes</span>
                    </button>
                </nav>

                <div className="mt-auto space-y-4">
                    <button onClick={handleLogout} className="w-full flex items-center gap-1.5 p-2 text-white/30 hover:text-white transition-all font-bold uppercase tracking-widest text-[10px] px-4">
                        <LogOut className="w-4 h-4" /> Sair
                    </button>
                    <div className="pl-4 pb-6 flex flex-col border-t border-white/5 pt-4">
                        <p className="text-[10px] font-normal text-white/60 leading-none mb-1 text-left">Powered by</p>
                        <p className="text-[18px] font-black text-white leading-none tracking-[0.1em] text-left">
                            UXBRAS<span className="text-[12px] font-normal align-top ml-0.5 tracking-normal">®</span>
                        </p>
                    </div>
                </div>
            </aside>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* ÁREA PRINCIPAL */}
            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden">

                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 lg:p-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3 text-[#1A3351]">
                            <Shield className="w-5 lg:w-6 h-5 lg:h-6" />
                            <h2 className="text-lg lg:text-xl font-black leading-none uppercase tracking-tight">Operadores</h2>
                        </div>
                        <div className="flex items-center gap-2 lg:gap-3">
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="p-2.5 lg:px-6 lg:h-10 bg-[#E31E24] text-white font-black rounded-lg lg:rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10 flex items-center gap-2"
                            >
                                <UserPlus className="w-5 h-5 lg:w-4 lg:h-4" />
                                <span className="hidden lg:inline">Novo Operador</span>
                            </button>
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden p-2.5 bg-[#1A3351] rounded-lg text-white active:scale-95 transition-all shadow-md flex items-center gap-2"
                            >
                                <Menu className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Menu</span>
                            </button>
                        </div>
                    </div>

                    <div className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="PESQUISAR USUÁRIO..."
                            className="w-full px-11 py-3 lg:py-2 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase rounded-lg lg:rounded-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </section>

                {/* CONTEÚDO */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">

                    <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden">
                        <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest">Base de Acessos Autorizados</h3>
                            <div className="text-[9px] font-black text-slate-600 uppercase">Total: {filteredProfiles.length} Usuários</div>
                        </div>

                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário / E-mail</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível de Acesso</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Cadastro</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProfiles.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                                                        <UserRound className="w-5 h-5 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-[#1A3351] uppercase leading-none mb-1">
                                                            {user.full_name || user.email.split('@')[0]}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={user.role || 'operator'}
                                                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                        className={`
                                                            px-3 py-1.5 rounded-full text-[9px] font-black uppercase 
                                                            ${user.role === 'admin' ? 'bg-red-50 text-[#E31E24] border border-[#E31E24]/20' :
                                                                user.role === 'nurse' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                                    user.role === 'operator' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                                        'bg-slate-50 text-slate-500 border border-slate-200'}
                                                            outline-none cursor-pointer
                                                        `}
                                                    >
                                                        <option value="admin">ADMINISTRADOR (TOTAL)</option>
                                                        <option value="nurse">ENFERMAGEM (ASO/ENC/RELAT)</option>
                                                        <option value="social_assistant">ASSISTENTE SOCIAL (ABONO)</option>
                                                        <option value="analytic_manager">GERENTE ANALÍTICO (CONSULTA TOTAL)</option>
                                                        <option value="operator">OPERADOR (APENAS ENCAMINHAM.)</option>
                                                        <option value="viewer">VISUALIZADOR (CONSULTA)</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">
                                                {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button className="p-2 text-slate-400 hover:text-[#1A3351] transition-colors" title="Editar Perfil">
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
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                                <UserRound className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-[#1A3351] uppercase leading-tight mb-1">
                                                    {user.full_name || user.email.split('@')[0]}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 truncate max-w-[180px]">{user.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteProfile(user.id)}
                                            className="p-2 text-red-500/20 hover:text-red-500 transition-colors bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Acesso:</p>
                                        <select
                                            value={user.role || 'operator'}
                                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                            className={`
                                                w-full px-4 py-3 rounded-lg text-[10px] font-black uppercase 
                                                ${user.role === 'admin' ? 'bg-red-50 text-[#E31E24] border border-[#E31E24]/20' :
                                                    user.role === 'nurse' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                        user.role === 'operator' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                            'bg-slate-50 text-slate-500 border border-slate-200'}
                                                outline-none
                                            `}
                                        >
                                            <option value="admin">ADMINISTRADOR</option>
                                            <option value="nurse">ENFERMAGEM</option>
                                            <option value="social_assistant">ASSIST. SOCIAL</option>
                                            <option value="analytic_manager">GERENTE BI</option>
                                            <option value="operator">OPERADOR</option>
                                            <option value="viewer">VISUALIZADOR</option>
                                        </select>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase bg-slate-50 p-2 rounded-lg">
                                        <span>Cadastro:</span>
                                        <span>{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredProfiles.length === 0 && (
                            <div className="py-20 text-center">
                                <p className="text-slate-400 uppercase font-black text-xs tracking-widest italic">Nenhum operador encontrado.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#B0B0B0] p-4 text-center border-2 border-slate-300 shadow-md">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">Powered by UXBRAS® — Controle de Segurança SESMT</p>
                    </div>
                </div>
            </main>

            {/* MODAL DE CONVITE (NOVO OPERADOR) */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md border-2 border-[#1A3351] shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-[#1A3351] p-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5" />
                                <h3 className="font-black uppercase text-xs tracking-widest">Novo Operador SESMT</h3>
                            </div>
                            <button onClick={() => setIsInviteModalOpen(false)}>
                                <X className="w-5 h-5 text-white/50 hover:text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="email"
                                            placeholder="exemplo@treslagoas.ms.gov.br"
                                            className="w-full px-10 py-3 bg-[#f8f8f8] border border-slate-200 font-bold text-sm outline-none focus:border-[#E31E24] uppercase"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil de Acesso</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            className="w-full px-10 py-3 bg-[#f8f8f8] border border-slate-200 font-bold text-sm outline-none focus:border-[#E31E24] uppercase appearance-none"
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value)}
                                        >
                                            <option value="admin">ADMINISTRADOR (TOTAL)</option>
                                            <option value="nurse">ENFERMAGEM (ASO/ENC/RELAT)</option>
                                            <option value="social_assistant">ASSISTENTE SOCIAL (ABONO)</option>
                                            <option value="analytic_manager">GERENTE ANALÍTICO (CONSULTA TOTAL)</option>
                                            <option value="operator">OPERADOR (APENAS ENCAMINHAM.)</option>
                                            <option value="viewer">VISUALIZADOR (CONSULTA)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 border-l-4 border-[#1A3351] rounded">
                                <p className="text-[10px] text-blue-800 leading-relaxed italic">
                                    * O perfil será criado como "PRÉ-AUTORIZADO". Quando o usuário realizar o primeiro acesso com este e-mail, o sistema vinculará automaticamente o acesso à role escolhida.
                                </p>
                            </div>

                            <button
                                disabled={inviteLoading || !inviteEmail}
                                onClick={handleInviteUser}
                                className="w-full py-4 bg-[#1A3351] text-white font-black uppercase tracking-widest text-xs shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
    );
}
