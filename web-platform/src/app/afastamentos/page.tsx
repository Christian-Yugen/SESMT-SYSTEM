"use client";

import { useEffect, useState, useMemo } from "react";
import { getCIDChapter, getCIDDetails } from "@/lib/cid-utils";
import { supabase } from "@/lib/supabase";
import {
    BarChart3, User, Calendar, ClipboardList, Search, Filter, Printer, Users as UsersIcon, TrendingUp, FolderOpen, Trash2, PlusCircle, ArrowRight,
    Building2, Scale, FileText, CheckCircle2, Clock, RotateCcw, Briefcase, Hash, Eye, Layers
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Loader2 } from "lucide-react";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { generateAfastamentoPDF } from "@/lib/afastamento-portaria-pdf";

// Tipos para o módulo de Afastamentos
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
    afastamento_cids?: CIDRecord[]; // Joined CIDs
    portarias_afastamento?: { numero: string; ano: string; data_emissao: string }[]; // Joined Portaria
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

export default function AfastamentosPage() {
    const [records, setRecords] = useState<AfastamentoRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCpf, setExpandedCpf] = useState<string | null>(null);
    const [expandedCidId, setExpandedCidId] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished' | 'alert'>('all');
    const [sortBy, setSortBy] = useState<'alphabetical' | 'newest' | 'oldest'>('alphabetical');
    const [secretariaFilter, setSecretariaFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [updatingId, setUpdatingId] = useState<number | null>(null);

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
                        if (data.role !== 'admin' && data.role !== 'nurse') {
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
    }, [router]);

    async function loadRecords() {
        setLoading(true);
        const { data, error } = await supabase
            .from('afastamentos')
            .select(`
                *,
                afastamento_cids (*),
                portarias_afastamento (numero, ano, data_emissao)
            `)
            .eq('status', 'ATIVO')
            .order('data_inicio', { ascending: false });

        if (!error && data) {
            const recordsWithDays = data.map(record => {
                if (record.data_inicio && record.data_fim) {
                    const startDate = new Date(record.data_inicio);
                    const endDate = new Date(record.data_fim);
                    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start and end day
                    return { ...record, dias_afastado: diffDays };
                }
                return { ...record, dias_afastado: null };
            });
            setRecords(recordsWithDays);
        }
        setLoading(false);
    }

    async function handleAltaMedica(record: AfastamentoRecord) {
        if (!confirm("Confirmar ALTA MÉDICA para este afastamento? O registro será marcado como FINALIZADO.")) return;
        
        setUpdatingId(record.id);
        const { error } = await supabase
            .from('afastamentos')
            .update({ situacao: 'FINALIZADO' })
            .eq('id', record.id);

        if (error) {
            alert("Erro ao dar alta: " + error.message);
        } else {
            setRecords(records.map((r: AfastamentoRecord) => r.id === record.id ? { ...r, situacao: 'FINALIZADO' } : r));
        }
        setUpdatingId(null);
    }

    const handleViewPortaria = (record: any) => {
        const portaria = record.portarias_afastamento?.[0];
        if (!portaria) {
            alert("Portaria não encontrada para este registro.");
            return;
        }

        generateAfastamentoPDF({
            numero: portaria.numero,
            ano: portaria.ano,
            servidor_nome: record.servidor_nome,
            servidor_matricula: record.servidor_matricula,
            servidor_cargo: record.natureza_cargo,
            servidor_lotacao: record.servidor_secretaria,
            tipo_afastamento: record.tipo_afastamento,
            data_inicio: new Date(record.data_inicio).toLocaleDateString('pt-BR'),
            data_fim: record.data_fim ? new Date(record.data_fim).toLocaleDateString('pt-BR') : '---',
            data_portaria: new Date(portaria.data_emissao).toLocaleDateString('pt-BR'),
            perito_nome: record.perito_nome,
            perito_crm: record.perito_crm,
            servidor_contrato: record.servidor_contrato
        }, 'view');
    };

    const renderStatusBadge = (record: AfastamentoRecord) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = record.data_fim ? new Date(record.data_fim) : null;
        if (endDate) endDate.setHours(0, 0, 0, 0);

        if (record.situacao === 'FINALIZADO') {
            return (
                <span className="text-[11px] font-black px-3 py-1 bg-blue-600 text-white rounded-lg shadow-sm uppercase">
                    FINALIZADO
                </span>
            );
        }

        if (endDate && today > endDate) {
            if (record.tipo_afastamento?.toUpperCase().includes('MATERNIDADE')) {
                return (
                    <span className="text-[11px] font-black px-3 py-1 bg-blue-600 text-white rounded-lg shadow-sm uppercase">
                        FINALIZADO
                    </span>
                );
            }
            return (
                <span className="text-[11px] font-black px-3 py-1 bg-red-500 text-white rounded-lg shadow-sm uppercase">
                    VENCIDO
                </span>
            );
        }

        return (
            <span className="text-[11px] font-black px-3 py-1 bg-emerald-500 text-white rounded-lg shadow-sm uppercase">
                ATIVO
            </span>
        );
    };

    const getRemainingDays = (dateStr: string) => {
        if (!dateStr) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        
        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const filteredRecords = useMemo(() => {
        return records.filter((record: AfastamentoRecord) => {
            const matchesSearch = record.servidor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.servidor_cpf.includes(searchTerm);
            const matchesSecretaria = secretariaFilter === 'all' || record.servidor_secretaria === secretariaFilter;
            const matchesType = typeFilter === 'all' || record.tipo_afastamento === typeFilter;
            
            // Status Filter Logic
            let matchesStatus = true;
            if (statusFilter === 'active') matchesStatus = record.situacao === 'EM_ANDAMENTO';
            else if (statusFilter === 'finished') matchesStatus = record.situacao === 'FINALIZADO';
            else if (statusFilter === 'alert') {
                if (record.situacao !== 'EM_ANDAMENTO' || !record.data_fim) matchesStatus = false;
                else {
                    const diff = Math.ceil((new Date(record.data_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    matchesStatus = diff <= 15 && diff >= 0;
                }
            }

            return matchesSearch && matchesSecretaria && matchesType && matchesStatus;
        });
    }, [records, searchTerm, secretariaFilter, typeFilter, statusFilter]);

    const groupedRecords = useMemo(() => {
        const groups: Record<string, { nome: string, cpf: string, items: AfastamentoRecord[] }> = {};

        filteredRecords.forEach((record: AfastamentoRecord) => {
            const key = normalizeCpf(record.servidor_cpf);
            if (!groups[key]) {
                groups[key] = {
                    nome: record.servidor_nome,
                    cpf: record.servidor_cpf,
                    items: []
                };
            }
            groups[key].items.push(record);
        });

        Object.values(groups).forEach(group => {
            group.items.sort((a, b) => b.data_inicio.localeCompare(a.data_inicio));
        });

        let result = Object.values(groups);
        if (sortBy === 'alphabetical') result.sort((a, b) => a.nome.localeCompare(b.nome));
        else if (sortBy === 'newest') result.sort((a, b) => b.items[0].data_inicio.localeCompare(a.items[0].data_inicio));
        
        return result;
    }, [filteredRecords, sortBy]);

    const stats = useMemo(() => {
        const active = records.filter((r: AfastamentoRecord) => r.situacao === 'EM_ANDAMENTO').length;
        const alertCount = records.filter((r: AfastamentoRecord) => {
            if (r.situacao !== 'EM_ANDAMENTO' || !r.data_fim) return false;
            const diff = Math.ceil((new Date(r.data_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return diff <= 15 && diff >= 0;
        }).length;
        return { total: records.length, active, alert: alertCount };
    }, [records]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                <p className="text-[#1A3351] uppercase tracking-[0.3em] font-black text-xs">Carregando Afastamentos...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-x-hidden">
            <Sidebar userRole={userRole} userName={userName} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            
            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden">
                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 lg:p-6 py-3 border-b-[6px] border-emerald-500 shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3 text-[#1A3351]">
                            <Database className="w-6 h-6" />
                            <h2 className="text-xl font-black uppercase tracking-tight">Gestão de Afastamentos</h2>
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => {
                                    setSearchTerm("");
                                    setStatusFilter('all');
                                    setSecretariaFilter('all');
                                    setTypeFilter('all');
                                }} 
                                className="flex items-center gap-2 px-4 h-10 bg-slate-700 text-white font-black rounded shadow-md hover:bg-slate-800 transition-all text-[10px] uppercase"
                             >
                                <RotateCcw className="w-4 h-4" /> Zerar Filtros
                             </button>
                             <button onClick={() => router.push('/afastamentos/new')} className="flex items-center gap-2 px-6 h-10 bg-emerald-600 text-white font-black rounded shadow-md hover:bg-emerald-700 transition-all text-[10px] uppercase">
                                <PlusCircle className="w-4 h-4" /> Novo Lançamento
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-2">
                        <div className="flex-[3] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="BUSCAR POR NOME OU CPF..."
                                className="w-full px-10 py-2.5 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            className="flex-1 px-4 py-2.5 border border-[#888] bg-[#E8E8E8] text-xs font-bold uppercase outline-none"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">TODOS OS TIPOS</option>
                            <option value="AUX. DOENÇA">AUXÍLIO DOENÇA</option>
                            <option value="LICENÇA MATERNIDADE">LICENÇA MATERNIDADE</option>
                        </select>
                    </div>
                </section>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    {/* INDICADORES */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 border-l-4 border-[#1A3351] shadow-md">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Registros</p>
                            <h3 className="text-3xl font-black text-[#1A3351]">{stats.total}</h3>
                        </div>
                        <div className="bg-white p-6 border-l-4 border-emerald-500 shadow-md">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Afastamentos Ativos</p>
                            <h3 className="text-3xl font-black text-emerald-600">{stats.active}</h3>
                        </div>
                        <div className="bg-white p-6 border-l-4 border-amber-500 shadow-md">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencendo (15 dias)</p>
                            <h3 className="text-3xl font-black text-amber-600">{stats.alert}</h3>
                        </div>
                    </div>

                    {/* LISTAGEM AGRUPADA */}
                    <div className="bg-white border-2 border-slate-300 shadow-xl rounded-lg overflow-hidden">
                        {groupedRecords.map(group => (
                            <div key={group.cpf} className="border-b border-slate-100 last:border-0">
                                <div 
                                    onClick={() => setExpandedCpf(expandedCpf === group.cpf ? null : group.cpf)}
                                    className={`px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors ${expandedCpf === group.cpf ? 'bg-emerald-50' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${expandedCpf === group.cpf ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-[#1A3351] uppercase">{group.nome}</h4>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">CPF: {formatCpf(group.cpf)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black px-2 py-1 bg-slate-200 text-slate-600 rounded-full uppercase">
                                            {group.items.length} {group.items.length === 1 ? 'Registro' : 'Registros'}
                                        </span>
                                        {expandedCpf === group.cpf ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                </div>

                                {expandedCpf === group.cpf && (
                                    <div className="px-6 pb-6 pt-4 bg-slate-50 animate-in slide-in-from-top-2">
                                        {/* CARD DE INFORMAÇÕES DO SERVIDOR (ESTILO IMAGEM 1) */}
                                        <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-start gap-4">
                                            <div className="p-3 bg-[#1A3351] text-white rounded-lg shadow-md">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3 flex-1">
                                                <div className="md:col-span-3 border-b border-slate-100 pb-2">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Servidor</p>
                                                    <p className="text-xl font-black text-[#1A3351] uppercase leading-none">{group.nome}</p>
                                                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">CPF: {formatCpf(group.cpf)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matrícula(s) / Vínculo(s)</p>
                                                    <div className="flex flex-col">
                                                        {Array.from(new Set(group.items.map(i => `${i.servidor_matricula} (C. ${i.servidor_contrato || '1'})`))).map(m => (
                                                            <p key={m} className="text-sm font-black text-emerald-600 uppercase">
                                                                MAT: {m}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo / Natureza</p>
                                                    <p className="text-sm font-bold text-slate-700 uppercase">
                                                        {group.items[0].natureza_cargo || 'N/D'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secretaria</p>
                                                    <p className="text-sm font-bold text-slate-700 uppercase">
                                                        {group.items[0].servidor_secretaria || 'N/D'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {group.items.map(record => (
                                                <div key={record.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all hover:border-emerald-200">
                                                    <div className="p-4">
                                                        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 items-center">
                                                            <div className="md:col-span-1">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tipo</p>
                                                                <p className="text-[11px] font-black text-[#1A3351] uppercase">{record.tipo_afastamento}</p>
                                                            </div>
                                                            <div className="md:col-span-1">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Início Afastamento</p>
                                                                <p className="text-[11px] font-bold text-slate-700">
                                                                    {new Date(record.data_inicio).toLocaleDateString('pt-BR')}
                                                                </p>
                                                            </div>
                                                            <div className="md:col-span-1 border-r border-slate-100 last:border-0 mr-2">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Fim Afastamento</p>
                                                                <p className="text-[13px] font-black text-red-600">
                                                                    {record.data_fim ? new Date(record.data_fim).toLocaleDateString('pt-BR') : '---'}
                                                                </p>
                                                                {record.situacao === 'EM_ANDAMENTO' && record.data_fim && (
                                                                    (() => {
                                                                        const daysLeft = getRemainingDays(record.data_fim);
                                                                        if (daysLeft !== null && daysLeft <= 10 && daysLeft >= 0) {
                                                                            const isMaternidade = record.tipo_afastamento?.toUpperCase().includes('MATERNIDADE');
                                                                            return (
                                                                                <p className="text-[10px] font-black text-amber-600 mt-1 animate-pulse">
                                                                                    {daysLeft === 0 
                                                                                        ? (isMaternidade ? 'LICENÇA ENCERRA HOJE!' : 'VENCE HOJE!') 
                                                                                        : `Faltam ${daysLeft} dias para ${isMaternidade ? 'finalizar a licença maternidade' : 'vencer'}`}
                                                                                </p>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()
                                                                )}
                                                            </div>
                                                            <div className="md:col-span-1">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Dias</p>
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="w-4 h-4 text-amber-500" />
                                                                    <p className="text-[13px] font-black text-emerald-700">{record.dias_afastado || '---'} Dias</p>
                                                                </div>
                                                            </div>
                                                            <div className="md:col-span-1">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">CID(s)</p>
                                                                <div className="flex flex-wrap gap-1 items-center">
                                                                    {record.afastamento_cids?.map(c => (
                                                                        <button 
                                                                            key={c.id} 
                                                                            onClick={() => setExpandedCidId(expandedCidId === record.id ? null : record.id)}
                                                                            className="text-[13px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded hover:bg-emerald-200 transition-colors"
                                                                        >
                                                                            {c.cid_codigo}
                                                                        </button>
                                                                    )) || <span className="text-[13px] text-slate-400">Nenhum</span>}
                                                                    {record.afastamento_cids && record.afastamento_cids.length > 0 && (
                                                                        <button 
                                                                            onClick={() => setExpandedCidId(expandedCidId === record.id ? null : record.id)}
                                                                            className="ml-1 text-slate-400 hover:text-emerald-600 transition-transform hover:scale-125"
                                                                        >
                                                                            <Eye className="w-5 h-5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="md:col-span-1">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Situação</p>
                                                                {renderStatusBadge(record)}
                                                            </div>
                                                            <div className="md:col-span-1 flex flex-col gap-1">
                                                                {record.situacao === 'EM_ANDAMENTO' && (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => router.push(`/afastamentos/new?renew_from=${record.id}&cpf=${record.servidor_cpf}`)}
                                                                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-[10px] font-black rounded hover:bg-amber-600 transition-all shadow-sm"
                                                                            title="Prorrogar Afastamento"
                                                                        >
                                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                                            PRORROGAR
                                                                        </button>
                                                                        {!record.tipo_afastamento?.toUpperCase().includes('MATERNIDADE') && (
                                                                            <button 
                                                                                onClick={() => handleAltaMedica(record)}
                                                                                disabled={updatingId === record.id}
                                                                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black rounded hover:bg-emerald-700 transition-all shadow-sm"
                                                                                title="Dar Alta Médica"
                                                                            >
                                                                                {updatingId === record.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                                                DAR ALTA
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                                <button 
                                                                    onClick={() => handleViewPortaria(record)}
                                                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-black rounded hover:bg-slate-200 transition-all border border-slate-200"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                    PORTARIA
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* DETALHES DO CID EXPANDIDOS */}
                                                        {expandedCidId === record.id && (
                                                            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg animate-in zoom-in-95">
                                                                <p className="text-[10px] font-black text-emerald-800 uppercase mb-3 flex items-center gap-2">
                                                                    <Layers className="w-4 h-4" /> Detalhes dos Diagnósticos (CID-10)
                                                                </p>
                                                                <div className="space-y-4">
                                                                    {record.afastamento_cids?.map(c => {
                                                                        const details = getCIDDetails(c.cid_codigo);
                                                                        return (
                                                                            <div key={c.id} className="bg-white p-3 rounded border border-emerald-200 shadow-sm">
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <span className="text-sm font-black text-emerald-700">{c.cid_codigo}</span>
                                                                                    <span className="text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded">CAPÍTULO {details.chapter}</span>
                                                                                </div>
                                                                                <p className="text-xs font-black text-slate-800 uppercase">{details.desc}</p>
                                                                                <p className="text-[10px] font-bold text-slate-500 uppercase italic mt-1">{details.chapter_desc}</p>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
