"use client";

import { useEffect, useState, useMemo } from "react";
import { getCIDChapter, getCIDDetails, searchCIDs, getCIDDetailsFromDB, normalizeCID } from "@/lib/cid-utils";
import { supabase } from "@/lib/supabase";
import {
    Activity, X, Menu,
    ChevronDown, ChevronUp,
    User, Calendar, ClipboardList, Search, Printer, PlusCircle,
    Building2, CheckCircle2, Clock, RotateCcw, Eye, EyeOff, Pencil, FileEdit, Save,
    FileText, History as HistoryIcon, Users as UsersIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Loader2 } from "lucide-react";
import { generateServidorReportPDF } from "@/lib/afastamento-report-pdf";
import { generateAfastamentosListPDF } from "@/lib/afastamentos-list-pdf";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { generateAfastamentoPDF } from "@/lib/afastamento-portaria-pdf";
import { BarChart3 } from "lucide-react";

interface AfastamentoRecord {
    id: number;
    servidor_cpf: string;
    servidor_nome: string;
    servidor_matricula: string;
    servidor_contrato: string;
    servidor_secretaria: string;
    servidor_cargo: string;
    natureza_cargo: string;
    tipo_afastamento: string;
    data_inicio: string;
    data_fim: string;
    data_pericia: string;
    dias_afastado: number | null;
    perito_nome: string;
    perito_crm: string;
    situacao: 'EM_ANDAMENTO' | 'FINALIZADO' | 'PRORROGADO';
    status: string;
    observacoes: string;
    renovado_por_id: number | null;
    criado_em: string;
    criado_por: string;
    hash_auditoria?: string;
    afastamento_cids?: { cid_codigo: string; cid_descricao: string; cid_capitulo: string }[];
    is_acidente_trabalho: boolean;
    portarias_afastamento?: { numero: number; ano: number; data_emissao: string }[];
}

interface CIDRecord {
    id: number;
    afastamento_id: number;
    cid_codigo: string;
    cid_descricao: string;
    cid_capitulo: string;
}

const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, '');
const formatCpf = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

