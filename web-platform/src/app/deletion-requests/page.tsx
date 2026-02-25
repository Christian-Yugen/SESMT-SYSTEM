"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, X, Menu,
    ChevronDown, ChevronUp, Briefcase, History as HistoryIcon,
    BarChart3, Users as UsersIcon, TrendingUp, FolderOpen, Trash2, CheckCircle, XCircle, AlertTriangle, ClipboardList, Eye
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface DeletionRequest {
    id: number;
    history_record_id: number;
    requester_id: string;
    requester_name: string;
    deletion_reason: string;
    status: 'pending' | 'approved' | 'rejected';
    requested_at: string;
    reviewed_at?: string;
    reviewed_by?: string;
    reviewer_name?: string;
    original_data: {
        servidor_cpf?: string;
        servidor_nome?: string;
        aso_type?: string;
        cargo?: string;
        secretaria?: string;
        generated_at?: string;
    };
}

export default function DeletionRequestsPage() {
    const [requests, setRequests] = useState<DeletionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [userName, setUserName] = useState<string>("Administrador");
    const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Modal de confirmação para aprovar exclusão
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
    const [processingAction, setProcessingAction] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (session) {
                    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                    if (!data || data.role !== 'admin') {
                        router.push("/");
                        return;
                    }
                    setUserRole(data.role);
                    setUserId(session.user.id);

                    const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Administrador";
                    setUserName(name);
                    loadRequests();
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
    }, [router]);

    async function loadRequests() {
        setLoading(true);
        const { data, error } = await supabase
            .from('deletion_requests')
            .select('*')
            .order('requested_at', { ascending: false });

        if (!error && data) {
            setRequests(data);
        } else {
            console.error("Erro ao carregar solicitações:", error);
        }
        setLoading(false);
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const handleApproveRequest = async (request: DeletionRequest) => {
        setSelectedRequest(request);
        setShowApprovalModal(true);
    };

    const confirmApproval = async () => {
        if (!selectedRequest || !userId) return;

        setProcessingAction(true);
        try {
            // 1. Obter dados do usuário atual para o reviewer_name
            const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .single();

            // 2. Excluir o registro do histórico do banco de dados
            // Usamos { count: 'exact' } para verificar se o registro foi realmente deletado
            const { error: deleteError, count } = await supabase
                .from('aso_history')
                .delete({ count: 'exact' })
                .eq('id', selectedRequest.history_record_id);

            if (deleteError) {
                alert('Erro ao excluir registro do histórico: ' + deleteError.message);
                setProcessingAction(false);
                return;
            }

            if (count === 0) {
                console.warn("Nenhum registro encontrado em aso_history com ID:", selectedRequest.history_record_id);
                // Mesmo que o registro não exista (talvez já deletado), vamos proceder para limpar a solicitação
            }

            // 3. Atualizar a solicitação como aprovada
            const { error: updateError } = await supabase
                .from('deletion_requests')
                .update({
                    status: 'approved',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: userId,
                    reviewer_name: profile?.email || 'Admin'
                })
                .eq('id', selectedRequest.id);

            if (updateError) {
                alert('Erro ao atualizar solicitação: ' + updateError.message);
            } else {
                alert('Registro excluído definitivamente com sucesso!');
                router.refresh(); // Força a revalidação do cache do roteador do Next.js
                loadRequests();
            }
        } catch (err) {
            console.error('Erro ao aprovar exclusão:', err);
            alert('Erro ao processar exclusão');
        }

        setProcessingAction(false);
        setShowApprovalModal(false);
        setSelectedRequest(null);
    };

    const handleRejectRequest = async (requestId: number) => {
        if (!confirm('Tem certeza que deseja REJEITAR esta solicitação de exclusão?')) return;

        setProcessingAction(true);
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', userId!)
                .single();

            // 1. Marcar a solicitação como rejeitada
            const { error: updateError } = await supabase
                .from('deletion_requests')
                .update({
                    status: 'rejected',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: userId,
                    reviewer_name: profile?.email || 'Admin'
                })
                .eq('id', requestId);

            // 2. Remover o flag de deletion_pending do histórico
            const request = requests.find(r => r.id === requestId);
            if (request) {
                await supabase
                    .from('aso_history')
                    .update({ deletion_pending: false })
                    .eq('id', request.history_record_id);
            }

            if (updateError) {
                alert('Erro ao rejeitar solicitação: ' + updateError.message);
            } else {
                alert('Solicitação rejeitada. O registro permanecerá no histórico.');
                loadRequests();
            }
        } catch (err) {
            console.error('Erro ao rejeitar exclusão:', err);
            alert('Erro ao processar rejeição');
        }
        setProcessingAction(false);
    };

    const filteredRequests = requests.filter(req => {
        if (filterStatus === 'all') return true;
        return req.status === filterStatus;
    });

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const approvedCount = requests.filter(r => r.status === 'approved').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected').length;

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
                <p className="text-[#1A3351] uppercase tracking-[0.3em] font-black text-xs">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-x-hidden">
            {/* SIDEBAR */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 bg-[#1A3351] border-r border-white/10 flex flex-col p-6 lg:p-4 shrink-0 shadow-2xl transition-transform duration-300 transform ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
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
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">SESMT SYSTEM</p>
                        <p className="text-xs font-bold text-white/70 uppercase tracking-wider truncate whitespace-nowrap">
                            Olá, <span className="text-white">{userName}</span>
                        </p>
                    </div>
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

                    {/* BENEFÍCIOS COM SUBMENU */}
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
                                <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <Database className="w-3.5 h-3.5 shrink-0" />
                                    <span>Auxílio Doença</span>
                                </button>
                                <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <FileSearch className="w-3.5 h-3.5 shrink-0" />
                                    <span>Readaptação</span>
                                </button>
                                <button
                                    onClick={() => router.push('/abono')}
                                    className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap"
                                >
                                    <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                                    <span>Abono Salarial</span>
                                </button>
                                <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                    <span>Redução de Jornada</span>
                                </button>
                            </div>
                        )}
                    </div>

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
                                <button onClick={() => router.push('/history')} className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <HistoryIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span>Log Principal</span>
                                </button>
                                <button
                                    onClick={() => router.push('/analytics')}
                                    className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap"
                                >
                                    <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                                    <span>Indicadores</span>
                                </button>
                            </div>
                        )}
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
                            <button onClick={() => router.push('/deletion-requests')} className="w-full flex items-center gap-1.5 p-3 rounded-lg bg-white/10 text-white font-bold text-xs uppercase tracking-wider shadow-sm border border-white/5 transition-all">
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

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* ÁREA PRINCIPAL */}
            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden">
                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 lg:p-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg font-sans">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3 text-[#1A3351]">
                            <Trash2 className="w-5 lg:w-6 h-5 lg:h-6" />
                            <h2 className="text-lg lg:text-xl font-black leading-none uppercase tracking-tight">Gerenciar Exclusões</h2>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2.5 bg-[#1A3351] rounded-lg text-white active:scale-95 transition-all shadow-md flex items-center gap-2"
                        >
                            <Menu className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Menu</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2 font-black text-[9px] uppercase transition-all whitespace-nowrap rounded ${filterStatus === 'all' ? 'bg-[#1A3351] text-white shadow-md' : 'bg-[#E8E8E8] text-slate-500 hover:bg-slate-200'}`}
                        >
                            Todas ({requests.length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('pending')}
                            className={`px-4 py-2 font-black text-[9px] uppercase transition-all whitespace-nowrap rounded ${filterStatus === 'pending' ? 'bg-[#E31E24] text-white shadow-md' : 'bg-[#E8E8E8] text-slate-500 hover:bg-slate-200'}`}
                        >
                            Pendentes ({pendingCount})
                        </button>
                        <button
                            onClick={() => setFilterStatus('approved')}
                            className={`px-4 py-2 font-black text-[9px] uppercase transition-all whitespace-nowrap rounded ${filterStatus === 'approved' ? 'bg-emerald-600 text-white shadow-md' : 'bg-[#E8E8E8] text-slate-500 hover:bg-slate-200'}`}
                        >
                            Aprovadas ({approvedCount})
                        </button>
                        <button
                            onClick={() => setFilterStatus('rejected')}
                            className={`px-4 py-2 font-black text-[9px] uppercase transition-all whitespace-nowrap rounded ${filterStatus === 'rejected' ? 'bg-slate-600 text-white shadow-md' : 'bg-[#E8E8E8] text-slate-500 hover:bg-slate-200'}`}
                        >
                            Rejeitadas ({rejectedCount})
                        </button>
                    </div>
                </section>

                {/* CONTEÚDO */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
                    {/* STATS CARDS */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 shrink-0">
                        <div className="bg-white p-4 lg:p-6 border-l-4 border-[#E31E24] shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all">
                            <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Pendentes</p>
                            <h3 className="text-2xl lg:text-3xl font-black text-[#E31E24] leading-none">{pendingCount}</h3>
                        </div>
                        <div className="bg-white p-4 lg:p-6 border-l-4 border-emerald-500 shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all">
                            <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Aprovadas</p>
                            <h3 className="text-2xl lg:text-3xl font-black text-emerald-600 leading-none">{approvedCount}</h3>
                        </div>
                        <div className="bg-white p-4 lg:p-6 border-l-4 border-slate-400 shadow-lg rounded-xl lg:rounded-none transform hover:scale-[1.02] transition-all hidden sm:block">
                            <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Rejeitadas</p>
                            <h3 className="text-2xl lg:text-3xl font-black text-slate-600 leading-none">{rejectedCount}</h3>
                        </div>
                    </div>

                    {/* LISTA DE SOLICITAÇÕES */}
                    <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden">
                        <div className="bg-[#B0B0B0] px-6 py-3 border-b-2 border-slate-400">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#1A3351]">Solicitações de Exclusão</h3>
                        </div>
                        <div className="divide-y divide-slate-200">
                            {filteredRequests.length > 0 ? filteredRequests.map((request) => (
                                <div key={request.id} className="group">
                                    <div
                                        onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                                        className={`px-6 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 cursor-pointer transition-all border-l-4 ${expandedId === request.id ? 'bg-[#1A3351]/5 border-[#E31E24]' :
                                            request.status === 'pending' ? 'border-[#E31E24]' :
                                                request.status === 'approved' ? 'border-green-500' :
                                                    'border-slate-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`p-2 rounded ${request.status === 'pending' ? 'bg-[#E31E24]/10 text-[#E31E24]' :
                                                request.status === 'approved' ? 'bg-green-100 text-green-600' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}>
                                                {request.status === 'pending' ? <AlertTriangle className="w-5 h-5" /> :
                                                    request.status === 'approved' ? <CheckCircle className="w-5 h-5" /> :
                                                        <XCircle className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h4 className="font-black uppercase text-[#1A3351] text-sm">
                                                    {request.original_data?.servidor_nome || 'Nome não disponível'}
                                                </h4>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">
                                                    {request.original_data?.aso_type || 'Tipo não disponível'}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1">
                                                    Solicitado por: <span className="text-[#E31E24]">{request.requester_name}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="text-[9px] font-black text-slate-400 uppercase block">Solicitado em</span>
                                                <span className="text-[11px] font-bold text-slate-700">
                                                    {new Date(request.requested_at).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                            {expandedId === request.id ? <ChevronUp className="w-5 h-5 text-[#1A3351]" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                                        </div>
                                    </div>

                                    {/* Detalhes Expandidos */}
                                    {expandedId === request.id && (
                                        <div className="px-6 pb-6 pt-4 bg-[#1A3351]/5 border-t border-slate-200">
                                            <div className="bg-white p-4 rounded border border-slate-200 mb-4">
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase mb-2">Motivo da Exclusão:</h5>
                                                <p className="text-sm text-[#1A3351] font-semibold leading-relaxed">{request.deletion_reason}</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="bg-white p-3 rounded border border-slate-200">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Cargo</span>
                                                    <p className="text-sm font-bold text-[#1A3351]">{request.original_data?.cargo || 'N/A'}</p>
                                                </div>
                                                <div className="bg-white p-3 rounded border border-slate-200">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Secretaria</span>
                                                    <p className="text-sm font-bold text-[#1A3351]">{request.original_data?.secretaria || 'N/A'}</p>
                                                </div>
                                            </div>

                                            {request.status === 'pending' && (
                                                <div className="flex gap-3 mt-4">
                                                    <button
                                                        onClick={() => handleApproveRequest(request)}
                                                        disabled={processingAction}
                                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-black text-xs uppercase rounded shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        {processingAction ? 'Processando...' : 'Aprovar e Excluir Definitivamente'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectRequest(request.id)}
                                                        disabled={processingAction}
                                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-600 text-white font-black text-xs uppercase rounded shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        {processingAction ? 'Processando...' : 'Rejeitar Solicitação'}
                                                    </button>
                                                </div>
                                            )}

                                            {request.status !== 'pending' && (
                                                <div className="bg-white p-3 rounded border border-slate-200 mt-4">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase">Revisado por</p>
                                                    <p className="text-sm font-bold text-[#1A3351]">{request.reviewer_name || 'N/A'}</p>
                                                    <p className="text-[10px] text-slate-500 mt-1">
                                                        em {request.reviewed_at ? new Date(request.reviewed_at).toLocaleString('pt-BR') : 'N/A'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="py-20 text-center text-slate-400 uppercase font-black text-xs italic tracking-widest">
                                    {filterStatus === 'all' ? 'Nenhuma solicitação encontrada' : `Nenhuma solicitação ${filterStatus === 'pending' ? 'pendente' : filterStatus === 'approved' ? 'aprovada' : 'rejeitada'}`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* MODAL DE CONFIRMAÇÃO DE APROVAÇÃO */}
            {showApprovalModal && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-[#E31E24]">
                            <AlertTriangle className="w-8 h-8 text-[#E31E24]" />
                            <h3 className="text-lg font-black uppercase text-[#1A3351]">Confirmar Exclusão Definitiva</h3>
                        </div>

                        <div className="space-y-4 mb-6">
                            <p className="text-sm font-bold text-slate-700">
                                Esta ação é <span className="text-[#E31E24] uppercase">IRREVERSÍVEL</span>. O registro será PERMANENTEMENTE excluído do banco de dados.
                            </p>

                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                <p className="text-xs font-black text-slate-500 uppercase mb-1">Servidor:</p>
                                <p className="font-bold text-[#1A3351]">{selectedRequest.original_data?.servidor_nome}</p>
                            </div>

                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                <p className="text-xs font-black text-slate-500 uppercase mb-1">Motivo da exclusão:</p>
                                <p className="text-sm text-slate-700">{selectedRequest.deletion_reason}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowApprovalModal(false);
                                    setSelectedRequest(null);
                                }}
                                disabled={processingAction}
                                className="flex-1 py-3 px-4 bg-slate-200 text-slate-700 font-black text-xs uppercase rounded hover:bg-slate-300 transition-all disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmApproval}
                                disabled={processingAction}
                                className="flex-[2] py-3 px-4 bg-[#E31E24] text-white font-black text-xs uppercase rounded shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processingAction ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Excluindo...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Confirmar Exclusão Definitiva
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
