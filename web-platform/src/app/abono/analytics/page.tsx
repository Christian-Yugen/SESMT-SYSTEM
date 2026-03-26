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

/** Utilitário: Verifica se o benefício está ativo (1 ano de vigência) */
const isBenefitActive = (inicio: string) => {
    if (!inicio) return false;
    const startDate = new Date(inicio + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setFullYear(startDate.getFullYear() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today <= endDate;
};

/** Quebra label em até 2 linhas para tick SVG (Recharts) */
function wrapLabel(text: string, maxCharsPerLine: number) {
    const words = String(text || "")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);

    const lines: string[] = [];
    let line = "";

    for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (test.length <= maxCharsPerLine) {
            line = test;
        } else {
            if (line) lines.push(line);
            line = w;
            if (line.length > maxCharsPerLine) {
                lines.push(line.slice(0, Math.max(1, maxCharsPerLine - 1)) + "…");
                line = "";
            }
        }
    }
    if (line) lines.push(line);
    return lines.slice(0, 2);
}

/** Tick customizado para YAxis do ranking */
function SecretariaTick(props: any) {
    const { x, y, payload } = props;
    const lines = wrapLabel(payload?.value, 22);

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={4} textAnchor="end" fill="#1A3351" fontSize={9} fontWeight={900}>
                {lines.map((line: string, i: number) => (
                    <tspan key={i} x={0} dy={i === 0 ? 0 : 12}>
                        {line}
                    </tspan>
                ))}
            </text>
        </g>
    );
}

