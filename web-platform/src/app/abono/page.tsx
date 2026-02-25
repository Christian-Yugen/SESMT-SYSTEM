"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, ChevronUp, Briefcase, Building2, History as HistoryIcon,
    BarChart3, User, Calendar, ClipboardList, Search, Filter, Printer, Users as UsersIcon, TrendingUp, FolderOpen, Trash2, PlusCircle, ArrowRight
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
    const [expandedCpf, setExpandedCpf] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");
    const [logs, setLogs] = useState<Record<number, any[]>>({});
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished'>('all');
    const [sortBy, setSortBy] = useState<'alphabetical' | 'newest' | 'oldest'>('alphabetical');
    const [secretariaFilter, setSecretariaFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

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

        // Cache breaker para evitar dados viciados
        const cacheBreaker = Date.now();

        const { data, error } = await supabase
            .from('abono_salarial')
            .select('*')
            .neq('id', -cacheBreaker)
            .order('inicio', { ascending: false });

        if (!error && data) {
            setRecords(data);

            // Buscar Logs de Auditoria
            const { data: logsData } = await supabase
                .from('abono_salarial_logs')
                .select('*')
                .order('data_alteracao', { ascending: false });

            if (logsData) {
                const logsMap: Record<number, any[]> = {};
                logsData.forEach((log: any) => {
                    if (!logsMap[log.abono_id]) logsMap[log.abono_id] = [];
                    logsMap[log.abono_id].push(log);
                });
                setLogs(logsMap);
            }
        } else if (error) {
            console.error("Erro ao carregar abonos:", error);
        }
        setLoading(false);
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const secretarias = useMemo(() => {
        const unique = new Set(records.map(r => r.secretaria).filter(Boolean));
        return Array.from(unique).sort();
    }, [records]);

    const filteredRecords = useMemo(() => {
        return records.filter(record => {
            const matchesSearch = record.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.cpf.includes(searchTerm);

            const matchesSecretaria = secretariaFilter === 'all' || record.secretaria === secretariaFilter;

            let matchesPeriod = true;
            if (startDate || endDate) {
                const recDate = record.inicio ? new Date(record.inicio + 'T00:00:00') : null;
                if (recDate) {
                    if (startDate && recDate < new Date(startDate + 'T00:00:00')) matchesPeriod = false;
                    if (endDate && recDate > new Date(endDate + 'T00:00:00')) matchesPeriod = false;
                } else {
                    matchesPeriod = false;
                }
            }

            return matchesSearch && matchesSecretaria && matchesPeriod;
        });
    }, [records, searchTerm, secretariaFilter, startDate, endDate]);

    const formatDate = (dateStr: string | undefined | null) => {
        if (!dateStr || dateStr === 'None' || dateStr === 'null') return '---';
        try {
            const parts = dateStr.split('-');
            if (parts.length !== 3) return '---';
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);
            const date = new Date(year, month, day);
            return date.toLocaleDateString('pt-BR');
        } catch (e) {
            return '---';
        }
    };

    const getDiff = (prev: any, next: any) => {
        if (!prev || !next) return null;
        const changes: string[] = [];

        const labels: Record<string, string> = {
            portaria: "PORTARIA",
            assomasul_data: "DATA ASSOMASUL",
            inicio: "DATA INÍCIO",
            observacoes: "OBSERVAÇÕES"
        };

        Object.keys(labels).forEach(key => {
            let pVal = prev[key] || "---";
            let nVal = next[key] || "---";

            // Formatar datas para exibição no log
            if (key.includes('data') || key === 'inicio') {
                if (pVal !== "---") pVal = formatDate(pVal);
                if (nVal !== "---") nVal = formatDate(nVal);
            }

            if (pVal !== nVal) {
                changes.push(`${labels[key]}: "${pVal}" ➞ "${nVal}"`);
            }
        });

        return changes;
    };

    const groupedRecords = useMemo(() => {
        // Utility to check if a benefit is active
        const isBenefitActive = (inicioStr: string | undefined) => {
            if (!inicioStr) return false;
            try {
                const parts = inicioStr.split('-');
                const endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                endDate.setFullYear(endDate.getFullYear() + 1);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return endDate >= today;
            } catch (e) { return false; }
        };

        const groups: Record<string, { nome: string, cpf: string, benefits: AbonoRecord[] }> = {};
        filteredRecords.forEach(record => {
            if (!groups[record.cpf]) {
                groups[record.cpf] = {
                    nome: record.nome,
                    cpf: record.cpf,
                    benefits: []
                };
            }
            groups[record.cpf].benefits.push(record);
        });

        // Sort individual benefits within each group by date (always descending)
        Object.values(groups).forEach(group => {
            group.benefits.sort((a, b) => (b.inicio || "").localeCompare(a.inicio || ""));
        });

        let result = Object.values(groups);

        // Filter by Status
        if (statusFilter === 'active') {
            result = result.filter(group => group.benefits.some(b => isBenefitActive(b.inicio)));
        } else if (statusFilter === 'finished') {
            result = result.filter(group => group.benefits.every(b => !isBenefitActive(b.inicio)));
        }

        // Apply Sorting
        if (sortBy === 'alphabetical') {
            result.sort((a, b) => a.nome.localeCompare(b.nome));
        } else if (sortBy === 'newest') {
            result.sort((a, b) => (b.benefits[0]?.inicio || "").localeCompare(a.benefits[0]?.inicio || ""));
        } else if (sortBy === 'oldest') {
            result.sort((a, b) => (a.benefits[0]?.inicio || "").localeCompare(b.benefits[0]?.inicio || ""));
        }

        return result;
    }, [filteredRecords, statusFilter, sortBy]);

    const stats = useMemo(() => {
        const totalBenefits = records.length;
        const totalServidores = new Set(records.map(r => r.cpf)).size;
        const recent = records.filter(r => {
            if (!r.inicio) return false;
            const initDate = new Date(r.inicio + 'T00:00:00');
            const now = new Date();
            const diffMonths = (now.getFullYear() - initDate.getFullYear()) * 12 + (now.getMonth() - initDate.getMonth());
            return diffMonths <= 12;
        }).length;
        return { totalBenefits, totalServidores, recent };
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

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="BUSCAR POR NOME OU CPF..."
                                    className="w-full px-10 py-2 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Dropdown Secretaria */}
                            <div className="flex-1 lg:flex-[1.5] relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    className="w-full px-10 py-2 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase appearance-none cursor-pointer"
                                    value={secretariaFilter}
                                    onChange={(e) => setSecretariaFilter(e.target.value)}
                                >
                                    <option value="all">TODAS SECRETARIAS</option>
                                    {secretarias.map(sec => (
                                        <option key={sec} value={sec}>{sec}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>

                            {/* Filtro por Período */}
                            <div className="flex-1 flex gap-2">
                                <div className="flex-1 relative group">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="date"
                                        className="w-full px-10 py-2 border border-[#888] shadow-inner text-[11px] font-bold bg-[#E8E8E8] outline-none"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                    <span className="absolute -top-1.5 left-2 bg-[#B0B0B0] px-1 text-[7px] font-black text-[#1A3351] uppercase">De</span>
                                </div>
                                <div className="flex-1 relative group">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="date"
                                        className="w-full px-10 py-2 border border-[#888] shadow-inner text-[11px] font-bold bg-[#E8E8E8] outline-none"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                    <span className="absolute -top-1.5 left-2 bg-[#B0B0B0] px-1 text-[7px] font-black text-[#1A3351] uppercase">Até</span>
                                </div>
                            </div>

                            {/* Botão Limpar */}
                            {(startDate || endDate || secretariaFilter !== 'all') && (
                                <button
                                    onClick={() => {
                                        setStartDate("");
                                        setEndDate("");
                                        setSecretariaFilter("all");
                                    }}
                                    className="px-4 py-2 bg-[#E31E24] text-white text-[10px] font-black uppercase rounded shadow-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 active:scale-95 shrink-0"
                                >
                                    <X className="w-3 h-3" /> Limpar Filtros
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* CONTEÚDO */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">

                    {/* STATS CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 border-b-4 border-[#1A3351] shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Servidores</p>
                            <h3 className="text-3xl font-black text-[#1A3351]">{stats.totalServidores}</h3>
                        </div>
                        <div className="bg-white p-6 border-b-4 border-slate-300 shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Benefícios</p>
                            <h3 className="text-3xl font-black text-slate-500">{stats.totalBenefits}</h3>
                        </div>
                        <div className="bg-white p-6 border-b-4 border-[#E31E24] shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Iniciados Recentes</p>
                            <h3 className="text-3xl font-black text-[#1A3351]">{stats.recent}</h3>
                        </div>
                    </div>

                    {/* LISTA DE REGISTROS */}
                    <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden">
                        <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xs font-black uppercase tracking-widest text-[#1A3351]">Registros de Abono</h3>
                                <div className={`text-sm font-black uppercase tracking-tight transition-colors duration-300 ${statusFilter === 'active' ? 'text-green-700' :
                                    statusFilter === 'finished' ? 'text-[#E31E24]' :
                                        'text-[#1A3351]'
                                    }`}>
                                    Mostrando {groupedRecords.length} servidores {statusFilter !== 'all' ? (statusFilter === 'active' ? 'ativos' : 'finalizados') : 'cadastrados'}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                {/* Filtro de Status */}
                                <div className="flex items-center gap-1 bg-white/50 p-1 rounded-md shadow-inner border border-black/5">
                                    <button
                                        onClick={() => setStatusFilter('all')}
                                        className={`px-3 py-1 text-[9px] font-black uppercase rounded transition-all ${statusFilter === 'all' ? 'bg-[#1A3351] text-white' : 'text-slate-600 hover:bg-black/5'}`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('active')}
                                        className={`px-3 py-1 text-[9px] font-black uppercase rounded transition-all ${statusFilter === 'active' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}`}
                                    >
                                        Ativos
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('finished')}
                                        className={`px-3 py-1 text-[9px] font-black uppercase rounded transition-all ${statusFilter === 'finished' ? 'bg-[#E31E24] text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}`}
                                    >
                                        Finalizados
                                    </button>
                                </div>

                                {/* Divisor */}
                                <div className="hidden lg:block w-px h-6 bg-slate-400/50" />

                                {/* Ordenação */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase">Ordenar:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="bg-white/70 border border-slate-400 text-[9px] font-black uppercase px-2 py-1 outline-none shadow-sm cursor-pointer hover:bg-white transition-colors"
                                    >
                                        <option value="alphabetical">Ordem Alfabética</option>
                                        <option value="newest">Mais Novos</option>
                                        <option value="oldest">Mais Antigos</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-200">
                            {groupedRecords.length > 0 ? groupedRecords.map((group) => (
                                <div key={group.cpf} className="group">
                                    <div
                                        onClick={() => setExpandedCpf(expandedCpf === group.cpf ? null : group.cpf)}
                                        className={`px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 cursor-pointer transition-all border-l-4 ${expandedCpf === group.cpf ? 'bg-[#1A3351]/5 border-[#1A3351]' : 'border-transparent'}`}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`p-3 rounded-full transition-colors ${expandedCpf === group.cpf ? 'bg-[#1A3351] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className={`font-black uppercase text-[#1A3351] leading-tight transition-all ${expandedCpf === group.cpf ? 'text-xl' : 'text-base'}`}>
                                                    {group.nome}
                                                </h4>
                                                <div className="flex flex-wrap gap-4 mt-1">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">CPF: {group.cpf}</p>
                                                    {group.benefits[0].secretaria && (
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                            <Building2 className="w-3 h-3 text-slate-400" /> {group.benefits[0].secretaria}
                                                        </p>
                                                    )}
                                                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full uppercase">
                                                        {group.benefits.length} {group.benefits.length === 1 ? 'Benefício' : 'Benefícios'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {expandedCpf !== group.cpf && (
                                                <div className="hidden md:flex items-center gap-6 mr-4 bg-slate-100/50 px-4 py-2 rounded-lg border border-slate-200">
                                                    <div className="flex flex-col items-start leading-none">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Último Início</p>
                                                        <p className="text-xs font-black text-[#1A3351]">{formatDate(group.benefits[0].inicio)}</p>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-300" />
                                                    <div className="flex flex-col items-start leading-none">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Próximo Término</p>
                                                        <p className={`text-xs font-black ${(() => {
                                                            if (!group.benefits[0].inicio) return 'text-slate-400';
                                                            const parts = group.benefits[0].inicio.split('-');
                                                            const endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                                            endDate.setFullYear(endDate.getFullYear() + 1);
                                                            const today = new Date();
                                                            today.setHours(0, 0, 0, 0);
                                                            return endDate < today ? 'text-[#E31E24]' : 'text-green-600';
                                                        })()}`}>
                                                            {group.benefits[0].inicio ? (() => {
                                                                const parts = group.benefits[0].inicio.split('-');
                                                                const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                                                date.setFullYear(date.getFullYear() + 1);
                                                                return date.toLocaleDateString('pt-BR');
                                                            })() : '---'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {expandedCpf !== group.cpf ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-[#1A3351]" />}
                                        </div>
                                    </div>

                                    {expandedCpf === group.cpf && (
                                        <div className="px-6 md:px-12 py-8 bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-6">
                                                <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] border-b pb-2">Histórico de Benefícios</h5>

                                                <div className="grid grid-cols-1 gap-4">
                                                    {group.benefits.map((record) => (
                                                        <div key={record.id} className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg hover:border-[#1A3351]/30 transition-colors relative overflow-hidden group/card">
                                                            <div className="absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 bg-[#1A3351]/5 rounded-full group-hover/card:bg-[#1A3351]/10 transition-colors" />

                                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                                                                <div className="space-y-1">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase">Vigência</p>
                                                                    <div className="flex flex-col gap-1.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs font-black text-slate-400 uppercase min-w-[50px]">Início:</span>
                                                                            <span className="text-sm font-bold text-[#1A3351]">{formatDate(record.inicio)}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                                                            <span className="text-xs font-black text-slate-400 uppercase min-w-[50px]">Término:</span>
                                                                            <span className="text-sm font-bold">
                                                                                {record.inicio ? (() => {
                                                                                    const parts = record.inicio.split('-');
                                                                                    const endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                                                                    endDate.setFullYear(endDate.getFullYear() + 1);

                                                                                    const today = new Date();
                                                                                    today.setHours(0, 0, 0, 0);
                                                                                    const isFinished = endDate < today;

                                                                                    return (
                                                                                        <span className="flex items-center gap-2 translate-y-[1px]">
                                                                                            <span className={isFinished ? 'text-[#E31E24]' : 'text-green-600'}>
                                                                                                {endDate.toLocaleDateString('pt-BR')}
                                                                                            </span>
                                                                                            <span className={`text-[10px] px-2 py-0.5 rounded shadow-sm border font-black ${isFinished
                                                                                                ? 'bg-slate-200 text-slate-600 border-slate-300'
                                                                                                : 'bg-green-500 text-white border-green-600 animate-pulse'
                                                                                                }`}>
                                                                                                {isFinished ? 'FINALIZADO' : 'ATIVO'}
                                                                                            </span>
                                                                                        </span>
                                                                                    );
                                                                                })() : '---'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase">Portaria</p>
                                                                    <p className="text-sm font-bold text-slate-700 uppercase">{record.portaria || '---'}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase">Assomasul:</p>
                                                                        <p className="text-sm font-bold text-slate-600 uppercase">{formatDate(record.assomasul_data)}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1 text-center md:text-left">
                                                                    <p className="text-[8px] text-slate-400 italic">Atualizado em: {new Date(record.updated_at).toLocaleDateString('pt-BR')}</p>
                                                                </div>
                                                                <div className="flex items-center justify-end">
                                                                    <button
                                                                        onClick={() => router.push(`/abono/edit/${record.id}`)}
                                                                        className="px-6 py-2 bg-[#1A3351] text-white text-[10px] font-black uppercase rounded shadow-sm hover:brightness-110 active:scale-95 transition-all w-full md:w-auto"
                                                                    >
                                                                        Editar Dados
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {record.observacoes && (
                                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                                    <p className="text-[11px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                                        <ClipboardList className="w-3.5 h-3.5" /> Informações Adicionais
                                                                    </p>
                                                                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                                                        <p className="text-sm text-slate-700 font-bold uppercase leading-relaxed italic">
                                                                            "{record.observacoes}"
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {logs[record.id] && logs[record.id].length > 0 && (
                                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                                    <button
                                                                        onClick={() => setExpandedLogId(expandedLogId === record.id ? null : record.id)}
                                                                        className={`w-full flex items-center justify-between p-3 rounded border transition-all ${expandedLogId === record.id ? 'bg-[#E31E24] text-white border-[#E31E24] shadow-md' : 'bg-slate-50 text-[#E31E24] border-slate-200 hover:bg-slate-100'}`}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <HistoryIcon className={`w-4 h-4 ${expandedLogId === record.id ? 'text-white' : 'text-[#E31E24]'}`} />
                                                                            <span className="text-[10px] font-black uppercase tracking-wider">
                                                                                {expandedLogId === record.id ? 'Ocultar Histórico de Auditoria' : `Ver Histórico de Auditoria (${logs[record.id].length})`}
                                                                            </span>
                                                                        </div>
                                                                        {expandedLogId === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                                    </button>

                                                                    {expandedLogId === record.id && (
                                                                        <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                                                            {logs[record.id].map((log) => {
                                                                                const diff = getDiff(log.dados_anteriores, log.dados_novos);
                                                                                return (
                                                                                    <div key={log.id} className="text-[10px] p-3 bg-white rounded border border-slate-200 shadow-sm relative overflow-hidden group/log">
                                                                                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                                                                                        <div className="flex justify-between font-black uppercase text-slate-500 mb-2 border-b border-slate-200 pb-1">
                                                                                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {log.usuario_email}</span>
                                                                                            <span className="text-slate-400">{new Date(log.data_alteracao).toLocaleDateString('pt-BR')} {new Date(log.data_alteracao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                        </div>
                                                                                        <div className="space-y-2">
                                                                                            <p className="font-black text-[#1A3351] uppercase leading-tight">
                                                                                                <span className="text-amber-600">MOTIVO:</span> {log.motivo}
                                                                                            </p>
                                                                                            {diff && diff.length > 0 && (
                                                                                                <div className="bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                                                                                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Mudanças Realizadas:</p>
                                                                                                    {diff.map((change, i) => (
                                                                                                        <p key={i} className="text-[9px] font-bold text-slate-600 flex items-center gap-2">
                                                                                                            <ArrowRight className="w-2.5 h-2.5 text-amber-500" /> {change}
                                                                                                        </p>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
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
