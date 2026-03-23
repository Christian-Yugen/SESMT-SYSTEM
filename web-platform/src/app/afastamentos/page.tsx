"use client";

import { useEffect, useState, useMemo } from "react";
import { getCIDChapter, getCIDDetails } from "@/lib/cid-utils";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, ChevronUp, History as HistoryIcon,
    BarChart3, User, Calendar, ClipboardList, Search, Filter, Printer, Users as UsersIcon, TrendingUp, FolderOpen, Trash2, PlusCircle, ArrowRight,
    Building2, Scale, FileText, CheckCircle2, Clock, RotateCcw, Briefcase, Hash, Eye, EyeOff, Layers
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

interface ServidorLite {
    cpf: string;
    cargo: string;
    natureza_cargo: string;
    matricula: string;
    contrato: string;
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
    const [revealedCids, setRevealedCids] = useState<Set<number>>(new Set());
    const [servidoresData, setServidoresData] = useState<Record<string, ServidorLite>>({});

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
            // Fetch unique CPFs
            const cpfs = Array.from(new Set(data.map(r => r.servidor_cpf))).filter(Boolean);
            if (cpfs.length > 0) {
                const { data: servs } = await supabase
                    .from('servidores')
                    .select('cpf, cargo, natureza_cargo, matricula, contrato')
                    .in('cpf', cpfs);
                
                if (servs) {
                    const servMap: Record<string, ServidorLite> = {};
                    servs.forEach(s => {
                        const key = `${normalizeCpf(s.cpf)}_${String(s.matricula)}_${String(s.contrato || '1')}`;
                        servMap[key] = s;
                    });
                    setServidoresData(servMap);
                }
            }

