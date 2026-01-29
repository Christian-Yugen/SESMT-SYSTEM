"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, ChevronUp, Briefcase, Building2, History as HistoryIcon,
    BarChart3, User, Calendar, ClipboardList, Search, Filter, Printer, Users as UsersIcon
} from "lucide-react";
import Image from "next/image";
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

    // Estatísticas
    const stats = useMemo(() => {
        const total = history.length;
        const asos = history.filter(h => h.aso_type.toLowerCase().includes('aso')).length;
        const encs = history.filter(h => h.aso_type.toLowerCase().includes('encaminhamento')).length;
        const uniqueUsers = new Set(history.map(h => h.generated_by)).size;
        return { total, asos, encs, uniqueUsers };
    }, [history]);

    const uniqueUsersList = useMemo(() => Array.from(new Set(history.map(h => h.generated_by))), [history]);

    const filteredHistory = history.filter(entry => {
        const matchesSearch = entry.servidor_nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUser = filterUser === "all" || entry.generated_by === filterUser;
        const entryType = entry.aso_type.toLowerCase().includes('aso') ? 'ASO' : (entry.aso_type.toLowerCase().includes('encaminhamento') ? 'Encaminhamento' : 'Outros');
        const matchesType = filterType === "all" || entryType === filterType;

        // Filtro de Data
        const entryDate = new Date(entry.generated_at).toISOString().split('T')[0];
        const matchesStartDate = !startDate || entryDate >= startDate;
        const matchesEndDate = !endDate || entryDate <= endDate;

        return matchesSearch && matchesUser && matchesType && matchesStartDate && matchesEndDate;
    });

    // Função para gerar relatório de impressão (SEM CPF POR PRIVACIDADE)
    const handlePrintReport = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const userName = session?.user?.email?.split('@')[0].toUpperCase() || "SISTEMA";

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const today = new Date().toLocaleDateString('pt-BR');
        const rows = filteredHistory.map(entry => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-transform: uppercase; font-size: 10px;">${new Date(entry.generated_at).toLocaleString('pt-BR')}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-transform: uppercase; font-size: 10px;">${entry.servidor_nome}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-transform: uppercase; font-size: 10px;">${entry.aso_type}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-transform: uppercase; font-size: 10px;">${entry.cargo || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-transform: uppercase; font-size: 10px;">${entry.secretaria || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-transform: uppercase; font-size: 10px;">${entry.ghe_conj || '-'}</td>
      </tr>
    `).join('');

        printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Gerencial SESMT - ${today}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.4; }
            .official-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #E31E24; padding-bottom: 15px; margin-bottom: 25px; }
            .logo-area img { height: 60px; object-fit: contain; }
            .report-title-area { text-align: right; }
            .report-title-area h1 { margin: 0; font-size: 16px; color: #1A3351; text-transform: uppercase; font-weight: 900; }
            .report-info { font-size: 9px; color: #666; font-weight: bold; text-transform: uppercase; margin-top: 5px; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #1A3351; color: white; border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 9px; text-transform: uppercase; }
            td { border: 1px solid #ddd; padding: 8px; text-transform: uppercase; font-size: 9px; }
            
            .footer { margin-top: 30px; font-size: 9px; text-align: center; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
            .lgpd-box { background: #f9f9f9; border: 1px solid #eee; padding: 12px; margin-top: 25px; border-radius: 4px; }
            .lgpd-title { font-size: 9px; font-weight: 800; color: #1A3351; text-transform: uppercase; margin-bottom: 4px; display: block; }
            .lgpd-text { font-size: 8px; color: #777; text-align: justify; margin: 0; }
          </style>
        </head>
        <body>
          <div class="official-header">
            <div class="logo-area">
              <img src="/images/logo.png" alt="Prefeitura Três Lagoas" />
            </div>
            <div class="report-title-area">
              <h1>Relatório de Emissões Operacionais</h1>
              <div class="report-info">
                Responsável: ${userName} | Emissão: ${today}
              </div>
              <div class="report-info" style="color: #E31E24;">
                Período: ${startDate || 'Início'} até ${endDate || 'Hoje'}
              </div>
            </div>
          </div>
          
          <div style="font-size: 9px; font-weight: bold; margin-bottom: 10px; color: #1A3351; text-transform: uppercase;">
            Total de registros localizados: ${filteredHistory.length}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Data/Hora</th>
                <th style="width: 25%;">Nome do Servidor</th>
                <th style="width: 15%;">Tipo</th>
                <th style="width: 15%;">Cargo</th>
                <th style="width: 15%;">Secretaria</th>
                <th style="width: 15%;">GHE</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          
          <div class="lgpd-box">
            <span class="lgpd-title">Observação sobre Proteção de Dados (LGPD)</span>
            <p class="lgpd-text">
                Este relatório foi gerado em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). 
                As informações contidas neste documento destinam-se exclusivamente para fins de gestão operacional do SESMT. 
                É vedado o compartilhamento destes dados com terceiros não autorizados. A reprodução, manipulação ou uso indevido 
                destas informações sujeitará o infrator às sanções administrativas e legais previstas na legislação vigente.
            </p>
          </div>

          <div class="footer">Documento gerado eletronicamente por ${userName} via SESMT SYSTEM - Powered by UXBRAS®</div>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();
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
                    <button onClick={() => router.push('/history')} className="w-full flex items-center gap-2 p-3 rounded-lg bg-white/10 text-white font-black text-[11px] uppercase tracking-tight shadow-sm border border-white/5">
                        <HistoryIcon className="w-4 h-4" />
                        <span>Histórico</span>
                    </button>
                    {userRole === 'admin' && (
                        <button onClick={() => router.push('/users')} className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight">
                            <UsersIcon className="w-4 h-4" />
                            <span>Usuários</span>
                        </button>
                    )}
                    <button className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight">
                        <HeartPulse className="w-4 h-4" />
                        <span>Benefícios</span>
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

                {/* HEADER COM DASHBOARD E FILTROS DE DATA */}
                <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-6 h-6 text-[#1A3351]" />
                            <h2 className="text-xl font-black leading-none uppercase tracking-tight">Dashboard de Histórico</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            {(userRole === 'admin' || userRole === 'nurse') && (
                                <button
                                    onClick={handlePrintReport}
                                    className="hidden md:flex items-center justify-center gap-2 w-64 h-10 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
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
                            {(searchTerm || filterUser !== "all" || filterType !== "all" || startDate || endDate) && (
                                <button
                                    onClick={() => { setSearchTerm(""); setFilterUser("all"); setFilterType("all"); setStartDate(""); setEndDate(""); }}
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
                                        className="px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`p-2 rounded ${expandedId === entry.id ? 'bg-[#E31E24] text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                <ClipboardList className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-black uppercase text-base text-[#1A3351] leading-tight">{entry.servidor_nome}</h4>
                                                <div className="flex gap-4 text-[10px] font-bold text-slate-500 uppercase">
                                                    <span className="text-[#E31E24]">{entry.aso_type}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 shrink-0 md:text-right">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase">Data de Registro</span>
                                                <span className="text-xs font-bold text-slate-700">{new Date(entry.generated_at).toLocaleString('pt-BR')}</span>
                                            </div>
                                            {expandedId === entry.id ? <ChevronUp className="w-5 h-5 text-[#E31E24]" /> : <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-slate-500" />}
                                        </div>
                                    </div>

                                    {/* Detalhes Expandidos */}
                                    {expandedId === entry.id && (
                                        <div className="px-6 pb-6 pt-2 bg-slate-50/80 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1">Cargo</span>
                                                    <p className="text-sm font-bold text-slate-700 uppercase">{entry.cargo || "Não registrado"}</p>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1">Secretaria</span>
                                                    <p className="text-sm font-bold text-slate-700 uppercase">{entry.secretaria || "Não registrado"}</p>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1">GHE CONJ</span>
                                                    <p className="text-sm font-bold text-slate-700 uppercase">{entry.ghe_conj || "Não registrado"}</p>
                                                </div>
                                            </div>
                                            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-widest">
                                                <span>Responsável: {entry.operator_name || operatorsMap[entry.generated_by] || entry.generated_by}</span>
                                                <span>Ref: #{entry.id}</span>
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
