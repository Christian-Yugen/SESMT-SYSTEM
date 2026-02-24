"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, ChevronUp, Briefcase, Building2, History as HistoryIcon,
    BarChart3, User, Calendar, ClipboardList, Search, Filter, Printer, Users as UsersIcon, TrendingUp, FolderOpen, Trash2, AlertCircle
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
    deletion_pending?: boolean;
}

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Estados para o modal de exclusão
    const [showDeletionModal, setShowDeletionModal] = useState(false);
    const [selectedEntryForDeletion, setSelectedEntryForDeletion] = useState<HistoryEntry | null>(null);
    const [deletionReason, setDeletionReason] = useState("");
    const [processingDeletion, setProcessingDeletion] = useState(false);

    // Filtros
    const [filterUser, setFilterUser] = useState("all");
    const [filterType, setFilterType] = useState("all");
    const [filterSecretaria, setFilterSecretaria] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [filterAsoSubtype, setFilterAsoSubtype] = useState("all");
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
                    setCurrentUserId(session.user.id);
                    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                    if (data) setUserRole(data.role);
                } else {
                    router.push("/login");
                    return;
                }
                loadHistory();
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

    async function loadHistory() {
        setLoading(true);

        // Força o Next.js a atualizar o cache do roteador
        router.refresh();

        // Carrega o histórico com um "cache breaker" manual para evitar cache agressivo em produção (Vercel)
        const cacheBreaker = Date.now();

        const { data: histData, error: histError } = await supabase
            .from('aso_history')
            .select('*')
            .neq('id', -cacheBreaker) // Filtro inútil apenas para mudar a URL da requisição e evitar cache viciado
            .order('generated_at', { ascending: false });

        if (!histError && histData) {
            setHistory(histData);
        } else if (histError) {
            console.error("Erro ao carregar histórico:", histError);
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
        const matchesAsoSubtype = filterAsoSubtype === "all" || (entryType === 'ASO' && entry.aso_type.toUpperCase().includes(filterAsoSubtype.toUpperCase()));

        // Filtro de Data
        const entryDate = new Date(entry.generated_at).toISOString().split('T')[0];
        const matchesStartDate = !startDate || entryDate >= startDate;
        const matchesEndDate = !endDate || entryDate <= endDate;

        return matchesSearch && matchesUser && matchesType && matchesAsoSubtype && matchesSecretaria && matchesStartDate && matchesEndDate;
    });

    // Estatísticas Dinâmicas (Baseadas no Histórico Filtrado)
    const stats = useMemo(() => {
        const total = filteredHistory.length;
        const asos = filteredHistory.filter(h => h.aso_type.toLowerCase().includes('aso')).length;
        const encs = filteredHistory.filter(h => h.aso_type.toLowerCase().includes('encaminhamento')).length;
        const uniqueUsers = new Set(filteredHistory.map(h => h.generated_by)).size;
        return { total, asos, encs, uniqueUsers };
    }, [filteredHistory]);

    // Ordenação Final
    const sortedHistory = useMemo(() => {
        const base = [...filteredHistory];
        if (sortOrder === "alpha") {
            return base.sort((a, b) => (a.servidor_nome || "").localeCompare(b.servidor_nome || "", 'pt-BR'));
        }
        // default: date desc
        return base.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
    }, [filteredHistory, sortOrder]);

    // Funções para exclusão de registros
    const handleRequestDeletion = (entry: HistoryEntry) => {
        setSelectedEntryForDeletion(entry);
        setDeletionReason("");
        setShowDeletionModal(true);
    };

    const confirmDeletionRequest = async () => {
        if (!selectedEntryForDeletion || !currentUserId) return;

        if (!deletionReason.trim()) {
            alert('Por favor, descreva o motivo da exclusão.');
            return;
        }

        if (!confirm('Tem certeza que deseja solicitar a exclusão deste registro? Esta solicitação será enviada para aprovação do administrador.')) {
            return;
        }

        setProcessingDeletion(true);
        try {
            // Obter nome do operador atual
            const { data: profileData } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', currentUserId)
                .single();

            // Criar solicitação de exclusão
            const { error: insertError } = await supabase
                .from('deletion_requests')
                .insert({
                    history_record_id: selectedEntryForDeletion.id,
                    requester_id: currentUserId,
                    requester_name: profileData?.email || 'Desconhecido',
                    deletion_reason: deletionReason.trim(),
                    status: 'pending',
                    original_data: {
                        servidor_cpf: selectedEntryForDeletion.servidor_cpf,
                        servidor_nome: selectedEntryForDeletion.servidor_nome,
                        aso_type: selectedEntryForDeletion.aso_type,
                        cargo: selectedEntryForDeletion.cargo,
                        secretaria: selectedEntryForDeletion.secretaria,
                        generated_at: selectedEntryForDeletion.generated_at
                    }
                });

            if (insertError) {
                console.error('Erro ao criar solicitação:', insertError);
                alert('Erro ao criar solicitação de exclusão: ' + insertError.message);
                setProcessingDeletion(false);
                return;
            }

            // Marcar o registro como pendente de exclusão
            const { error: updateError } = await supabase
                .from('aso_history')
                .update({ deletion_pending: true })
                .eq('id', selectedEntryForDeletion.id);

            if (updateError) {
                console.error('Erro ao atualizar registro:', updateError);
            }

            alert('Solicitação de exclusão enviada com sucesso! Aguarde aprovação do administrador.');
            setShowDeletionModal(false);
            setSelectedEntryForDeletion(null);
            setDeletionReason("");
            loadHistory(); // Recarregar histórico
        } catch (err) {
            console.error('Erro ao solicitar exclusão:', err);
            alert('Erro ao processar solicitação de exclusão.');
        }
        setProcessingDeletion(false);
    };

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

        const rows = sortedHistory.map(entry => {
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

                        <button
                            onClick={() => router.push('/abono')}
                            className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap"
                        >
                            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                            <span>Abono Salarial</span>
                        </button>

                        <button className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                            <span>Redução de Jornada</span>
                        </button>
                    </div>
                    <div className="group">
                        <button onClick={() => router.push('/history')} className="w-full flex items-center gap-1.5 p-3 rounded-lg bg-white/10 text-white font-bold text-xs uppercase tracking-wider shadow-sm border border-white/5 transition-all hover:bg-white/20">
                            <HistoryIcon className="w-4 h-4 shrink-0" />
                            <span>Histórico</span>
                        </button>

                        {/* Submenu Indicadores - Aparece no Hover do group */}
                        <button
                            onClick={() => router.push('/analytics')}
                            className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap"
                        >
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
                        <>
                            <button onClick={() => router.push('/users')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <UsersIcon className="w-4 h-4 shrink-0" />
                                <span>Usuários</span>
                            </button>
                            <button onClick={() => router.push('/deletion-requests')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <Trash2 className="w-4 h-4 shrink-0" />
                                <span>Exclusões Pendentes</span>
                            </button>
                        </>
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

                            {filterType === 'ASO' && (
                                <select
                                    value={filterAsoSubtype}
                                    onChange={(e) => setFilterAsoSubtype(e.target.value)}
                                    className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#1A3351] text-[10px] font-black uppercase outline-none animate-in fade-in slide-in-from-left-2"
                                >
                                    <option value="all">TODOS TIPOS DE ASO</option>
                                    <option value="ADMISS">ADMISSIONAL</option>
                                    <option value="DEMISS">DEMISSIONAL</option>
                                    <option value="RETORNO">RETORNO AO TRABALHO</option>
                                    <option value="MUDANÇA">MUDANÇA DE FUNÇÃO</option>
                                    <option value="PERIÓDIC">PERIÓDICO</option>
                                </select>
                            )}

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

                            {(searchTerm || filterUser !== "all" || filterType !== "all" || filterAsoSubtype !== "all" || filterSecretaria !== "all" || startDate || endDate) && (
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        setFilterUser("all");
                                        setFilterType("all");
                                        setFilterAsoSubtype("all");
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
                        <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#1A3351]">Log de Processamento Geral</h3>
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-600 uppercase">Ordem:</span>
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="bg-[#D3D3D3] border border-slate-400 text-[9px] font-black uppercase px-2 py-1 outline-none focus:border-[#1A3351]"
                                    >
                                        <option value="date-desc">Data e Hora (Recentes)</option>
                                        <option value="alpha">Alfabeto (A-Z)</option>
                                    </select>
                                </div>
                                <div className="text-[9px] font-black text-slate-600 uppercase">Mostrando {sortedHistory.length} resultados</div>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-200">
                            {sortedHistory.length > 0 ? sortedHistory.map((entry) => (
                                <div key={entry.id} className="group">
                                    <div
                                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                        className={`px-6 py-2.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 cursor-pointer transition-all border-l-4 ${entry.deletion_pending
                                            ? 'bg-amber-50/50 border-amber-500 opacity-60'
                                            : expandedId === entry.id
                                                ? 'bg-[#1A3351]/5 border-[#1A3351]'
                                                : 'border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`p-1.5 rounded transition-colors ${expandedId === entry.id ? 'bg-[#1A3351] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <ClipboardList className={`${expandedId === entry.id ? 'w-5 h-5' : 'w-4 h-4'}`} />
                                            </div>
                                            <div className="flex items-baseline gap-3 transition-all duration-300">
                                                <h4 className={`font-black uppercase text-[#1A3351] leading-tight transition-all duration-300 ${expandedId === entry.id ? 'text-lg' : 'text-sm'}`}>
                                                    {entry.servidor_nome}
                                                </h4>
                                                {entry.deletion_pending && (
                                                    <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] font-black tracking-widest shrink-0 animate-pulse">
                                                        ⚠️ EXCLUSÃO PENDENTE
                                                    </span>
                                                )}
                                                {expandedId === entry.id && !entry.deletion_pending && (
                                                    <span className="bg-[#1A3351] text-white px-2 py-0.5 rounded text-[10px] font-black tracking-widest shrink-0">
                                                        REF: #{entry.id}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`flex gap-4 font-bold uppercase transition-all duration-300 ${expandedId === entry.id ? 'text-xs mt-1' : 'text-[9px]'}`}>
                                                <span className="text-[#E31E24]">
                                                    {(() => {
                                                        const raw = entry.aso_type || "";
                                                        if (raw.includes('{') || raw.includes('<') || raw.includes('[')) {
                                                            // Extrai apenas o tipo principal: "Encaminhamento (Admissional)"
                                                            return raw.split(' {')[0].split(' <')[0].split(' [')[0];
                                                        }
                                                        return raw;
                                                    })()}
                                                </span>
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
                                            {entry.deletion_pending && (
                                                <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded animate-in fade-in">
                                                    <div className="flex items-start gap-3">
                                                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                                                        <div>
                                                            <h5 className="text-xs font-black text-amber-800 uppercase mb-1">
                                                                Registro com Solicitação de Exclusão Pendente
                                                            </h5>
                                                            <p className="text-xs text-amber-700">
                                                                Este registro está aguardando aprovação do administrador para exclusão definitiva.
                                                                O registro permanecerá visível até que a solicitação seja aprovada ou rejeitada.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
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
                                            <div className="mt-6 pt-3 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 uppercase tracking-widest">
                                                <span className="text-[10px] font-black text-[#1A3351]">
                                                    <span className="text-slate-400 font-bold mr-1">Operador Responsável:</span>
                                                    {entry.operator_name || operatorsMap[entry.generated_by] || entry.generated_by}
                                                </span>
                                                <div className="flex items-center gap-3 w-full md:w-auto">
                                                    <span className="text-[9px] font-bold text-slate-400">Log ID: {entry.id}</span>
                                                    {currentUserId === entry.generated_by && (
                                                        entry.deletion_pending ? (
                                                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-black text-[10px] uppercase rounded shadow-md cursor-not-allowed">
                                                                <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                                                Aguardando Aprovação de Exclusão Definitiva
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRequestDeletion(entry);
                                                                }}
                                                                className="flex items-center gap-2 px-4 py-2 bg-[#E31E24] text-white font-black text-[10px] uppercase rounded shadow-md hover:brightness-110 active:scale-95 transition-all"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                Solicitar Exclusão
                                                            </button>
                                                        )
                                                    )}
                                                </div>
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

            {/* MODAL DE SOLICITAÇÃO DE EXCLUSÃO */}
            {showDeletionModal && selectedEntryForDeletion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-[#E31E24]">
                            <AlertCircle className="w-8 h-8 text-[#E31E24]" />
                            <h3 className="text-lg font-black uppercase text-[#1A3351]">Solicitar Exclusão de Registro</h3>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                <p className="text-xs font-black text-slate-500 uppercase mb-1">Servidor:</p>
                                <p className="font-bold text-[#1A3351]">{selectedEntryForDeletion.servidor_nome}</p>
                            </div>

                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                <p className="text-xs font-black text-slate-500 uppercase mb-1">Tipo de Documento:</p>
                                <p className="text-sm text-[#E31E24] font-bold">{selectedEntryForDeletion.aso_type}</p>
                            </div>

                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                <p className="text-xs font-black text-slate-500 uppercase mb-1">Log ID:</p>
                                <p className="text-sm text-slate-700 font-mono">#{selectedEntryForDeletion.id}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase mb-2">
                                    Motivo da Exclusão <span className="text-[#E31E24]">*</span>
                                </label>
                                <textarea
                                    value={deletionReason}
                                    onChange={(e) => setDeletionReason(e.target.value)}
                                    placeholder="Descreva detalhadamente o motivo da solicitação de exclusão..."
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded text-sm outline-none focus:border-[#1A3351] transition-all min-h-[120px] resize-none"
                                    maxLength={500}
                                />
                                <p className="text-xs text-slate-400 mt-1 text-right">
                                    {deletionReason.length}/500 caracteres
                                </p>
                            </div>

                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                                <p className="text-xs font-bold text-amber-800 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>
                                        Esta solicitação será enviada para aprovação do administrador.
                                        O registro permanecerá no histórico até que a exclusão seja aprovada.
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeletionModal(false);
                                    setSelectedEntryForDeletion(null);
                                    setDeletionReason("");
                                }}
                                disabled={processingDeletion}
                                className="flex-1 py-3 px-4 bg-slate-200 text-slate-700 font-black text-xs uppercase rounded hover:bg-slate-300 transition-all disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDeletionRequest}
                                disabled={processingDeletion || !deletionReason.trim()}
                                className="flex-[2] py-3 px-4 bg-[#E31E24] text-white font-black text-xs uppercase rounded shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processingDeletion ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Enviar Solicitação
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
