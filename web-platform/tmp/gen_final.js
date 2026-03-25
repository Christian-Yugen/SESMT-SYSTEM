import fs from 'fs';

const content = `"use client";

import { useEffect, useState, useMemo } from "react";
import { getCIDChapter, getCIDDetails, searchCIDs, getCIDDetailsFromDB } from "@/lib/cid-utils";
import { supabase } from "@/lib/supabase";
import {
    Activity, X, Menu,
    ChevronDown, ChevronUp,
    User, Calendar, ClipboardList, Search, Printer, PlusCircle,
    Building2, CheckCircle2, Clock, RotateCcw, Eye, EyeOff, Pencil, FileEdit, Save
} from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Loader2 } from "lucide-react";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { generateAfastamentoPDF } from "@/lib/afastamento-portaria-pdf";

interface AfastamentoRecord {
    id: number;
    servidor_cpf: string;
    servidor_nome: string;
    servidor_matricula: string;
    servidor_contrato: string;
    servidor_secretaria: string;
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
    afastamento_cids?: CIDRecord[];
    portarias_afastamento?: { numero: string; ano: string; data_emissao: string }[];
}

interface CIDRecord {
    id: number;
    afastamento_id: number;
    cid_codigo: string;
    cid_descricao: string;
    cid_capitulo: string;
}

const normalizeCpf = (cpf: string) => cpf.replace(/\\D/g, '');
const formatCpf = (cpf: string) => {
    const digits = cpf.replace(/\\D/g, '');
    if (digits.length !== 11) return cpf;
    return \`\${digits.slice(0, 3)}.\${digits.slice(3, 6)}.\${digits.slice(6, 9)}-\${digits.slice(9, 11)}\`;
};

function CIDBadge({ code }: { code: string }) {
    const [details, setDetails] = useState<any>(null);
    useEffect(() => { getCIDDetailsFromDB(code).then(setDetails); }, [code]);
    if (!details) return <span className="text-[13px] font-black bg-slate-100 text-slate-700 px-2.5 py-1 rounded animate-pulse">{code}</span>;
    return (
        <div className="group relative">
            <span className="text-[13px] font-black bg-emerald-100/80 text-emerald-800 px-2.5 py-1 rounded border border-emerald-200/50 cursor-help hover:bg-emerald-200 transition-colors">
                {details.code}
            </span>
            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white border-2 border-[#1A3351] shadow-2xl rounded-lg z-50 text-left">
                <p className="text-[10px] font-black text-white bg-[#1A3351] px-2 py-0.5 rounded-full uppercase inline-block mb-1">Cap. {details.chapter}</p>
                <p className="text-xs font-black text-slate-800 uppercase leading-snug">{details.desc}</p>
            </div>
        </div>
    );
}

export default function AfastamentosPage() {
    const [records, setRecords] = useState<AfastamentoRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCpf, setExpandedCpf] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'alert' | 'finished'>('all');
    const [sortBy, setSortBy] = useState<'alphabetical' | 'newest' | 'oldest'>('alphabetical');
    const [secretariaFilter, setSecretariaFilter] = useState<string>('all');
    const [naturezaCargoFilter, setNaturezaCargoFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
    const [tempStartDate, setTempStartDate] = useState<string>("");
    const [tempEndDate, setTempEndDate] = useState<string>("");
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [revealedCids, setRevealedCids] = useState<Set<number>>(new Set());

    // Edit modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AfastamentoRecord | null>(null);
    const [editFormData, setEditFormData] = useState({ data_inicio: "", dias_afastado: "", cids: [] as any[] });
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [cidEditInput, setCidEditInput] = useState("");
    const [foundCids, setFoundCids] = useState<any[]>([]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (cidEditInput.trim().length >= 1) {
                const results = await searchCIDs(cidEditInput);
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
            const withDays = data.map(r => {
                if (r.data_inicio && r.data_fim) {
                    const diff = Math.abs(new Date(r.data_fim).getTime() - new Date(r.data_inicio).getTime());
                    return { ...r, dias_afastado: Math.ceil(diff / 86400000) + 1 };
                }
                return { ...r, dias_afastado: null };
            });
            setRecords(withDays);
        }
        setLoading(false);
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
        setEditFormData({ data_inicio: record.data_inicio, dias_afastado: String(record.dias_afastado || ""), cids: resolvedCids });
        setUpdatingId(null);
        setIsEditModalOpen(true);
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

            const oldData = { data_inicio: editingRecord.data_inicio, data_fim: editingRecord.data_fim, cids: editingRecord.afastamento_cids?.map(c => c.cid_codigo) || [] };
            const newData = { data_inicio: editFormData.data_inicio, data_fim: newDataFim, cids: editFormData.cids.map(c => c.code) };

            await supabase.from('afastamentos').update({ data_inicio: editFormData.data_inicio, data_fim: newDataFim, dias_afastado: days }).eq('id', editingRecord.id);
            await supabase.from('afastamento_cids').delete().eq('afastamento_id', editingRecord.id);
            for (const cid of editFormData.cids) {
                const chapter = getCIDChapter(cid.code);
                await supabase.from('afastamento_cids').insert({ afastamento_id: editingRecord.id, cid_codigo: cid.code, cid_descricao: cid.desc, cid_capitulo: chapter?.capitulo || 'Desconhecido' });
            }
            await supabase.from('afastamentos_logs').insert({ afastamento_id: editingRecord.id, alterado_por: user?.email || 'Sistema', dados_anteriores: oldData, dados_novos: newData, motivo_alteracao: "Edição manual" });
            loadRecords();
            setIsEditModalOpen(false);
            alert("Alterações salvas com sucesso!");
        } catch (err: any) { alert("Erro ao salvar: " + err.message); }
        finally { setIsSavingEdit(false); }
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
        if (record.situacao === 'FINALIZADO') return 'finished';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (record.data_fim) {
            const end = new Date(record.data_fim); end.setHours(0, 0, 0, 0);
            if (end < today) return record.tipo_afastamento?.toUpperCase().includes('MATERNIDADE') ? 'finished' : 'expired';
            if (Math.ceil((end.getTime() - today.getTime()) / 86400000) <= 15) return 'alert';
        }
        return 'active';
    };

    const filteredRecords = useMemo(() => {
        return records.filter(record => {
            const normalizedSearch = normalizeCpf(searchTerm);
            const matchesSearch = !searchTerm
                || record.servidor_nome.toLowerCase().includes(searchTerm.toLowerCase())
                || (normalizedSearch.length > 0 && normalizeCpf(record.servidor_cpf).includes(normalizedSearch));
            const matchesSecretaria = secretariaFilter === 'all' || record.servidor_secretaria === secretariaFilter;
            const matchesNatureza = naturezaCargoFilter === 'all' || record.natureza_cargo === naturezaCargoFilter;
            let matchesPeriod = true;
            if (startDate || endDate) {
                const recDate = record.data_inicio ? new Date(record.data_inicio + 'T00:00:00') : null;
                if (recDate) {
                    if (startDate && recDate < new Date(startDate + 'T00:00:00')) matchesPeriod = false;
                    if (endDate && recDate > new Date(endDate + 'T00:00:00')) matchesPeriod = false;
                } else matchesPeriod = false;
            }
            return matchesSearch && matchesSecretaria && matchesNatureza && matchesPeriod;
        });
    }, [records, searchTerm, secretariaFilter, naturezaCargoFilter, startDate, endDate]);

    const groupedRecords = useMemo(() => {
        const groups: Record<string, { nome: string, cpf: string, items: AfastamentoRecord[] }> = {};
        filteredRecords.forEach(record => {
            const status = getStatus(record);
            if (statusFilter !== 'all' && status !== statusFilter) return;
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
    }, [filteredRecords, statusFilter, sortBy]);

    const stats = useMemo(() => {
        return {
            totalServidores: new Set(records.map(r => r.servidor_cpf)).size,
            totalRegistros: records.length,
            active: records.filter(r => getStatus(r) === 'active').length,
            alert: records.filter(r => getStatus(r) === 'alert').length,
            expired: records.filter(r => getStatus(r) === 'expired').length,
            finished: records.filter(r => getStatus(r) === 'finished').length,
        };
    }, [records]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-[#10b981] animate-spin" />
                <p className="text-[#1A3351] uppercase tracking-[0.3em] font-black text-xs">Carregando Afastamentos...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-x-hidden">
            <Sidebar userRole={userRole} userName={userName} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden">
                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 lg:p-6 py-3 border-b-[6px] border-[#10b981] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3 text-[#1A3351]">
                            <ClipboardList className="w-5 lg:w-6 h-5 lg:h-6" />
                            <h2 className="text-lg lg:text-xl font-black leading-none uppercase tracking-tight">Gestão de Afastamentos</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => router.push('/afastamentos/new')} className="hidden md:flex items-center justify-center gap-2 px-6 h-10 bg-emerald-600 text-white font-black rounded shadow-md hover:bg-emerald-700 active:scale-95 transition-all text-[10px] uppercase border border-black/10">
                                <PlusCircle className="w-4 h-4" /> Novo Lançamento
                            </button>
                            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-[#1A3351] rounded-lg text-white transition-all shadow-md flex items-center gap-2">
                                <Menu className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-2">
                            <div className="flex-[3] relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input type="text" placeholder="BUSCAR POR NOME OU CPF..." className="w-full px-10 py-2.5 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase placeholder:text-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="flex-1 relative min-w-[200px]">
                                <button onClick={() => { setTempStartDate(startDate); setTempEndDate(endDate); setIsDatePopoverOpen(!isDatePopoverOpen); }} className="w-full h-full min-h-[40px] px-4 py-2 border border-[#888] shadow-inner bg-[#E8E8E8] flex items-center justify-between text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-all uppercase">
                                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-500" /><span>Filtrar por Período</span></div>
                                    <ChevronDown className={\`w-3 h-3 transition-transform \${isDatePopoverOpen ? 'rotate-180' : ''}\`} />
                                </button>
                                {isDatePopoverOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-80 bg-white border-2 border-[#1A3351] shadow-2xl z-[100] p-5">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-sm font-black text-[#1A3351] uppercase">Definir Período</h4>
                                            <button onClick={() => setIsDatePopoverOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                                        </div>
                                        <div className="space-y-4">
                                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Data Inicial</label><input type="date" className="w-full px-4 py-3 border border-slate-200 bg-slate-50 text-sm font-bold outline-none rounded" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} /></div>
                                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Data Final</label><input type="date" className="w-full px-4 py-3 border border-slate-200 bg-slate-50 text-sm font-bold outline-none rounded" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} /></div>
                                            <div className="flex gap-2 pt-2">
                                                <button onClick={() => { setTempStartDate(""); setTempEndDate(""); setStartDate(""); setEndDate(""); setIsDatePopoverOpen(false); }} className="flex-1 py-3 border border-slate-200 text-slate-400 text-xs font-black uppercase rounded">Limpar</button>
                                                <button onClick={() => { setStartDate(tempStartDate); setEndDate(tempEndDate); setIsDatePopoverOpen(false); }} className="flex-[2] py-3 bg-[#1A3351] text-white text-xs font-black uppercase rounded">Filtrar</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-2 mt-1">
                            <div className="flex-[3] relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select className="w-full px-10 py-2.5 border border-[#888] shadow-inner text-xs font-bold bg-[#E8E8E8] outline-none uppercase appearance-none cursor-pointer" value={secretariaFilter} onChange={(e) => setSecretariaFilter(e.target.value)}>
                                    <option value="all">TODAS SECRETARIAS</option>
                                    {Array.from(new Set(records.map(r => r.servidor_secretaria).filter(Boolean))).sort().map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                            <div className="flex-1 relative min-w-[200px]">
                                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select className="w-full px-10 py-2.5 border border-[#888] shadow-inner text-xs font-bold bg-[#E8E8E8] outline-none uppercase appearance-none cursor-pointer" value={naturezaCargoFilter} onChange={(e) => setNaturezaCargoFilter(e.target.value)}>
                                    <option value="all">NATUREZA DO CARGO: TODAS</option>
                                    <option value="EFETIVO">EFETIVO</option>
                                    <option value="COMISSÃO">COMISSÃO</option>
                                    <option value="TEMPORÁRIO">TEMPORÁRIO</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                            {(secretariaFilter !== 'all' || naturezaCargoFilter !== 'all' || searchTerm || startDate || endDate) && (
                                <button onClick={() => { setStartDate(""); setEndDate(""); setTempStartDate(""); setTempEndDate(""); setSecretariaFilter("all"); setNaturezaCargoFilter("all"); setSearchTerm(""); }} className="px-6 py-2 bg-[#E31E24] text-white text-[10px] font-black uppercase rounded shadow-md hover:bg-red-700 flex items-center gap-2 shrink-0">
                                    <X className="w-4 h-4" /> ZERAR FILTROS
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* CONTEÚDO */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">
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
                            <div key={card.label} onClick={() => setStatusFilter(card.filter)} className={\`p-4 lg:p-6 border-l-4 shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all cursor-pointer \${statusFilter === card.filter ? card.activeColor : card.baseColor}\`}>
                                <p className={\`text-[9px] lg:text-[10px] font-black uppercase tracking-widest leading-tight mb-1 \${statusFilter === card.filter ? 'text-white/60' : 'text-slate-400'}\`}>{card.label}</p>
                                <h3 className="text-xl lg:text-3xl font-black">{card.value}</h3>
                            </div>
                        ))}
                    </div>

                    {/* LISTA */}
                    <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden">
                        <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#1A3351]">Registros de Afastamento</h3>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-1 bg-white/50 p-1 rounded-md shadow-inner border border-black/5">
                                    {[
                                        { key: 'all', label: 'Todos', color: 'bg-[#1A3351]' },
                                        { key: 'active', label: 'Ativos', color: 'bg-green-600' },
                                        { key: 'alert', label: 'Vencendo', color: 'bg-amber-500' },
                                        { key: 'expired', label: 'Vencidos', color: 'bg-[#E31E24]' },
                                        { key: 'finished', label: 'Finalizados', color: 'bg-blue-600' },
                                    ].map(btn => (
                                        <button key={btn.key} onClick={() => setStatusFilter(btn.key as any)} className={\`px-3 py-1 text-[9px] font-black uppercase rounded transition-all \${statusFilter === btn.key ? btn.color + ' text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}\`}>
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="hidden lg:block w-px h-6 bg-slate-400/50" />
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase">Ordenar:</span>
                                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-white/70 border border-slate-400 text-[9px] font-black uppercase px-2 py-1 outline-none shadow-sm cursor-pointer">
                                        <option value="alphabetical">Ordem Alfabética</option>
                                        <option value="newest">Mais Novos</option>
                                        <option value="oldest">Mais Antigos</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-200">
                            {groupedRecords.length > 0 ? groupedRecords.map((group) => (
                                <div key={group.cpf}>
                                    <div onClick={() => setExpandedCpf(expandedCpf === group.cpf ? null : group.cpf)} className={\`px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 cursor-pointer transition-all border-l-4 \${expandedCpf === group.cpf ? 'bg-[#1A3351]/5 border-[#1A3351]' : 'border-transparent'}\`}>
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={\`p-3 rounded-full transition-colors \${expandedCpf === group.cpf ? 'bg-[#1A3351] text-white' : 'bg-slate-100 text-slate-400'}\`}><User className="w-6 h-6" /></div>
                                            <div>
                                                <h4 className={\`font-black uppercase text-[#1A3351] leading-tight \${expandedCpf === group.cpf ? 'text-xl' : 'text-base'}\`}>{group.nome}</h4>
                                                <div className="flex flex-wrap gap-4 mt-1">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">CPF: {formatCpf(group.cpf)}</p>
                                                    {group.items[0].servidor_secretaria && <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400" /> {group.items[0].servidor_secretaria}</p>}
                                                    {group.items[0].natureza_cargo && <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Activity className="w-3 h-3 text-slate-400" /> {group.items[0].natureza_cargo}</p>}
                                                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full uppercase">{group.items.length} {group.items.length === 1 ? 'Registro' : 'Registros'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {expandedCpf !== group.cpf && (
                                                <div className="hidden md:flex items-center gap-6 mr-4 bg-slate-100/50 px-4 py-2 rounded-lg border border-slate-200">
                                                    <div className="flex flex-col items-start leading-none">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Último Início</p>
                                                        <p className="text-xs font-black text-[#1A3351]">{formatDate(group.items[0].data_inicio)}</p>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-300" />
                                                    <div className="flex flex-col items-start leading-none">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Próximo Término</p>
                                                        <p className={\`text-xs font-black \${(() => {
                                                            if (!group.items[0].data_fim) return 'text-slate-400';
                                                            const e = new Date(group.items[0].data_fim); e.setHours(0,0,0,0);
                                                            const t = new Date(); t.setHours(0,0,0,0);
                                                            return e < t ? 'text-[#E31E24]' : 'text-green-600';
                                                        })()}\`}>{formatDate(group.items[0].data_fim)}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {expandedCpf !== group.cpf ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-[#1A3351]" />}
                                        </div>
                                    </div>

                                    {expandedCpf === group.cpf && (
                                        <div className="px-6 md:px-12 py-8 bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                                            <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] border-b pb-2 mb-6">Histórico de Afastamentos</h5>
                                            <div className="grid grid-cols-1 gap-4">
                                                {group.items.map((record) => {
                                                    const status = getStatus(record);
                                                    return (
                                                        <div key={record.id} className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg hover:border-[#1A3351]/30 transition-colors relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 bg-[#1A3351]/5 rounded-full" />

                                                            {/* INFO GRID - 2 colunas */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                                                <div className="space-y-1">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase">Vigência e Tipo</p>
                                                                    <p className="text-sm font-black text-[#1A3351] uppercase truncate">{record.tipo_afastamento}</p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-xs font-black text-slate-400 uppercase min-w-[50px]">Início:</span>
                                                                        <span className="text-sm font-bold text-[#1A3351]">{formatDate(record.data_inicio)}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-black text-slate-400 uppercase min-w-[50px]">Término:</span>
                                                                        {record.data_fim ? (
                                                                            <span className="flex items-center gap-2">
                                                                                <span className={status === 'expired' ? 'text-sm font-bold text-[#E31E24]' : 'text-sm font-bold text-green-600'}>{formatDate(record.data_fim)}</span>
                                                                                <span className={\`text-[10px] px-2 py-0.5 rounded border font-black \${status === 'active' || status === 'alert' ? 'bg-green-500 text-white border-green-600 animate-pulse' : status === 'finished' ? 'bg-slate-300 text-slate-600 border-slate-400' : 'bg-[#E31E24] text-white border-[#E31E24]'}\`}>
                                                                                    {status === 'active' ? 'VIGENTE' : status === 'alert' ? 'VENCENDO' : status === 'finished' ? 'FINALIZADO' : 'VENCIDO'}
                                                                                </span>
                                                                            </span>
                                                                        ) : <span className="text-sm font-bold text-slate-400">---</span>}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase">Dados Adicionais</p>
                                                                    <div className="flex flex-col gap-2 mt-1">
                                                                        <div>
                                                                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Duração</span>
                                                                            <span className="text-sm font-black text-[#1A3351] flex items-center gap-1"><Clock className="w-3.5 h-3.5 opacity-50" /> {record.dias_afastado || 'N/D'} Dias</span>
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Diagnóstico (CID-10)</span>
                                                                                <button onClick={() => { const s = new Set(revealedCids); if (s.has(record.id)) s.delete(record.id); else s.add(record.id); setRevealedCids(s); }} className="text-[9px] px-2 py-0.5 border border-slate-300 rounded text-slate-500 hover:bg-slate-100 flex items-center gap-1">
                                                                                    {revealedCids.has(record.id) ? <><EyeOff className="w-3 h-3" /> Ocultar</> : <><Eye className="w-3 h-3" /> Revelar</>}
                                                                                </button>
                                                                            </div>
                                                                            {revealedCids.has(record.id) ? (
                                                                                <div className="flex flex-wrap gap-1 mt-1">{record.afastamento_cids?.map(c => <CIDBadge key={c.id} code={c.cid_codigo} />)}</div>
                                                                            ) : (
                                                                                <span className="text-xs text-slate-400 font-bold italic">• • •</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* BOTÕES - parte inferior, distribuídos horizontalmente */}
                                                            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100 relative z-10">
                                                                <button onClick={() => handleViewPortaria(record)} className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-1 bg-slate-200 text-slate-800 hover:bg-slate-300 font-black rounded border border-slate-300 text-[10px] uppercase transition-all">
                                                                    <Printer className="w-3 h-3" /> Portaria
                                                                </button>
                                                                <button onClick={() => openEditModal(record)} className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-1 bg-[#1A3351] text-white font-black rounded border border-[#1A3351] text-[10px] uppercase hover:bg-[#0f2035] active:scale-95 transition-all">
                                                                    <Pencil className="w-3 h-3" /> Editar
                                                                </button>
                                                                {record.situacao === 'EM_ANDAMENTO' && (
                                                                    <>
                                                                        <button onClick={() => router.push(`/afastamentos/new?renew_from=${record.id}\u0026cpf=${record.servidor_cpf}`)} className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-1 bg-amber-400 text-amber-900 text-[10px] font-black rounded border border-amber-500 hover:bg-amber-500 hover:text-white transition-all">
                                                                            <RotateCcw className="w-3 h-3" /> Prorrogar
                                                                        </button>
                                                                        {!record.tipo_afastamento?.toUpperCase().includes('MATERNIDADE') && (
                                                                            <button onClick={() => handleAltaMedica(record)} disabled={updatingId === record.id} className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded border border-emerald-700 hover:bg-emerald-700 transition-all disabled:opacity-50">
                                                                                {updatingId === record.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                                                Dar Alta
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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
                    <div className="bg-white rounded-xl shadow-2xl border-4 border-[#1A3351] w-full max-w-2xl flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-lg">
                            <div>
                                <h3 className="text-sm font-black text-[#1A3351] uppercase flex items-center gap-2"><FileEdit className="w-5 h-5" /> Editar Afastamento</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Auditoria ativada — alterações serão registradas.</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="bg-slate-100 p-4 rounded-lg">
                                <p className="text-[11px] font-black uppercase text-slate-500 mb-1">Servidor</p>
                                <p className="text-base font-black text-[#1A3351]">{editingRecord.servidor_nome}</p>
                                <p className="text-xs font-bold text-slate-600">Matrícula: {editingRecord.servidor_matricula}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Data de Início</label>
                                    <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded font-bold text-slate-700 outline-none" value={editFormData.data_inicio} onChange={(e) => setEditFormData({ ...editFormData, data_inicio: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Dias Afastado</label>
                                    <input type="number" min="1" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded font-bold text-slate-700 outline-none" value={editFormData.dias_afastado} onChange={(e) => setEditFormData({ ...editFormData, dias_afastado: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-slate-500 block">Diagnósticos CID-10</label>
                                <div className="flex flex-wrap gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg min-h-[60px]">
                                    {editFormData.cids.map((cid, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-emerald-200">
                                            <span className="text-xs font-black text-emerald-800">{cid.code}</span>
                                            <button onClick={() => setEditFormData({ ...editFormData, cids: editFormData.cids.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ))}
                                    {editFormData.cids.length === 0 && <span className="text-xs font-bold text-slate-400 italic">Nenhum CID selecionado.</span>}
                                </div>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="BUSCAR NOVO CID..." className="w-full px-10 py-3 bg-slate-50 border border-slate-300 rounded font-bold text-slate-700 text-xs outline-none uppercase" value={cidEditInput} onChange={(e) => setCidEditInput(e.target.value.toUpperCase())} />
                                    {foundCids.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 shadow-xl rounded-lg max-h-[200px] overflow-y-auto z-[160]">
                                            {foundCids.map((cid, i) => (
                                                <button key={i} onClick={() => { if (!editFormData.cids.find(c => c.code === cid.code)) setEditFormData({ ...editFormData, cids: [...editFormData.cids, cid] }); setCidEditInput(""); setFoundCids([]); }} className="w-full text-left px-4 py-3 border-b hover:bg-emerald-50 transition-colors flex flex-col gap-1">
                                                    <span className="text-xs font-black text-emerald-700">{cid.code}</span>
                                                    <span className="text-[10px] font-bold text-slate-600 truncate">{cid.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-end gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} disabled={isSavingEdit} className="px-6 py-2.5 bg-slate-200 text-slate-700 font-black text-xs uppercase rounded">Cancelar</button>
                            <button onClick={handleEditSave} disabled={isSavingEdit} className="px-6 py-2.5 bg-[#1A3351] text-white font-black text-xs uppercase rounded flex items-center gap-2">
                                {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
`;

fs.writeFileSync('src/app/afastamentos/page.tsx', content);
console.log('Done! File rewritten successfully.');
