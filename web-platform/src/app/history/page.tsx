"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, ChevronUp, History as HistoryIcon,
    BarChart3, User, Calendar, ClipboardList, Search, Filter, Printer, Users as UsersIcon, TrendingUp, FolderOpen, Trash2, AlertCircle,
    Building2, Loader2, MessageSquarePlus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { ensureISO } from "@/lib/utils";
import Sidebar from "@/components/layout/Sidebar";


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
    // Campos ASO 2.0
    servidor_nascimento?: string;
    exams_json?: { name: string; date: string }[];
    risks?: string;
    function_name?: string;
    edit_history?: any[];
    // Campo virtual para permissões
    creator_role?: string;
}

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>('landscape');
    const [isPrintPopoverOpen, setIsPrintPopoverOpen] = useState(false);
    const [userName, setUserName] = useState<string>("Usuário");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

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
    const [selectedAsoSubtypes, setSelectedAsoSubtypes] = useState<string[]>([]);
    const [isAsoSubtypeFilterOpen, setIsAsoSubtypeFilterOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState("date-desc");
    const [filterShift, setFilterShift] = useState("all");

    // Estados para Edição ASO 2.0
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);
    const [editFormData, setEditFormData] = useState<any>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Estados de busca (UI) e carregamento
    const [cargoSearch, setCargoSearch] = useState("");
    const [filteredCargosSearch, setFilteredCargosSearch] = useState<string[]>([]);
    const [isSearchingCargo, setIsSearchingCargo] = useState(false);

    const [secretariaSearch, setSecretariaSearch] = useState("");
    const [filteredSecretariasSearch, setFilteredSecretariasSearch] = useState<string[]>([]);
    const [isSearchingSecretaria, setIsSearchingSecretaria] = useState(false);

    const [funcoesSearch, setFuncoesSearch] = useState("");
    const [filteredFuncoes, setFilteredFuncoes] = useState<any[]>([]);
    const [isSearchingFuncao, setIsSearchingFuncao] = useState(false);

    // Busca de Cargo no Servidor com Debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!cargoSearch || cargoSearch.length < 2) {
                setFilteredCargosSearch([]);
                return;
            }

            setIsSearchingCargo(true);
            try {
                const { data } = await supabase
                    .from('servidores')
                    .select('cargo')
                    .ilike('cargo', `%${cargoSearch}%`)
                    .not('cargo', 'is', null)
                    .limit(50);

                if (data) {
                    const unique = Array.from(new Set(data.map(s => s.cargo))).filter(Boolean) as string[];
                    // Ordenação inteligente: prefixo primeiro
                    const term = cargoSearch.toUpperCase();
                    unique.sort((a, b) => {
                        const aStart = a.toUpperCase().startsWith(term);
                        const bStart = b.toUpperCase().startsWith(term);
                        if (aStart && !bStart) return -1;
                        if (!aStart && bStart) return 1;
                        return a.localeCompare(b);
                    });
                    setFilteredCargosSearch(unique.slice(0, 20));
                }
            } finally {
                setIsSearchingCargo(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [cargoSearch]);

    // Busca de Secretaria no Servidor com Debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!secretariaSearch || secretariaSearch.length < 2) {
                setFilteredSecretariasSearch([]);
                return;
            }

            setIsSearchingSecretaria(true);
            try {
                const { data } = await supabase
                    .from('servidores')
                    .select('secretaria')
                    .ilike('secretaria', `%${secretariaSearch}%`)
                    .not('secretaria', 'is', null)
                    .limit(50);

                if (data) {
                    const unique = Array.from(new Set(data.map(s => s.secretaria))).filter(Boolean) as string[];
                    const term = secretariaSearch.toUpperCase();
                    unique.sort((a, b) => {
                        const aStart = a.toUpperCase().startsWith(term);
                        const bStart = b.toUpperCase().startsWith(term);
                        if (aStart && !bStart) return -1;
                        if (!aStart && bStart) return 1;
                        return a.localeCompare(b);
                    });
                    setFilteredSecretariasSearch(unique.slice(0, 20));
                }
            } finally {
                setIsSearchingSecretaria(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [secretariaSearch]);

    // Busca de Função no Servidor com Debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!funcoesSearch || funcoesSearch.length < 1) {
                setFilteredFuncoes([]);
                return;
            }

            setIsSearchingFuncao(true);
            try {
                const { data } = await supabase
                    .from('funcoes')
                    .select('*')
                    .or(`nome.ilike.%${funcoesSearch}%,cod.ilike.%${funcoesSearch}%`)
                    .limit(100);

                if (data) {
                    const term = funcoesSearch.toUpperCase();
                    data.sort((a, b) => {
                        const aName = (a.nome || "").toUpperCase();
                        const bName = (b.nome || "").toUpperCase();
                        const aStart = aName.startsWith(term);
                        const bStart = bName.startsWith(term);
                        if (aStart && !bStart) return -1;
                        if (!aStart && bStart) return 1;
                        return aName.localeCompare(bName);
                    });
                    setFilteredFuncoes(data.slice(0, 30));
                }
            } finally {
                setIsSearchingFuncao(false);
            }
        }, 400); 
        return () => clearTimeout(timer);
    }, [funcoesSearch]);

