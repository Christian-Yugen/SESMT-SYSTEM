"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, ChevronUp, Briefcase, Building2, History as HistoryIcon,
    BarChart3, User, Calendar, ClipboardList, Search, Filter, Printer, Users as UsersIcon, TrendingUp, FolderOpen, Trash2, PlusCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AbonoRecord } from "@/types";

export default function AbonoPage() {
    const [records, setRecords] = useState<AbonoRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
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
                    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                    if (data) setUserRole(data.role);
                    const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Usuário";
                    setUserName(name);
                } else {
                    router.push("/login");
                    return;
                }
                loadRecords();
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

    async function loadRecords() {
        setLoading(true);
        const { data, error } = await supabase
            .from('abono_salarial')
            .select('*')
            .order('inicio', { ascending: false });

        if (!error && data) {
            setRecords(data);
        } else if (error) {
            console.error("Erro ao carregar abonos:", error);
        }
        setLoading(false);
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const filteredRecords = records.filter(record => {
        const matchesSearch = record.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.cpf.includes(searchTerm);
        return matchesSearch;
    });

    const stats = useMemo(() => {
        const total = records.length;
        const recent = records.filter(r => {
            if (!r.inicio) return false;
            const initDate = new Date(r.inicio);
            const now = new Date();
            const diffMonths = (now.getFullYear() - initDate.getFullYear()) * 12 + (now.getMonth() - initDate.getMonth());
            return diffMonths <= 12;
        }).length;
        return { total, recent };
    }, [records]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
                <p className="text-[#1A3351] uppercase tracking-[0.3em] font-black text-xs">Carregando Abono Salarial...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-x-hidden">

            {/* SIDEBAR */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1A3351] border-r border-white/10 flex flex-col p-4 shrink-0 shadow-2xl transition-transform duration-300 transform
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="mb-8 flex flex-col items-center">
                    <div className="flex justify-between items-center w-full lg:hidden mb-4">
                        <span className="text-white font-bold text-xs uppercase">Menu</span>
                        <button onClick={() => setIsSidebarOpen(false)}>
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>
                    <div className="w-full h-16 mt-2 mb-4 flex items-center justify-center">
                        <img src="/images/logo_white.png" alt="SESMT" className="h-14 w-auto object-contain" />
                    </div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] -mt-2">SESMT SYSTEM</p>
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

                    <div className="group">
                        <button className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                            <HeartPulse className="w-4 h-4 shrink-0" />
                            <span>Benefícios</span>
                        </button>
                        <button className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <Database className="w-3.5 h-3.5 shrink-0" />
                            <span>Auxílio Doença</span>
                        </button>
                        <button className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <FileSearch className="w-3.5 h-3.5 shrink-0" />
                            <span>Readaptação</span>
                        </button>
                        <button onClick={() => router.push('/abono')} className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg bg-white/10 text-white font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                            <span>Abono Salarial</span>
                        </button>
                        <button className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                            <span>Redução de Jornada</span>
                        </button>
                    </div>

                    <div className="group">
                        <button onClick={() => router.push('/history')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                            <HistoryIcon className="w-4 h-4 shrink-0" />
                            <span>Histórico</span>
                        </button>
                        <button onClick={() => router.push('/analytics')} className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                            <span>Indicadores</span>
                        </button>
                    </div>

                    <button onClick={() => router.push('/archive')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                        <FolderOpen className="w-4 h-4 shrink-0" />
                        <span>Arquivo Médico</span>
                    </button>

                    {userRole === 'admin' && (
                        <button onClick={() => router.push('/users')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                            <UsersIcon className="w-4 h-4 shrink-0" />
                            <span>Usuários</span>
                        </button>
                    )}
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

            {/* ÁREA PRINCIPAL */}
            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden">

                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <ClipboardList className="w-6 h-6 text-[#1A3351]" />
                            <h2 className="text-xl font-black leading-none uppercase tracking-tight">Abono Salarial</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/abono/new')}
                                className="hidden md:flex items-center justify-center gap-2 w-56 h-10 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-xs uppercase border border-black/10"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Novo Lançamento
                            </button>
                            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1A3351] rounded text-white active:scale-90 transition-transform">
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="BUSCAR POR NOME OU CPF..."
                                className="w-full px-10 py-2 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                {/* CONTEÚDO */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">

                    {/* STATS CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 border-b-4 border-[#1A3351] shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Registros</p>
                            <h3 className="text-3xl font-black text-[#1A3351]">{stats.total}</h3>
                        </div>
                        <div className="bg-white p-6 border-b-4 border-[#E31E24] shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Iniciados nos últimos 12 meses</p>
                            <h3 className="text-3xl font-black text-[#1A3351]">{stats.recent}</h3>
                        </div>
                    </div>

                    {/* LISTA DE REGISTROS */}
                    <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden">
                        <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#1A3351]">Registros de Abono</h3>
                            <div className="text-[9px] font-black text-slate-600 uppercase">Mostrando {filteredRecords.length} resultados</div>
                        </div>
                        <div className="divide-y divide-slate-200">
                            {filteredRecords.length > 0 ? filteredRecords.map((record) => (
                                <div key={record.id} className="group">
                                    <div
                                        onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                                        className={`px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 cursor-pointer transition-all border-l-4 ${expandedId === record.id ? 'bg-[#1A3351]/5 border-[#1A3351]' : 'border-transparent'}`}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`p-2 rounded transition-colors ${expandedId === record.id ? 'bg-[#1A3351] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <ClipboardList className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className={`font-black uppercase text-[#1A3351] leading-tight transition-all ${expandedId === record.id ? 'text-lg' : 'text-sm'}`}>
                                                    {record.nome}
                                                </h4>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">CPF: {record.cpf}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs font-black text-[#E31E24] uppercase">Início: {record.inicio ? new Date(record.inicio).toLocaleDateString('pt-BR') : '---'}</span>
                                            {expandedId !== record.id && <ChevronDown className="w-4 h-4 text-slate-400" />}
                                            {expandedId === record.id && <ChevronUp className="w-4 h-4 text-[#1A3351]" />}
                                        </div>
                                    </div>

                                    {expandedId === record.id && (
                                        <div className="px-16 py-6 bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Portaria</p>
                                                        <p className="text-sm font-bold text-[#1A3351] uppercase">{record.portaria || '---'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Data Assomasul</p>
                                                        <p className="text-sm font-bold text-[#1A3351] uppercase">{record.assomasul_data ? new Date(record.assomasul_data).toLocaleDateString('pt-BR') : '---'}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Quantidade</p>
                                                        <p className="text-sm font-bold text-[#1A3351] uppercase">{record.quant || '0'} meses</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Última Atualização</p>
                                                        <p className="text-sm font-bold text-slate-500">{new Date(record.updated_at).toLocaleString('pt-BR')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col justify-end gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/abono/edit/${record.id}`);
                                                        }}
                                                        className="w-full py-2 bg-[#1A3351] text-white text-[10px] font-black uppercase rounded hover:brightness-110 transition-all border-b-2 border-blue-900"
                                                    >
                                                        Editar Registro
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="p-20 text-center text-slate-400 flex flex-col items-center gap-4">
                                    <ClipboardList className="w-16 h-16 opacity-20" />
                                    <p className="font-black uppercase tracking-[0.2em]">Nenhum registro encontrado</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