            const recordsWithDays = data.map(record => {
                const startDate = record.data_inicio ? new Date(record.data_inicio) : null;
                const endDate = record.data_fim ? new Date(record.data_fim) : null;
                if (startDate && endDate) {
                    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    return { ...record, dias_afastado: diffDays };
                }
                return { ...record, dias_afastado: null };
            });
            setRecords(recordsWithDays);
        }
        setLoading(false);
    }

    async function handleAltaMedica(record: AfastamentoRecord) {
        let motivo = "";
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = record.data_fim ? new Date(record.data_fim) : null;
        
        if (endDate) {
            endDate.setHours(0, 0, 0, 0);
            const diffTime = endDate.getTime() - today.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            
            if (diffDays > 1) {
                motivo = prompt("Alta médica com antecipação superior a 1 dia. Por favor, informe o motivo:") || "";
                if (!motivo) {
                    alert("O motivo é obrigatório para altas antecipadas.");
                    return;
                }
            }
        }

        if (!confirm("Confirmar ALTA MÉDICA para este afastamento? O registro será marcado como FINALIZADO.")) return;
        
        setUpdatingId(record.id);
        const updateData: any = { situacao: 'FINALIZADO' };
        if (motivo) {
            updateData.observacoes = (record.observacoes ? record.observacoes + "\n" : "") + "MOTIVO ALTA ANTECIPADA: " + motivo;
        }

        const { error } = await supabase
            .from('afastamentos')
            .update(updateData)
            .eq('id', record.id);

        if (error) {
            alert("Erro ao dar alta: " + error.message);
        } else {
            setRecords(records.map((r: AfastamentoRecord) => r.id === record.id ? { ...r, situacao: 'FINALIZADO', observacoes: updateData.observacoes || r.observacoes } : r));
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

    const toggleCidVisibility = (id: number) => {
        const newSet = new Set(revealedCids);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setRevealedCids(newSet);
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
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secretaria</p>
                                                    <p className="text-sm font-bold text-slate-700 uppercase">
                                                        {group.items[0].servidor_secretaria || 'N/D'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-8 bg-slate-200"></div>
                                                    <p className="text-[11px] font-bold text-slate-400 italic">Expanda os registros para ver vínculos específicos</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {group.items.map(record => (
                                                <div key={record.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all hover:border-emerald-200">
                                                        <div className="flex flex-col">
                                                            {/* CABEÇALHO DO CARD: INFORMAÇÕES PRINCIPAIS EM LINHA */}
                                                            <div className="p-6">
                                                                <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
                                                                    {/* TIPO E VÍNCULO */}
                                                                    <div className="flex-none min-w-[140px]">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo / Vínculo</p>
                                                                        <div className="flex flex-col gap-1">
                                                                            <p className="text-sm font-black text-[#1A3351] uppercase">{record.tipo_afastamento}</p>
                                                                            <p className="text-sm font-black text-slate-500 uppercase">MAT: {record.servidor_matricula} (C. {record.servidor_contrato || '1'})</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* CARGO E NATUREZA - ESPAÇO MÁXIMO */}
                                                                    <div className="flex-1 min-w-0 mx-4">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cargo / Natureza</p>
                                                                        {(() => {
                                                                            const servKey = `${normalizeCpf(record.servidor_cpf)}_${String(record.servidor_matricula)}_${String(record.servidor_contrato || '1')}`;
                                                                            const s = servidoresData[servKey];
                                                                            return (
                                                                                <div className="flex flex-col gap-1">
                                                                                    <p className="text-sm font-black text-slate-700 uppercase break-words leading-tight">
                                                                                        {s?.cargo || '---'}
                                                                                    </p>
                                                                                    <p className="text-sm font-black text-slate-500 uppercase">
                                                                                        {s?.natureza_cargo || record.natureza_cargo || '---'}
                                                                                    </p>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>

                                                                    {/* PERÍODO E TOTAL DIAS */}
                                                                    <div className="flex-none min-w-[200px] flex flex-col items-end">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-right">Período e Duração</p>
                                                                        <div className="flex flex-col gap-2 w-full items-end">
                                                                            <div className="flex items-center gap-4 justify-end">
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Início</span>
                                                                                    <span className="text-sm font-black text-slate-700">{new Date(record.data_inicio).toLocaleDateString('pt-BR')}</span>
                                                                                </div>
                                                                                <div className="w-px h-6 bg-slate-200"></div>
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Fim</span>
                                                                                    <span className="text-sm font-black text-red-600">{record.data_fim ? new Date(record.data_fim).toLocaleDateString('pt-BR') : '---'}</span>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div className="flex items-center justify-end w-full pt-1 border-t border-slate-100">
                                                                                <p className="text-sm font-black text-[#1A3351] uppercase">{record.dias_afastado || '---'} <span className="text-[11px] text-slate-400 font-bold ml-1">DIAS TOTAIS</span></p>
                                                                            </div>

                                                                            {record.situacao === 'EM_ANDAMENTO' && record.data_fim && (
                                                                                (() => {
                                                                                    const daysLeft = getRemainingDays(record.data_fim);
                                                                                    if (daysLeft !== null && daysLeft <= 10 && daysLeft >= 0) {
                                                                                        const isMaternidade = record.tipo_afastamento?.toUpperCase().includes('MATERNIDADE');
                                                                                        return (
                                                                                            <p className="text-[10px] font-black text-slate-500 mt-1 animate-pulse bg-slate-50 px-2 py-1 rounded border border-slate-100 text-center uppercase tracking-tighter w-full">
                                                                                                {daysLeft === 0 
                                                                                                    ? (isMaternidade ? 'ENCERRA HOJE!' : 'VENCE HOJE!') 
                                                                                                    : `FALTA ${daysLeft} ${daysLeft === 1 ? 'DIA' : 'DIAS'}`}
                                                                                            </p>
                                                                                        );
                                                                                    }
                                                                                    return null;
                                                                                })()
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* SITUAÇÃO */}
                                                                    <div className="flex-none min-w-[100px] flex flex-col items-end">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-right">Situação Atual</p>
                                                                        {renderStatusBadge(record)}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                        {/* SEÇÃO DE CIDS (EXPANSÍVEL) */}
                                                        {revealedCids.has(record.id) && (
                                                            <div className="px-6 pb-6 animate-in slide-in-from-top-4">
                                                                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                                                                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                        <Layers className="w-4 h-4" /> Diagnósticos Registrados (CID-10)
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-x-8 gap-y-4">
                                                                        {record.afastamento_cids?.map(c => {
                                                                            const details = getCIDDetails(c.cid_codigo);
                                                                            return (
                                                                                <div key={c.id} className="flex items-center gap-3 group">
                                                                                    {/* BADGE DO CID - ESMERALDA */}
                                                                                    <div className="flex items-center bg-emerald-100/50 px-2 py-1 rounded-lg border border-emerald-200/50">
                                                                                        <span className="text-sm font-black text-emerald-800 mr-2">{c.cid_codigo}</span>
                                                                                        <span className="text-[8px] font-black bg-emerald-600 text-white px-1.5 rounded-full py-0.5">CAP. {details.chapter}</span>
                                                                                    </div>
                                                                                    {/* DESCRIÇÃO - LADO A LADO */}
                                                                                    <div className="flex flex-col">
                                                                                        <p className="text-xs font-black text-slate-800 uppercase group-hover:text-emerald-700 transition-colors whitespace-nowrap">
                                                                                            {details.desc}
                                                                                        </p>
                                                                                        <p className="text-[11px] font-bold text-slate-400 leading-none mt-1">
                                                                                            {details.chapter_desc}
                                                                                        </p>
                                                                                    </div>
                                                                                    {/* DIVIDER VISUAL ENTRE CIDS SE NÃO FOR O ÚLTIMO */}
                                                                                    <div className="hidden lg:block w-px h-8 bg-slate-200 ml-4"></div>
                                                                                </div>
                                                                            );
                                                                        }) || <p className="text-sm text-slate-400 italic">Nenhum CID registrado.</p>}
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => toggleCidVisibility(record.id)}
                                                                        className="mt-4 w-full py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-200 transition-colors border border-emerald-200"
                                                                    >
                                                                        Ocultar Detalhes do CID
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* RODAPÉ DO CARD: BOTÕES DE AÇÃO NA HORIZONTAL */}
                                                        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center gap-3">
                                                            {record.situacao === 'EM_ANDAMENTO' && (
                                                                <>
                                                                    <button 
                                                                        onClick={() => router.push(`/afastamentos/new?renew_from=${record.id}&cpf=${record.servidor_cpf}`)}
                                                                        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 uppercase border-b-2 border-indigo-800"
                                                                    >
                                                                        <RotateCcw className="w-4 h-4" /> Prorrogar
                                                                    </button>
                                                                    {!record.tipo_afastamento?.toUpperCase().includes('MATERNIDADE') && (
                                                                        <button 
                                                                            onClick={() => handleAltaMedica(record)}
                                                                            disabled={updatingId === record.id}
                                                                            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-50 uppercase border-b-2 border-emerald-800"
                                                                        >
                                                                            {updatingId === record.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                                            Dar Alta
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                            <button 
                                                                onClick={() => handleViewPortaria(record)}
                                                                className="flex items-center gap-2 px-5 py-2 bg-sky-600 text-white text-[10px] font-black rounded-xl hover:bg-sky-700 transition-all shadow-md active:scale-95 uppercase border-b-2 border-sky-800"
                                                            >
                                                                <FileText className="w-4 h-4" /> Portaria
                                                            </button>
                                                            
                                                            {!revealedCids.has(record.id) && (
                                                                <button 
                                                                    onClick={() => toggleCidVisibility(record.id)}
                                                                    className="flex items-center gap-2 px-5 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm active:scale-95 ml-auto uppercase"
                                                                >
                                                                    <Eye className="w-4 h-4" /> Revelar CID
                                                                </button>
                                                            )}
                                                        </div>
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
