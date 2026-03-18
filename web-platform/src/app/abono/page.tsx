"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, ChevronUp, History as HistoryIcon,
    BarChart3, User, Calendar, ClipboardList, Search, Filter, Printer, Users as UsersIcon, TrendingUp, FolderOpen, Trash2, PlusCircle, ArrowRight,
    Building2, Scale, FileText
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Loader2 } from "lucide-react";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { AbonoRecord } from "@/types";

// Tipos adicionais para o relatório
interface PrintData {
    operator: string;
    timestamp: string;
    filters: string;
}

// Normaliza CPF removendo caracteres não numéricos para agrupamento consistente
const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, '');

// Formata CPF para exibição: xxx.xxx.xxx-xx
const formatCpf = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

export default function AbonoPage() {
    const [records, setRecords] = useState<AbonoRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCpf, setExpandedCpf] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");
    const [logs, setLogs] = useState<Record<number, any[]>>({});
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'finished'>('all');
    const [sortBy, setSortBy] = useState<'alphabetical' | 'newest' | 'oldest'>('alphabetical');
    const [secretariaFilter, setSecretariaFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
    const [tempStartDate, setTempStartDate] = useState<string>("");
    const [tempEndDate, setTempEndDate] = useState<string>("");
    const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>('landscape');
    const [isPrintPopoverOpen, setIsPrintPopoverOpen] = useState(false);
    const [naturezaCargoFilter, setNaturezaCargoFilter] = useState<string>('all');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { session, error } = await safeGetSession();
                if (error) {
                    await handleAuthError(error);
                    return;
                }

                if (session) {
                    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                    if (data) {
                        setUserRole(data.role);
                        if (data.role === 'nurse' || data.role === 'operator' || data.role === 'viewer') {
                            router.push('/');
                            return;
                        }
                    }
                    const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Usuário";
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

    const naturezas = useMemo(() => {
        const unique = new Set(records.map(r => r.natureza_cargo).filter(Boolean));
        return Array.from(unique).sort();
    }, [records]);

    const filteredRecords = useMemo(() => {
        return records.filter(record => {
            const normalizedSearch = searchTerm.replace(/\D/g, '');
            const matchesSearch = record.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.cpf.includes(searchTerm) ||
                (normalizedSearch && normalizeCpf(record.cpf).includes(normalizedSearch));

            const matchesSecretaria = secretariaFilter === 'all' || record.secretaria === secretariaFilter;
            const matchesNatureza = naturezaCargoFilter === 'all' || record.natureza_cargo === naturezaCargoFilter;

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

            return matchesSearch && matchesSecretaria && matchesNatureza && matchesPeriod;
        });
    }, [records, searchTerm, secretariaFilter, naturezaCargoFilter, startDate, endDate]);

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
            assomasul_numero: "Nº ASSOMASUL",
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

    // IDs de registros que nasceram de uma renovação
    const renewalTargetIds = useMemo(() => {
        return new Set(records.map(r => r.renovado_por_id).filter((id): id is number => !!id));
    }, [records]);

    // Utility to check if a benefit is active
    const getBenefitStatus = (record: AbonoRecord, rIds: Set<number>) => {
        if (!record.inicio) return 'inactive';
        try {
            const parts = record.inicio.split('-');
            const endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            endDate.setFullYear(endDate.getFullYear() + 1);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Se já foi substituído por uma nova renovação -> FINALIZADO (Histórico)
            if (record.renovado_por_id) return 'finished';

            // 2. Se a vigência acabou e NÃO foi renovado -> VENCIDO
            if (today > endDate) return 'expired';

            // 3. Se está na vigência:
            // É fruto de uma renovação recente (< 90 dias)?
            const isRenewalResult = rIds.has(record.id);
            const createdAt = new Date(record.created_at);
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            if (isRenewalResult && createdAt > ninetyDaysAgo) return 'renewed';

            // Novo lançamento ou renovação antiga -> ATIVO
            return 'active';
        } catch (e) { return 'inactive'; }
    };

    const groupedRecords = useMemo(() => {
        const groups: Record<string, { nome: string, cpf: string, benefits: AbonoRecord[] }> = {};

        filteredRecords.forEach(record => {
            const status = getBenefitStatus(record, renewalTargetIds);

            // Filter by Status individualmente
            if (statusFilter === 'active' && status !== 'active' && status !== 'renewed') return;
            if (statusFilter === 'expired' && status !== 'expired') return;
            if (statusFilter === 'finished' && status !== 'finished') return;

            const key = normalizeCpf(record.cpf);
            if (!groups[key]) {
                groups[key] = {
                    nome: record.nome,
                    cpf: record.cpf,
                    benefits: []
                };
            }
            groups[key].benefits.push(record);
        });

        // Ordenar benefícios dentro de cada grupo
        Object.values(groups).forEach(group => {
            group.benefits.sort((a, b) => (b.inicio || "").localeCompare(a.inicio || ""));
        });

        let result = Object.values(groups);

        // Apply Sorting do grupo (baseado no benefício mais recente do grupo filtrado)
        if (sortBy === 'alphabetical') {
            result.sort((a, b) => a.nome.localeCompare(b.nome));
        } else if (sortBy === 'newest') {
            result.sort((a, b) => (b.benefits[0]?.inicio || "").localeCompare(a.benefits[0]?.inicio || ""));
        } else if (sortBy === 'oldest') {
            result.sort((a, b) => (a.benefits[0]?.inicio || "").localeCompare(b.benefits[0]?.inicio || ""));
        }

        return result;
    }, [filteredRecords, statusFilter, sortBy, renewalTargetIds]);

    const stats = useMemo(() => {
        // finalRecords para a lista e PDF (aplica o filtro de status atual sobre o que já foi filtrado por busca/sec/data)
        const finalRecords = filteredRecords.filter(r => {
            if (statusFilter === 'all') return true;
            const s = getBenefitStatus(r, renewalTargetIds);
            if (statusFilter === 'active') return s === 'active' || s === 'renewed';
            return s === statusFilter;
        });

        // Totais Dinâmicos: Respondem a TODOS os filtros (Search, Sec, Date E Status)
        const totalBenefits = finalRecords.length;
        const totalServidores = new Set(finalRecords.map(r => normalizeCpf(r.cpf))).size;

        // Contadores de Categoria: Respondem a Busca, Sec e Data, mas mostram o total daquela categoria
        // Isso permite que o usuário veja quantos existem de cada antes de clicar
        const ativosCount = filteredRecords.filter(r => {
            const s = getBenefitStatus(r, renewalTargetIds);
            return s === 'active' || s === 'renewed';
        }).length;
        const vencidosCount = filteredRecords.filter(r => getBenefitStatus(r, renewalTargetIds) === 'expired').length;
        const finalizadosCount = filteredRecords.filter(r => getBenefitStatus(r, renewalTargetIds) === 'finished').length;

        // Dados formatados para o cabeçalho do PDF
        const printFilters = [
            searchTerm ? `Busca: "${searchTerm}"` : null,
            secretariaFilter !== 'all' ? `Secretaria: ${secretariaFilter}` : 'Todas as Secretarias',
            naturezaCargoFilter !== 'all' ? `Natureza: ${naturezaCargoFilter}` : 'Todas as Naturezas',
            (startDate || endDate) ? `Período: ${formatDate(startDate)} até ${formatDate(endDate)}` : 'Início até Hoje',
            statusFilter !== 'all' ? `Status: ${statusFilter.toUpperCase() === 'ACTIVE' ? 'ATIVOS (E RENOVADOS)' : statusFilter.toUpperCase()}` : 'Todos os Status'
        ].filter(Boolean).join(' | ');

        return {
            totalBenefits,
            totalServidores,
            ativos: ativosCount,
            vencidos: vencidosCount,
            finalizados: finalizadosCount,
            finalRecords,
            printFilters
        };
    }, [filteredRecords, statusFilter, searchTerm, secretariaFilter, naturezaCargoFilter, startDate, endDate, renewalTargetIds]);

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
            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden print:hidden">

                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 lg:p-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg font-sans">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3 text-[#1A3351]">
                            <ClipboardList className="w-5 lg:w-6 h-5 lg:h-6" />
                            <h2 className="text-lg lg:text-xl font-black leading-none uppercase tracking-tight">Abono Salarial</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Botão de Impressão com Popover de Opções */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsPrintPopoverOpen(!isPrintPopoverOpen)}
                                    className="hidden md:flex items-center justify-center gap-2 px-4 h-10 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
                                >
                                    <Printer className="w-4 h-4" />
                                    Gerar Relatório (PDF)
                                    <ChevronDown className={`w-3 h-3 transition-transform ${isPrintPopoverOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isPrintPopoverOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border-2 border-[#1A3351] shadow-2xl z-[110] animate-in fade-in slide-in-from-top-2">
                                        <div className="p-3 border-b border-slate-100 bg-slate-50">
                                            <p className="text-[9px] font-black text-[#1A3351] uppercase tracking-wider">Escolha a Orientação</p>
                                        </div>
                                        <div className="p-2 space-y-1">
                                            <button
                                                onClick={() => { setPrintLayout('portrait'); setTimeout(() => { window.print(); setIsPrintPopoverOpen(false); }, 100); }}
                                                className={`w-full text-left p-3 rounded flex items-center justify-between transition-colors ${printLayout === 'portrait' ? 'bg-[#E31E24]/10 text-[#E31E24]' : 'hover:bg-slate-100 text-slate-600'}`}
                                            >
                                                <span className="text-[10px] font-bold uppercase">↗ Vertical (Retrato)</span>
                                                {printLayout === 'portrait' && <div className="w-1.5 h-1.5 rounded-full bg-[#E31E24]" />}
                                            </button>
                                            <button
                                                onClick={() => { setPrintLayout('landscape'); setTimeout(() => { window.print(); setIsPrintPopoverOpen(false); }, 100); }}
                                                className={`w-full text-left p-3 rounded flex items-center justify-between transition-colors ${printLayout === 'landscape' ? 'bg-[#E31E24]/10 text-[#E31E24]' : 'hover:bg-slate-100 text-slate-600'}`}
                                            >
                                                <span className="text-[10px] font-bold uppercase">➡ Horizontal (Paisagem)</span>
                                                {printLayout === 'landscape' && <div className="w-1.5 h-1.5 rounded-full bg-[#E31E24]" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => router.push('/abono/analytics')}
                                className="hidden md:flex items-center justify-center gap-2 px-4 h-10 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
                            >
                                <BarChart3 className="w-4 h-4" />
                                Indicadores BI
                            </button>
                            {userRole !== 'analytic_manager' && (
                                <button
                                    onClick={() => router.push('/abono/new')}
                                    className="hidden md:flex items-center justify-center gap-2 px-6 h-10 bg-green-600 text-white font-black rounded shadow-md hover:bg-green-700 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Novo Lançamento
                                </button>
                            )}
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden p-2.5 bg-[#1A3351] rounded-lg text-white active:scale-95 transition-all shadow-md flex items-center gap-2"
                            >
                                <Menu className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Menu</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-2">
                            {/* Busca principal */}
                            <div className="flex-[3] relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="BUSCAR POR NOME OU CPF..."
                                    className="w-full px-10 py-2.5 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Filtro por Período Estilizado (Padrao Historico - Lado a Lado) */}
                            <div className="flex-1 relative min-w-[200px]">
                                <button
                                    onClick={() => {
                                        setTempStartDate(startDate);
                                        setTempEndDate(endDate);
                                        setIsDatePopoverOpen(!isDatePopoverOpen);
                                    }}
                                    className="w-full h-full min-h-[40px] px-4 py-2 border border-[#888] shadow-inner bg-[#E8E8E8] flex items-center justify-between text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-all uppercase"
                                >
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                        <span>Filtrar por Período</span>
                                    </div>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${isDatePopoverOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Popover de Datas (Alineado à direita para não cortar na tela) */}
                                {isDatePopoverOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-80 bg-white border-2 border-[#1A3351] shadow-2xl z-[100] p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-sm font-black text-[#1A3351] uppercase tracking-tighter">Definir Período</h4>
                                            <button onClick={() => setIsDatePopoverOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Data Inicial (Início)</label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        className="w-full px-4 py-3 border border-slate-200 bg-slate-50 text-sm font-bold outline-none rounded focus:border-[#1A3351] transition-colors"
                                                        value={tempStartDate}
                                                        onChange={(e) => setTempStartDate(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Data Final (Fim)</label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        className="w-full px-4 py-3 border border-slate-200 bg-slate-50 text-sm font-bold outline-none rounded focus:border-[#1A3351] transition-colors"
                                                        value={tempEndDate}
                                                        onChange={(e) => setTempEndDate(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={() => {
                                                        setTempStartDate("");
                                                        setTempEndDate("");
                                                        setStartDate("");
                                                        setEndDate("");
                                                        setIsDatePopoverOpen(false);
                                                    }}
                                                    className="flex-1 py-3 border border-slate-200 text-slate-400 text-xs font-black uppercase hover:bg-slate-50 transition-all rounded shadow-sm"
                                                >
                                                    Limpar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setStartDate(tempStartDate);
                                                        setEndDate(tempEndDate);
                                                        setIsDatePopoverOpen(false);
                                                    }}
                                                    className="flex-[2] py-3 bg-[#1A3351] text-white text-xs font-black uppercase hover:brightness-110 transition-all rounded shadow-lg active:scale-[0.98]"
                                                >
                                                    Filtrar Agora
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-2 mt-1">
                            <div className="flex-[3] relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    className="w-full px-10 py-2.5 border border-[#888] shadow-inner text-xs font-bold bg-[#E8E8E8] outline-none uppercase appearance-none cursor-pointer"
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

                            {/* Filtro por Natureza do Cargo */}
                            <div className="flex-1 relative min-w-[200px]">
                                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    className="w-full px-10 py-2.5 border border-[#888] shadow-inner text-xs font-bold bg-[#E8E8E8] outline-none uppercase appearance-none cursor-pointer"
                                    value={naturezaCargoFilter}
                                    onChange={(e) => setNaturezaCargoFilter(e.target.value)}
                                >
                                    <option value="all">NATUREZA DO CARGO: TODAS</option>
                                    {naturezas.map(nat => (
                                        <option key={nat} value={nat}>{nat}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>

                            {/* Botão Global Zerar Filtros */}
                            {(secretariaFilter !== 'all' || naturezaCargoFilter !== 'all' || searchTerm || startDate || endDate) && (
                                <button
                                    onClick={() => {
                                        setStartDate("");
                                        setEndDate("");
                                        setTempStartDate("");
                                        setTempEndDate("");
                                        setSecretariaFilter("all");
                                        setNaturezaCargoFilter("all");
                                        setSearchTerm("");
                                    }}
                                    className="px-6 py-2 bg-[#E31E24] text-white text-[10px] font-black uppercase rounded shadow-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 active:scale-95 shrink-0"
                                >
                                    <X className="w-4 h-4" /> ZERAR FILTROS
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* CONTEÚDO */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">

                    {/* STATS CARDS - DINÂMICOS E INTERATIVOS */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 shrink-0">
                        <div
                            onClick={() => setStatusFilter('all')}
                            className={`p-4 lg:p-6 border-l-4 shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-[#1A3351] border-white text-white' : 'bg-white border-[#1A3351] text-[#1A3351]'}`}
                        >
                            <p className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest leading-tight mb-1 ${statusFilter === 'all' ? 'text-white/60' : 'text-slate-400'}`}>Total Servidores</p>
                            <h3 className="text-xl lg:text-3xl font-black">{stats.totalServidores}</h3>
                        </div>
                        <div
                            onClick={() => setStatusFilter('all')}
                            className={`p-4 lg:p-6 border-l-4 shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-slate-500 border-white text-white' : 'bg-white border-slate-300 text-slate-500'}`}
                        >
                            <p className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest leading-tight mb-1 ${statusFilter === 'all' ? 'text-white/60' : 'text-slate-400'}`}>Benefícios</p>
                            <h3 className="text-xl lg:text-3xl font-black">{stats.totalBenefits}</h3>
                        </div>
                        <div
                            onClick={() => setStatusFilter('active')}
                            className={`p-4 lg:p-6 border-l-4 shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all cursor-pointer ${statusFilter === 'active' ? 'bg-emerald-600 border-white text-white' : 'bg-white border-emerald-500 text-emerald-600'}`}
                        >
                            <p className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest leading-tight mb-1 ${statusFilter === 'active' ? 'text-white/60' : 'text-slate-400'}`}>Abonos Ativos</p>
                            <h3 className="text-xl lg:text-3xl font-black">{stats.ativos}</h3>
                        </div>
                        <div
                            onClick={() => setStatusFilter('expired')}
                            className={`p-4 lg:p-6 border-l-4 shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all cursor-pointer ${statusFilter === 'expired' ? 'bg-[#E31E24] border-white text-white' : 'bg-white border-[#E31E24] text-[#E31E24]'}`}
                        >
                            <p className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest leading-tight mb-1 ${statusFilter === 'expired' ? 'text-white/60' : 'text-slate-400'}`}>Vencidos</p>
                            <h3 className="text-xl lg:text-3xl font-black">{stats.vencidos}</h3>
                        </div>
                        <div
                            onClick={() => setStatusFilter('finished')}
                            className={`p-4 lg:p-6 border-l-4 shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all cursor-pointer ${statusFilter === 'finished' ? 'bg-blue-600 border-white text-white' : 'bg-white border-blue-600 text-blue-600'}`}
                        >
                            <p className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest leading-tight mb-1 ${statusFilter === 'finished' ? 'text-white/60' : 'text-slate-400'}`}>Finalizados</p>
                            <h3 className="text-xl lg:text-3xl font-black">{stats.finalizados}</h3>
                        </div>
                    </div>

                    {/* LISTA DE REGISTROS */}
                    <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden">
                        <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-[#1A3351]">Registros de Abono</h3>
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
                                        onClick={() => setStatusFilter('expired')}
                                        className={`px-3 py-1 text-[9px] font-black uppercase rounded transition-all ${statusFilter === 'expired' ? 'bg-[#E31E24] text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}`}
                                    >
                                        Vencidos
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('finished')}
                                        className={`px-3 py-1 text-[9px] font-black uppercase rounded transition-all ${statusFilter === 'finished' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}`}
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
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">CPF: {formatCpf(group.cpf)}</p>
                                                    {group.benefits[0].secretaria && (
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                            <Building2 className="w-3 h-3 text-slate-400" /> {group.benefits[0].secretaria}
                                                        </p>
                                                    )}
                                                    {group.benefits[0].natureza_cargo && (
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                            <Activity className="w-3 h-3 text-slate-400" /> {group.benefits[0].natureza_cargo}
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

                                                            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 relative z-10">
                                                                <div className="space-y-1 md:col-span-2">
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
                                                                                    const status = getBenefitStatus(record, renewalTargetIds);

                                                                                    return (
                                                                                        <span className="flex items-center gap-2 translate-y-[1px]">
                                                                                            <span className={status === 'active' || status === 'renewed' ? 'text-green-600' : status === 'expired' ? 'text-[#E31E24]' : 'text-slate-500'}>
                                                                                                {endDate.toLocaleDateString('pt-BR')}
                                                                                            </span>
                                                                                            <span className={`text-[10px] px-2 py-0.5 rounded shadow-sm border font-black ${status === 'active'
                                                                                                ? 'bg-green-500 text-white border-green-600 animate-pulse'
                                                                                                : status === 'renewed'
                                                                                                    ? 'bg-blue-600 text-white border-blue-700'
                                                                                                    : status === 'finished'
                                                                                                        ? 'bg-slate-300 text-slate-600 border-slate-400'
                                                                                                        : 'bg-[#E31E24] text-white border-[#E31E24]'
                                                                                                }`}>
                                                                                                {status === 'active' ? 'VIGENTE' : status === 'renewed' ? 'RENOVADO' : status === 'finished' ? 'FINALIZADO' : 'VENCIDO'}
                                                                                            </span>
                                                                                        </span>
                                                                                    );
                                                                                })() : '---'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1 md:col-span-2 text-center md:text-left">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase">Beneficiário e Natureza</p>
                                                                    <p className="text-sm font-bold text-slate-700 uppercase truncate">{record.beneficiario_nome || 'PRÓPRIO'}</p>
                                                                    {record.natureza_cargo && (
                                                                        <span className="text-[10px] font-black text-[#1A3351] bg-[#1A3351]/5 px-2 py-0.5 rounded uppercase border border-[#1A3351]/10">
                                                                            {record.natureza_cargo}
                                                                        </span>
                                                                    )}
                                                                    <p className="text-[8px] text-slate-400 italic mt-2">Atualizado em: {new Date(record.updated_at).toLocaleDateString('pt-BR')}</p>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase border-b border-slate-100 pb-0.5 mb-1.5">Documento Oficial</p>
                                                                    <div className="space-y-0.5">
                                                                        {record.assomasul_data && (
                                                                            <p className="text-[10px] font-black text-[#1A3351] uppercase tracking-tighter whitespace-nowrap">
                                                                                Pub. Assomasul: {formatDate(record.assomasul_data)}
                                                                            </p>
                                                                        )}
                                                                        {record.assomasul_numero && (
                                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Nº Assomasul: {record.assomasul_numero}</p>
                                                                        )}
                                                                        <div className="h-px bg-slate-100 my-1" />
                                                                        <p className="text-xs font-black text-[#1A3351] uppercase tracking-tighter leading-tight">{record.portaria || '---'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col gap-2 items-end justify-center">
                                                                    {userRole !== 'analytic_manager' && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => router.push(`/abono/edit/${record.id}`)}
                                                                                className="px-6 py-2 bg-[#1A3351] text-white text-[10px] font-black uppercase rounded shadow-sm hover:brightness-110 active:scale-95 transition-all w-full md:w-32"
                                                                            >
                                                                                Editar Dados
                                                                            </button>
                                                                            {getBenefitStatus(record, renewalTargetIds) === 'expired' && !record.renovado_por_id && (
                                                                                <button
                                                                                    onClick={() => router.push(`/abono/new?renew_from=${record.id}&cpf=${record.cpf}&beneficiario=${record.beneficiario_nome || ''}`)}
                                                                                    className="px-6 py-2 bg-green-600 text-white text-[10px] font-black uppercase rounded shadow-sm hover:brightness-110 active:scale-95 transition-all w-full md:w-32 flex items-center justify-center gap-1"
                                                                                >
                                                                                    <TrendingUp className="w-3 h-3" />
                                                                                    Renovar
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    )}
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

                                                            {
                                                                logs[record.id] && logs[record.id].length > 0 && (
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

            {/* RELATÓRIO PDF (OCULTO NA TELA, VISÍVEL NA IMPRESSÃO) */}
            < div id="print-area" className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 pt-1 overflow-y-auto" >
                {/* CABEÇALHO OFICIAL - ULTRA COMPACTO */}
                < div className="flex justify-between items-center border-b-[1px] border-slate-200 pb-1.5 mb-2" >
                    <div className="flex items-center gap-3">
                        <img src="/images/logo.png" alt="Logo" className="h-12 w-auto object-contain" />
                        <div className="h-10 w-[1px] bg-slate-200 mx-1" />
                        <div className="flex flex-col">
                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-0.5">Prefeitura Três Lagoas</p>
                            <p className="text-[9px] font-medium text-slate-400 uppercase leading-none">SESMT - Saúde Ocupacional</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-base font-black text-[#1A3351] uppercase tracking-tighter leading-tight">Relatório Gerencial de Abono</h1>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">
                            OP: {userName} | {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div >

                {/* RESUMO DOS FILTROS - MAIS DISCRETO */}
                < div className="flex items-center justify-between bg-slate-50/50 p-1 mb-2 border border-slate-100 rounded" >
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-3.5 bg-[#E31E24]" />
                        <p className="text-[8px] font-black uppercase text-[#1A3351]">
                            REGISTROS: <span className="text-[#E31E24]">{stats.finalRecords.length}</span>
                        </p>
                    </div>
                    <p className="text-[7.5px] font-medium uppercase text-slate-400 truncate max-w-[60%] italic">
                        FILTROS: {stats.printFilters}
                    </p>
                </div >

                {/* TABELA DE DADOS - MÁXIMA COMPACTAÇÃO E SEM NEGRITOS DESNECESSÁRIOS */}
                < table className="w-full border-collapse" >
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                            <th className="p-1 px-2 text-[8px] font-black uppercase text-slate-500 text-left border border-slate-200">Nome do Servidor</th>
                            <th className="p-1 px-2 text-[8px] font-black uppercase text-slate-500 text-left border border-slate-200">Portaria</th>
                            <th className="p-1 text-[8px] font-black uppercase text-slate-500 text-center border border-slate-200">Início</th>
                            <th className="p-1 text-[8px] font-black uppercase text-slate-500 text-center border border-slate-200">Término</th>
                            <th className="p-1 px-2 text-[8px] font-black uppercase text-slate-500 text-left border border-slate-200">Secretaria</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.finalRecords.sort((a, b) => a.nome.localeCompare(b.nome)).map((record, index) => {
                            const endDate = record.inicio ? (() => {
                                const d = new Date(record.inicio + 'T00:00:00');
                                d.setFullYear(d.getFullYear() + 1);
                                return d.toISOString().split('T')[0];
                            })() : null;

                            return (
                                <tr key={record.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} border-b border-slate-100`}>
                                    <td className="p-0.5 px-2 border border-slate-100 font-medium">
                                        <p className="text-[9px] text-slate-600 uppercase leading-tight">{record.nome}</p>
                                    </td>
                                    <td className="p-0.5 px-2 border border-slate-100 uppercase">
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-[9px] font-bold text-[#1A3351]">{record.portaria}</span>
                                            {(record.assomasul_numero || record.assomasul_data) && (
                                                <span className="text-[7.5px] text-slate-400 font-medium">
                                                    AS: {record.assomasul_numero || '---'} {record.assomasul_data ? `(${formatDate(record.assomasul_data)})` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-0.5 text-[8px] font-bold text-[#1A3351] border border-slate-100 text-center whitespace-nowrap">{formatDate(record.inicio)}</td>
                                    <td className="p-0.5 text-[8px] font-bold text-[#E31E24] border border-slate-100 text-center whitespace-nowrap">{formatDate(endDate)}</td>
                                    <td className="p-0.5 px-2 text-[8px] font-normal text-slate-400 border border-slate-100 uppercase leading-tight truncate max-w-[180px]">{record.secretaria || '---'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table >


                {/* RODAPÉ DO PDF */}
                < div className="mt-4 pt-1 border-t border-slate-100 flex justify-center items-center opacity-60" >
                    <p className="text-[7.5px] font-normal text-slate-500">Gerado via SESMT SYSTEM - Powered by UXBRAS®</p>
                </div >

                <style jsx global>{`
                    @media print {
                        #print-area {
                            display: block !important;
                            position: relative !important;
                            z-index: 9999 !important;
                        }
                        #print-area table {
                            display: table !important;
                            width: 100% !important;
                        }
                        #print-area tr {
                            display: table-row !important;
                        }
                        #print-area td, #print-area th {
                            display: table-cell !important;
                        }
                        @page {
                            size: ${printLayout};
                            margin: 0.5cm;
                        }
                    }
                `}</style>
            </div >
        </div >
    );
}