export default function AbonoAnalyticsPage() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");

    // Filtros
    const [filterSecretaria, setFilterSecretaria] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
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
            .from("abono_salarial")
            .select("*")
            .order("inicio", { ascending: true });
        if (!error && data) setRecords(data);
        setLoading(false);
    }

    const uniqueSecretarias = useMemo(() =>
        Array.from(new Set(records.map(r => r.secretaria).filter(Boolean))).sort() as string[]
        , [records]);

    // IDs de registros que nasceram de uma renovação
    const renewalTargetIds = useMemo(() => {
        return new Set(records.map(r => r.renovado_por_id).filter(Boolean));
    }, [records]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSecretaria = filterSecretaria === "all" || r.secretaria === filterSecretaria;
            const matchesNatureza = filterNatureza === "all" || r.natureza_cargo === filterNatureza;
            const entryDate = r.inicio;
            const matchesStartDate = !startDate || entryDate >= startDate;
            const matchesEndDate = !endDate || entryDate <= endDate;

            if (!r.inicio) return false;
            const startDateObj = new Date(r.inicio + 'T00:00:00');
            const endDateObj = new Date(startDateObj);
            endDateObj.setFullYear(startDateObj.getFullYear() + 1);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Identidade do status
            const isFinished = !!r.renovado_por_id;
            const isExpired = today > endDateObj && !isFinished;

            // Lógica de 90 dias para Renovados
            const isRenewal = renewalTargetIds.has(r.id);
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const isRecent = new Date(r.created_at) > ninetyDaysAgo;
            const isRenovado = isRenewal && isRecent && today <= endDateObj && !isFinished;
            const isAtivo = today <= endDateObj && !isFinished && !isRenovado;

            const matchesStatus = filterStatus === "all" ||
                (filterStatus === "active" && (isAtivo || isRenovado)) ||
                (filterStatus === "expired" && isExpired) ||
                (filterStatus === "finished" && isFinished);

            return matchesSecretaria && matchesNatureza && matchesStatus && matchesStartDate && matchesEndDate;
        });
    }, [records, filterSecretaria, filterNatureza, filterStatus, startDate, endDate, renewalTargetIds]);

    // Processamento para Gráficos
    const chartData = useMemo(() => {
        if (!filteredRecords.length) return { byMonth: [], byStatus: [], bySecretaria: [], byNatureza: [] };

        // Volume por Mês
        const monthMap: Record<string, number> = {};
        filteredRecords.forEach(r => {
            if (!r.inicio) return;
            const [y, m] = r.inicio.split('-');
            const label = `${m}/${y.substring(2)}`;
            monthMap[label] = (monthMap[label] || 0) + 1;
        });
        const byMonth = Object.keys(monthMap).map(k => ({ name: k, total: monthMap[k] })).slice(-12);

        // Status
        let ativos = 0;
        let renovados = 0;
        let vencidos = 0;
        let finalizados = 0;
        filteredRecords.forEach(r => {
            if (!r.inicio) return;
            const startDate = new Date(r.inicio + 'T00:00:00');
            const endDate = new Date(startDate);
            endDate.setFullYear(startDate.getFullYear() + 1);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (r.renovado_por_id) {
                finalizados++;
            } else if (today > endDate) {
                vencidos++;
            } else {
                // Lógica de 90 dias para Renovados
                const isRenewal = renewalTargetIds.has(r.id);
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                if (isRenewal && new Date(r.created_at) > ninetyDaysAgo) {
                    renovados++;
                } else {
                    ativos++;
                }
            }
        });
        const byStatus = [
            { name: "Ativos", value: ativos, color: "#10b981" },
            { name: "Renovados", value: renovados, color: "#2563eb" },
            { name: "Vencidos", value: vencidos, color: "#ef4444" },
            { name: "Finalizados", value: finalizados, color: "#94a3b8" }
        ].filter(s => s.value > 0);

        // Ranking Secretarias
        const secMap: Record<string, number> = {};
        filteredRecords.forEach(r => {
            const s = r.secretaria || "NÃO INFORMADA";
            secMap[s] = (secMap[s] || 0) + 1;
        });
        const bySecretaria = Object.keys(secMap)
            .map(k => ({ name: k, total: secMap[k] }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);

        // Natureza do Cargo
        const natMap: Record<string, number> = {};
        filteredRecords.forEach(r => {
            const n = r.natureza_cargo || "NÃO INFORMADA";
            natMap[n] = (natMap[n] || 0) + 1;
        });
        const byNatureza = Object.keys(natMap).map(k => ({ name: k, value: natMap[k] }));

        return { byMonth, byStatus, bySecretaria, byNatureza };
    }, [filteredRecords]);

    const handlePrintReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const today = new Date().toLocaleDateString('pt-BR');
        const logoUrl = window.location.origin + "/images/logo.png";

        printWindow.document.write(`
            <html>
                <head>
                    <title>BI Abono Salarial - ${today}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #E31E24; padding-bottom: 10px; margin-bottom: 20px; }
                        .logo { height: 40px; }
                        h1 { font-size: 18px; color: #1A3351; margin: 0; text-transform: uppercase; }
                        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
                        .stat-card { border: 1px solid #eee; padding: 10px; text-align: center; }
                        .stat-val { font-size: 20px; font-weight: 900; color: #1A3351; }
                        .stat-lbl { font-size: 9px; color: #666; text-transform: uppercase; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #1A3351; color: white; font-size: 10px; padding: 8px; text-align: left; text-transform: uppercase; }
                        td { border-bottom: 1px solid #eee; padding: 8px; font-size: 10px; text-transform: uppercase; }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    <div class="header">
                        <img src="${logoUrl}" class="logo" />
                        <div style="text-align: right;">
                            <h1>Relatório BI - Abono Salarial</h1>
                            <div style="font-size: 10px; font-weight: bold; color: #666;">EMISSÃO: ${today} | OP: ${userName}</div>
                        </div>
                    </div>
                    <div class="stats">
                        <div class="stat-card">
                            <div class="stat-val">${filteredRecords.length}</div>
                            <div class="stat-lbl">Total de Benefícios</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-val">${chartData.byStatus.find(s => s.name === "Ativos")?.value || 0}</div>
                            <div class="stat-lbl">Abonos Ativos</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-val">${new Set(filteredRecords.map(r => r.cpf)).size}</div>
                            <div class="stat-lbl">Servidores Atendidos</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-val">${uniqueSecretarias.length}</div>
                            <div class="stat-lbl">Secretarias</div>
                        </div>
                    </div>
                    <h2>Ranking por Secretaria (Top registros)</h2>
                    <table>
                        <thead>
                            <tr><th>Secretaria</th><th>Quantidade</th><th>% Total</th></tr>
                        </thead>
                        <tbody>
                            ${chartData.bySecretaria.map(s => `
                                <tr>
                                    <td>${s.name}</td>
                                    <td>${s.total}</td>
                                    <td>${((s.total / filteredRecords.length) * 100).toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="margin-top: 30px; font-size: 7.5px; text-align: center; color: #777; border-top: 1px solid #eee; padding-top: 10px; font-weight: normal;">
                        Gerado via SESMT SYSTEM - Powered by UXBRAS®
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#1A3351] flex flex-col items-center justify-center gap-4">
                <TrendingUp className="w-12 h-12 text-white animate-pulse" />
                <p className="text-white uppercase tracking-[0.3em] font-bold text-xs">Analisando Dados de Abono...</p>
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
                    {(userRole === 'admin' || userRole === 'social_assistant') && (
                        <>
                            <button onClick={() => router.push("/")} className="w-full flex items-center gap-1.5 p-3 rounded-none text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <LayoutDashboard className="w-4 h-4 shrink-0" />
                                <span>Criar documentos</span>
                            </button>
                            <button onClick={() => router.push("/abono")} className="w-full flex items-center gap-1.5 p-3 rounded-none text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <ClipboardList className="w-4 h-4 shrink-0" />
                                <span>Abono Salarial</span>
                            </button>
                            <button className="w-full flex items-center gap-1.5 p-3 rounded-none bg-white/10 text-white font-bold text-xs uppercase tracking-wider shadow-sm border border-white/5">
                                <BarChart3 className="w-4 h-4 shrink-0" />
                                <span>Indicadores BI</span>
                            </button>
                            <button onClick={() => router.push("/history")} className="w-full flex items-center gap-1.5 p-3 rounded-none text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <HistoryIcon className="w-4 h-4 shrink-0" />
                                <span>Histórico</span>
                            </button>
                            <button onClick={() => router.push("/archive")} className="w-full flex items-center gap-1.5 p-3 rounded-none text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <FolderOpen className="w-4 h-4 shrink-0" />
                                <span>Arquivo Médico</span>
                            </button>
                        </>
                    )}
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
            <main className="flex-1 flex flex-col bg-[#D3D3D3] text-black min-h-screen lg:h-screen lg:overflow-visible relative">
                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#1A3351] rounded-none shadow-inner">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold uppercase tracking-tighter leading-none text-[#1A3351]">Abono <span className="text-blue-700">Analytics</span></h1>
                                <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest mt-1">Estatísticas e Indicadores Gerenciais</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handlePrintReport} className="hidden md:flex items-center justify-center gap-2 px-6 h-10 bg-[#1A3351] text-white font-bold rounded-none shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10">
                                <Printer className="w-3.5 h-3.5" /> Relatório Analítico (PDF)
                            </button>
                            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1A3351] rounded-none text-white"><Menu className="w-6 h-6" /></button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                        <select value={filterSecretaria} onChange={(e) => setFilterSecretaria(e.target.value)} className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#888] shadow-inner text-[10px] font-bold uppercase outline-none focus:border-[#1A3351] max-w-[250px]">
                            <option value="all">TODAS SECRETARIAS</option>
                            {uniqueSecretarias.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#888] shadow-inner text-[10px] font-bold uppercase outline-none focus:border-[#1A3351]">
                            <option value="all">TODOS STATUS</option>
                            <option value="active">ATIVOS</option>
                            <option value="expired">VENCIDOS</option>
                            <option value="finished">FINALIZADOS</option>
                        </select>
                        <select value={filterNatureza} onChange={(e) => setFilterNatureza(e.target.value)} className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#888] shadow-inner text-[10px] font-bold uppercase outline-none focus:border-[#1A3351]">
                            <option value="all">TODAS NATUREZAS</option>
                            {Array.from(new Set(records.map(r => r.natureza_cargo).filter(Boolean))).sort().map(n => (
                                <option key={n} value={n}>{String(n).toUpperCase()}</option>
                            ))}
                        </select>
                        <div className="relative flex-1 md:flex-none min-w-[180px]">
                            <button onClick={() => setIsDateFilterOpen(!isDateFilterOpen)} className={`w-full bg-[#E8E8E8] border border-[#888] shadow-inner px-4 py-2 text-[10px] font-bold uppercase flex items-center justify-between gap-2 ${startDate || endDate ? "text-blue-700" : ""}`}>
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
                        {(filterSecretaria !== "all" || filterStatus !== "all" || filterNatureza !== "all" || startDate || endDate) && (
                            <button onClick={() => { setFilterSecretaria("all"); setFilterStatus("all"); setFilterNatureza("all"); setStartDate(""); setEndDate(""); }} className="bg-[#E31E24] text-white px-4 py-2 text-[10px] font-bold uppercase shadow-md flex items-center gap-2">
                                <X className="w-3 h-3" /> Reset
                            </button>
                        )}
                    </div>
                </section>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* STAT CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 border-l-4 border-blue-600 shadow-md flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest leading-tight">Total de Benefícios</p>
                                <h3 className="text-2xl font-bold text-[#1A3351] mt-1">{filteredRecords.length}</h3>
                            </div>
                            <ClipboardList className="w-6 h-6 text-blue-100" />
                        </div>
                        <div className="bg-white p-4 border-l-4 border-emerald-500 shadow-md flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest leading-tight">Abonos Ativos</p>
                                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{chartData.byStatus.find(s => s.name === "Ativos")?.value || 0}</h3>
                            </div>
                            <Activity className="w-6 h-6 text-emerald-100" />
                        </div>
                        <div className="bg-white p-4 border-l-4 border-[#1A3351] shadow-md flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest leading-tight">Servidores Diferentes</p>
                                <h3 className="text-2xl font-bold text-[#1A3351] mt-1">{new Set(filteredRecords.map(r => r.cpf)).size}</h3>
                            </div>
                            <UsersIcon className="w-6 h-6 text-slate-100" />
                        </div>
                        <div className="bg-white p-4 border-l-4 border-[#E31E24] shadow-md flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest leading-tight">Secretarias</p>
                                <h3 className="text-2xl font-bold text-[#E31E24] mt-1">{new Set(filteredRecords.map(r => r.secretaria).filter(Boolean)).size}</h3>
                            </div>
                            <Building2 className="w-6 h-6 text-red-500/10" />
                        </div>
                    </div>

                    {/* CHARTS */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-8">
                        {/* CHART 1: MONTHLY VOLUME */}
                        <div className="bg-white p-5 shadow-sm border border-black/5 lg:col-span-8 rounded-none">
                            <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> Volume de Concessões (Mês a Mês)
                            </h4>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.byMonth}>
                                        <defs>
                                            <linearGradient id="colorAbono" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1A3351" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#1A3351" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: "#999" }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: "#999" }} />
                                        <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "11px", fontWeight: "bold" }} />
                                        <Area type="monotone" dataKey="total" stroke="#1A3351" strokeWidth={4} fillOpacity={1} fill="url(#colorAbono)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 2: STATUS PIE */}
                        <div className="bg-white p-5 shadow-sm border border-black/5 lg:col-span-4 rounded-none relative">
                            <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Status dos Benefícios
                            </h4>
                            <div className="h-[280px] w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData.byStatus} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value">
                                            {chartData.byStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            <LabelList dataKey="value" position="outside" style={{ fontSize: "11px", fontWeight: 900, fill: "#1A3351" }} />
                                        </Pie>
                                        <Tooltip formatter={(value: any) => [`${value}`, "Registros"]} />
                                        <Legend verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: "9px", fontWeight: "black", textTransform: "uppercase", paddingTop: "20px" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-[48%] left-1/2 -translate-x-1/2 flex flex-col items-center">
                                    <span className="text-2xl font-bold text-[#1A3351]">{filteredRecords.length}</span>
                                    <span className="text-[8px] font-bold text-black/30 uppercase leading-none">Abonos</span>
                                </div>
                            </div>
                        </div>

                        {/* CHART 3: NATUREZA DO CARGO PIE */}
                        <div className="bg-white p-5 shadow-sm border border-black/5 lg:col-span-4 rounded-none relative">
                            <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> Natureza do Cargo
                            </h4>
                            <div className="h-[280px] w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData.byNatureza} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value">
                                            {chartData.byNatureza.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#1e293b', '#3b82f6', '#f59e0b', '#10b981', '#6366f1'][index % 5]} />
                                            ))}
                                            <LabelList dataKey="value" position="outside" style={{ fontSize: "11px", fontWeight: 900, fill: "#1A3351" }} />
                                        </Pie>
                                        <Tooltip formatter={(value: any) => [`${value}`, "Registros"]} />
                                        <Legend verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: "9px", fontWeight: "black", textTransform: "uppercase", paddingTop: "20px" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 4: SECRETARIA BAR RANKING */}
                        <div className="bg-white p-6 shadow-sm border border-black/5 lg:col-span-8 rounded-none">
                            <h4 className="text-[10px] font-bold uppercase tracking-tight text-[#1A3351] mb-6 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Distribuição por Secretaria (Ranking)
                            </h4>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.bySecretaria} layout="vertical" margin={{ left: 140, right: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={<SecretariaTick />} width={130} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "11px" }} />
                                        <Bar dataKey="total" fill="#1A3351" radius={[0, 4, 4, 0]} barSize={24}>
                                            <LabelList dataKey="total" position="right" style={{ fontSize: "10px", fontWeight: 900, fill: "#1A3351" }} />
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
