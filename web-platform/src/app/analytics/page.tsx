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
    ChevronDown,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

            // Se uma palavra for grande demais, corta duro
            if (line.length > maxCharsPerLine) {
                lines.push(line.slice(0, Math.max(1, maxCharsPerLine - 1)) + "…");
                line = "";
            }
        }
    }
    if (line) lines.push(line);

    return lines.slice(0, 2); // máximo 2 linhas
}

/** Tick customizado para YAxis do ranking */
function SecretariaTick(props: any) {
    const { x, y, payload } = props;
    const lines = wrapLabel(payload?.value, 22); // ajuste fino: 20–26

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={4}
                textAnchor="end"
                fill="#1A3351"
                fontSize={9}
                fontWeight={900}
            >
                {lines.map((line: string, i: number) => (
                    <tspan key={i} x={0} dy={i === 0 ? 0 : 12}>
                        {line}
                    </tspan>
                ))}
            </text>
        </g>
    );
}

export default function AnalyticsPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");
    const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Filtros
    const [searchTerm] = useState("");
    const [filterUser] = useState("all");
    const [filterType, setFilterType] = useState("all");
    const [filterSecretaria, setFilterSecretaria] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
    const [operatorsMap, setOperatorsMap] = useState<Record<string, string>>({});

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
                    loadHistory();

                    const { data: profData } = await supabase.from('profiles').select('id, full_name, role');
                    if (profData) {
                        const map: Record<string, string> = {};
                        profData.forEach(p => { map[p.id] = p.full_name || p.id; });
                        setOperatorsMap(map);
                    }
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
    }, [router, userRole]);

    // Redirecionamento para perfis sem acesso
    useEffect(() => {
        if (userRole === 'social_assistant') {
            router.push('/abono');
        } else if (userRole === 'operator' || userRole === 'viewer') {
            router.push('/');
        }
    }, [userRole, router]);

    async function loadHistory() {
        setLoading(true);

        const { data, error } = await supabase
            .from("aso_history")
            .select("*")
            .order("generated_at", { ascending: true });

        if (!error && data) setHistory(data);

        setLoading(false);
    }

    const uniqueSecretarias = useMemo(
        () =>
            Array.from(new Set(history.map((h) => h.secretaria).filter(Boolean))).sort() as string[],
        [history]
    );

    const filteredHistory = useMemo(() => {
        return history.filter((entry) => {
            const matchesSearch = entry.servidor_nome
                ?.toLowerCase()
                ?.includes(searchTerm.toLowerCase());

            const matchesUser = filterUser === "all" || entry.generated_by === filterUser;

            const matchesSecretaria =
                filterSecretaria === "all" || entry.secretaria === filterSecretaria;

            const entryType = entry.aso_type?.toLowerCase()?.includes("aso")
                ? "ASO"
                : entry.aso_type?.toLowerCase()?.includes("encaminhamento")
                    ? "Encaminhamento"
                    : "Outros";

            const matchesType = filterType === "all" || entryType === filterType;

            const entryDate = new Date(entry.generated_at).toISOString().split("T")[0];
            const matchesStartDate = !startDate || entryDate >= startDate;
            const matchesEndDate = !endDate || entryDate <= endDate;

            return (
                !!matchesSearch &&
                matchesUser &&
                matchesType &&
                matchesSecretaria &&
                matchesStartDate &&
                matchesEndDate
            );
        });
    }, [history, searchTerm, filterUser, filterType, filterSecretaria, startDate, endDate]);

    // Processamento de dados para Gráficos
    const chartData = useMemo(() => {
        if (!filteredHistory.length) return { byDate: [], byType: [], bySecretaria: [] };

        // Volume por data (últimos 15 pontos)
        const dateMap: Record<string, number> = {};
        filteredHistory.forEach((h) => {
            const date = new Date(h.generated_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
            });
            dateMap[date] = (dateMap[date] || 0) + 1;
        });
        const byDate = Object.keys(dateMap)
            .map((key) => ({ name: key, total: dateMap[key] }))
            .slice(-15);

        // Tipo
        const typeMap = { ASO: 0, Encaminhamento: 0 };
        filteredHistory.forEach((h) => {
            if (h.aso_type?.toLowerCase?.().includes("aso")) typeMap.ASO++;
            else typeMap.Encaminhamento++;
        });
        const byType = [
            { name: "ASOs", value: typeMap.ASO, color: "#1A3351" },
            { name: "Encaminhamentos", value: typeMap.Encaminhamento, color: "#E31E24" },
        ];

        // Ranking secretarias (Top 10)
        const secMap: Record<string, number> = {};
        filteredHistory.forEach((h) => {
            const sec = h.secretaria || "NÃO INFORMADA";
            secMap[sec] = (secMap[sec] || 0) + 1;
        });
        const bySecretaria = Object.keys(secMap)
            .map((key) => ({ name: key, total: secMap[key] }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        return { byDate, byType, bySecretaria };
    }, [filteredHistory]);

    const COLORS = ["#1A3351", "#E31E24", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const handlePrintReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const today = new Date().toLocaleDateString('pt-BR');
        const logoUrl = window.location.origin + "/images/logo.png";

        const formatFilterDate = (dateStr: string) => {
            if (!dateStr) return null;
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        };

        const displayStartDate = formatFilterDate(startDate) || 'INÍCIO';
        const displayEndDate = formatFilterDate(endDate) || 'HOJE';

        // Dados para as tabelas
        const secRows = chartData.bySecretaria.map(item => `
            <tr>
                <td>${item.name}</td>
                <td style="text-align: center; font-weight: bold;">${item.total}</td>
                <td style="text-align: center;">${((item.total / (filteredHistory.length || 1)) * 100).toFixed(1)}%</td>
            </tr>
        `).join('');

        const typeRows = chartData.byType.map(item => `
            <tr>
                <td>${item.name}</td>
                <td style="text-align: center; font-weight: bold;">${item.value}</td>
                <td style="text-align: center;">${((item.value / (filteredHistory.length || 1)) * 100).toFixed(1)}%</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório Analítico SESMT - ${today}</title>
                    <style>
                        body { font-family: sans-serif; padding: 15px; color: #333; line-height: 1.1; }
                        .official-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E31E24; padding-bottom: 10px; margin-bottom: 15px; }
                        .logo-area img { height: 40px; width: auto; }
                        .report-title-area { text-align: right; }
                        .report-title-area h1 { margin: 0; font-size: 14px; color: #1A3351; text-transform: uppercase; font-weight: 900; }
                        .report-info { font-size: 8px; color: #666; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
                        
                        .section-title { font-size: 10px; font-weight: 900; color: #1A3351; text-transform: uppercase; margin: 15px 0 8px 0; border-left: 3px solid #E31E24; padding-left: 8px; background: #f9f9f9; padding-top: 4px; padding-bottom: 4px; }
                        
                        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
                        th { background-color: #1A3351; color: white; border: 1px solid #ccc; padding: 6px 4px; text-align: left; font-size: 8px; text-transform: uppercase; }
                        td { border: 1px solid #eee; padding: 5px 4px; text-transform: uppercase; font-size: 8px; word-wrap: break-word; color: #444; }
                        
                        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
                        .stat-card { border: 1px solid #eee; padding: 10px; text-align: center; background: #fff; }
                        .stat-label { font-size: 7px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; }
                        .stat-value { font-size: 16px; font-weight: 900; color: #1A3351; }

                        .footer { margin-top: 30px; font-size: 7.5px; text-align: center; color: #777; border-top: 1px solid #eee; padding-top: 10px; font-weight: normal; }
                        .lgpd-box { background: #fcfcfc; border: 1px solid #e0e0e0; padding: 10px; margin-top: 20px; border-radius: 2px; }
                        .lgpd-title { font-size: 8px; font-weight: 900; color: #1A3351; text-transform: uppercase; margin-bottom: 4px; display: block; }
                        .lgpd-text { font-size: 8px; color: #333; text-align: justify; margin: 0; line-height: 1.4; font-weight: 500; }
                    </style>
                </head>
                <body>
                    <div class="official-header">
                        <div class="logo-area"><img src="${logoUrl}" alt="Logo" /></div>
                        <div class="report-title-area">
                            <h1>Relatório Analítico de Produtividade (BI)</h1>
                            <div class="report-info">Operador: ${userName} | Data: ${today}</div>
                            <div class="report-info" style="color: #E31E24;">FILTRO: ${displayStartDate} À ${displayEndDate}</div>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Total GERAL</div>
                            <div class="stat-value">${filteredHistory.length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Secretarias Atendidas</div>
                            <div class="stat-value">${new Set(filteredHistory.map(h => h.secretaria)).size}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Média Diária (Período)</div>
                            <div class="stat-value">${(filteredHistory.length / Math.max(1, chartData.byDate.length)).toFixed(1)}</div>
                        </div>
                    </div>

                    <div class="section-title">Distribuição por Tipo de Documento</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 50%;">Tipo de Emissão</th>
                                <th style="width: 25%; text-align: center;">Quantidade</th>
                                <th style="width: 25%; text-align: center;">Percentual</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${typeRows}
                        </tbody>
                    </table>

                    <div class="section-title">Ranking de Produtividade por Secretaria (Top 10)</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 50%;">Secretaria / Órgão</th>
                                <th style="width: 25%; text-align: center;">Total de Emissões</th>
                                <th style="width: 25%; text-align: center;">Participação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${secRows}
                        </tbody>
                    </table>

                    <div class="lgpd-box">
                        <span class="lgpd-title">🛡️ IMPORTANTE: Privacidade e Proteção de Dados (LGPD)</span>
                        <p class="lgpd-text">
                            Este relatório gerencial contém dados agregados de produtividade para fins de Business Intelligence. 
                            O uso destas informações é restrito à gestão estratégica do SESMT. Proibida a divulgação pública ou 
                            compartilhamento com terceiros sem autorização prévia.
                        </p>
                    </div>

                    <div class="footer">Gerado via SESMT SYSTEM - Powered by UXBRAS®</div>
                </body>
            </html>
        `);

        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#1A3351] flex flex-col items-center justify-center gap-4">
                <TrendingUp className="w-12 h-12 text-white animate-pulse" />
                <p className="text-white uppercase tracking-[0.3em] font-black text-xs">
                    Carregando Business Intelligence...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A111C] text-white font-sans overflow-x-hidden">
            {/* SIDEBAR */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 bg-[#1A3351] border-r border-white/10 flex flex-col p-6 lg:p-4 shrink-0 shadow-2xl transition-transform duration-300 transform ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
            >
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
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">
                            SESMT SYSTEM
                        </p>
                        <p className="text-xs font-bold text-white/70 uppercase tracking-wider truncate whitespace-nowrap">
                            Olá, <span className="text-white">{userName}</span>
                        </p>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                    {userRole !== 'social_assistant' && (
                        <>
                            <button onClick={() => router.push("/")} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                <LayoutDashboard className="w-4 h-4 shrink-0" />
                                <span>Criar documentos</span>
                            </button>
                            {userRole !== 'viewer' && (
                                <button onClick={() => router.push('/referrals')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    <ClipboardList className="w-4 h-4 shrink-0" />
                                    <span>Central de Evidências</span>
                                </button>
                            )}
                        </>
                    )}

                    {userRole !== 'viewer' && (
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
                                    {userRole !== 'social_assistant' && (
                                        <>
                                            <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                                <Database className="w-3.5 h-3.5 shrink-0" />
                                                <span>Auxílio Doença</span>
                                            </button>
                                            <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                                <FileSearch className="w-3.5 h-3.5 shrink-0" />
                                                <span>Readaptação</span>
                                            </button>
                                        </>
                                    )}
                                    {/* Abono Salarial - Restrito para nurse e operator */}
                                    {userRole !== 'nurse' && userRole !== 'operator' && (
                                        <button
                                            onClick={() => router.push('/abono')}
                                            className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap"
                                        >
                                            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                                            <span>Abono Salarial</span>
                                        </button>
                                    )}
                                    {userRole !== 'social_assistant' && (
                                        <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                            <span>Redução de Jornada</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {userRole !== 'social_assistant' && userRole !== 'operator' && userRole !== 'viewer' && (
                        <div className="space-y-1">
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
                                        <button onClick={() => router.push("/history")} className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                            <HistoryIcon className="w-3.5 h-3.5 shrink-0" />
                                            <span>Log Principal</span>
                                        </button>
                                        <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg bg-white/10 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm border border-white/5 whitespace-nowrap transition-all hover:bg-white/20">
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
                        </div>
                    )}

                    {userRole === "admin" && (
                        <>
                            <button onClick={() => router.push("/users")} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <UsersIcon className="w-4 h-4 shrink-0" />
                                <span>Usuários</span>
                            </button>
                            <button onClick={() => router.push('/deletion-requests')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                <Trash2 className="w-4 h-4 shrink-0" />
                                <span>Exclusões Pendentes</span>
                            </button>
                        </>
                    )}

                </nav>

                <div className="mt-auto space-y-4 px-4">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-1.5 p-2 text-white/30 hover:text-white transition-all font-bold uppercase tracking-widest text-[10px]"
                    >
                        <LogOut className="w-4 h-4" /> Sair
                    </button>

                    <div className="pl-4 pb-6 flex flex-col border-t border-white/5 pt-4">
                        <p className="text-[10px] font-normal text-white/60 leading-none mb-1 text-left">
                            Powered by
                        </p>
                        <p className="text-[18px] font-black text-white leading-none tracking-[0.1em] text-left">
                            UXBRAS<span className="text-[12px] font-normal align-top ml-0.5 tracking-normal">®</span>
                        </p>
                    </div>
                </div>
            </aside>

            {/* MAIN */}
            <main className="flex-1 flex flex-col bg-[#D3D3D3] text-black min-h-screen lg:h-screen lg:overflow-hidden relative">
                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 lg:p-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-5 lg:w-6 h-5 lg:h-6 text-[#1A3351]" />
                            <div>
                                <h1 className="text-lg lg:text-xl font-black uppercase tracking-tighter leading-none text-[#1A3351]">
                                    SESMT <span className="text-blue-700">Analytics</span>
                                </h1>
                                <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mt-1">
                                    Business Intelligence
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrintReport}
                                className="hidden md:flex items-center justify-center gap-2 px-6 h-10 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Relatório
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

                    {/* FILTROS */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        <select
                            value={filterSecretaria}
                            onChange={(e) => setFilterSecretaria(e.target.value)}
                            className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#888] shadow-inner text-[10px] font-black uppercase outline-none cursor-pointer focus:border-[#1A3351] max-w-[250px]"
                        >
                            <option value="all">TODAS SECRETARIAS</option>
                            {uniqueSecretarias.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#888] shadow-inner text-[10px] font-black uppercase outline-none cursor-pointer focus:border-[#1A3351]"
                        >
                            <option value="all">TODOS DOCUMENTOS</option>
                            <option value="ASO">ASO</option>
                            <option value="Encaminhamento">Encaminhamento</option>
                        </select>

                        <div className="relative flex-1 lg:flex-none lg:min-w-[180px]">
                            <button
                                onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                                className={`w-full bg-[#E8E8E8] border border-[#888] shadow-inner px-4 py-2.5 lg:py-2 text-[10px] font-black uppercase flex items-center justify-between gap-2 rounded-lg lg:rounded-none ${startDate || endDate ? "text-blue-700" : ""
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" /> PERÍODO
                                </span>
                                <Filter className="w-3.5 h-3.5" />
                            </button>

                            {isDateFilterOpen && (
                                <div className="absolute top-11 left-0 bg-white shadow-2xl rounded-xl p-4 border border-[#888] w-64 z-[100] text-black">
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase">
                                            Selecione o Intervalo
                                        </p>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full p-2 bg-slate-50 border rounded text-[10px] font-bold outline-none"
                                        />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full p-2 bg-slate-50 border rounded text-[10px] font-bold outline-none"
                                        />
                                        <button
                                            onClick={() => setIsDateFilterOpen(false)}
                                            className="w-full py-2 bg-[#1A3351] text-white text-[10px] font-black rounded uppercase"
                                        >
                                            Aplicar Filtro
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {(filterSecretaria !== "all" || filterType !== "all" || startDate || endDate) && (
                            <button
                                onClick={() => {
                                    setFilterSecretaria("all");
                                    setFilterType("all");
                                    setStartDate("");
                                    setEndDate("");
                                }}
                                className="bg-[#E31E24] text-white px-4 py-2 text-[10px] font-black uppercase shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <X className="w-3 h-3" /> Zerar Filtros
                            </button>
                        )}
                    </div>
                </section>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* BIG NUMBERS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
                        <div className="bg-white p-3 lg:p-4 border-l-4 border-blue-600 shadow-md flex items-center justify-between rounded-lg lg:rounded-none">
                            <div>
                                <p className="text-[8px] lg:text-[10px] font-black text-black/40 uppercase tracking-widest leading-tight">
                                    Documentos
                                </p>
                                <h3 className="text-xl lg:text-2xl font-black text-[#1A3351] leading-none mt-1">
                                    {filteredHistory.length}
                                </h3>
                            </div>
                            <ClipboardList className="w-4 h-4 text-blue-100 hidden sm:block" />
                        </div>

                        <div className="bg-white p-3 lg:p-4 border-l-4 border-[#1A3351] shadow-md flex items-center justify-between rounded-lg lg:rounded-none">
                            <div>
                                <p className="text-[8px] lg:text-[10px] font-black text-black/40 uppercase tracking-widest leading-tight">
                                    ASOs
                                </p>
                                <h3 className="text-xl lg:text-2xl font-black text-[#1A3351] leading-none mt-1">
                                    {filteredHistory.filter((h) => h.aso_type?.toLowerCase?.().includes("aso")).length}
                                </h3>
                            </div>
                            <HistoryIcon className="w-4 h-4 text-slate-200 hidden sm:block" />
                        </div>

                        <div className="bg-white p-3 lg:p-4 border-l-4 border-[#E31E24] shadow-md flex items-center justify-between rounded-lg lg:rounded-none">
                            <div>
                                <p className="text-[8px] lg:text-[10px] font-black text-black/40 uppercase tracking-widest leading-tight">
                                    Encaminhamentos
                                </p>
                                <h3 className="text-xl lg:text-2xl font-black text-[#E31E24] leading-none mt-1">
                                    {
                                        filteredHistory.filter((h) =>
                                            h.aso_type?.toLowerCase?.().includes("encaminhamento")
                                        ).length
                                    }
                                </h3>
                            </div>
                            <FileSearch className="w-4 h-4 text-red-100 hidden sm:block" />
                        </div>

                        <div className="bg-white p-3 lg:p-4 border-l-4 border-emerald-500 shadow-md flex items-center justify-between rounded-lg lg:rounded-none">
                            <div>
                                <p className="text-[8px] lg:text-[10px] font-black text-black/40 uppercase tracking-widest leading-tight">
                                    Secretarias
                                </p>
                                <h3 className="text-xl lg:text-2xl font-black text-emerald-600 leading-none mt-1">
                                    {new Set(filteredHistory.map((h) => h.secretaria)).size}
                                </h3>
                            </div>
                            <Building2 className="w-4 h-4 text-emerald-100 hidden sm:block" />
                        </div>
                    </div>

                    {/* GRID DE GRÁFICOS (Ranking maior / Tipo menor) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* VOLUME */}
                        <div className="bg-white p-4 shadow-md border border-black/5 rounded lg:col-span-4">
                            <h4 className="text-[10px] font-black uppercase tracking-tight text-[#1A3351] mb-4 flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5" /> Volume por Período
                            </h4>
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.byDate}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 8, fontWeight: 700, fill: "#888" }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 8, fontWeight: 700, fill: "#888" }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: "8px",
                                                border: "none",
                                                fontSize: "10px",
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorTotal)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* TIPO (menor) */}
                        <div className="bg-white p-4 shadow-md border border-black/5 rounded lg:col-span-3">
                            <h4 className="text-[10px] font-black uppercase tracking-tight text-[#1A3351] mb-4 flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5" /> Tipo de Documento
                            </h4>

                            <div className="h-[220px] w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.byType}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={44}
                                            outerRadius={72}
                                            paddingAngle={6}
                                            dataKey="value"
                                        >
                                            {chartData.byType.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                            {/* ✅ Mostra a numeração (quantidade) em cada fatia */}
                                            <LabelList
                                                dataKey="value"
                                                position="outside"
                                                style={{ fontSize: "10px", fontWeight: 900, fill: "#1A3351" }}
                                            />
                                        </Pie>
                                        {/* ✅ Tooltip mais claro */}
                                        <Tooltip formatter={(value: any) => [`${value}`, "Quantidade"]} />
                                        <Legend
                                            verticalAlign="bottom"
                                            align="center"
                                            iconSize={8}
                                            wrapperStyle={{
                                                fontSize: "8px",
                                                fontWeight: "bold",
                                                textTransform: "uppercase",
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>

                                <div className="absolute top-[40%] left-1/2 -translate-x-1/2 flex flex-col items-center">
                                    <span className="text-xl font-black text-[#1A3351]">{filteredHistory.length}</span>
                                    <span className="text-[7px] font-black text-black/30 uppercase leading-none text-center">
                                        Registros
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* RANKING (maior e corrigido) */}
                        <div className="bg-white p-4 shadow-md border border-black/5 rounded lg:col-span-5">
                            <h4 className="text-[10px] font-black uppercase tracking-tight text-[#1A3351] mb-4 flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5" /> Ranking Secretarias
                            </h4>

                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData.bySecretaria}
                                        layout="vertical"
                                        margin={{ top: 8, right: 36, left: 6, bottom: 8 }}
                                        barCategoryGap={10}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#eee" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            width={140}
                                            interval={0}
                                            tick={<SecretariaTick />}
                                        />
                                        <Tooltip cursor={{ fill: "#f0f0f0" }} />
                                        <Bar dataKey="total" radius={[0, 0, 0, 0]} barSize={16}>
                                            {chartData.bySecretaria.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                            <LabelList
                                                dataKey="total"
                                                position="right"
                                                style={{ fontSize: "10px", fontWeight: 900, fill: "#1A3351" }}
                                                offset={10}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <footer className="text-center py-6">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-black/20">
                            Powered by UXBRAS® — Executive Intelligence System
                        </p>
                    </footer>
                </div>
            </main>
        </div >
    );
}
