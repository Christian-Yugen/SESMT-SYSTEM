"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    LabelList,
} from "recharts";
import {
    LayoutDashboard,
    Database,
    FileSearch,
    HeartPulse,
    LogOut,
    Activity,
    X,
    Menu,
    ChevronDown,
    Building2,
    History as HistoryIcon,
    Users as UsersIcon,
    BarChart3,
    Calendar,
    Filter,
    ClipboardList,
    TrendingUp,
    Printer,
    FolderOpen,
    Scale,
    FileText
} from "lucide-react";
import { useRouter } from "next/navigation";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { capitalizeName } from "@/lib/portaria-utils";

/** Quebra label em até 2 linhas para tick SVG (Recharts) e limpa prefixos */
function wrapLabel(text: string, maxCharsPerLine: number) {
    const cleanText = text
        .replace(/SECRETARIA MUNICIPAL DE\s+/gi, "")
        .replace(/SECRETARIA MUNICIPAL DA\s+/gi, "")
        .replace(/SECRETARIA MUNICIPAL\s+/gi, "")
        .trim();

    const words = cleanText.split(" ").filter(Boolean);
    const lines: string[] = [];
    let line = "";

    for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (test.length <= maxCharsPerLine) {
            line = test;
        } else {
            if (line) lines.push(line);
            line = w;
        }
    }
    if (line) lines.push(line);
    return lines.slice(0, 2);
}

/** Tick customizado para YAxis do ranking */
function SecretariaTick(props: any) {
    const { x, y, payload } = props;
    const lines = wrapLabel(payload?.value, 20);

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={4} textAnchor="end" fill="#1A3351" fontSize={8} fontWeight={900}>
                {lines.map((line: string, i: number) => (
                    <tspan key={i} x={0} dy={i === 0 ? 0 : 10}>
                        {line}
                    </tspan>
                ))}
            </text>
        </g>
    );
}

