"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, ChevronUp, UserPlus, Shield, UserRound, Users as UsersIcon,
    Search, Filter, Trash2, Edit, Save, ShieldCheck, Mail, History as HistoryIcon
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
    const [inviteRole, setInviteRole] = useState("operator");
    const [inviteLoading, setInviteLoading] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }

            // Verifica se é administrador
            const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
            if (!prof || prof.role !== 'admin') {
                router.push("/");
                return;
            }

            loadProfiles();
        };
        checkAuth();
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
            loadProfiles();
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
                fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-52 bg-[#1A3351] border-r border-white/10 flex flex-col p-4 shrink-0 shadow-2xl transition-transform duration-300 transform
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="mb-8 flex flex-col items-center">
                    <div className="flex justify-between items-center w-full lg:hidden mb-4">
                        <span className="text-white font-black text-xs uppercase">Menu</span>
                        <button onClick={() => setIsSidebarOpen(false)}>
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>
                    <div className="relative w-full h-16 mb-2">
                        <Image src="/images/logo_white.png" alt="Logo" fill className="object-contain" priority />
                    </div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">SESMT SYSTEM</p>
                </div>

                <nav className="flex-1 space-y-1">
                    <button onClick={() => router.push('/')} className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>ASO</span>
                    </button>
                    <button className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight">
                        <Database className="w-4 h-4" />
                        <span>Afastamentos</span>
                    </button>
                    <button className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight">
                        <FileSearch className="w-4 h-4" />
                        <span>Readaptação</span>
                    </button>
                    <button onClick={() => router.push('/history')} className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight">
                        <HistoryIcon className="w-4 h-4" />
                        <span>Histórico</span>
                    </button>
                    <button className="w-full flex items-center gap-2 p-3 rounded-lg bg-white/10 text-white font-black text-[11px] uppercase tracking-tight shadow-sm border border-white/5">
                        <UsersIcon className="w-4 h-4" />
                        <span>Usuários</span>
                    </button>
                </nav>

                <div className="mt-auto space-y-4">
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 p-2 text-white/30 hover:text-white transition-all font-black uppercase tracking-widest text-[9px] px-4">
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

            {/* ÁREA PRINCIPAL */}
            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden">

                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <Shield className="w-6 h-6 text-[#1A3351]" />
                            <h2 className="text-xl font-black leading-none uppercase tracking-tight">Gestão de Operadores</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="hidden md:flex items-center justify-center gap-2 w-64 h-10 bg-[#E31E24] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
                            >
                                <UserPlus className="w-4 h-4" />
                                Novo Operador
                            </button>
                            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1A3351] rounded text-white active:scale-90 transition-transform">
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="PESQUISAR POR NOME OU E-MAIL DO USUÁRIO..."
                            className="w-full px-10 py-2 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase"
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

                        <div className="overflow-x-auto">
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
                                                        <option value="admin">Administrador (Total)</option>
                                                        <option value="nurse">Enfermagem (ASO/Enc/Relat)</option>
                                                        <option value="operator">Operador (Apenas Encaminham.)</option>
                                                        <option value="viewer">Visualizador (Consulta)</option>
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
                                                    <button className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Revogar Acesso">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredProfiles.length === 0 && (
                                <div className="py-20 text-center">
                                    <p className="text-slate-400 uppercase font-black text-xs tracking-widest italic">Nenhum operador encontrado com este critério.</p>
                                </div>
                            )}
                        </div>
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
                                            <option value="operator">Operador (Emissão de Documentos)</option>
                                            <option value="admin">Administrador (Controle Total)</option>
                                            <option value="viewer">Visualizador (Apenas Consulta)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 border-l-4 border-[#1A3351] rounded">
                                <p className="text-[10px] text-blue-800 leading-relaxed italic">
                                    * Atualmente, o sistema exige que o primeiro acesso do usuário seja realizado através do processo de login/cadastro padrão. Este convite será implementado no backend futuramente.
                                </p>
                            </div>

                            <button
                                disabled={inviteLoading}
                                onClick={() => setIsInviteModalOpen(false)}
                                className="w-full py-4 bg-[#1A3351] text-white font-black uppercase tracking-widest text-xs shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <Save className="w-4 h-4" />
                                Salvar e Sincronizar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
