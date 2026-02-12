"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, ChevronUp, Briefcase, Building2, History as HistoryIcon,
    BarChart3, User, Calendar, ClipboardList, Search, Filter, Printer, Users as UsersIcon, TrendingUp, CreditCard, FolderOpen
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface ReferralEntry {
    id: number;
    servidor_cpf: string;
    servidor_nome: string;
    aso_type: string;
    cargo?: string;
    secretaria?: string;
    ghe_conj?: string;
    operator_name?: string;
    generated_at: string;
    generated_by: string;
    exams?: string[];
}

export default function ReferralsPage() {
    const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchCpf, setSearchCpf] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");

    // Filtros
    const [filterUser, setFilterUser] = useState("all");
    const [filterSecretaria, setFilterSecretaria] = useState("all");
    const [filterAsoType, setFilterAsoType] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortOrder, setSortOrder] = useState("date-desc");

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
                loadReferrals();
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

    const [operatorsMap, setOperatorsMap] = useState<Record<string, string>>({});

    async function loadReferrals() {
        setLoading(true);

        // Carrega o histórico apenas de encaminhamentos
        const { data: histData, error: histError } = await supabase
            .from('aso_history')
            .select('*')
            .ilike('aso_type', '%Encaminhamento%')
            .order('generated_at', { ascending: false });

        if (!histError && histData) {
            setReferrals(histData);
        }

        // Carrega mapeamento de perfis
        const { data: profData } = await supabase
            .from('profiles')
            .select('id, email');

        if (profData) {
            const map: Record<string, string> = {};
            profData.forEach(p => {
                map[p.id] = p.email;
            });
            setOperatorsMap(map);
        }

        setLoading(false);
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

    const uniqueUsersList = useMemo(() => Array.from(new Set(referrals.map(h => h.generated_by))), [referrals]);
    const uniqueSecretarias = useMemo(() => Array.from(new Set(referrals.map(h => h.secretaria).filter(Boolean))).sort() as string[], [referrals]);

    const filteredReferrals = referrals.filter(entry => {
        const matchesSearch = entry.servidor_nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCpf = !searchCpf || (entry.servidor_cpf && entry.servidor_cpf.replace(/\D/g, "").includes(searchCpf.replace(/\D/g, "")));
        const matchesUser = filterUser === "all" || entry.generated_by === filterUser;
        const matchesSecretaria = filterSecretaria === "all" || entry.secretaria === filterSecretaria;
        const matchesAsoType = filterAsoType === "all" || entry.aso_type.toUpperCase().includes(filterAsoType.toUpperCase());

        // Filtro de Data
        const entryDate = new Date(entry.generated_at).toISOString().split('T')[0];
        const matchesStartDate = !startDate || entryDate >= startDate;
        const matchesEndDate = !endDate || entryDate <= endDate;

        return matchesSearch && matchesCpf && matchesUser && matchesSecretaria && matchesAsoType && matchesStartDate && matchesEndDate;
    });

    const sortedReferrals = useMemo(() => {
        const base = [...filteredReferrals];
        if (sortOrder === "alpha") {
            return base.sort((a, b) => (a.servidor_nome || "").localeCompare(b.servidor_nome || "", 'pt-BR'));
        }
        return base.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
    }, [filteredReferrals, sortOrder]);

    const stats = useMemo(() => {
        const total = filteredReferrals.length;
        const uniqueUsers = new Set(filteredReferrals.map(h => h.generated_by)).size;
        return { total, uniqueUsers };
    }, [filteredReferrals]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
                <p className="text-[#1A3351] uppercase tracking-[0.3em] font-black text-xs">Acessando Central de Evidências...</p>
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

                    <button onClick={() => router.push('/referrals')} className="w-full flex items-center gap-1.5 p-3 rounded-lg bg-white/10 text-white font-bold text-xs uppercase tracking-wider shadow-sm border border-white/5 whitespace-nowrap transition-all hover:bg-white/20">
                        <ClipboardList className="w-4 h-4 shrink-0" />
                        <span>Central de Evidências</span>
                    </button>

                    {/* BENEFÍCIOS COM SUBMENU CONSOLIDADO */}
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

                        <button className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
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

                    <button
                        onClick={() => router.push('/archive')}
                        className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
                    >
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
            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden relative">

                {/* HEADER COM DESIGN SESMT-SYSTEM */}
                <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <ClipboardList className="w-6 h-6 text-[#1A3351]" />
                            <div>
                                <h2 className="text-xl font-black leading-none uppercase tracking-tight text-[#1A3351]">Evidências de Encaminhamento</h2>
                                <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">SESMT Ledger • Sem Papel</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1A3351] rounded text-white active:scale-90 transition-transform">
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-5 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="BUSCAR NOME DO SERVIDOR..."
                                    className="w-full px-10 py-2 border border-[#888] shadow-inner text-xs font-bold bg-[#E8E8E8] outline-none uppercase"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-3 relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="BUSCAR POR CPF..."
                                    className="w-full px-10 py-2 border border-[#888] shadow-inner text-xs font-bold bg-[#E8E8E8] outline-none uppercase"
                                    value={searchCpf}
                                    onChange={(e) => setSearchCpf(e.target.value)}
                                />
                            </div>

                            {/* FILTRO DE DATA */}
                            <div className="md:col-span-4 relative">
                                <button
                                    onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                                    className={`
                                        flex items-center justify-between w-full h-10 px-4 bg-[#E8E8E8] border border-[#888] shadow-inner font-black text-[10px] uppercase transition-all
                                        ${(startDate || endDate) ? 'text-[#E31E24] border-[#E31E24]' : 'text-slate-500'}
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>{(startDate || endDate) ? `${startDate || '...'} → ${endDate || '...'}` : 'Filtrar por Período'}</span>
                                    </div>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${isDateFilterOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isDateFilterOpen && (
                                    <div className="absolute top-12 right-0 bg-white border-2 border-[#1A3351] shadow-2xl p-4 z-[100] w-64 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                <span className="text-[10px] font-black text-[#1A3351] uppercase">Definir Período</span>
                                                <button onClick={() => setIsDateFilterOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-red-500" /></button>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase">Data Inicial</span>
                                                <input
                                                    type="date"
                                                    className="w-full bg-[#f8f8f8] border border-slate-200 px-3 py-2 text-xs font-bold uppercase outline-none focus:border-[#E31E24] rounded-none"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase">Data Final</span>
                                                <input
                                                    type="date"
                                                    className="w-full bg-[#f8f8f8] border border-slate-200 px-3 py-2 text-xs font-bold uppercase outline-none focus:border-[#E31E24] rounded-none"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={() => { setStartDate(""); setEndDate(""); }}
                                                    className="flex-1 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 border border-slate-100"
                                                >
                                                    Limpar
                                                </button>
                                                <button
                                                    onClick={() => setIsDateFilterOpen(false)}
                                                    className="flex-[2] py-2 bg-[#1A3351] text-white text-[9px] font-black uppercase hover:brightness-110 shadow-md"
                                                >
                                                    Filtrar Agora
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <select
                                value={filterUser}
                                onChange={(e) => setFilterUser(e.target.value)}
                                className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#888] text-[10px] font-black uppercase outline-none focus:border-[#1A3351]"
                            >
                                <option value="all">TODOS OPERADORES</option>
                                {uniqueUsersList.map(uid => (
                                    <option key={uid} value={uid}>
                                        {referrals.find(h => h.generated_by === uid)?.operator_name || operatorsMap[uid] || `ID: ${uid.substring(0, 8)}`}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filterSecretaria}
                                onChange={(e) => setFilterSecretaria(e.target.value)}
                                className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#888] text-[10px] font-black uppercase outline-none focus:border-[#1A3351] max-w-[250px]"
                            >
                                <option value="all">TODAS SECRETARIAS</option>
                                {uniqueSecretarias.map(sec => (
                                    <option key={sec} value={sec}>{sec}</option>
                                ))}
                            </select>

                            <select
                                value={filterAsoType}
                                onChange={(e) => setFilterAsoType(e.target.value)}
                                className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#888] text-[10px] font-black uppercase outline-none focus:border-[#1A3351]"
                            >
                                <option value="all">TODOS TIPOS DE ASO</option>
                                <option value="ADMISS">ADMISSIONAL</option>
                                <option value="DEMISS">DEMISSIONAL</option>
                                <option value="RETORNO">RETORNO AO TRABALHO</option>
                            </select>

                            {(searchTerm || searchCpf || filterUser !== "all" || filterSecretaria !== "all" || filterAsoType !== "all" || startDate || endDate) && (
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        setSearchCpf("");
                                        setFilterUser("all");
                                        setFilterSecretaria("all");
                                        setFilterAsoType("all");
                                        setStartDate("");
                                        setEndDate("");
                                    }}
                                    className="px-4 py-2 bg-[#E31E24] text-white text-[10px] font-black uppercase shadow-sm hover:brightness-110 active:scale-95 transition-all"
                                >
                                    Zerar Filtros
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* CONTEÚDO SCROLLÁVEL */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 space-y-8">

                    {/* STATS CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white p-6 border-b-4 border-[#1A3351] shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encaminhamentos Digitais</p>
                            <h3 className="text-3xl font-black text-[#1A3351]">{stats.total} <span className="text-xs font-normal">registros</span></h3>
                        </div>
                        <div className="bg-white p-6 border-b-4 border-[#E31E24] shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Economia de Papel Est.</p>
                            <h3 className="text-3xl font-black text-[#E31E24]">{stats.total} <span className="text-xs font-normal">folhas</span></h3>
                        </div>
                        <div className="bg-white p-6 border-b-4 border-slate-300 shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditores Ativos</p>
                            <h3 className="text-3xl font-black text-[#1A3351]">{stats.uniqueUsers}</h3>
                        </div>
                    </div>

                    {/* LISTA DE REGISTROS (DIGITAL LEDGER) */}
                    <div className="bg-white border-2 border-slate-300 shadow-2xl overflow-hidden">
                        <div className="bg-[#B0B0B0] px-6 py-4 border-b-2 border-slate-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-[#1A3351]">Registro Digital de Emissões</h3>
                                <p className="text-[9px] font-bold text-slate-600 uppercase">Evidências oficiais geradas via SESMT SYSTEM</p>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-600 uppercase">Ordem:</span>
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="bg-[#D3D3D3] border border-slate-400 text-[10px] font-black uppercase px-3 py-1.5 outline-none focus:border-[#1A3351]"
                                    >
                                        <option value="date-desc">Recentes Primeiro</option>
                                        <option value="alpha">Ordem Alfabética</option>
                                    </select>
                                </div>
                                <div className="text-[10px] font-black text-slate-700 uppercase bg-slate-200 px-3 py-1.5 border border-slate-300">{sortedReferrals.length} ITENS</div>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {sortedReferrals.length > 0 ? sortedReferrals.map((entry) => (
                                <div key={entry.id} className="group">
                                    <div
                                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                        className={`px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-slate-50 cursor-pointer transition-all border-l-[6px] ${expandedId === entry.id ? 'bg-[#1A3351]/5 border-[#1A3351]' : 'border-transparent'}`}
                                    >
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className={`p-2.5 rounded shadow-sm transition-all duration-300 ${expandedId === entry.id ? 'bg-[#1A3351] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <ClipboardList className={`${expandedId === entry.id ? 'w-6 h-6' : 'w-5 h-5'}`} />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-baseline gap-4">
                                                    <h4 className={`font-black uppercase text-[#1A3351] leading-none transition-all duration-300 ${expandedId === entry.id ? 'text-xl' : 'text-base'}`}>
                                                        {entry.servidor_nome}
                                                    </h4>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 border border-slate-200">
                                                        #{entry.id}
                                                    </span>
                                                </div>
                                                <div className="flex gap-4 mt-2">
                                                    <span className="text-[10px] font-black text-[#E31E24] uppercase bg-red-50 px-2 py-0.5 border border-red-100">
                                                        {entry.aso_type.split('{')[0].split('<')[0].split('[')[0].trim()}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                                                        <CreditCard className="w-3 h-3" /> {entry.servidor_cpf || "---"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`flex items-center gap-8 shrink-0 md:text-right transition-all ${expandedId === entry.id ? 'opacity-100' : 'opacity-70'}`}>
                                            <div className="flex flex-col">
                                                <span className="font-black text-[9px] text-slate-400 uppercase mb-1">Data de Solicitação</span>
                                                <span className={`font-black text-slate-800 transition-all ${expandedId === entry.id ? 'text-base' : 'text-xs'}`}>
                                                    {new Date(entry.generated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {expandedId === entry.id ? <ChevronUp className="w-6 h-6 text-[#1A3351]" /> : <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-slate-500" />}
                                        </div>
                                    </div>

                                    {/* DETALHES DA EVIDÊNCIA */}
                                    {expandedId === entry.id && (
                                        <div className="px-8 pb-8 pt-4 bg-[#1A3351]/5 border-t border-slate-200 animate-in slide-in-from-top-4 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-2">
                                                <div className="md:col-span-8 space-y-4">
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase mb-2 block border-b border-slate-200 pb-1">Cargo / Secretaria</span>
                                                        <p className="text-sm font-black text-[#1A3351] uppercase leading-tight">{entry.cargo || "Não registrado"}</p>
                                                        <p className="text-sm font-black text-slate-700 uppercase mt-1 leading-tight">{entry.secretaria || "Não registrado"}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase mb-2 block border-b border-slate-200 pb-1">Identificação Função / GHE</span>
                                                        <p className="text-xs font-black text-[#1A3351] uppercase leading-tight">
                                                            {(() => {
                                                                const match = entry.aso_type.match(/\{([\s\S]*?)\}/);
                                                                return match ? match[1] : "---";
                                                            })()}
                                                        </p>
                                                        <p className="text-xs font-black text-[#1A3351] uppercase mt-1">GHE: {entry.ghe_conj || "---"}</p>
                                                    </div>

                                                    <div className="pt-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase mb-2 block border-b border-slate-200 pb-1">Riscos Ocupacionais</span>
                                                        <p className="text-[11px] font-bold text-slate-700 uppercase leading-relaxed bg-white/50 p-2 border border-slate-200 rounded">
                                                            {(() => {
                                                                const match = entry.aso_type.match(/<([\s\S]*?)>/);
                                                                return match ? match[1] : "Riscos não detalhados nesta evidência.";
                                                            })()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="md:col-span-4 bg-white p-5 border border-slate-200 shadow-inner">
                                                    <span className="text-[11px] font-black text-[#1A3351] uppercase mb-3 block flex items-center gap-2">
                                                        <Activity className="w-4 h-4 text-[#E31E24]" /> Exames Solicitados na Evidência
                                                    </span>
                                                    <div className="space-y-2">
                                                        {(() => {
                                                            const match = entry.aso_type.match(/\[(.*?)\]/);
                                                            if (match && match[1]) {
                                                                const exams = match[1].split(',')
                                                                    .map(e => e.trim())
                                                                    .filter(e => e.toUpperCase() !== "EXAME CLÍNICO");

                                                                if (exams.length === 0) {
                                                                    return (
                                                                        <div className="py-2 text-center">
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Apenas exames complementares indisponíveis ou não registrados.</p>
                                                                        </div>
                                                                    );
                                                                }

                                                                return exams.map((exam, i) => (
                                                                    <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-50 pb-1 last:border-0">
                                                                        <div className="w-1.5 h-1.5 bg-[#E31E24] rounded-full" />
                                                                        {exam}
                                                                    </div>
                                                                ));
                                                            }
                                                            return (
                                                                <div className="py-4 text-center">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">Acesse o documento PDF para visualizar a lista completa de exames desta solicitação.</p>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                <div className="md:col-span-12 flex flex-col md:flex-row justify-between items-center bg-slate-100/50 p-4 border border-slate-200 mt-2">
                                                    <div className="flex items-center gap-10">
                                                        <div>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Operador Responsável</span>
                                                            <p className="text-[11px] font-black text-[#1A3351] uppercase">{entry.operator_name || operatorsMap[entry.generated_by] || entry.generated_by}</p>
                                                        </div>
                                                        <div className="h-8 w-px bg-slate-300 hidden md:block" />
                                                        <div>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Status de Registro</span>
                                                            <p className="text-[11px] font-black text-[#28A745] uppercase flex items-center gap-1">✓ REGISTRADO E AUDITADO</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 md:mt-0 px-4 py-2 border-2 border-[#1A3351] text-center">
                                                        <p className="text-[10px] font-black text-[#1A3351] uppercase leading-none">CÓDIGO DE EVIDÊNCIA: {entry.id}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center">
                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={() => {
                                                            const asoTypeMatch = entry.aso_type.match(/\((.*?)\)/);
                                                            const asoType = asoTypeMatch ? asoTypeMatch[1] : "Encaminhamento";

                                                            const examsMatch = entry.aso_type.match(/\[([\s\S]*?)\]/);
                                                            const exams = examsMatch ? examsMatch[1].split(',').map(e => e.trim()) : [];

                                                            const risksMatch = entry.aso_type.match(/<([\s\S]*?)>/);
                                                            const details = risksMatch ? risksMatch[1] : "";

                                                            const docData = {
                                                                Nome: entry.servidor_nome,
                                                                CPF: entry.servidor_cpf,
                                                                Cargo: entry.cargo,
                                                                Secretaria: entry.secretaria,
                                                                // Nota: Dt.Nascimento não é armazenado no histórico resumido, 
                                                                // então o PDF mostrará --- para este campo na reemissão.
                                                            };

                                                            const examConfig = {
                                                                exames: exams,
                                                                riscos: "",
                                                                detalhes: details
                                                            };

                                                            import("@/lib/pdf-generator").then(m => {
                                                                m.generateReferralPDF(
                                                                    docData,
                                                                    examConfig,
                                                                    asoType,
                                                                    exams.map(() => new Date(entry.generated_at).toLocaleDateString('pt-BR')),
                                                                    entry.operator_name || operatorsMap[entry.generated_by] || "SISTEMA"
                                                                );
                                                            });
                                                        }}
                                                        className="px-6 py-2 bg-[#1A3351] text-white text-[10px] font-black uppercase hover:brightness-110 shadow-md transition-all flex items-center gap-2"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" /> Reemitir PDF Oficial
                                                    </button>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hash de Segurança: {Math.random().toString(36).substring(7).toUpperCase()}-{entry.id}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="py-24 text-center flex flex-col items-center gap-4">
                                    <ClipboardList className="w-16 h-16 text-slate-200" />
                                    <p className="text-slate-400 uppercase font-black text-xs italic tracking-[0.3em]">Nenhum encaminhamento registrado para os filtros aplicados</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#B0B0B0] p-6 text-center border-2 border-slate-300 shadow-inner">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">SESMT SYSTEM — Módulo de Digital Referrals — Powered by UXBRAS®</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