// Efeito para sincronizar riscos e exames quando muda o Tipo de ASO ou a Função
useEffect(() => {
    async function syncExamsAndRisks() {
        if (!isEditModalOpen || !editFormData?.function_ghe || !editFormData?.aso_type) return;

        // Mapeia tipo do formulário para o tipo no exames_config
        let typeInternal = "admissional";
        const formType = editFormData.aso_type;
        if (formType === "Demissional") typeInternal = "demissional";
        else if (formType === "Periódico") typeInternal = "admissional"; // Geralmente segue admissional ou tem campo próprio? page.tsx usa admissional/demissional
        else if (formType === "Mudança de Função") typeInternal = "admissional";
        else if (formType === "Retorno ao Trabalho") typeInternal = "admissional";

        const { data, error } = await supabase
            .from('exames_config')
            .select('*')
            .eq('aso_type', typeInternal)
            .eq('ghe', editFormData.function_ghe)
            .single();

        if (data && !error) {
            // Só atualiza se o usuário realmente trocou algo (para não sobrescrever datas já editadas se apenas abrir o modal)
            // Mas aqui o gatilho é a mudança de GHE ou Tipo, então é seguro.
            const newExams = data.exames.map((name: string) => ({
                name: name,
                date: new Date().toLocaleDateString('pt-BR')
            }));

            setEditFormData((prev: any) => ({
                ...prev,
                risks: data.riscos + (data.detalhes ? `\n${data.detalhes}` : ''),
                exams: newExams
            }));
        }
    }
    syncExamsAndRisks();
}, [editFormData?.aso_type, editFormData?.function_ghe, isEditModalOpen]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { session, error } = await safeGetSession();
                if (error) {
                    await handleAuthError(error);
                    return;
                }

                if (session) {
                    setCurrentUserId(session.user.id);
                    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                    if (data) setUserRole(data.role);

                    const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Usuário";
                    setUserName(name);
                } else {
                    router.push("/login");
                    return;
                }
                loadHistory();
            } catch (err) {
                await handleAuthError(err);
            }
        };
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') router.push("/login");
        });

        return () => subscription.unsubscribe();
    }, [router, userRole]);

    // Redirecionamento para perfis sem acesso ao histórico
    useEffect(() => {
        if (userRole === 'social_assistant') {
            router.push('/abono');
        } else if (userRole === 'operator' || userRole === 'viewer') {
            router.push('/');
        }
    }, [userRole, router]);

    const [profilesData, setProfilesData] = useState<Record<string, { email: string; role: string }>>({});

    async function loadHistory() {
        setLoading(true);

        // Força o Next.js a atualizar o cache do roteador
        router.refresh();

        // Carrega o histórico com um "cache breaker" manual
        const cacheBreaker = Date.now();

        // Buscamos o histórico e os perfis em paralelo
        const [histRes, profRes] = await Promise.all([
            supabase
                .from('aso_history')
                .select('*')
                .neq('id', -cacheBreaker)
                .order('generated_at', { ascending: false }),
            supabase
                .from('profiles')
                .select('id, email, role')
        ]);

        const profMap: Record<string, { email: string; role: string }> = {};
        if (profRes.data) {
            profRes.data.forEach(p => {
                profMap[p.id] = { email: p.email, role: p.role };
            });
            setProfilesData(profMap);
        }

        if (!histRes.error && histRes.data) {
            // Injetamos o creator_role para facilitar a lógica de UI
            const enrichedHistory = histRes.data.map(h => ({
                ...h,
                creator_role: profMap[h.generated_by]?.role || 'unknown'
            }));
            setHistory(enrichedHistory);
        } else if (histRes.error) {
            console.error("Erro ao carregar histórico:", histRes.error);
        }

        setLoading(false);
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const uniqueUsersList = useMemo(() => Array.from(new Set(history.map(h => h.generated_by))), [history]);
    const uniqueSecretarias = useMemo(() => Array.from(new Set(history.map(h => h.secretaria).filter(Boolean))).sort() as string[], [history]);

    const filteredHistory = history.filter(entry => {
        const matchesSearch = entry.servidor_nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUser = filterUser === "all" || entry.generated_by === filterUser;
        const matchesSecretaria = filterSecretaria === "all" || entry.secretaria === filterSecretaria;
        const entryType = entry.aso_type.toLowerCase().includes('aso') ? 'ASO' : (entry.aso_type.toLowerCase().includes('encaminhamento') ? 'Encaminhamento' : 'Outros');
        const matchesType = filterType === "all" || entryType === filterType;
        
        const matchesAsoSubtype = selectedAsoSubtypes.length === 0 || (
            entryType === 'ASO' && selectedAsoSubtypes.some(sub => 
                entry.aso_type.toUpperCase().includes(sub.toUpperCase())
            )
        );

        // Filtro de Data
        const entryDate = new Date(entry.generated_at).toISOString().split('T')[0];
        const matchesStartDate = !startDate || entryDate >= startDate;
        const matchesEndDate = !endDate || entryDate <= endDate;

        // Filtro de Turno (Manhã: 07:00-12:59, Tarde: 13:00-18:00)
        let matchesShift = true;
        if (filterShift !== "all") {
            const date = new Date(entry.generated_at);
            // Ajustar para o fuso horário local se necessário, mas o Supabase retorna UTC.
            // Para simplicidade e conforme pedido, vamos checar a hora bruta.
            const hour = date.getHours();
            if (filterShift === "morning") {
                matchesShift = hour >= 7 && hour < 13;
            } else if (filterShift === "afternoon") {
                matchesShift = hour >= 13 && hour <= 18;
            }
        }

        return matchesSearch && matchesUser && matchesType && matchesAsoSubtype && matchesSecretaria && matchesStartDate && matchesEndDate && matchesShift;
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
        const { session } = await safeGetSession();
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

    const handlePrintRequest = (layout: 'portrait' | 'landscape') => {
        setPrintLayout(layout);
        setIsPrintPopoverOpen(false);
        // Pequeno timeout para garantir que o estado do @page seja atualizado (se fosse renderizado na mesma tela)
        // Como o histórico usa window.open, precisamos injetar a orientação correta no HTML
        generatePrintReportWithLayout(layout);
    };

    const generatePrintReportWithLayout = async (layout: 'portrait' | 'landscape') => {
        const { session } = await safeGetSession();
        const userName = session?.user?.email?.split('@')[0].toUpperCase() || "SISTEMA";

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const today = new Date().toLocaleDateString('pt-BR');
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
        const displayStartDate = (startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'INÍCIO');
        const displayEndDate = (endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'HOJE');

        printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Gerencial SESMT - ${today}</title>
          <style>
            @page { size: ${layout}; margin: 1cm; }
            body { font-family: sans-serif; padding: 10px; color: #333; line-height: 1.0; }
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
            
            .stats-bar { font-size: 8px; font-weight: 900; margin-bottom: 5px; color: #1A3351; text-transform: uppercase; border-left: 3px solid #E31E24; padding-left: 8px; }
            .footer { margin-top: 20px; font-size: 7px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
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
          <div class="footer">Gerado via SESMT SYSTEM - Powered by UXBRAS®</div>
        </body>
      </html>
    `);
        printWindow.document.close();
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
            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden">

                {/* HEADER COM DASHBOARD E FILTROS DE DATA */}
                <section className="bg-[#B0B0B0] p-4 lg:p-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className={`flex justify-between items-center mb-3 relative ${isPrintPopoverOpen ? 'z-50' : 'z-20'}`}>
                        <div className="flex items-center gap-3 text-[#1A3351]">
                            <HistoryIcon className="w-5 lg:w-6 h-5 lg:h-6" />
                            <h2 className="text-lg lg:text-xl font-black leading-none uppercase tracking-tight">Histórico</h2>
                        </div>
                        <div className="flex items-center gap-2 lg:gap-3">
                            <button
                                onClick={() => router.push('/analytics')}
                                className="hidden md:flex items-center justify-center gap-2 px-6 h-10 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                Indicadores BI
                            </button>
                            {(userRole === 'admin' || userRole === 'nurse') && (
                                <div className={`relative hidden md:block ${isPrintPopoverOpen ? 'z-[120]' : 'z-10'}`}>
                                    <button
                                        onClick={() => setIsPrintPopoverOpen(!isPrintPopoverOpen)}
                                        className="flex items-center justify-center gap-2 px-6 h-10 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        Relatório
                                        <ChevronDown className={`w-3 h-3 transition-transform ${isPrintPopoverOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isPrintPopoverOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-64 bg-white border-2 border-[#1A3351] shadow-2xl z-[200] animate-in fade-in slide-in-from-top-2 rounded-lg overflow-hidden">
                                            <div className="p-4 flex flex-col gap-3">
                                                <h3 className="text-[11px] font-black text-[#1A3351] uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
                                                    <Printer className="w-4 h-4 text-[#E31E24]" />
                                                    Opções de Relatório
                                                </h3>
                                                
                                                <button
                                                    onClick={() => handlePrintRequest('portrait')}
                                                    className="flex items-center gap-3 p-3 hover:bg-slate-50 text-slate-700 transition-all rounded-lg group border border-transparent hover:border-slate-200"
                                                >
                                                    <div className="p-2 bg-slate-100 rounded group-hover:bg-[#1A3351] group-hover:text-white transition-colors">
                                                        <FileSearch className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black uppercase leading-none mb-1">Vertical</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Formato Retrato (A4)</p>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => handlePrintRequest('landscape')}
                                                    className="flex items-center gap-3 p-3 hover:bg-slate-50 text-slate-700 transition-all rounded-lg group border border-transparent hover:border-slate-200"
                                                >
                                                    <div className="p-2 bg-slate-100 rounded group-hover:bg-[#1A3351] group-hover:text-white transition-colors">
                                                        <Printer className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black uppercase leading-none mb-1">Horizontal</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Formato Paisagem (A4)</p>
                                                    </div>
                                                </button>
                                            </div>
                                            <div className="bg-[#1A3351]/5 px-4 py-2 border-t border-slate-100 italic text-[8px] text-slate-500 text-center font-bold">
                                                SELECIONE A ORIENTAÇÃO PARA IMPRIMIR
                                            </div>
                                        </div>
                                    )}
                                </div>
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

                    <div className="flex flex-col gap-3 relative z-10">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="BUSCAR SERVIDOR..."
                                    className="w-full px-11 py-3 lg:py-2 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase rounded-lg lg:rounded-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* FILTRO DE DATA COMPACTO (POPOVER) */}
                            <div className="relative w-full lg:w-auto">
                                <button
                                    onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                                    className={`
                                        flex items-center justify-between lg:justify-center gap-2 w-full lg:w-64 h-11 lg:h-10 bg-[#E8E8E8] border border-[#888] shadow-inner font-black text-[10px] uppercase transition-all px-4 rounded-lg lg:rounded-none
                                        ${(startDate || endDate) ? 'text-[#E31E24] border-[#E31E24]' : 'text-slate-500'}
                                    `}
                                >
                                    <span className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>{(startDate || endDate) ? `${startDate || '...'} → ${endDate || '...'}` : 'POR PERÍODO'}</span>
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDateFilterOpen ? 'rotate-180' : ''}`} />
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
                                        {profilesData[uid]?.email || history.find(h => h.generated_by === uid)?.operator_name || `ID: ${uid.substring(0, 8)}`}
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
                                <div className="relative flex-1 md:flex-none">
                                    <button
                                        onClick={() => setIsAsoSubtypeFilterOpen(!isAsoSubtypeFilterOpen)}
                                        className={`flex items-center justify-between gap-2 px-4 py-2 bg-[#E8E8E8] border text-[10px] font-black uppercase outline-none transition-all min-w-[200px] ${selectedAsoSubtypes.length > 0 ? 'border-[#1A3351] text-[#1A3351]' : 'border-[#888] text-slate-500'}`}
                                    >
                                        <span className="truncate">
                                            {selectedAsoSubtypes.length === 0 
                                                ? "TODOS TIPOS DE ASO" 
                                                : `ASO: ${selectedAsoSubtypes.length} SELEC.`}
                                        </span>
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAsoSubtypeFilterOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isAsoSubtypeFilterOpen && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-[140]" 
                                                onClick={() => setIsAsoSubtypeFilterOpen(false)}
                                            />
                                            <div className="absolute top-full left-0 mt-1 w-64 bg-white border-2 border-[#1A3351] shadow-2xl z-[150] p-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-1">
                                                        <span className="text-[9px] font-black text-[#1A3351] uppercase">Selecionar Tipos</span>
                                                        {selectedAsoSubtypes.length > 0 && (
                                                            <button 
                                                                onClick={() => setSelectedAsoSubtypes([])}
                                                                className="text-[8px] font-black text-[#E31E24] hover:underline uppercase"
                                                            >
                                                                Limpar
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    {[
                                                        { id: 'ADMISS', label: 'ADMISSIONAL' },
                                                        { id: 'DEMISS', label: 'DEMISSIONAL' },
                                                        { id: 'RETORNO', label: 'RETORNO AO TRABALHO' },
                                                        { id: 'MUDANÇA', label: 'MUDANÇA DE FUNÇÃO' },
                                                        { id: 'PERIÓDIC', label: 'PERIÓDICO' }
                                                    ].map((type) => (
                                                        <label 
                                                            key={type.id} 
                                                            className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer rounded transition-colors group"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 accent-[#1A3351] cursor-pointer"
                                                                checked={selectedAsoSubtypes.includes(type.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedAsoSubtypes([...selectedAsoSubtypes, type.id]);
                                                                    } else {
                                                                        setSelectedAsoSubtypes(selectedAsoSubtypes.filter(s => s !== type.id));
                                                                    }
                                                                }}
                                                            />
                                                            <span className={`text-[10px] font-bold uppercase transition-colors ${selectedAsoSubtypes.includes(type.id) ? 'text-[#1A3351]' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                                                {type.label}
                                                            </span>
                                                        </label>
                                                    ))}

                                                    <button
                                                        onClick={() => setIsAsoSubtypeFilterOpen(false)}
                                                        className="mt-2 w-full py-2 bg-[#1A3351] text-white text-[9px] font-black uppercase hover:brightness-110 rounded transition-all"
                                                    >
                                                        Fechar
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <select
                                value={filterShift}
                                onChange={(e) => setFilterShift(e.target.value)}
                                className="flex-1 md:flex-none px-4 py-2 bg-[#E8E8E8] border border-[#888] text-[10px] font-black uppercase outline-none focus:border-[#1A3351]"
                            >
                                <option value="all">TODOS OS TURNOS</option>
                                <option value="morning">MANHÃ (07h - 13h)</option>
                                <option value="afternoon">TARDE (13h - 18h)</option>
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

                            {(searchTerm || filterUser !== "all" || filterType !== "all" || selectedAsoSubtypes.length > 0 || filterSecretaria !== "all" || filterShift !== "all" || startDate || endDate) && (
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        setFilterUser("all");
                                        setFilterType("all");
                                        setSelectedAsoSubtypes([]);
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
                <div className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-6 lg:space-y-8">
                    {/* STATS CARDS */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                        <div className="bg-white p-4 lg:p-6 border-l-4 border-blue-600 shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Total Registros</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-2xl lg:text-3xl font-black text-[#1A3351] leading-none">{stats.total}</h3>
                                <HistoryIcon className="w-6 h-6 text-blue-50" />
                            </div>
                        </div>

                        <div className="bg-white p-4 lg:p-6 border-l-4 border-emerald-500 shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">ASOs Emitidos</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-2xl lg:text-3xl font-black text-[#1A3351] leading-none">{stats.asos}</h3>
                                <Activity className="w-6 h-6 text-emerald-50" />
                            </div>
                        </div>

                        <div className="bg-white p-4 lg:p-6 border-l-4 border-[#E31E24] shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">ENC Emitidos</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-2xl lg:text-3xl font-black text-[#1A3351] leading-none">{stats.encs}</h3>
                                <Building2 className="w-6 h-6 text-red-50" />
                            </div>
                        </div>

                        <div className="bg-white p-4 lg:p-6 border-l-4 border-amber-500 shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Operadores</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-2xl lg:text-3xl font-black text-[#1A3351] leading-none">{stats.uniqueUsers}</h3>
                                <User className="w-6 h-6 text-amber-50" />
                            </div>
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
                                        className={`px-4 lg:px-6 py-3 lg:py-2.5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4 hover:bg-slate-50 cursor-pointer transition-all border-l-4 ${entry.deletion_pending
                                            ? 'bg-amber-50/50 border-amber-500 opacity-60'
                                            : expandedId === entry.id
                                                ? 'bg-[#1A3351]/5 border-[#1A3351]'
                                                : 'border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 lg:gap-4 flex-1 w-full">
                                            <div className={`p-2 lg:p-1.5 rounded transition-colors shrink-0 ${expandedId === entry.id ? 'bg-[#1A3351] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <ClipboardList className={`${expandedId === entry.id ? 'w-5 h-5' : 'w-4 h-4'}`} />
                                            </div>
                                            <div className="flex flex-col lg:flex-row lg:items-baseline gap-1 lg:gap-3 flex-1 min-w-0">
                                                <h4 className={`font-black uppercase text-[#1A3351] leading-tight truncate transition-all duration-300 ${expandedId === entry.id ? 'text-lg lg:text-xl' : 'text-sm'}`}>
                                                    {entry.servidor_nome}
                                                </h4>
                                                <div className="flex flex-wrap gap-2 items-center">
                                                    {entry.deletion_pending && (
                                                        <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[8px] lg:text-[9px] font-black tracking-widest shrink-0 animate-pulse">
                                                            ⚠️ EXCLUSÃO PENDENTE
                                                        </span>
                                                    )}
                                                    {expandedId === entry.id && !entry.deletion_pending && (
                                                        <span className="bg-[#1A3351] text-white px-1.5 lg:py-0.5 rounded text-[9px] lg:text-[10px] font-black tracking-widest shrink-0">
                                                            REF: #{entry.id}
                                                        </span>
                                                    )}
                                                    <div className={`flex gap-3 font-bold uppercase transition-all duration-300 ${expandedId === entry.id ? 'text-[10px] lg:text-xs' : 'text-[9px]'}`}>
                                                        <span className="text-[#E31E24] truncate max-w-[150px] lg:max-w-none">
                                                            {(() => {
                                                                const raw = entry.aso_type || "";
                                                                if (raw.includes('{') || raw.includes('<') || raw.includes('[')) {
                                                                    return raw.split(' {')[0].split(' <')[0].split(' [')[0];
                                                                }
                                                                return raw;
                                                            })()}
                                                        </span>
                                                        {expandedId !== entry.id && <span className="text-slate-500 font-black">#{entry.id}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto lg:shrink-0 lg:text-right transition-all border-t lg:border-t-0 border-slate-100 pt-2 lg:pt-0 ${expandedId === entry.id ? 'opacity-100' : 'opacity-80'}`}>
                                            <div className="flex flex-col">
                                                <span className={`font-black text-slate-400 uppercase transition-all ${expandedId === entry.id ? 'text-[10px]' : 'text-[8px]'}`}>Registro</span>
                                                <span className={`font-bold text-slate-700 transition-all ${expandedId === entry.id ? 'text-xs lg:text-sm' : 'text-[10px]'}`}>
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
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2">
                                                <div className="lg:col-span-4 flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1">Cargo</span>
                                                    <p className="text-[12px] lg:text-[13px] font-black text-[#1A3351] uppercase lg:truncate" title={entry.cargo}>{entry.cargo || "Não registrado"}</p>
                                                </div>
                                                <div className="lg:col-span-5 flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1">Secretaria</span>
                                                    <p className="text-[12px] lg:text-[13px] font-black text-[#1A3351] uppercase lg:truncate" title={entry.secretaria}>{entry.secretaria || "Não registrado"}</p>
                                                </div>
                                                <div className="lg:col-span-3 flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase mb-1 border-b border-slate-200 pb-1 lg:text-right">GHE CONJ</span>
                                                    <p className="text-[11px] font-black text-slate-500 uppercase lg:text-right leading-tight">{entry.ghe_conj || "---"}</p>
                                                </div>
                                            </div>
                                            <div className="mt-6 pt-3 border-t border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 uppercase tracking-widest">
                                                <div className="flex flex-col gap-1 flex-1">
                                                    <span className="text-slate-400 font-bold text-[9px]">Operador Responsável:</span>
                                                    <span className="text-[11px] font-black text-[#1A3351]">
                                                        {entry.operator_name || profilesData[entry.generated_by]?.email || entry.generated_by}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                                                    {/* Botão de Edição ASO / Encaminhamento */}
                                                    {!entry.deletion_pending && (userRole === 'admin' || userRole === entry.creator_role) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const rawType = entry.aso_type || "";
                                                                const isEncaminhamento = rawType.toLowerCase().includes("encaminhamento");
                                                                
                                                                let simplifiedType = isEncaminhamento ? "Encaminhamento" : "Admissional";
                                                                if (!isEncaminhamento) {
                                                                    if (rawType.includes("Periódico")) simplifiedType = "Periódico";
                                                                    else if (rawType.includes("Demissional")) simplifiedType = "Demissional";
                                                                    else if (rawType.includes("Mudança de Função")) simplifiedType = "Mudança de Função";
                                                                    else if (rawType.includes("Retorno ao Trabalho")) simplifiedType = "Retorno ao Trabalho";
                                                                }

                                                                setEditingEntry(entry);
                                                                setEditFormData({
                                                                    servidor_nome: entry.servidor_nome,
                                                                    servidor_cpf: entry.servidor_cpf,
                                                                    servidor_nascimento: entry.servidor_nascimento || "",
                                                                    cargo: entry.cargo,
                                                                    secretaria: entry.secretaria,
                                                                    aso_type: simplifiedType,
                                                                    function_name: entry.function_name || "",
                                                                    function_ghe: entry.ghe_conj || "", 
                                                                    risks: entry.risks || "",
                                                                    exams: entry.exams_json || [],
                                                                    motivo_alteracao: ""
                                                                });
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-3 lg:py-2 bg-[#1A3351] text-white font-black text-[10px] uppercase rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all"
                                                        >
                                                            <Activity className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-blue-400" />
                                                            <span>Editar / Reemitir</span>
                                                        </button>
                                                    )}
                                                    <span className="text-[9px] font-bold text-slate-400">Log ID: {entry.id}</span>
                                                    {currentUserId === entry.generated_by && userRole !== 'analytic_manager' && (
                                                        entry.deletion_pending ? (
                                                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-black text-[9px] uppercase rounded-lg shadow-md cursor-not-allowed">
                                                                <AlertCircle className="w-3.5 h-3.5 animate-pulse shrink-0" />
                                                                <span>Exclusão em Análise</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRequestDeletion(entry);
                                                                }}
                                                                className="flex items-center gap-2 px-4 py-3 lg:py-2 bg-[#E31E24] text-white font-black text-[10px] uppercase rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                                                                <span>Excluir Registro</span>
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            {/* Histórico de Edições (Auditoria) */}
                                            {entry.edit_history && entry.edit_history.length > 0 && (
                                                <div className="mt-8 pt-4 border-t border-slate-200">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <HistoryIcon className="w-4 h-4 text-slate-400" />
                                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Histórico de Alterações (Auditoria)</span>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {entry.edit_history.map((log: any, idx: number) => (
                                                            <div key={idx} className="bg-white/40 border border-slate-200 rounded-lg p-3 text-[10px] lg:text-[11px] animate-in fade-in slide-in-from-left-2 transition-all">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-black text-[#1A3351] uppercase">{log.user}</span>
                                                                        <span className="text-slate-400">•</span>
                                                                        <span className="font-bold text-slate-500 uppercase">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                                                                    </div>
                                                                    <div className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-black uppercase text-[8px]">Reemitido</div>
                                                                </div>
                                                                <p className="font-black text-[#E31E24] uppercase mb-1">Motivo: <span className="text-slate-700 font-bold">{log.motivo || "Não informado"}</span></p>
                                                                {log.changes && (
                                                                    <div className="mt-2 pl-2 border-l-2 border-slate-200 flex flex-wrap gap-x-4 gap-y-1">
                                                                        {Object.keys(log.changes.new).map((key) => {
                                                                            const oldVal = log.changes.old[key];
                                                                            const newVal = log.changes.new[key];
                                                                            if (oldVal !== newVal) {
                                                                                return (
                                                                                    <span key={key} className="text-[9px] font-bold text-slate-500">
                                                                                        <span className="uppercase text-slate-400">{key}:</span> {String(oldVal || '---')} → <span className="text-[#1A3351] font-black">{String(newVal || '---')}</span>
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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
            {/* MODAL DE EDIÇÃO ASO 2.0 */}
            {isEditModalOpen && editingEntry && editFormData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
                    <div className="bg-[#D3D3D3] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 border-4 border-[#1A3351]">
                        {/* Header do Modal */}
                        <div className="bg-[#1A3351] p-6 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <Activity className="w-8 h-8 text-[#E31E24]" />
                                <div>
                                    <h3 className="text-xl font-black uppercase text-white tracking-tighter">Editor de Evidência Digital</h3>
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Ajuste de dados para reemissão • ID #{editingEntry.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-white/50 hover:text-white transition-colors">
                                <X className="w-8 h-8" />
                            </button>
                        </div>

                        {/* Corpo do Modal (Scrollable) */}
                        <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 bg-white/20">
                            {/* Sessão 1: Dados Pessoais */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-[#1A3351]" />
                                    <span className="text-xs font-black uppercase text-[#1A3351] tracking-widest">Dados do Servidor</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-6 space-y-1">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            className="w-full bg-white border-2 border-slate-200 px-4 py-2.5 rounded-lg text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all"
                                            value={editFormData.servidor_nome}
                                            onChange={(e) => setEditFormData({ ...editFormData, servidor_nome: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-3 space-y-1">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">CPF</label>
                                        <input
                                            type="text"
                                            className="w-full bg-white border-2 border-slate-200 px-4 py-2.5 rounded-lg text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all"
                                            value={editFormData.servidor_cpf}
                                            onChange={(e) => setEditFormData({ ...editFormData, servidor_cpf: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-3 space-y-1">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Data de Nascimento</label>
                                        <input
                                            type="date"
                                            className="w-full bg-white border-2 border-slate-200 px-4 py-2 text-sm font-bold outline-none focus:border-[#E31E24] rounded-lg h-[46px]"
                                            value={editFormData.servidor_nascimento}
                                            onChange={(e) => setEditFormData({ ...editFormData, servidor_nascimento: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-12 space-y-1">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tipo de Documento</label>
                                        <select
                                            className="w-full bg-white border-2 border-slate-200 px-4 py-2.5 rounded-lg text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all cursor-pointer"
                                            value={editFormData.aso_type}
                                            onChange={(e) => setEditFormData({ ...editFormData, aso_type: e.target.value })}
                                        >
                                            <option value="Admissional">ASO Admissional</option>
                                            <option value="Periódico">ASO Periódico</option>
                                            <option value="Mudança de Função">ASO Mudança de Função</option>
                                            <option value="Demissional">ASO Demissional</option>
                                            <option value="Retorno ao Trabalho">ASO Retorno ao Trabalho</option>
                                            <option value="Encaminhamento">Encaminhamento de Exames</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Sessão 2: Dados Profissionais */}
                            <div className="space-y-4 pt-4 border-t border-black/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="w-4 h-4 text-[#1A3351]" />
                                    <span className="text-xs font-black uppercase text-[#1A3351] tracking-widest">Dados Profissionais</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1 relative">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center justify-between">
                                            <span>Cargo</span>
                                            {isSearchingCargo && <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Digite para buscar..."
                                            className="flex-1 bg-white border-2 border-[#1A3351]/10 px-4 py-2.5 rounded-lg text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all shadow-sm"
                                            value={cargoSearch || (editFormData?.cargo || "")}
                                            onChange={(e) => {
                                                const val = e.target.value.toUpperCase();
                                                setCargoSearch(val);
                                                setEditFormData({ ...editFormData, cargo: val });
                                            }}
                                        />
                                        {filteredCargosSearch.length > 0 && (
                                            <div className="absolute z-[310] left-0 right-0 mt-1 bg-white border-2 border-[#1A3351] shadow-2xl rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                                {filteredCargosSearch.map((c) => (
                                                    <div
                                                        key={c}
                                                        onClick={() => {
                                                            setEditFormData({ ...editFormData, cargo: c });
                                                            setCargoSearch("");
                                                            setFilteredCargosSearch([]);
                                                        }}
                                                        className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-xs font-black text-[#1A3351] uppercase"
                                                    >
                                                        {c}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1 relative">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center justify-between">
                                            <span>Secretaria</span>
                                            {isSearchingSecretaria && <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Digite para buscar..."
                                            className="flex-1 bg-white border-2 border-[#1A3351]/10 px-4 py-2.5 rounded-lg text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all shadow-sm"
                                            value={secretariaSearch || (editFormData?.secretaria || "")}
                                            onChange={(e) => {
                                                const val = e.target.value.toUpperCase();
                                                setSecretariaSearch(val);
                                                setEditFormData({ ...editFormData, secretaria: val });
                                            }}
                                        />
                                        {filteredSecretariasSearch.length > 0 && (
                                            <div className="absolute z-[310] left-0 right-0 mt-1 bg-white border-2 border-[#1A3351] shadow-2xl rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                                {filteredSecretariasSearch.map((s) => (
                                                    <div
                                                        key={s}
                                                        onClick={() => {
                                                            setEditFormData({ ...editFormData, secretaria: s });
                                                            setSecretariaSearch("");
                                                            setFilteredSecretariasSearch([]);
                                                        }}
                                                        className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-xs font-black text-[#1A3351] uppercase"
                                                    >
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                    <div className="space-y-1 relative">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center justify-between">
                                            <span>Função / GHE (Busque para atualizar riscos)</span>
                                            {isSearchingFuncao && <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />}
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Digite para buscar..."
                                                className="flex-1 bg-white border-2 border-[#1A3351]/10 px-4 py-2.5 rounded-lg text-sm font-bold uppercase focus:border-[#E31E24] outline-none transition-all shadow-sm"
                                                value={funcoesSearch || (editFormData?.function_name || "")}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFuncoesSearch(val);
                                                    setEditFormData({ ...editFormData, function_name: val });
                                                }}
                                            />
                                            {(funcoesSearch || (editFormData?.function_name)) && (
                                                <button 
                                                    onClick={() => {
                                                        setFuncoesSearch("");
                                                        setFilteredFuncoes([]);
                                                        setEditFormData({ ...editFormData, function_name: "", function_ghe: "", risks: "", exams_json: [] });
                                                    }}
                                                    className="px-3 bg-white border-2 border-slate-200 rounded-lg text-[9px] font-black uppercase hover:bg-slate-50 transition-colors"
                                                >
                                                    Limpar
                                                </button>
                                            )}
                                        </div>
                                        {filteredFuncoes.length > 0 && (
                                            <div className="absolute z-[310] left-0 right-0 mt-1 bg-white border-2 border-[#1A3351] shadow-2xl rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                                                {filteredFuncoes.map((f) => (
                                                    <div
                                                        key={f.id}
                                                        onClick={() => {
                                                            setEditFormData({ 
                                                                ...editFormData, 
                                                                function_name: f.nome,
                                                                function_ghe: f.ghe 
                                                            });
                                                            setFuncoesSearch("");
                                                            setFilteredFuncoes([]);
                                                        }}
                                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 group transition-colors"
                                                    >
                                                        <div className="flex justify-between items-center mb-0.5">
                                                            <span className="text-xs font-black text-[#1A3351] uppercase group-hover:text-[#E31E24]">{f.nome}</span>
                                                            <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">GHE: {f.ghe}</span>
                                                        </div>
                                                        {f.cod && <div className="text-[9px] font-bold text-slate-400">CÓD: {f.cod}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Riscos Ocupacionais (Automático - Não Editável)</label>
                                        <textarea
                                            readOnly
                                            className="w-full bg-slate-50 border-2 border-slate-200 px-4 py-3 rounded-lg text-sm font-bold uppercase outline-none min-h-[80px] resize-none text-slate-500 italic"
                                            value={editFormData.risks}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sessão 3: Exames e Datas */}
                            <div className="space-y-4 pt-4 border-t border-black/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity className="w-4 h-4 text-[#1A3351]" />
                                    <span className="text-xs font-black uppercase text-[#1A3351] tracking-widest">Exames e Prazos</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {editFormData.exams.map((exam: any, idx: number) => (
                                        <div key={idx} className="flex gap-2 p-3 bg-white border-2 border-slate-100 rounded-xl shadow-sm">
                                            <div className="flex-1">
                                                <p className="text-[9px] font-black text-[#E31E24] uppercase mb-1">{exam.name}</p>
                                                <input
                                                    type="date"
                                                    className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs font-black outline-none focus:border-[#E31E24] rounded"
                                                    value={exam.date.split('/').reverse().join('-')}
                                                    onChange={(e) => {
                                                        const newExams = [...editFormData.exams];
                                                        const [y, m, d] = e.target.value.split('-');
                                                        newExams[idx].date = `${d}/${m}/${y}`;
                                                        setEditFormData({ ...editFormData, exams: newExams });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {editFormData.exams.length === 0 && (
                                        <p className="col-span-2 text-center py-4 text-slate-400 text-[10px] font-black uppercase italic italic">Registro legado: O sistema usará o mapeamento original.</p>
                                    )}
                                </div>
                            </div>

                            {/* Sessão 4: Motivo da Alteração (Obrigatório para Auditoria) */}
                            <div className="space-y-4 pt-4 border-t border-black/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <HistoryIcon className="w-4 h-4 text-amber-600" />
                                    <span className="text-xs font-black uppercase text-amber-600 tracking-widest">Justificativa da Alteração (Auditoria)</span>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-200">
                                    <textarea
                                        rows={3}
                                        placeholder="DESCREVA O MOTIVO DESTA ALTERAÇÃO (OBRIGATÓRIO PARA SEGURANÇA)..."
                                        className="w-full bg-white border-2 border-amber-300 px-4 py-3 rounded-lg text-sm font-bold uppercase outline-none focus:border-amber-500 transition-all resize-none"
                                        value={editFormData.motivo_alteracao}
                                        onChange={(e) => setEditFormData({ ...editFormData, motivo_alteracao: e.target.value })}
                                    />
                                    <div className="flex items-center gap-2 mt-2 text-amber-700">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <p className="text-[9px] font-black uppercase">Este registro será vinculado ao seu perfil para auditoria futura.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer do Modal */}
                        <div className="bg-[#B0B0B0] p-6 flex flex-col sm:flex-row gap-4 shrink-0">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="flex-1 py-4 px-6 bg-slate-300 text-slate-700 font-black text-xs uppercase rounded-xl hover:bg-slate-400 transition-all active:scale-95"
                            >
                                Cancelar Alterações
                            </button>
                            <button
                                onClick={async () => {
                                    if (isSavingEdit) return;
                                    
                                    if (!editFormData.motivo_alteracao || editFormData.motivo_alteracao.length < 5) {
                                        alert("Por favor, informe o motivo da alteração (mínimo 5 caracteres) para auditoria.");
                                        return;
                                    }

                                    setIsSavingEdit(true);

                                    try {
                                        const { session } = await safeGetSession();
                                        const userEmail = session?.user?.email || "desconhecido";

                                        // 1. Registrar Auditoria no edit_history (Enriquecido com Motivo)
                                        const newAudit = {
                                            timestamp: new Date().toISOString(),
                                            user: userEmail,
                                            motivo: editFormData.motivo_alteracao,
                                            changes: {
                                                old: {
                                                    nome: editingEntry.servidor_nome,
                                                    cpf: editingEntry.servidor_cpf,
                                                    cargo: editingEntry.cargo,
                                                    secretaria: editingEntry.secretaria,
                                                    tipo: editingEntry.aso_type
                                                },
                                                new: {
                                                    nome: editFormData.servidor_nome,
                                                    cpf: editFormData.servidor_cpf,
                                                    cargo: editFormData.cargo,
                                                    secretaria: editFormData.secretaria,
                                                    tipo: editFormData.aso_type === 'Encaminhamento' ? 'Encaminhamento' : `ASO (${editFormData.aso_type})`
                                                }
                                            }
                                        };

                                        const updatedHistory = [...(editingEntry.edit_history || []), newAudit];

                                        // Detecta tipo selecionado
                                        const asoTypeLabel = editFormData.aso_type;
                                        const isEncaminhamento = asoTypeLabel === 'Encaminhamento';
                                        
                                        // 2. Salvar no Banco
                                        const { error } = await supabase
                                            .from('aso_history')
                                            .update({
                                                aso_type: isEncaminhamento ? 'Encaminhamento' : `ASO (${asoTypeLabel})`,
                                                servidor_nome: editFormData.servidor_nome,
                                                servidor_cpf: editFormData.servidor_cpf,
                                                servidor_nascimento: ensureISO(editFormData.servidor_nascimento),
                                                cargo: editFormData.cargo,
                                                secretaria: editFormData.secretaria,
                                                ghe_conj: editFormData.function_ghe, 
                                                function_name: editFormData.function_name,
                                                risks: editFormData.risks,
                                                exams_json: editFormData.exams,
                                                edit_history: updatedHistory
                                            })
                                            .eq('id', editingEntry.id);

                                        if (error) throw error;

                                        // 3. Reemitir PDF
                                        const { generateASOPDF, generateReferralPDF } = await import("@/lib/pdf-generator");

                                        const servidorMock = {
                                            Nome: editFormData.servidor_nome,
                                            CPF: editFormData.servidor_cpf,
                                            "CPF.": editFormData.servidor_cpf,
                                            "Dt.Nascimento": editFormData.servidor_nascimento,
                                            Cargo: editFormData.cargo,
                                            Secretaria: editFormData.secretaria
                                        };

                                        const currentExamsMock = {
                                            exames: editFormData.exams.map((e: any) => e.name),
                                            riscos: "", 
                                            detalhes: editFormData.risks
                                        };

                                        const datesMock = editFormData.exams.map((e: any) => e.date);
                                        const operatorName = userName.toUpperCase(); 

                                        if (isEncaminhamento) {
                                            generateReferralPDF(servidorMock, currentExamsMock, asoTypeLabel, datesMock, operatorName);
                                        } else {
                                            generateASOPDF(servidorMock, currentExamsMock, asoTypeLabel, datesMock, operatorName);
                                        }

                                        alert("Alterações salvas com sucesso! O novo PDF foi gerado.");
                                        setIsEditModalOpen(false);
                                        loadHistory();
                                    } catch (err) {
                                        console.error("Erro ao salvar edição:", err);
                                        alert("Erro ao processar as alterações no banco de dados.");
                                    } finally {
                                        setIsSavingEdit(false);
                                    }
                                }}
                                disabled={isSavingEdit}
                                className="flex-[2] py-4 px-6 bg-[#1A3351] text-white font-black text-xs uppercase rounded-xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSavingEdit ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processando Registro...
                                    </>
                                ) : (
                                    <>
                                        <Printer className="w-5 h-5" />
                                        Salvar e Reemitir PDF Oficial
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