function CIDBadge({ code }: { code: string }) {
    const [details, setDetails] = useState<any>(null);
    const normalized = normalizeCID(code);
    useEffect(() => { getCIDDetailsFromDB(normalized).then(setDetails); }, [normalized]);
    if (!details) return <span className="text-[13px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-none animate-pulse">{normalized || code}</span>;
    return (
        <div className="group relative">
            <span className="text-[13px] font-bold bg-emerald-100/80 text-emerald-800 px-2.5 py-1 rounded-none border border-emerald-200/50 cursor-help hover:bg-emerald-200 transition-colors">
                {details.code}
            </span>
            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white border-2 border-[#1A3351] shadow-2xl rounded-none z-50 text-left">
                <p className="text-[10px] font-bold text-white bg-[#1A3351] px-2 py-0.5 rounded-none uppercase inline-block mb-1">Cap. {details.chapter}</p>
                <p className="text-xs font-semibold text-slate-800 uppercase leading-snug">{details.desc}</p>
            </div>
        </div>
    );
}

function CIDDetailItem({ cid }: { cid: CIDRecord }) {
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const normalized = normalizeCID(cid.cid_codigo);
        getCIDDetailsFromDB(normalized).then(res => {
            setDetails(res);
            setLoading(false);
        });
    }, [cid.cid_codigo]);

    if (loading) return (
        <div className="py-2 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-3 animate-pulse">
            <div className="w-[50px] h-[32px] bg-slate-100 rounded-none" />
            <div className="space-y-1.5 flex-1">
                <div className="h-2 bg-slate-100 rounded-none w-1/4" />
                <div className="h-3 bg-slate-100 rounded-none w-3/4" />
            </div>
        </div>
    );

    const displayCode = details?.code || normalizeCID(cid.cid_codigo);

    return (
        <div className="py-2 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-3 group/cid">
            <div className="flex flex-col items-center justify-center bg-slate-100 text-[#1A3351] rounded-none px-2 py-1 min-w-[60px] border border-slate-200 group-hover/cid:bg-[#1A3351] group-hover/cid:text-white transition-colors">
                <span className="text-[7px] font-bold uppercase opacity-60 tracking-wider leading-none">Código</span>
                <span className="text-sm font-bold tracking-wide leading-none">{displayCode}</span>
            </div>
            <div className="flex flex-col justify-center">
                <div className="flex items-baseline gap-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">Descrição:</span>
                    <p className="text-xs font-semibold text-[#1A3351] leading-tight">{details?.desc || cid.cid_descricao || '—'}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 mt-0.5">
                    <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Cap:</span>
                        <span className="text-[10px] font-bold text-emerald-700">{details?.chapter || cid.cid_capitulo || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Grupo:</span>
                        <span className="text-[10px] font-medium text-slate-500 truncate max-w-[400px]">{details?.chapter_desc || '—'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AfastamentosPage() {
    const [records, setRecords] = useState<AfastamentoRecord[]>([]);
    const [logs, setLogs] = useState<Record<number, any[]>>({});
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showHeader, setShowHeader] = useState(true);
    const [lastScrollTop, setLastScrollTop] = useState(0);
    const [scrollUpStart, setScrollUpStart] = useState(0);

    const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const isScrollingDown = scrollTop > lastScrollTop;

        if (isScrollingDown) {
            setScrollUpStart(scrollTop);
            if (scrollTop > 150 && showHeader) setShowHeader(false);
        } else {
            // Só mostra se subiu mais de 250px desde o ponto mais baixo ou chegou no topo
            if ((scrollUpStart - scrollTop > 250) || scrollTop < 50) {
                if (!showHeader) setShowHeader(true);
            }
        }
        setLastScrollTop(scrollTop);
    };

    const [expandedCpf, setExpandedCpf] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");
    const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'alert' | 'finished'>('all');
    const [sortBy, setSortBy] = useState<'alphabetical' | 'newest' | 'oldest'>('alphabetical');
    const [secretariaFilter, setSecretariaFilter] = useState<string>('all');
    const [naturezaCargoFilter, setNaturezaCargoFilter] = useState<string>('all');
    const [tipoAfastamentoFilter, setTipoAfastamentoFilter] = useState<string>('all');
    const [cargoFilter, setCargoFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
    const [tempStartDate, setTempStartDate] = useState<string>("");
    const [tempEndDate, setTempEndDate] = useState<string>("");
    const [isPrintPopoverOpen, setIsPrintPopoverOpen] = useState(false);
    const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>('landscape');
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [revealedCids, setRevealedCids] = useState<Set<number>>(new Set());

    // Edit modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AfastamentoRecord | null>(null);
    const [editFormData, setEditFormData] = useState({ data_inicio: "", dias_afastado: "", is_acidente_trabalho: false, cids: [] as any[] });
    const [noteFormData, setNoteFormData] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [cidEditInput, setCidEditInput] = useState("");
    const [foundCids, setFoundCids] = useState<any[]>([]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            const normalized = normalizeCID(cidEditInput);
            if (normalized.length >= 1) {
                const results = await searchCIDs(normalized);
                setFoundCids(results);
            } else setFoundCids([]);
        }, 300);
        return () => clearTimeout(timer);
    }, [cidEditInput]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { session, error } = await safeGetSession();
                if (error) { await handleAuthError(error); return; }
                if (session) {
                    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                    if (data) {
                        setUserRole(data.role);
                        if (data.role !== 'admin' && data.role !== 'nurse') { router.push('/'); return; }
                    }
                    const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Usuário";
                    setUserName(name);
                } else { router.push("/login"); return; }
                loadRecords();
            } catch (err) { await handleAuthError(err); }
        };
        checkAuth();
    }, [router]);

    async function loadRecords() {
        setLoading(true);
        const { data, error } = await supabase
            .from('afastamentos')
            .select('*, afastamento_cids (*), portarias_afastamento (numero, ano, data_emissao)')
            .eq('status', 'ATIVO')
            .order('data_inicio', { ascending: false });

        if (!error && data) {
            // Auto-repair logic: Fix records that should be PRORROGADO or FINALIZADO
            await runAutoRepair(data);

            const withDays = data.map(r => {
                if (r.data_inicio && r.data_fim) {
                    const diff = Math.abs(new Date(r.data_fim).getTime() - new Date(r.data_inicio).getTime());
                    return { ...r, dias_afastado: Math.ceil(diff / 86400000) + 1 };
                }
                return { ...r, dias_afastado: null };
            });
            setRecords(withDays);

            // Carregar Logs de Auditoria
            const { data: logsData } = await supabase
                .from('afastamentos_logs')
                .select('*')
                .order('data_alteracao', { ascending: false });

            if (logsData) {
                const logsMap: Record<number, any[]> = {};
                logsData.forEach((log: any) => {
                    if (!logsMap[log.afastamento_id]) logsMap[log.afastamento_id] = [];
                    logsMap[log.afastamento_id].push(log);
                });
                setLogs(logsMap);
            }

            // Carregar Mapeamento de Perfis (para resolver UUIDs)
            const { data: profilesData } = await supabase.from('profiles').select('id, full_name, email');
            if (profilesData) {
                const pMap: Record<string, string> = {};
                profilesData.forEach(p => {
                    pMap[p.id] = p.full_name || p.email || p.id;
                });
                setProfilesMap(pMap);
            }
        }
        setLoading(false);
    }

    async function runAutoRepair(data: AfastamentoRecord[]) {
        try {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            
            // 1. Records that have 'renovado_por_id' but are still 'EM_ANDAMENTO'
            const toProrrogar = data.filter(r => 
                r.situacao === 'EM_ANDAMENTO' && 
                r.renovado_por_id !== null
            );

            // 2. Records that are clearly expired (over 30 days ago) and still 'EM_ANDAMENTO'
            // We only do this for records that are definitely in the past to avoid false positives
            const toFinalize = data.filter(r => {
                if (r.situacao !== 'EM_ANDAMENTO') return false;
                if (!r.data_fim) return false;
                const end = new Date(r.data_fim + 'T00:00:00');
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(today.getDate() - 30);
                return end < thirtyDaysAgo;
            });

            if (toProrrogar.length > 0) {
                console.log(`Fixing ${toProrrogar.length} records to PRORROGADO...`);
                await supabase.from('afastamentos').update({ situacao: 'PRORROGADO' }).in('id', toProrrogar.map(r => r.id));
                toProrrogar.forEach(r => r.situacao = 'PRORROGADO'); // Update local ref
            }

            if (toFinalize.length > 0) {
                console.log(`Fixing ${toFinalize.length} records to FINALIZADO...`);
                await supabase.from('afastamentos').update({ situacao: 'FINALIZADO' }).in('id', toFinalize.map(r => r.id));
                toFinalize.forEach(r => r.situacao = 'FINALIZADO'); // Update local ref
            }
        } catch (err) {
            console.error("Error in auto-repair:", err);
        }
    }

    async function handleAltaMedica(record: AfastamentoRecord) {
        if (!confirm("Confirmar ALTA MÉDICA? O registro será marcado como FINALIZADO.")) return;
        setUpdatingId(record.id);
        const { error } = await supabase.from('afastamentos').update({ situacao: 'FINALIZADO' }).eq('id', record.id);
        if (!error) setRecords(records.map(r => r.id === record.id ? { ...r, situacao: 'FINALIZADO' } : r));
        setUpdatingId(null);
    }

    const openEditModal = async (record: AfastamentoRecord) => {
        setUpdatingId(record.id);
        const resolvedCids = await Promise.all((record.afastamento_cids || []).map(c => getCIDDetailsFromDB(c.cid_codigo)));
        setEditingRecord(record);
        setEditFormData({ 
            data_inicio: record.data_inicio, 
            dias_afastado: String(record.dias_afastado || ""), 
            is_acidente_trabalho: record.is_acidente_trabalho || false,
            cids: resolvedCids 
        });
        setUpdatingId(null);
        setIsEditModalOpen(true);
    };

    const openNotesModal = (record: AfastamentoRecord) => {
        setEditingRecord(record);
        setNoteFormData(record.observacoes || "");
        setIsNotesModalOpen(true);
    };

    async function handleEditSave() {
        if (!editingRecord) return;
        setIsSavingEdit(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const days = parseInt(editFormData.dias_afastado);
            if (isNaN(days) || days <= 0) { alert("Dias inválidos."); setIsSavingEdit(false); return; }
            const start = new Date(editFormData.data_inicio);
            const end = new Date(start);
            end.setDate(start.getDate() + days - 1);
            const newDataFim = end.toISOString().split('T')[0];

            const oldData = { data_inicio: editingRecord.data_inicio, data_fim: editingRecord.data_fim, is_acidente_trabalho: editingRecord.is_acidente_trabalho, cids: editingRecord.afastamento_cids?.map(c => c.cid_codigo) || [] };
            const newData = { data_inicio: editFormData.data_inicio, data_fim: newDataFim, is_acidente_trabalho: editFormData.is_acidente_trabalho, cids: editFormData.cids.map(c => c.code) };


            const auditHash = `AF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            await supabase.from('afastamentos').update({ 
                data_inicio: editFormData.data_inicio, 
                data_fim: newDataFim, 
                dias_afastado: days,
                is_acidente_trabalho: editFormData.is_acidente_trabalho,
                hash_auditoria: auditHash 
            }).eq('id', editingRecord.id);
            await supabase.from('afastamento_cids').delete().eq('afastamento_id', editingRecord.id);
            for (const cid of editFormData.cids) {
                const chapter = getCIDChapter(cid.code);
                await supabase.from('afastamento_cids').insert({ afastamento_id: editingRecord.id, cid_codigo: cid.code, cid_descricao: cid.desc, cid_capitulo: chapter?.capitulo || 'Desconhecido' });
            }
            await supabase.from('afastamentos_logs').insert({ 
                afastamento_id: editingRecord.id, 
                usuario_id: user?.id,
                usuario_email: user?.email,
                alterado_por: user?.user_metadata?.full_name || user?.email || 'Sistema', 
                dados_anteriores: oldData, 
                dados_novos: { ...newData, hash_auditoria: auditHash }, 
                motivo_alteracao: "Edição manual",
                hash_auditoria: auditHash
            });
            loadRecords();
            setIsEditModalOpen(false);
            alert("Alterações salvas com sucesso!");
        } catch (err: any) { alert("Erro ao salvar: " + err.message); }
        finally { setIsSavingEdit(false); }
    }

    async function handleNoteSave() {
        if (!editingRecord) return;
        setIsSavingNote(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const auditHash = `AF-NOTE-${Date.now().toString(36).toUpperCase()}`;
            
            const { error } = await supabase.from('afastamentos').update({ 
                observacoes: noteFormData,
                hash_auditoria: auditHash
            }).eq('id', editingRecord.id);
            
            if (error) throw error;
            
            await supabase.from('afastamentos_logs').insert({ 
                afastamento_id: editingRecord.id, 
                usuario_id: user?.id,
                usuario_email: user?.email,
                alterado_por: user?.user_metadata?.full_name || user?.email || 'Sistema', 
                dados_anteriores: { observacoes: editingRecord.observacoes }, 
                dados_novos: { observacoes: noteFormData, hash_auditoria: auditHash }, 
                motivo_alteracao: "Atualização de anotações",
                hash_auditoria: auditHash
            });

            loadRecords();
            setIsNotesModalOpen(false);
            alert("Anotação salva com sucesso!");
        } catch (err: any) { alert("Erro ao salvar anotação: " + err.message); }
        finally { setIsSavingNote(false); }
    }

    const handleViewPortaria = (record: any) => {
        const portaria = record.portarias_afastamento?.[0];
        if (!portaria) { alert("Portaria não encontrada para este registro."); return; }
        generateAfastamentoPDF({
            numero: portaria.numero, ano: portaria.ano, servidor_nome: record.servidor_nome,
            servidor_matricula: record.servidor_matricula, servidor_cargo: record.natureza_cargo,
            servidor_lotacao: record.servidor_secretaria, tipo_afastamento: record.tipo_afastamento,
            data_inicio: new Date(record.data_inicio).toLocaleDateString('pt-BR'),
            data_fim: record.data_fim ? new Date(record.data_fim).toLocaleDateString('pt-BR') : '---',
            data_portaria: new Date(portaria.data_emissao).toLocaleDateString('pt-BR'),
            perito_nome: record.perito_nome, perito_crm: record.perito_crm, servidor_contrato: record.servidor_contrato
        }, 'view');
    };

    const formatDate = (d: string) => {
        if (!d || d === 'None' || d === 'null') return '---';
        const p = d.split('-');
        if (p.length !== 3) return '---';
        return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])).toLocaleDateString('pt-BR');
    };

    const getStatus = (record: AfastamentoRecord) => {
        if (record.situacao === 'FINALIZADO' || record.situacao === 'PRORROGADO') return 'finished';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (record.data_fim) {
            const p = record.data_fim.split('-');
            const end = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
            end.setHours(0, 0, 0, 0);
            if (end < today) return record.tipo_afastamento?.toUpperCase().includes('MATERNIDADE') ? 'finished' : 'expired';
            if (Math.ceil((end.getTime() - today.getTime()) / 86400000) <= 10) return 'alert';
        }
        return 'active';
    };

    const getDaysRemaining = (dateFim: string) => {
        if (!dateFim) return null;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const p = dateFim.split('-');
        const end = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
        end.setHours(0, 0, 0, 0);
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const VencimentoAlerta = ({ dateFim, compact = false }: { dateFim: string, compact?: boolean }) => {
        const days = getDaysRemaining(dateFim);
        if (days === null || days < 0 || days >= 11) return null;
        
        return (
            <div className={`flex items-center gap-1.5 text-red-600 font-bold animate-pulse ${compact ? 'text-[8px]' : 'text-xs'} uppercase tracking-tight`}>
                <Clock className={compact ? 'w-2 h-2 text-red-400' : 'w-4 h-4 text-red-500'} />
                {days === 0 ? 'VENCE HOJE' : `Faltam ${days} ${days === 1 ? 'dia' : 'dias'} para vencer`}
            </div>
        );
    };

    const filteredRecords = useMemo(() => {
        return records.filter(record => {
            const normalizedSearch = normalizeCpf(searchTerm);
            const matchesSearch = !searchTerm
                || record.servidor_nome.toLowerCase().includes(searchTerm.toLowerCase())
                || (normalizedSearch.length > 0 && normalizeCpf(record.servidor_cpf).includes(normalizedSearch));
            
            const matchesSecretaria = secretariaFilter === 'all' || record.servidor_secretaria === secretariaFilter;
            const matchesNatureza = naturezaCargoFilter === 'all' || record.natureza_cargo === naturezaCargoFilter;
            const matchesTipo = tipoAfastamentoFilter === 'all' || record.tipo_afastamento === tipoAfastamentoFilter;
            const matchesCargo = cargoFilter === 'all' || record.servidor_cargo === cargoFilter;
            
            let matchesStatus = true;
            if (statusFilter !== 'all') {
                const s = getStatus(record);
                matchesStatus = s === statusFilter;
            }

            let matchesPeriod = true;
            if (startDate || endDate) {
                const recDate = record.data_inicio ? new Date(record.data_inicio + 'T00:00:00') : null;
                if (recDate) {
                    if (startDate && recDate < new Date(startDate + 'T00:00:00')) matchesPeriod = false;
                    if (endDate && recDate > new Date(endDate + 'T00:00:00')) matchesPeriod = false;
                } else matchesPeriod = false;
            }

            return matchesSearch && matchesSecretaria && matchesNatureza && matchesTipo && matchesCargo && matchesPeriod && matchesStatus;
        });
    }, [records, searchTerm, secretariaFilter, naturezaCargoFilter, cargoFilter, tipoAfastamentoFilter, startDate, endDate, statusFilter]);

    const printFiltersDesc = useMemo(() => {
        const filters = [];
        if (secretariaFilter !== 'all') filters.push(secretariaFilter);
        if (naturezaCargoFilter !== 'all') filters.push(naturezaCargoFilter);
        if (cargoFilter !== 'all') filters.push(cargoFilter);
        if (tipoAfastamentoFilter !== 'all') filters.push(tipoAfastamentoFilter);
        if (startDate || endDate) {
            const start = startDate ? formatDate(startDate) : "INÍCIO";
            const end = endDate ? formatDate(endDate) : "HOJE";
            filters.push(`${start} ATÉ ${end}`);
        }
        if (statusFilter !== 'all') {
            const statusMap = { active: 'ATIVOS', expired: 'VENCIDOS', alert: 'EM ALERTA', finished: 'FINALIZADOS' };
            filters.push(statusMap[statusFilter as keyof typeof statusMap] || statusFilter.toUpperCase());
        }
        return filters.length > 0 ? filters.join(' | ').toUpperCase() : 'NENHUM FILTRO APLICADO';
    }, [secretariaFilter, naturezaCargoFilter, cargoFilter, tipoAfastamentoFilter, startDate, endDate, statusFilter]);

    const groupedRecords = useMemo(() => {
        const groups: Record<string, { nome: string, cpf: string, items: AfastamentoRecord[] }> = {};
        filteredRecords.forEach(record => {
            const key = normalizeCpf(record.servidor_cpf);
            if (!groups[key]) groups[key] = { nome: record.servidor_nome, cpf: record.servidor_cpf, items: [] };
            groups[key].items.push(record);
        });
        Object.values(groups).forEach(g => g.items.sort((a, b) => b.data_inicio.localeCompare(a.data_inicio)));
        let result = Object.values(groups);
        if (sortBy === 'alphabetical') result.sort((a, b) => a.nome.localeCompare(b.nome));
        else if (sortBy === 'newest') result.sort((a, b) => (b.items[0]?.data_inicio || "").localeCompare(a.items[0]?.data_inicio || ""));
        else if (sortBy === 'oldest') result.sort((a, b) => (a.items[0]?.data_inicio || "").localeCompare(b.items[0]?.data_inicio || ""));
        return result;
    }, [filteredRecords, sortBy]);

    const stats = useMemo(() => {
        return {
            totalServidores: new Set(filteredRecords.map(r => r.servidor_cpf)).size,
            totalRegistros: filteredRecords.length,
            active: filteredRecords.filter(r => getStatus(r) === 'active').length,
            alert: filteredRecords.filter(r => getStatus(r) === 'alert').length,
            expired: filteredRecords.filter(r => getStatus(r) === 'expired').length,
            finished: filteredRecords.filter(r => getStatus(r) === 'finished').length,
        };
    }, [filteredRecords]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-[#10b981] animate-spin" />
                <p className="text-[#1A3351] uppercase tracking-[0.3em] font-bold text-xs">Carregando Afastamentos...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-x-hidden">
            <div className="print:hidden">
                <Sidebar userRole={userRole} userName={userName} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
            </div>

            <div className={`fixed inset-0 z-[45] bg-black/20 backdrop-blur-[2px] transition-all duration-500 ${expandedCpf ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden relative">
                {/* HEADER */}
                {/* HEADER - Smart Dynamic Header com Colapso de Espaço */}
                <div className={`grid transition-all duration-500 ease-in-out ${showHeader ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                    <div className="overflow-hidden">
                        <section className={`bg-[#B0B0B0] p-4 lg:p-6 py-3 border-b-[6px] border-[#10b981] shrink-0 shadow-lg print:hidden transition-all duration-500 ease-in-out transform ${showHeader ? 'translate-y-0' : '-translate-y-1/2'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3 text-[#1A3351]">
                            <ClipboardList className="w-5 lg:w-6 h-5 lg:h-6" />
                            <h2 className="text-lg lg:text-xl font-bold leading-none uppercase tracking-tight">Gestão de Afastamentos</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* BOTÃO GERAR RELATÓRIO PDF */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsPrintPopoverOpen(!isPrintPopoverOpen)}
                                    className="hidden md:flex items-center justify-center gap-2 px-4 h-10 bg-[#1A3351] text-white font-bold rounded-none shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
                                >
                                    <Printer className="w-4 h-4" />
                                    Gerar Relatório (PDF)
                                    <ChevronDown className={`w-3 h-3 transition-transform ${isPrintPopoverOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isPrintPopoverOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border-2 border-[#1A3351] shadow-2xl z-[110] animate-in fade-in slide-in-from-top-2">
                                        <div className="p-3 border-b border-slate-100 bg-slate-50">
                                            <p className="text-[9px] font-bold text-[#1A3351] uppercase tracking-wider">Escolha a Orientação</p>
                                        </div>
                                        <div className="p-2 space-y-1">
                                            <button
                                                onClick={() => { setPrintLayout('portrait'); setTimeout(() => { window.print(); setIsPrintPopoverOpen(false); }, 100); }}
                                                className={`w-full text-left p-3 rounded-none flex items-center justify-between transition-colors ${printLayout === 'portrait' ? 'bg-[#E31E24]/10 text-[#E31E24]' : 'hover:bg-slate-100 text-slate-600'}`}
                                            >
                                                <span className="text-[10px] font-bold uppercase">↗ Vertical (Retrato)</span>
                                                {printLayout === 'portrait' && <div className="w-1.5 h-1.5 rounded-none bg-[#E31E24]" />}
                                            </button>
                                            <button
                                                onClick={() => { setPrintLayout('landscape'); setTimeout(() => { window.print(); setIsPrintPopoverOpen(false); }, 100); }}
                                                className={`w-full text-left p-3 rounded-none flex items-center justify-between transition-colors ${printLayout === 'landscape' ? 'bg-[#E31E24]/10 text-[#E31E24]' : 'hover:bg-slate-100 text-slate-600'}`}
                                            >
                                                <span className="text-[10px] font-bold uppercase">➡ Horizontal (Paisagem)</span>
                                                {printLayout === 'landscape' && <div className="w-1.5 h-1.5 rounded-none bg-[#E31E24]" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => router.push('/afastamentos/analytics')}
                                className="hidden md:flex items-center justify-center gap-2 px-4 h-10 bg-[#1A3351] text-white font-bold rounded-none shadow-md hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase border border-black/10"
                            >
                                <BarChart3 className="w-4 h-4" />
                                Indicadores BI
                            </button>

                            <button onClick={() => router.push('/afastamentos/new')} className="hidden md:flex items-center justify-center gap-2 px-6 h-10 bg-emerald-600 text-white font-bold rounded-none shadow-md hover:bg-emerald-700 active:scale-95 transition-all text-[10px] uppercase border border-black/10">
                                <PlusCircle className="w-4 h-4" /> Novo Lançamento
                            </button>
                            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-[#1A3351] rounded-none text-white transition-all shadow-md flex items-center gap-2">
                                <Menu className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-2">
                            <div className="flex-[3] relative h-11">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input type="text" placeholder="BUSCAR POR NOME OU CPF..." className="w-full h-full px-10 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase placeholder:text-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="flex-1 relative min-w-[200px] h-11">
                                <button onClick={() => { setTempStartDate(startDate); setTempEndDate(endDate); setIsDatePopoverOpen(!isDatePopoverOpen); }} className="w-full h-full px-4 border border-[#888] shadow-inner bg-[#E8E8E8] flex items-center justify-between text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-all uppercase">
                                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-500" /><span>Filtrar por Período</span></div>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${isDatePopoverOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isDatePopoverOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-80 bg-white border-2 border-[#1A3351] shadow-2xl z-[100] p-5">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-sm font-bold text-[#1A3351] uppercase">Definir Período</h4>
                                            <button onClick={() => setIsDatePopoverOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                                        </div>
                                        <div className="space-y-4">
                                            <div><label className="text-[10px] font-medium text-slate-500 uppercase mb-1 block">Data Inicial</label><input type="date" className="w-full px-4 py-3 border border-slate-200 bg-slate-50 text-sm font-semibold outline-none rounded-none" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} /></div>
                                            <div><label className="text-[10px] font-medium text-slate-500 uppercase mb-1 block">Data Final</label><input type="date" className="w-full px-4 py-3 border border-slate-200 bg-slate-50 text-sm font-semibold outline-none rounded-none" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} /></div>
                                            <div className="flex gap-2 pt-2">
                                                <button onClick={() => { setTempStartDate(""); setTempEndDate(""); setStartDate(""); setEndDate(""); setIsDatePopoverOpen(false); }} className="flex-1 py-3 border border-slate-200 text-slate-400 text-xs font-bold uppercase rounded-none">Limpar</button>
                                                <button onClick={() => { setStartDate(tempStartDate); setEndDate(tempEndDate); setIsDatePopoverOpen(false); }} className="flex-[2] py-3 bg-[#1A3351] text-white text-xs font-bold uppercase rounded-none">Filtrar</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-2 mt-1">
                            <div className="flex-[3] relative h-11">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select className="w-full h-full px-10 border border-[#888] shadow-inner text-xs font-bold bg-[#E8E8E8] outline-none uppercase appearance-none cursor-pointer" value={secretariaFilter} onChange={(e) => setSecretariaFilter(e.target.value)}>
                                    <option value="all">TODAS SECRETARIAS</option>
                                    {Array.from(new Set(records.map(r => r.servidor_secretaria).filter(Boolean))).sort().map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>

                            <div className="flex-1 relative min-w-[200px] h-11">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select className="w-full h-full px-10 border border-[#888] shadow-inner text-xs font-bold bg-[#E8E8E8] outline-none uppercase appearance-none cursor-pointer" value={cargoFilter} onChange={(e) => setCargoFilter(e.target.value)}>
                                    <option value="all">CARGO: TODOS</option>
                                    {Array.from(new Set(records.map(r => r.servidor_cargo).filter(Boolean))).sort().map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>

                            {(secretariaFilter !== 'all' || naturezaCargoFilter !== 'all' || cargoFilter !== 'all' || tipoAfastamentoFilter !== 'all' || searchTerm || startDate || endDate) && (
                                <button onClick={() => { setStartDate(""); setEndDate(""); setTempStartDate(""); setTempEndDate(""); setSecretariaFilter("all"); setNaturezaCargoFilter("all"); setCargoFilter("all"); setTipoAfastamentoFilter("all"); setSearchTerm(""); }} className="px-6 h-11 bg-[#E31E24] text-white text-[10px] font-bold uppercase shadow-md hover:bg-red-700 flex items-center gap-2 shrink-0">
                                    <X className="w-4 h-4" /> ZERAR FILTROS
                                </button>
                            )}
                        </div>
                    </div>
                        </section>
                    </div>
                </div>

                {/* CONTEÚDO */}
                <div onScroll={handleMainScroll} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 print:hidden">
                    {/* STATS CARDS */}
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4 shrink-0">
                        {[
                            { label: 'Total Serv.', value: stats.totalServidores, filter: 'all' as const, activeColor: 'bg-[#1A3351] border-white text-white', baseColor: 'bg-white border-[#1A3351] text-[#1A3351]' },
                            { label: 'Registros', value: stats.totalRegistros, filter: 'all' as const, activeColor: 'bg-slate-500 border-white text-white', baseColor: 'bg-white border-slate-300 text-slate-500' },
                            { label: 'Ativos', value: stats.active, filter: 'active' as const, activeColor: 'bg-emerald-600 border-white text-white', baseColor: 'bg-white border-emerald-500 text-emerald-600' },
                            { label: 'Vencendo', value: stats.alert, filter: 'alert' as const, activeColor: 'bg-amber-500 border-white text-white', baseColor: 'bg-white border-amber-500 text-amber-500' },
                            { label: 'Vencidos', value: stats.expired, filter: 'expired' as const, activeColor: 'bg-[#E31E24] border-white text-white', baseColor: 'bg-white border-[#E31E24] text-[#E31E24]' },
                            { label: 'Finalizados', value: stats.finished, filter: 'finished' as const, activeColor: 'bg-blue-600 border-white text-white', baseColor: 'bg-white border-blue-600 text-blue-600' },
                        ].map(card => (
                            <div key={card.label} onClick={() => setStatusFilter(card.filter)} className={`p-4 lg:p-6 border-l-4 shadow-lg transform hover:scale-[1.02] transition-all cursor-pointer ${statusFilter === card.filter ? card.activeColor : card.baseColor}`}>
                                <p className={`text-[9px] lg:text-[10px] font-medium uppercase tracking-widest leading-tight mb-1 ${statusFilter === card.filter ? 'text-white/60' : 'text-slate-400'}`}>{card.label}</p>
                                <h3 className="text-xl lg:text-3xl font-bold">{card.value}</h3>
                            </div>
                        ))}
                    </div>

                    {/* LISTA */}
                    <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden">
                        <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A3351]">Registros de Afastamento</h3>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center bg-white/50 shadow-inner border border-black/5 h-10 p-1">
                                    {[
                                        { key: 'all', label: 'Todos', color: 'bg-[#1A3351]' },
                                        { key: 'active', label: 'Ativos', color: 'bg-green-600' },
                                        { key: 'alert', label: 'Vencendo', color: 'bg-amber-500' },
                                        { key: 'expired', label: 'Vencidos', color: 'bg-[#E31E24]' },
                                        { key: 'finished', label: 'Finalizados', color: 'bg-blue-600' },
                                    ].map(btn => (
                                        <button key={btn.key} onClick={() => setStatusFilter(btn.key as any)} className={`h-full px-4 text-[10px] font-bold uppercase transition-all flex items-center justify-center ${statusFilter === btn.key ? btn.color + ' text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}`}>
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="hidden lg:block w-px h-6 bg-slate-400/50" />
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-medium text-slate-500 uppercase">Filtrar:</span>
                                        <select value={tipoAfastamentoFilter} onChange={(e) => setTipoAfastamentoFilter(e.target.value)} className="bg-white/70 border border-slate-400 text-[10px] font-bold uppercase px-2 h-10 outline-none shadow-sm cursor-pointer min-w-[140px]">
                                            <option value="all">TODOS OS TIPOS</option>
                                            {Array.from(new Set(records.map(r => r.tipo_afastamento).filter(Boolean))).sort().map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-medium text-slate-500 uppercase">Ordenar:</span>
                                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-white/70 border border-slate-400 text-[10px] font-bold uppercase px-2 h-10 outline-none shadow-sm cursor-pointer">
                                            <option value="alphabetical">Ordem Alfabética</option>
                                            <option value="newest">Mais Novos</option>
                                            <option value="oldest">Mais Antigos</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-200">
                            {groupedRecords.length > 0 ? groupedRecords.map((group) => (
                                <div key={group.cpf}>
                                    <div 
                                        onClick={() => setExpandedCpf(expandedCpf === group.cpf ? null : group.cpf)} 
                                        className={`px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white cursor-pointer transition-all duration-500 border-l-8 relative ${expandedCpf === group.cpf ? 'bg-white border-[#1A3351] z-[50] shadow-2xl scale-[1.02] -mx-2' : 'bg-white border-transparent z-10 hover:border-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`p-3 transition-all duration-500 rounded-none ${expandedCpf === group.cpf ? 'bg-[#1A3351] text-white rotate-3 scale-110 shadow-lg' : 'bg-slate-100 text-slate-400'}`}><User className="w-6 h-6" /></div>
                                            <div>
                                                <h4 className={`font-bold uppercase text-[#1A3351] leading-tight ${expandedCpf === group.cpf ? 'text-xl' : 'text-base'}`}>{group.nome}</h4>
                                                <div className="flex flex-wrap gap-4 mt-1 items-center">
                                                    <p className="text-[10px] font-medium text-slate-500 uppercase">CPF: {formatCpf(group.cpf)}</p>
                                                    {group.items[0].servidor_secretaria && <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400" /> {group.items[0].servidor_secretaria}</p>}
                                                    {group.items[0].natureza_cargo && <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><Activity className="w-3 h-3 text-slate-400" /> {group.items[0].natureza_cargo}</p>}
                                                    <span className="text-[10px] font-bold px-2 h-5 bg-emerald-100 text-emerald-700 uppercase border border-emerald-200 flex items-center">
                                                        {group.items.filter(i => getStatus(i) === 'active' || getStatus(i) === 'alert').length} VIGENTE(S)
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 h-5 bg-slate-200 text-slate-600 uppercase border border-slate-300 flex items-center">
                                                        {group.items.length} TOTAL
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        const { data: servantBonds } = await supabase
                                                            .from('servidores')
                                                            .select('matricula, cargo, contrato, natureza_cargo, secretaria')
                                                            .eq('cpf', group.cpf);
                                                        
                                                        const bonds = servantBonds?.map(b => ({
                                                            matricula: b.matricula,
                                                            cargo: b.cargo || b.natureza_cargo,
                                                            contrato: b.contrato,
                                                            natureza: b.natureza_cargo,
                                                            secretaria: b.secretaria
                                                        })) || [];

                                                        generateServidorReportPDF({ nome: group.nome, cpf: group.cpf }, group.items, bonds);
                                                    } catch (err) {
                                                        console.error("Erro ao gerar relatório:", err);
                                                        generateServidorReportPDF({ nome: group.nome, cpf: group.cpf }, group.items, []);
                                                    }
                                                }}
                                                className="flex items-center gap-2 px-4 h-11 bg-white text-[#1A3351] hover:bg-slate-50 font-bold border border-slate-200 text-[10px] uppercase transition-all shadow-sm active:scale-95 group/btn shrink-0"
                                            >
                                                <FileText className="w-4 h-4 text-slate-400 group-hover/btn:text-[#1A3351]" /> Relatório
                                            </button>

                                            {expandedCpf !== group.cpf && (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="hidden md:flex items-stretch bg-slate-100/80 px-4 h-11 border border-slate-200">
                                                        <div className="flex flex-col justify-center leading-none min-w-[80px]">
                                                            <p className="text-[7px] font-medium text-slate-500 uppercase mb-1">Último Início</p>
                                                            <p className="text-[11px] font-bold text-[#1A3351]">{formatDate(group.items[0].data_inicio)}</p>
                                                        </div>
                                                        <div className="w-px bg-slate-200 mx-3 my-2" />
                                                        <div className="flex flex-col justify-center leading-none min-w-[80px]">
                                                            <p className="text-[7px] font-medium text-slate-500 uppercase mb-1">Próximo Término</p>
                                                            <p className={`text-[11px] font-bold ${(() => {
                                                                if (!group.items[0].data_fim) return 'text-slate-400';
                                                                const e = new Date(group.items[0].data_fim); e.setHours(0,0,0,0);
                                                                const t = new Date(); t.setHours(0,0,0,0);
                                                                return e < t ? 'text-[#E31E24]' : 'text-green-600';
                                                            })()}`}>{formatDate(group.items[0].data_fim)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-center w-8 h-11">
                                                {expandedCpf !== group.cpf ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-[#1A3351]" />}
                                            </div>
                                        </div>
                                    </div>

                                    {expandedCpf === group.cpf && (
                                        <div className="px-4 md:px-12 py-8 bg-white border-t border-slate-100 animate-in slide-in-from-top-4 fade-in duration-500 relative z-[50] -mx-2 shadow-2xl ring-1 ring-black/5">
                                            <div className="space-y-6">
                                                <h5 className="text-[11px] font-bold uppercase text-slate-400 tracking-[0.2em] border-b pb-2">Histórico de Benefícios</h5>

                                                <div className="grid grid-cols-1 gap-6">
                                                    {group.items.map((record) => {
                                                        const status = getStatus(record);
                                                        return (
                                                            <div key={record.id} className="bg-white p-6 border-2 border-slate-200 shadow-sm hover:border-[#1A3351]/30 transition-all relative overflow-hidden group/card">
                                                                <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-[#1A3351]/5 group-hover/card:bg-[#1A3351]/10 transition-colors" />

                                                            {/* INFO GRID - 3 colunas */}
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                                                {/* COLUNA 1: VÍNCULO (ESQUERDA) */}
                                                                <div className="space-y-1">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Vínculo do Afastamento</p>
                                                                    <div className="flex flex-col gap-1 mt-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-medium text-slate-500 uppercase min-w-[60px]">Matrícula:</span>
                                                                            <span className="text-sm font-semibold text-[#1A3351]">{record.servidor_matricula}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-medium text-slate-500 uppercase min-w-[60px]">Contrato:</span>
                                                                            <span className="text-sm font-semibold text-[#1A3351]">{record.servidor_contrato}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-medium text-slate-500 uppercase min-w-[60px]">Cargo:</span>
                                                                            <span className="text-[11px] font-semibold text-[#1A3351] uppercase">{record.servidor_cargo || '---'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-medium text-slate-500 uppercase min-w-[60px]">Natureza:</span>
                                                                            <span className="text-[11px] font-semibold text-[#1A3351] uppercase">{record.natureza_cargo}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* COLUNA 2: DADOS ADICIONAIS (CENTRO) */}
                                                                <div className="space-y-1">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Dados Adicionais</p>
                                                                    <div className="flex flex-col gap-2 mt-1">
                                                                        <div>
                                                                            <span className="text-[10px] font-medium text-slate-500 block uppercase">Duração</span>
                                                                            <span className="text-sm font-semibold text-[#1A3351] flex items-center gap-1"><Clock className="w-3.5 h-3.5 opacity-50" /> {record.dias_afastado || 'N/D'} Dias</span>
                                                                        </div>
                                                                        <div>
                                                                             <span className="text-[10px] font-medium text-slate-500 block uppercase">Diagnóstico (CID-10)</span>
                                                                             <span className="text-xs font-semibold text-[#1A3351]">{record.afastamento_cids?.length || 0} código(s) registrado(s)</span>
                                                                         </div>
                                                                    </div>
                                                                </div>

                                                                {/* COLUNA 3: VIGÊNCIA E TIPO (DIREITA) */}
                                                                <div className="space-y-1 md:text-right flex flex-col md:items-end">
                                                                    <div className="flex items-center gap-2 md:justify-end">
                                                                        {record.is_acidente_trabalho && (
                                                                            <span className="text-[9px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-none shadow-sm animate-pulse">ACIDENTE DE TRABALHO</span>
                                                                        )}
                                                                        <p className="text-sm font-semibold text-[#1A3351] uppercase truncate">{record.tipo_afastamento}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-1 md:justify-end">
                                                                        <span className="text-xs font-medium text-slate-500 uppercase">Início:</span>
                                                                        <span className="text-sm font-semibold text-[#1A3351]">{formatDate(record.data_inicio)}</span>
                                                                    </div>
                                                                    <div className="flex flex-col md:items-end gap-1">
                                                                        <div className="flex items-center gap-2 md:justify-end">
                                                                            <span className="text-xs font-medium text-slate-500 uppercase">Término:</span>
                                                                            {record.data_fim ? (
                                                                                <span className="flex flex-wrap items-center gap-1.5 md:justify-end">
                                                                                    <span className={status === 'expired' ? 'text-sm font-bold text-[#E31E24]' : 'text-sm font-bold text-green-600'}>{formatDate(record.data_fim)}</span>
                                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-none border font-bold ${status === 'active' || status === 'alert' ? 'bg-green-500 text-white border-green-600' : status === 'finished' ? 'bg-slate-300 text-slate-600 border-slate-400' : 'bg-[#E31E24] text-white border-[#E31E24]'}`}>
                                                                                        {status === 'active' ? 'VIGENTE' : status === 'alert' ? 'VENCENDO' : status === 'finished' ? 'FINALIZADO' : 'VENCIDO'}
                                                                                    </span>
                                                                                </span>
                                                                            ) : <span className="text-sm font-semibold text-slate-400">---</span>}
                                                                        </div>
                                                                        {record.situacao !== 'FINALIZADO' && record.data_fim && (
                                                                            <VencimentoAlerta dateFim={record.data_fim} />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* BOTÕES - parte inferior, distribuídos horizontalmente */}
                                                            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100 relative z-10 justify-start">
                                                                <button onClick={() => handleViewPortaria(record)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-200 text-slate-800 hover:bg-slate-300 font-bold rounded-none border border-slate-300 text-[10px] uppercase transition-all">
                                                                    <Printer className="w-3 h-3" /> Portaria
                                                                </button>
                                                                <button onClick={() => openEditModal(record)} className="flex items-center gap-1.5 px-2 py-1 bg-[#1A3351] text-white font-bold rounded-none border border-[#0f2035] text-[10px] uppercase hover:bg-[#0f2035] active:scale-95 transition-all">
                                                                    <Pencil className="w-3 h-3" /> Editar
                                                                </button>
                                                                <button onClick={() => openNotesModal(record)} className="flex items-center gap-1.5 px-2 py-1 bg-[#1A3351] text-white font-bold rounded-none border border-[#0f2035] text-[10px] uppercase hover:bg-[#0f2035] active:scale-95 transition-all">
                                                                    <ClipboardList className="w-3 h-3" /> Anotações
                                                                </button>
                                                                {record.situacao === 'EM_ANDAMENTO' && (
                                                                    <>
                                                                        <button onClick={() => router.push(`/afastamentos/new?renew_from=${record.id}&cpf=${record.servidor_cpf}`)} className="flex items-center gap-1.5 px-2 py-1 bg-amber-400 text-amber-900 text-[10px] font-bold rounded-none border border-amber-500 hover:bg-amber-600 hover:text-white uppercase transition-all">
                                                                            <RotateCcw className="w-3 h-3" /> PRORROGAR
                                                                        </button>
                                                                        {!record.tipo_afastamento?.toUpperCase().includes('MATERNIDADE') && (
                                                                            <button onClick={() => handleAltaMedica(record)} disabled={updatingId === record.id} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-none border border-emerald-700 hover:bg-emerald-700 uppercase transition-all disabled:opacity-50">
                                                                                {updatingId === record.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                                                DAR ALTA
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {/* Botão CID isolado à direita */}
                                                                <button onClick={() => { const s = new Set(revealedCids); if (s.has(record.id)) s.delete(record.id); else s.add(record.id); setRevealedCids(s); }} className="flex items-center gap-1.5 px-2 py-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-none text-[10px] uppercase transition-all ml-auto">
                                                                    {revealedCids.has(record.id) ? <><EyeOff className="w-3 h-3 text-emerald-600" /> Ocultar CID</> : <><Eye className="w-3 h-3 text-emerald-600" /> Revelar CID</>}
                                                                </button>
                                                            </div>

                                                            {/* PAINEL CID EXPANDIDO */}
                                                            {revealedCids.has(record.id) && (
                                                                <div className="mt-4 border-t border-slate-100 pt-3 relative z-10">
                                                                    <div className="flex flex-col gap-3">
                                                                        {/* CID-10 SECTION */}
                                                                        {record.afastamento_cids && record.afastamento_cids.length > 0 && (
                                                                            <div className="divide-y divide-slate-100">
                                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diagnósticos CID-10</p>
                                                                                {record.afastamento_cids.map((cid: any) => (
                                                                                    <CIDDetailItem key={cid.id} cid={cid} />
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {/* ANOTAÇÕES SECTION */}
                                                                        <div className="bg-slate-50/50 p-3 rounded-none border border-slate-200/50">
                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                                <ClipboardList className="w-3 h-3" /> Anotações do Registro
                                                                            </p>
                                                                            {record.observacoes ? (
                                                                                <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{record.observacoes}</p>
                                                                            ) : (
                                                                                <p className="text-[10px] font-medium text-slate-400 italic">Nenhuma anotação registrada para este afastamento.</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {/* INFO DE AUDITORIA - SEM NEGRITO, TOTALMENTE UNIFICADO */}
                                                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end text-[10px] items-center gap-1.5 font-normal text-slate-500 uppercase tracking-tighter relative z-10 transition-opacity hover:opacity-100 opacity-80">
                                                                <span>Criado por:</span>
                                                                <span className="text-slate-600">{profilesMap[record.criado_por] || record.criado_por || 'Sistema'}</span>
                                                                <span className="lowercase">({new Date(record.criado_em).toLocaleString('pt-BR')})</span>
                                                                
                                                                {logs[record.id] && logs[record.id].length > 0 && (
                                                                    <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200">
                                                                        <span>Modificado por:</span>
                                                                        <span className="text-slate-600">{profilesMap[logs[record.id][0].alterado_por] || logs[record.id][0].alterado_por}</span>
                                                                        <span className="lowercase">({new Date(logs[record.id][0].data_alteracao).toLocaleString('pt-BR')})</span>
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200">
                                                                    <span>Audit ID</span>
                                                                    <span className="text-slate-700 tracking-tight">#{record.hash_auditoria || `AF-${record.id}`}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )})}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )) : (
                            <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs">Nenhum registro encontrado para os filtros selecionados.</div>
                        )}
                    </div>
                </div>
            </div>
        </main>

            {/* MODAL DE EDIÇÃO */}
            {isEditModalOpen && editingRecord && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-none shadow-2xl border-4 border-[#1A3351] w-full max-w-2xl flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-none-t-lg">
                            <div>
                                <h3 className="text-sm font-bold text-[#1A3351] uppercase flex items-center gap-2"><FileEdit className="w-5 h-5" /> Editar Afastamento</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Auditoria ativada — alterações serão registradas.</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6 text-left">
                            <div className="bg-slate-100 p-4 rounded-none">
                                <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">Servidor</p>
                                <p className="text-base font-bold text-[#1A3351]">{editingRecord.servidor_nome}</p>
                                <p className="text-xs font-bold text-slate-600">Matrícula: {editingRecord.servidor_matricula}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">Data de Início</label>
                                    <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-none font-bold text-slate-700 outline-none" value={editFormData.data_inicio} onChange={(e) => setEditFormData({ ...editFormData, data_inicio: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">Dias Afastado</label>
                                    <input type="number" min="1" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-none font-bold text-slate-700 outline-none" value={editFormData.dias_afastado} onChange={(e) => setEditFormData({ ...editFormData, dias_afastado: e.target.value })} />
                                </div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-none border border-red-100 flex items-center justify-between group cursor-pointer"
                                onClick={() => setEditFormData({ ...editFormData, is_acidente_trabalho: !editFormData.is_acidente_trabalho })}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all ${editFormData.is_acidente_trabalho ? 'bg-red-600 border-red-600' : 'bg-white border-slate-300'}`}>
                                        {editFormData.is_acidente_trabalho && <Activity className="w-4 h-4 text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-red-800 uppercase leading-none">Acidente de Trabalho</p>
                                        <p className="text-[10px] font-bold text-red-600/60 uppercase mt-0.5">ESTE AFASTAMENTO É DECORRENTE DE ACIDENTE LABORAL?</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-none ${editFormData.is_acidente_trabalho ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {editFormData.is_acidente_trabalho ? 'SIM' : 'NÃO'}
                                </span>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Diagnósticos CID-10</label>
                                <div className="flex flex-wrap gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-none min-h-[60px]">
                                    {editFormData.cids.map((cid, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-none border border-emerald-200">
                                            <span className="text-xs font-bold text-emerald-800">{cid.code}</span>
                                            <button onClick={() => setEditFormData({ ...editFormData, cids: editFormData.cids.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ))}
                                    {editFormData.cids.length === 0 && <span className="text-xs font-bold text-slate-400 italic">Nenhum CID selecionado.</span>}
                                </div>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="BUSCAR NOVO CID..." className="w-full px-10 py-3 bg-slate-50 border border-slate-300 rounded-none font-bold text-slate-700 text-xs outline-none uppercase" value={cidEditInput} onChange={(e) => setCidEditInput(e.target.value.toUpperCase())} />
                                    {foundCids.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 shadow-xl rounded-none max-h-[200px] overflow-y-auto z-[160]">
                                            {foundCids.map((cid, i) => (
                                                <button key={i} onClick={() => { 
                                                    const normalized = normalizeCID(cid.code);
                                                    if (!editFormData.cids.find(c => normalizeCID(c.code) === normalized)) {
                                                        setEditFormData({ ...editFormData, cids: [...editFormData.cids, { ...cid, code: normalized }] });
                                                    }
                                                    setCidEditInput(""); setFoundCids([]); 
                                                }} className="w-full text-left px-4 py-3 border-b hover:bg-emerald-50 transition-colors flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-emerald-700">{cid.code}</span>
                                                    <span className="text-[10px] font-bold text-slate-600 truncate">{cid.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-none-b-lg flex justify-end gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} disabled={isSavingEdit} className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-none">Cancelar</button>
                            <button onClick={handleEditSave} disabled={isSavingEdit} className="px-6 py-2.5 bg-[#1A3351] text-white font-bold text-xs uppercase rounded-none flex items-center gap-2">
                                {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE ANOTAÇÕES */}
            {isNotesModalOpen && editingRecord && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white rounded-none shadow-2xl border-4 border-[#1A3351] w-full max-w-lg flex flex-col">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-none-t-lg">
                            <h3 className="text-sm font-bold text-[#1A3351] uppercase flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Anotações do Afastamento</h3>
                            <button onClick={() => setIsNotesModalOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-100 px-4 py-3 rounded-none border border-slate-200 mb-2">
                                <p className="text-[10px] font-bold uppercase text-slate-500 leading-none mb-1">Servidor</p>
                                <p className="text-sm font-bold text-[#1A3351]">{editingRecord.servidor_nome}</p>
                            </div>
                            <textarea
                                className="w-full p-4 bg-slate-50 border border-slate-300 rounded-none font-bold text-slate-700 text-xs outline-none min-h-[200px] resize-none focus:border-[#1A3351] focus:ring-1 focus:ring-[#1A3351] transition-all"
                                placeholder="INSIRA AQUI OBSERVAÇÕES ADICIONAIS SOBRE ESTE AFASTAMENTO..."
                                value={noteFormData}
                                onChange={(e) => setNoteFormData(e.target.value.toUpperCase())}
                                autoFocus
                            />
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-none-b-lg flex justify-end gap-3">
                            <button onClick={() => setIsNotesModalOpen(false)} disabled={isSavingNote} className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-none">Cancelar</button>
                            <button onClick={handleNoteSave} disabled={isSavingNote} className="px-6 py-2.5 bg-[#1A3351] text-white font-bold text-xs uppercase rounded-none flex items-center gap-2">
                                {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Anotação
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* RELATÓRIO PDF (OCULTO NA TELA, VISÍVEL NA IMPRESSÃO) */}
            <div id="print-area" className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 pt-1 overflow-y-auto">
                {/* CABEÇALHO OFICIAL - ULTRA COMPACTO (SYNC COM ABONO) */}
                <div className="flex justify-between items-center border-b-[1px] border-slate-200 pb-1.5 mb-2">
                    <div className="flex items-center gap-3">
                        <img src="/images/logo.png" alt="Logo" className="h-12 w-auto object-contain" />
                        <div className="h-10 w-[1px] bg-slate-200 mx-1" />
                        <div className="flex flex-col">
                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-0.5">Prefeitura Três Lagoas</p>
                            <p className="text-[9px] font-medium text-slate-400 uppercase leading-none">SESMT - Saúde Ocupacional</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-base font-bold text-[#1A3351] uppercase tracking-tighter leading-tight">Relatório Gerencial de Afastamentos</h1>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">
                            OP: {userName} | {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>

                {/* RESUMO DOS FILTROS - DISCRETO (SYNC COM ABONO) */}
                <div className="flex items-center justify-between bg-slate-50/50 p-1 mb-2 border border-slate-100 rounded-none">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-3.5 bg-[#E31E24]" />
                        <p className="text-[8px] font-bold uppercase text-[#1A3351]">
                            REGISTROS: <span className="text-[#E31E24]">{filteredRecords.length}</span>
                        </p>
                    </div>
                    <p className="text-[7.5px] font-medium uppercase text-slate-400 truncate max-w-[60%] italic">
                        FILTROS: {printFiltersDesc}
                    </p>
                </div>

                {/* TABELA DE DADOS - MÁXIMA COMPACTAÇÃO (SYNC COM ABONO) */}
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                            <th className="p-1 px-2 text-[8px] font-bold uppercase text-slate-500 text-left border border-slate-200">Nome do Servidor</th>
                            <th className="p-1 px-2 text-[8px] font-bold uppercase text-slate-500 text-left border border-slate-200">Identificação</th>
                            <th className="p-1 text-[8px] font-bold uppercase text-slate-500 text-center border border-slate-200">Início</th>
                            <th className="p-1 text-[8px] font-bold uppercase text-slate-500 text-center border border-slate-200">Término</th>
                            <th className="p-1 px-2 text-[8px] font-bold uppercase text-slate-500 text-left border border-slate-200">Secretaria</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.sort((a, b) => a.servidor_nome.localeCompare(b.servidor_nome)).map((record, index) => (
                            <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} border-b border-slate-100`}>
                                <td className="p-0.5 px-2 border border-slate-100 font-medium max-w-[200px]">
                                    <p className="text-[9px] font-bold text-slate-700 uppercase leading-tight truncate">{record.servidor_nome}</p>
                                    <p className="text-[7.5px] text-slate-400 font-medium mt-0.5 uppercase tracking-tighter truncate">{record.servidor_cargo || record.natureza_cargo || '---'}</p>
                                </td>
                                <td className="p-0.5 px-2 border border-slate-100 uppercase">
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[8px] text-slate-500 mb-0.5"><span className="font-bold text-slate-400">MATRI:</span> {record.servidor_matricula}</span>
                                        {record.servidor_contrato && <span className="text-[8px] text-slate-500"><span className="font-bold text-slate-400">CONTRATO:</span> {record.servidor_contrato}</span>}
                                    </div>
                                </td>
                                <td className="p-0.5 text-[8px] font-bold text-[#1A3351] border border-slate-100 text-center whitespace-nowrap">{formatDate(record.data_inicio)}</td>
                                <td className="p-0.5 text-[8px] font-bold text-[#E31E24] border border-slate-100 text-center whitespace-nowrap">{formatDate(record.data_fim)}</td>
                                <td className="p-0.5 px-2 text-[8px] font-normal text-slate-400 border border-slate-100 uppercase leading-tight truncate max-w-[180px]">{record.servidor_secretaria || '---'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* RODAPÉ DO PDF */}
                <div className="mt-4 pt-1 border-t border-slate-100 flex justify-center items-center opacity-60">
                    <p className="text-[7.5px] font-normal text-slate-500">Gerado via SESMT SYSTEM - Powered by UXBRAS®</p>
                </div>

                <style jsx global>{`
                    @media print {
                        /* CASO O COMPONENTE ESTEJA ANINHADO, GARANTE QUE SÓ ELE SEJA VISÍVEL */
                        html, body {
                            height: auto !important;
                            overflow: visible !important;
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }

                        #print-area {
                            display: block !important;
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            z-index: 99999 !important;
                            background: white !important;
                        }

                        #print-area table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                        }

                        #print-area tr {
                            page-break-inside: avoid !important;
                        }

                        @page {
                            size: ${printLayout};
                            margin: 0.5cm;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}