export default function AfastamentosAnalyticsPage() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");

    // Filtros
    const [filterSecretaria, setFilterSecretaria] = useState("all");
    const [filterTipo, setFilterTipo] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [filterNatureza, setFilterNatureza] = useState("all");
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { session, error } = await safeGetSession();
                if (error) {
                    await handleAuthError(error);
                    return;
                }
                if (!session) {
                    router.push("/login");
                    return;
                }
                const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                if (data) setUserRole(data.role);
                const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Usuário";
                setUserName(name);
                loadData();
            } catch (err) {
                await handleAuthError(err);
            }
        };
        checkAuth();
    }, [router]);

    async function loadData() {
        setLoading(true);
        const { data, error } = await supabase
            .from("afastamentos")
            .select("*")
            .order("data_inicio", { ascending: true });
        if (!error && data) setRecords(data);
        setLoading(false);
    }

    const uniqueSecretarias = useMemo(() =>
        Array.from(new Set(records.map(r => r.servidor_secretaria).filter(Boolean))).sort() as string[]
        , [records]);

    const uniqueTipos = useMemo(() =>
        Array.from(new Set(records.map(r => r.tipo_afastamento).filter(Boolean))).sort() as string[]
        , [records]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSecretaria = filterSecretaria === "all" || r.servidor_secretaria === filterSecretaria;
            const matchesNatureza = filterNatureza === "all" || r.natureza_cargo === filterNatureza;
            const matchesTipo = filterTipo === "all" || r.tipo_afastamento === filterTipo;
            
            const entryDate = r.data_inicio;
            const matchesStartDate = !startDate || entryDate >= startDate;
            const matchesEndDate = !endDate || entryDate <= endDate;

            return matchesSecretaria && matchesNatureza && matchesTipo && matchesStartDate && matchesEndDate;
        });
    }, [records, filterSecretaria, filterNatureza, filterTipo, startDate, endDate]);

    const getStatus = (record: any) => {
        if (record.situacao === 'FINALIZADO' || record.situacao === 'PRORROGADO') return 'finished';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (record.data_fim) {
            const end = new Date(record.data_fim + 'T00:00:00'); end.setHours(0, 0, 0, 0);
            if (end < today) return 'expired';
        }
        return 'active';
    };

    // Processamento para Gráficos
    const chartData = useMemo(() => {
        if (!filteredRecords.length) return { byMonth: [], byStatus: [], bySecretaria: [], byType: [], byImpact: [] };

        // Volume por Mês
        const monthMap: Record<string, number> = {};
        filteredRecords.forEach(r => {
            if (!r.data_inicio) return;
            const [y, m] = r.data_inicio.split('-');
            const label = `${m}/${y.substring(2)}`;
            monthMap[label] = (monthMap[label] || 0) + 1;
        });
        const byMonth = Object.keys(monthMap).map(k => ({ name: k, total: monthMap[k] })).slice(-12);

        // Status
        let ativos = 0;
        let vencidos = 0;
        let finalizados = 0;
        filteredRecords.forEach(r => {
            const status = getStatus(r);
            if (status === 'active') ativos++;
            else if (status === 'expired') vencidos++;
            else finalizados++;
        });
        const byStatus = [
            { name: "Ativos", value: ativos, color: "#10b981" },
            { name: "Vencidos", value: vencidos, color: "#ef4444" },
            { name: "Finalizados", value: finalizados, color: "#2563eb" }
        ].filter(s => s.value > 0);

        // Tipos de Afastamento
        const typeMap: Record<string, number> = {};
        filteredRecords.forEach(r => {
            const t = r.tipo_afastamento || "OUTROS";
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const byType = Object.keys(typeMap).map(k => ({ name: k, value: typeMap[k] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // Ranking Secretarias (Casos)
        const secMap: Record<string, number> = {};
        filteredRecords.forEach(r => {
            const s = r.servidor_secretaria || "NÃO INFORMADA";
            secMap[s] = (secMap[s] || 0) + 1;
        });
        const bySecretaria = Object.keys(secMap)
            .map(k => ({ name: k, total: secMap[k] }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);

        // Impacto em Dias por Secretaria
        const impactMap: Record<string, number> = {};
        filteredRecords.forEach(r => {
            const s = r.servidor_secretaria || "NÃO INFORMADA";
            const days = parseInt(r.dias_afastado) || 0;
            impactMap[s] = (impactMap[s] || 0) + days;
        });
        const byImpact = Object.keys(impactMap)
            .map(k => ({ name: k, total: impactMap[k] }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);

        return { byMonth, byStatus, bySecretaria, byType, byImpact };
    }, [filteredRecords]);

    const handlePrintReport = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#1A3351] flex flex-col items-center justify-center gap-4">
                <TrendingUp className="w-12 h-12 text-white animate-pulse" />
                <p className="text-white uppercase tracking-[0.3em] font-bold text-xs">Analisando Dados de Afastamento...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A111C] text-white font-sans overflow-x-hidden">
            {/* SIDEBAR */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1A3351] border-r border-white/10 flex flex-col p-4 shrink-0 shadow-2xl transition-transform duration-300 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
                <div className="mb-8 flex flex-col items-center">
                    <div className="flex justify-between items-center w-full lg:hidden mb-4">
                        <span className="text-white font-bold text-xs uppercase">Menu</span>
                        <button onClick={() => setIsSidebarOpen(false)}><X className="w-6 h-6 text-white" /></button>
                    </div>
                    <img src="/images/logo_white.png" alt="SESMT" className="h-14 w-auto object-contain mt-2 mb-2" />
                    <div className="text-center w-full px-1 mt-2">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">SESMT SYSTEM</p>
                        <p className="text-xs font-bold text-white/70 uppercase tracking-wider truncate">Olá, <span className="text-white">{userName}</span></p>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                            <button onClick={() => router.push("/")} className="w-full flex items-center gap-1.5 p-3 rounded-none text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <LayoutDashboard className="w-4 h-4 shrink-0" />
                                <span>Painel Geral</span>
                            </button>
                            <button onClick={() => router.push("/afastamentos")} className="w-full flex items-center gap-1.5 p-3 rounded-none text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <ClipboardList className="w-4 h-4 shrink-0" />
                                <span>Afastamentos</span>
                            </button>
                            <button className="w-full flex items-center gap-1.5 p-3 rounded-none bg-white/10 text-white font-bold text-xs uppercase tracking-wider shadow-sm border border-white/5">
                                <BarChart3 className="w-4 h-4 shrink-0" />
                                <span>Indicadores BI</span>
                            </button>
                            <button onClick={() => router.push("/history")} className="w-full flex items-center gap-1.5 p-3 rounded-none text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <HistoryIcon className="w-4 h-4 shrink-0" />
                                <span>Histórico ASO</span>
                            </button>
                </nav>

                <div className="mt-auto space-y-4 px-4">
                    <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="w-full flex items-center gap-1.5 p-2 text-white/30 hover:text-white transition-all font-bold uppercase tracking-widest text-[10px]">
                        <LogOut className="w-4 h-4" /> Sair
                    </button>
                    <div className="pl-4 pb-6 flex flex-col border-t border-white/5 pt-4">
                        <p className="text-[10px] font-normal text-white/60 leading-none mb-1 text-left">Powered by</p>
                        <p className="text-[18px] font-bold text-white leading-none tracking-[0.1em] text-left">UXBRAS<span className="text-[12px] font-normal align-top ml-0.5 tracking-normal">®</span></p>
                    </div>
                </div>
            </aside>

            {/* MAIN */}
            <main className="flex-1 flex flex-col bg-[#D3D3D3] text-black min-h-screen lg:h-screen lg:overflow-hidden relative">
                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#10b981] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#1A3351] rounded-none shadow-inner">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold uppercase tracking-tighter leading-none text-[#1A3351]">Afastamentos <span className="text-emerald-600">Analytics</span></h1>
                                <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest mt-1">Indicadores de Saúde e Absenteísmo</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handlePrintReport} className="hidden md:flex items-center justify-center gap-2 px-6 h-10 bg-[#1A3351] text-white font-bold shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10">
                                <Printer className="w-3.5 h-3.5" /> Imprimir Vista (PDF)
                            </button>
                            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1A3351] text-white"><Menu className="w-6 h-6" /></button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4 items-stretch">
                        <select value={filterSecretaria} onChange={(e) => setFilterSecretaria(e.target.value)} className="flex-1 md:flex-none px-4 h-11 bg-[#E8E8E8] border border-[#888] shadow-inner text-[10px] font-bold uppercase outline-none focus:border-[#1A3351] max-w-[250px]">
                            <option value="all">TODAS SECRETARIAS</option>
                            {uniqueSecretarias.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="flex-1 md:flex-none px-4 h-11 bg-[#E8E8E8] border border-[#888] shadow-inner text-[10px] font-bold uppercase outline-none focus:border-[#1A3351]">
                            <option value="all">TODOS OS TIPOS</option>
                            {uniqueTipos.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={filterNatureza} onChange={(e) => setFilterNatureza(e.target.value)} className="flex-1 md:flex-none px-4 h-11 bg-[#E8E8E8] border border-[#888] shadow-inner text-[10px] font-bold uppercase outline-none focus:border-[#1A3351]">
                            <option value="all">TODAS NATUREZAS</option>
                            <option value="EFETIVO">EFETIVO</option>
                            <option value="COMISSÃO">COMISSÃO</option>
                            <option value="TEMPORÁRIO">TEMPORÁRIO</option>
                        </select>
                        <div className="relative flex-1 md:flex-none min-w-[180px] h-11">
                            <button onClick={() => setIsDateFilterOpen(!isDateFilterOpen)} className={`w-full h-full bg-[#E8E8E8] border border-[#888] shadow-inner px-4 text-[10px] font-bold uppercase flex items-center justify-between gap-2 ${startDate || endDate ? "text-emerald-600" : ""}`}>
                                <span className="flex items-center gap-2"><Calendar className="w-3 h-3" /> PERÍODO</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            {isDateFilterOpen && (
                                <div className="absolute top-11 left-0 bg-white shadow-2xl p-4 border border-[#888] w-64 z-[100] animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Período de Início</p>
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-none text-[10px] font-bold outline-none" />
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-none text-[10px] font-bold outline-none" />
                                        <button onClick={() => setIsDateFilterOpen(false)} className="w-full py-2 bg-[#1A3351] text-white text-[10px] font-bold rounded-none uppercase">Aplicar Período</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {(filterSecretaria !== "all" || filterTipo !== "all" || filterNatureza !== "all" || startDate || endDate) && (
                            <button onClick={() => { setFilterSecretaria("all"); setFilterTipo("all"); setFilterNatureza("all"); setStartDate(""); setEndDate(""); }} className="bg-[#E31E24] text-white px-4 h-11 text-[10px] font-bold uppercase shadow-md flex items-center gap-2">
                                <X className="w-3 h-3" /> Limpar
                            </button>
                        )}
                    </div>
                </section>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-6">
                    {/* STAT CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 border-l-4 border-[#1A3351] shadow-md flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest leading-tight">Total de Registros</p>
                                <h3 className="text-2xl font-bold text-[#1A3351] mt-1">{filteredRecords.length}</h3>
                            </div>
                            <ClipboardList className="w-6 h-6 text-slate-100" />
                        </div>
                        <div className="bg-white p-4 border-l-4 border-emerald-500 shadow-md flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest leading-tight">Afastamentos Ativos</p>
                                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{chartData.byStatus.find(s => s.name === "Ativos")?.value || 0}</h3>
                            </div>
                            <Activity className="w-6 h-6 text-emerald-100" />
                        </div>
                        <div className="bg-white p-4 border-l-4 border-red-500 shadow-md flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest leading-tight">Total Dias Afastados</p>
                                <h3 className="text-2xl font-bold text-red-600 mt-1">{filteredRecords.reduce((acc, r) => acc + (parseInt(r.dias_afastado) || 0), 0)}</h3>
                            </div>
                            <Calendar className="w-6 h-6 text-red-50" />
                        </div>
                        <div className="bg-white p-4 border-l-4 border-blue-600 shadow-md flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest leading-tight">Servidores Diferentes</p>
                                <h3 className="text-2xl font-bold text-blue-600 mt-1">{new Set(filteredRecords.map(r => r.servidor_cpf)).size}</h3>
                            </div>
                            <UsersIcon className="w-6 h-6 text-blue-50" />
                        </div>
                    </div>

                    {/* CHARTS */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-8">
                        {/* CHART 1: MONTHLY VOLUME */}
                        <div className="bg-white p-5 shadow-sm border border-black/5 lg:col-span-8">
                            <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> Evolução Mensal (Lançamentos)
                            </h4>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.byMonth}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: "#999" }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: "#999" }} />
                                        <Tooltip contentStyle={{ borderRadius: "0px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "11px", fontWeight: "bold" }} />
                                        <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 2: STATUS PIE */}
                        <div className="bg-white p-5 shadow-sm border border-black/5 lg:col-span-4 relative">
                            <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Situação dos Registros
                            </h4>
                            <div className="h-[280px] w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData.byStatus} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                                            {chartData.byStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            <LabelList dataKey="value" position="outside" style={{ fontSize: "11px", fontWeight: 900, fill: "#1A3351" }} />
                                        </Pie>
                                        <Tooltip formatter={(value: any) => [`${value}`, "Registros"]} />
                                        <Legend verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: "9px", fontWeight: "black", textTransform: "uppercase", paddingTop: "20px" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 3: TYPE PIE */}
                        <div className="bg-white p-5 shadow-sm border border-black/5 lg:col-span-4 relative">
                            <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> Distribuição por Tipo
                            </h4>
                            <div className="h-[280px] w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData.byType} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                                            {chartData.byType.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#1e293b', '#3b82f6', '#f59e0b', '#10b981', '#6366f1'][index % 5]} />
                                            ))}
                                            <LabelList dataKey="value" position="outside" style={{ fontSize: "11px", fontWeight: 900, fill: "#1A3351" }} />
                                        </Pie>
                                        <Tooltip formatter={(value: any) => [`${value}`, "Casos"]} />
                                        <Legend verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: "9px", fontWeight: "black", textTransform: "uppercase", paddingTop: "20px" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 4: IMPACT BAR RANKING */}
                        <div className="bg-white p-6 shadow-sm border border-black/5 lg:col-span-8">
                            <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Absenteísmo por Secretaria (Total de Dias)
                            </h4>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.byImpact} layout="vertical" margin={{ left: 170, right: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={<SecretariaTick />} width={160} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: "0px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "11px" }} />
                                        <Bar dataKey="total" fill="#ef4444" radius={[0, 0, 0, 0]} barSize={24}>
                                            <LabelList dataKey="total" position="right" style={{ fontSize: "10px", fontWeight: 900, fill: "#ef4444" }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
