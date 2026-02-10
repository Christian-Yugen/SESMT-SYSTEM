"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, ChevronUp, Briefcase, Building2, History as HistoryIcon,
    BarChart3, User, Calendar, ClipboardList, Search, Filter, Printer, Users as UsersIcon, TrendingUp
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface HistoryEntry {
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
}

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    // Filtros
    const [filterUser, setFilterUser] = useState("all");
    const [filterType, setFilterType] = useState("all");
    const [filterSecretaria, setFilterSecretaria] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
                    if (data) setUserRole(data.role);
                });
            }
            loadHistory();
        };
        checkAuth();
    }, [router]);

    const [operatorsMap, setOperatorsMap] = useState<Record<string, string>>({});

    async function loadHistory() {
        setLoading(true);

        // Carrega o histórico
        const { data: histData, error: histError } = await supabase
            .from('aso_history')
            .select('*')
            .order('generated_at', { ascending: false });

        if (!histError && histData) {
            setHistory(histData);
        }

        // Tenta carregar mapeamento de perfis para mostrar e-mails em vez de IDs
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



    const uniqueUsersList = useMemo(() => Array.from(new Set(history.map(h => h.generated_by))), [history]);
    const uniqueSecretarias = useMemo(() => Array.from(new Set(history.map(h => h.secretaria).filter(Boolean))).sort() as string[], [history]);

    const filteredHistory = history.filter(entry => {
        const matchesSearch = entry.servidor_nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUser = filterUser === "all" || entry.generated_by === filterUser;
        const matchesSecretaria = filterSecretaria === "all" || entry.secretaria === filterSecretaria;
        const entryType = entry.aso_type.toLowerCase().includes('aso') ? 'ASO' : (entry.aso_type.toLowerCase().includes('encaminhamento') ? 'Encaminhamento' : 'Outros');
        const matchesType = filterType === "all" || entryType === filterType;

        // Filtro de Data
        const entryDate = new Date(entry.generated_at).toISOString().split('T')[0];
        const matchesStartDate = !startDate || entryDate >= startDate;
        const matchesEndDate = !endDate || entryDate <= endDate;

        return matchesSearch && matchesUser && matchesType && matchesSecretaria && matchesStartDate && matchesEndDate;
    });

    // Estatísticas Dinâmicas (Baseadas no Histórico Filtrado)
    const stats = useMemo(() => {
        const total = filteredHistory.length;
        const asos = filteredHistory.filter(h => h.aso_type.toLowerCase().includes('aso')).length;
        const encs = filteredHistory.filter(h => h.aso_type.toLowerCase().includes('encaminhamento')).length;
        const uniqueUsers = new Set(filteredHistory.map(h => h.generated_by)).size;
        return { total, asos, encs, uniqueUsers };
    }, [filteredHistory]);

    // Função para gerar relatório de impressão (SEM CPF POR PRIVACIDADE)
    const handlePrintReport = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const userName = session?.user?.email?.split('@')[0].toUpperCase() || "SISTEMA";

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const today = new Date().toLocaleDateString('pt-BR');
        // Lógica para legenda dinâmica baseada no conteúdo do relatório
        const usedTypesSet = new Set<string>();
        filteredHistory.forEach(h => {
            const t = (h.aso_type || "").toUpperCase();
            const prefix = t.includes("ENCAMINHAMENTO") ? "ENC" : "ASO";
            let suffix = "";
            if (t.includes("ADMISS")) suffix = "ADM";
            else if (t.includes("DEMISS")) suffix = "DEM";
            else if (t.includes("RETORNO")) suffix = "RET";
            else if (t.includes("MUDANÇA")) suffix = "MUD";
            else if (t.includes("PERIÓDIC")) suffix = "PER";
            if (suffix) usedTypesSet.add(`${prefix}|${suffix}`);
        });

        const dynamicLegendHTML = Array.from(usedTypesSet).sort().map(key => {
            const [pref, suff] = key.split('|');
            const fullPref = pref === "ENC" ? "ENCAMINHAMENTO" : "ASO";
            let fullSuff = "";
            if (suff === "ADM") fullSuff = "ADMISSIONAL";
            else if (suff === "DEM") fullSuff = "DEMISSIONAL";
            else if (suff === "RET") fullSuff = "RETORNO AO TRABALHO";
            else if (suff === "MUD") fullSuff = "MUDANÇA DE FUNÇÃO";
            else if (suff === "PER") fullSuff = "PERIÓDICO";
            return `<div class="legend-item"><span>${pref} ${suff}:</span> ${fullPref} ${fullSuff}</div>`;
        }).join('');

        const abbreviateType = (type: string) => {
            const t = (type || "").toUpperCase();
            const prefix = t.includes("ENCAMINHAMENTO") ? "ENC" : "ASO";
            if (t.includes("ADMISS")) return `${prefix} ADM`;
            if (t.includes("DEMISS")) return `${prefix} DEM`;
            if (t.includes("RETORNO")) return `${prefix} RET`;
            if (t.includes("MUDANÇA")) return `${prefix} MUD`;
            if (t.includes("PERIÓDIC")) return `${prefix} PER`;
            return t.length > 10 ? t.substring(0, 10) + "..." : t;
        };

        const rows = filteredHistory.map(entry => {
            const fullDate = new Date(entry.generated_at).toLocaleString('pt-BR');
            const [date, time] = fullDate.split(' ');
            const timeShort = time ? time.substring(0, 5) : "";

            return `
              <tr>
                <td class="datetime-cell">
                    <span class="date-part">${date}</span>
                    <span class="time-part">${timeShort}</span>
                </td>
                <td>${entry.servidor_nome}</td>
                <td style="color: #1A3351; text-align: center;">${abbreviateType(entry.aso_type)}</td>
                <td>${entry.cargo || '-'}</td>
                <td>${entry.secretaria || '-'}</td>
              </tr>
            `;
        }).join('');

        const logoUrl = window.location.origin + "/images/logo.png";

        const formatFilterDate = (dateStr: string) => {
            if (!dateStr) return null;
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        };

        const displayStartDate = formatFilterDate(startDate) || 'INÍCIO';
        const displayEndDate = formatFilterDate(endDate) || 'HOJE';

        printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Gerencial SESMT - ${today}</title>
          <style>
            body { font-family: sans-serif; padding: 15px; color: #333; line-height: 1.0; }
            .official-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E31E24; padding-bottom: 8px; margin-bottom: 12px; }
            .logo-area img { height: 35px; width: auto; }
            .report-title-area { text-align: right; }
            .report-title-area h1 { margin: 0; font-size: 13px; color: #1A3351; text-transform: uppercase; font-weight: 900; }
            .report-info { font-size: 7.5px; color: #666; font-weight: bold; text-transform: uppercase; margin-top: 1px; }
            
            .legend-bar { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 6px; color: #888; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; background: #f8f8f8; padding: 3px 6px; border-radius: 2px; border: 1px solid #f0f0f0; }
            .legend-item { display: flex; gap: 3px; }

            table { width: 100%; border-collapse: collapse; margin-top: 3px; table-layout: fixed; }
            th { background-color: #1A3351; color: white; border: 1px solid #ccc; padding: 4px; text-align: left; font-size: 7.5px; text-transform: uppercase; }
            td { border: 1px solid #eee; padding: 2px 4px; text-transform: uppercase; font-size: 7.5px; word-wrap: break-word; color: #444; vertical-align: middle; }
            
            .datetime-cell { text-align: center; line-height: 1.0; }
            .date-part { display: block; }
            .time-part { display: block; font-size: 7.5px; color: #777; }

            /* Estilos específicos para modo Paisagem (Landscape) */
            @media print and (orientation: landscape) {
                body { padding: 8px; }
                .date-part, .time-part { display: inline; font-size: 7.5px; color: inherit; }
                .date-part::after { content: " "; }
                td, th { padding: 1.5px 4px; }
                .official-header { margin-bottom: 5px; padding-bottom: 4px; }
                .legend-bar { margin-bottom: 4px; }
            }

            .stats-bar { font-size: 8px; font-weight: 900; margin-bottom: 5px; color: #1A3351; text-transform: uppercase; border-left: 3px solid #E31E24; padding-left: 8px; }
            .footer { margin-top: 20px; font-size: 7px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
            .lgpd-box { background: #fcfcfc; border: 1px solid #e0e0e0; padding: 10px; margin-top: 15px; border-radius: 2px; }
            .lgpd-title { font-size: 8px; font-weight: 900; color: #1A3351; text-transform: uppercase; margin-bottom: 4px; display: block; }
            .lgpd-text { font-size: 8px; color: #333; text-align: justify; margin: 0; line-height: 1.4; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="official-header">
            <div class="logo-area">
              <img src="${logoUrl}" alt="Logo" />
            </div>
            <div class="report-title-area">
              <h1>Relatório de Emissões Operacionais</h1>
              <div class="report-info">
                Operador: ${userName} | Data: ${today}
              </div>
              <div class="report-info" style="color: #E31E24;">
                FILTRO: ${displayStartDate} À ${displayEndDate}
              </div>
            </div>
          </div>
          
          <div class="stats-bar">
            Total de registros: ${filteredHistory.length}
          </div>

          ${dynamicLegendHTML ? `<div class="legend-bar">LEGENDA: ${dynamicLegendHTML}</div>` : ''}

          <table>
            <thead>
              <tr>
                <th style="width: 9%; text-align: center;">Data/Hora</th>
                <th style="width: 30%;">Nome do Servidor</th>
                <th style="width: 7%; text-align: center;">Tipo</th>
                <th style="width: 27%;">Cargo</th>
                <th style="width: 27%;">Secretaria</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          
          <div class="lgpd-box">
            <span class="lgpd-title">🛡️ IMPORTANTE: Privacidade e Proteção de Dados (LGPD)</span>
            <p class="lgpd-text">
                Este relatório atende à Lei nº 13.709/2018 (LGPD). Uso exclusivo para gestão operacional do SESMT. 
                Proibido compartilhamento com terceiros. O uso indevido sujeita o infrator às sanções administrativas e legais previstas na legislação vigente.
            </p>
          </div>

          <div class="footer">Gerado via SESMT SYSTEM - Powered by UXBRAS®</div>
        </body>
      </html>
    `);
        printWindow.document.close();

        // Esperar as imagens carregarem antes de abrir a caixa de impressão
        setTimeout(() => {
            printWindow.print();
        }, 500);

    };

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
                <p className="text-[#1A3351] uppercase tracking-[0.3em] font-black text-xs">Atualizando Painel...</p>
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
                    <div className="w-full h-16 mt-2 mb-4 flex items-center justify-center">
                        <img src="/images/logo_white.png" alt="SESMT" className="h-14 w-auto object-contain" />
                    </div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] -mt-2">SESMT SYSTEM</p>
                </div>

                <nav className="flex-1 space-y-1">
                    <button onClick={() => router.push('/')} className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>ASO</span>
                    </button>

                    {/* BENEFÍCIOS COM SUBMENU CONSOLIDADO */}
                    <div className="group">
                        <button className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight">
                            <HeartPulse className="w-4 h-4" />
                            <span>Benefícios</span>
                        </button>

                        <button className="hidden group-hover:flex w-full items-center gap-2 p-2 pl-9 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[9px] uppercase tracking-tight whitespace-nowrap">
                            <Database className="w-3.5 h-3.5 shrink-0" />
                            <span>Auxílio Doença</span>
                        </button>

                        <button className="hidden group-hover:flex w-full items-center gap-2 p-2 pl-9 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[9px] uppercase tracking-tight whitespace-nowrap">
                            <FileSearch className="w-3.5 h-3.5 shrink-0" />
                            <span>Readaptação</span>
                        </button>

                        <button className="hidden group-hover:flex w-full items-center gap-2 p-2 pl-9 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[9px] uppercase tracking-tight whitespace-nowrap">
                            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                            <span>Abono Salarial</span>
                        </button>

                        <button className="hidden group-hover:flex w-full items-center gap-2 p-2 pl-9 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[9px] uppercase tracking-tight whitespace-nowrap">
                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                            <span>Redução de Jornada</span>
                        </button>
                    </div>
                    <div className="group">
                        <button onClick={() => router.push('/history')} className="w-full flex items-center gap-2 p-3 rounded-lg bg-white/10 text-white font-black text-[11px] uppercase tracking-tight shadow-sm border border-white/5">
                            <HistoryIcon className="w-4 h-4" />
                            <span>Histórico</span>
                        </button>

                        {/* Submenu Indicadores - Aparece no Hover do group */}
                        <button
                            onClick={() => router.push('/analytics')}
                            className="hidden group-hover:flex w-full items-center gap-2 p-2 pl-9 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[9px] uppercase tracking-tight whitespace-nowrap"
                        >
                            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                            <span>Indicadores</span>
                        </button>
                    </div>

                    {userRole === 'admin' && (
                        <button onClick={() => router.push('/users')} className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight">
                            <UsersIcon className="w-4 h-4" />
                            <span>Usuários</span>
                        </button>
                    )}
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

                {/* HEADER COM DASHBOARD E FILTROS DE DATA */}
                <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-6 h-6 text-[#1A3351]" />
                            <h2 className="text-xl font-black leading-none uppercase tracking-tight">Dashboard de Histórico</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/analytics')}
                                className="hidden md:flex items-center justify-center gap-2 w-48 h-10 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                Indicadores BI
                            </button>
                            {(userRole === 'admin' || userRole === 'nurse') && (
                                <button
                                    onClick={handlePrintReport}
                                    className="hidden md:flex items-center justify-center gap-2 w-52 h-10 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Gerar Relatório (PDF)
                                </button>
                            )}
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
                                    placeholder="BUSCAR POR NOME DO SERVIDOR..."
                                    className="w-full px-10 py-2 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* FILTRO DE DATA COMPACTO (POPOVER) */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                                    className={`
                                        flex items-center justify-center gap-2 w-64 h-10 bg-[#E8E8E8] border border-[#888] shadow-inner font-black text-[10px] uppercase transition-all whitespace-nowrap
                                        ${(startDate || endDate) ? 'text-[#E31E24] border-[#E31E24]' : 'text-slate-500'}
                                    `}
                                >
                                    <Calendar className="w-4 h-4" />
                                    <span>{(startDate || endDate) ? `${startDate || '...'} → ${endDate || '...'}` : 'Filtrar por Período'}</span>
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
                                                <span className="text-[9px] font-black text-slate-400 uppercase">Data Inicial (Início)</span>
                                                <input
                                                    type="date"
                                                    className="w-full bg-[#f8f8f8] border border-slate-200 px-3 py-2 text-xs font-bold uppercase outline-none focus:border-[#E31E24] rounded"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase">Data Final (Fim)</span>
                                                <input
                                                    type="date"
                                                    className="w-full bg-[#f8f8f8] border border-slate-200 px-3 py-2 text-xs font-bold uppercase outline-none focus:border-[#E31E24] rounded"
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
                                                    className="flex-[2] py-2 bg-[#1A3351] text-white text-[9px] font-black uppercase hover:brightness-110 rounded shadow-md"
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
                                        {history.find(h => h.generated_by === uid)?.operator_name || operatorsMap[uid] || `ID: ${uid.substring(0, 8)}`}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#888] text-[10px] font-black uppercase outline-none focus:border-[#1A3351]"
                            >
                                <option value="all">TODOS DOCUMENTOS</option>
                                <option value="ASO">ASOs</option>
                                <option value="Encaminhamento">ENCAMINHAMENTOS</option>
                            </select>

                            <select
                                value={filterSecretaria}
                                onChange={(e) => setFilterSecretaria(e.target.value)}
                                className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#888] text-[10px] font-black uppercase outline-none focus:border-[#1A3351] max-w-[200px]"
                            >
                                <option value="all">TODAS SECRETARIAS</option>
                                {uniqueSecretarias.map(sec => (
                                    <option key={sec} value={sec}>{sec}</option>
                                ))}
                            </select>

                            {(searchTerm || filterUser !== "all" || filterType !== "all" || filterSecretaria !== "all" || startDate || endDate) && (
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        setFilterUser("all");
                                        setFilterType("all");
                                        setFilterSecretaria("all");
                                        setStartDate("");
                                        setEndDate("");
                                    }}
                                    className="px-4 py-2 bg-[#E31E24] text-white text-[10px] font-black uppercase rounded shadow-sm hover:brightness-110 active:scale-95 transition-all"
                                >
                                    Zerar Filtros
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* CONTEÚDO SCROLLÁVEL */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">

                    {/* STATS CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 border-b-4 border-[#1A3351] shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</p>
                            <h3 className="text-3xl font-black text-[#1A3351]">{stats.total} <span className="text-xs font-normal">items</span></h3>
                        </div>
                        <div className="bg-white p-6 border-b-4 border-[#E31E24] shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ASOs Emitidos</p>
                            <h3 className="text-3xl font-black text-[#1A3351]">{stats.asos}</h3>
                        </div>
                        <div className="bg-white p-6 border-b-4 border-blue-500 shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encaminhamentos</p>
                            <h3 className="text-3xl font-black text-[#1A3351]">{stats.encs}</h3>
                        </div>
                        <div className="bg-white p-6 border-b-4 border-slate-300 shadow-md flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuários Ativos</p>
                            <h3 className="text-3xl font-black text-[#1A3351]">{stats.uniqueUsers}</h3>
                        </div>
                    </div>

                    {/* LISTA DE REGISTROS */}
                    <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden">
                        <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest">Log de Processamento Geral</h3>
                            <div className="text-[9px] font-black text-slate-600 uppercase">Mostrando {filteredHistory.length} resultados</div>
                        </div>
                        <div className="divide-y divide-slate-200">
                            {filteredHistory.length > 0 ? filteredHistory.map((entry) => (
                                <div key={entry.id} className="group">
                                    <div
                                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                        className={`px-6 py-2.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 cursor-pointer transition-all border-l-4 ${expandedId === entry.id ? 'bg-[#1A3351]/5 border-[#1A3351]' : 'border-transparent'}`}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`p-1.5 rounded transition-colors ${expandedId === entry.id ? 'bg-[#1A3351] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <ClipboardList className={`${expandedId === entry.id ? 'w-5 h-5' : 'w-4 h-4'}`} />
                                            </div>
                                            <div className="flex items-baseline gap-3 transition-all duration-300">
                                                <h4 className={`font-black uppercase text-[#1A3351] leading-tight transition-all duration-300 ${expandedId === entry.id ? 'text-lg' : 'text-sm'}`}>
                                                    {entry.servidor_nome}
                                                </h4>
                                                {expandedId === entry.id && (
                                                    <span className="bg-[#1A3351] text-white px-2 py-0.5 rounded text-[10px] font-black tracking-widest shrink-0">
                                                        REF: #{entry.id}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`flex gap-4 font-bold uppercase transition-all duration-300 ${expandedId === entry.id ? 'text-xs mt-1' : 'text-[9px]'}`}>
                                                <span className="text-[#E31E24]">{entry.aso_type}</span>
                                                {expandedId !== entry.id && <span className="text-slate-500 font-black">#{entry.id}</span>}
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-6 shrink-0 md:text-right transition-all ${expandedId === entry.id ? 'opacity-100' : 'opacity-80'}`}>
                                            <div className="flex flex-col">
                                                <span className={`font-black text-slate-400 uppercase transition-all ${expandedId === entry.id ? 'text-[10px]' : 'text-[8px]'}`}>Registro</span>
                                                <span className={`font-bold text-slate-700 transition-all ${expandedId === entry.id ? 'text-sm' : 'text-[10px]'}`}>
                                                    {new Date(entry.generated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {expandedId === entry.id ? <ChevronUp className="w-5 h-5 text-[#1A3351]" /> : <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />}
                                        </div>
                                    </div>

                                    {/* Detalhes Expandidos */}
                                    {expandedId === entry.id && (
                                        <div className="px-6 pb-6 pt-2 bg-[#1A3351]/5 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-2">
                                                <div className="md:col-span-4 flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1">Cargo</span>
                                                    <p className="text-[13px] font-black text-[#1A3351] uppercase truncate" title={entry.cargo}>{entry.cargo || "Não registrado"}</p>
                                                </div>
                                                <div className="md:col-span-5 flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1">Secretaria</span>
                                                    <p className="text-[13px] font-black text-[#1A3351] uppercase truncate whitespace-nowrap" title={entry.secretaria}>{entry.secretaria || "Não registrado"}</p>
                                                </div>
                                                <div className="md:col-span-3 flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1 text-right">GHE CONJ</span>
                                                    <p className="text-[11px] font-black text-slate-500 uppercase text-right leading-tight">{entry.ghe_conj || "---"}</p>
                                                </div>
                                            </div>
                                            <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between items-center uppercase tracking-widest">
                                                <span className="text-[10px] font-black text-[#1A3351]">
                                                    <span className="text-slate-400 font-bold mr-1">Operador Responsável:</span>
                                                    {entry.operator_name || operatorsMap[entry.generated_by] || entry.generated_by}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400">Log ID: {entry.id}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="py-20 text-center text-slate-400 uppercase font-black text-xs italic tracking-widest">Nenhum registro encontrado para o período/filtro selecionado</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#B0B0B0] p-4 text-center border-2 border-slate-300 shadow-md">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">Powered by UXBRAS® — Gestão Estratégica SESMT</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
