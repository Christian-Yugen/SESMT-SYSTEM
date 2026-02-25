"use client";

import { useState, useEffect } from "react";
import {
    FolderOpen,
    Search,
    Archive,
    LogOut,
    X,
    Menu,
    ChevronRight,
    LayoutDashboard,
    ClipboardList,
    HeartPulse,
    History as HistoryIcon,
    Users as UsersIcon,
    BarChart3,
    Database,
    FileSearch,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Clock,
    User,
    Calendar,
    MapPin,
    ArrowUpDown
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface MedicalFolder {
    id: string;
    servidor_cpf: string;
    servidor_nome: string;
    armario: number;
    gaveta: number;
    pasta: number;
    status: 'ARQUIVADO' | 'RETIRADO';
    posse_nome?: string;
    motivo_saida?: string;
    data_saida?: string;
    ultima_movimentacao: string;
}

interface FolderLog {
    id: string;
    folder_id: string;
    tipo_acao: 'RETIRADA' | 'DEVOLUCAO';
    servidor_nome: string;
    motivo: string;
    anotacoes_devolucao?: string;
    data_hora: string;
    operador_sistema: string;
}

export default function ArchivePage() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");

    // Estados de busca e dados
    const [searchTerm, setSearchTerm] = useState("");
    const [searchType, setSearchType] = useState<'nome' | 'cpf'>('nome');
    const [folders, setFolders] = useState<MedicalFolder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<MedicalFolder | null>(null);
    const [folderLogs, setFolderLogs] = useState<FolderLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Estados dos modais
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Estados dos formulários
    const [withdrawData, setWithdrawData] = useState({
        servidor_nome: "",
        motivo: ""
    });
    const [returnData, setReturnData] = useState({
        anotacoes: "",
        novo_armario: "",
        nova_gaveta: "",
        nova_pasta: ""
    });

    // Autenticação
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
                    if (data) {
                        setUserRole(data.role);
                        if (data.role === 'social_assistant') {
                            router.push('/abono');
                            return;
                        } else if (data.role === 'operator' || data.role === 'viewer') {
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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('medical_folders')
                .select('*')
                .ilike(searchType === 'nome' ? 'servidor_nome' : 'servidor_cpf', `%${searchTerm}%`)
                .order('servidor_nome');

            if (error) throw error;
            setFolders(data || []);
        } catch (error) {
            console.error("Erro na busca:", error);
            alert("Erro ao buscar prontuários");
        } finally {
            setLoading(false);
        }
    };

    const loadFolderHistory = async (folderId: string) => {
        try {
            const { data, error } = await supabase
                .from('medical_folder_logs')
                .select('*')
                .eq('folder_id', folderId)
                .order('data_hora', { ascending: false });

            if (error) throw error;
            setFolderLogs(data || []);
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
        }
    };

    const handleSelectFolder = async (folder: MedicalFolder) => {
        setSelectedFolder(folder);
        await loadFolderHistory(folder.id);
    };

    const handleWithdraw = async () => {
        if (!selectedFolder || !withdrawData.servidor_nome || !withdrawData.motivo) {
            alert("Preencha todos os campos obrigatórios");
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Atualizar status da pasta
            const { error: updateError } = await supabase
                .from('medical_folders')
                .update({
                    status: 'RETIRADO',
                    posse_nome: withdrawData.servidor_nome,
                    motivo_saida: withdrawData.motivo,
                    data_saida: new Date().toISOString(),
                    ultima_movimentacao: new Date().toISOString()
                })
                .eq('id', selectedFolder.id);

            if (updateError) throw updateError;

            // Registrar no log
            const { error: logError } = await supabase
                .from('medical_folder_logs')
                .insert({
                    folder_id: selectedFolder.id,
                    tipo_acao: 'RETIRADA',
                    servidor_nome: withdrawData.servidor_nome,
                    motivo: withdrawData.motivo,
                    data_hora: new Date().toISOString(),
                    operador_sistema: session.user.id
                });

            if (logError) throw logError;

            alert("Retirada registrada com sucesso!");
            setShowWithdrawModal(false);
            setWithdrawData({ servidor_nome: "", motivo: "" });
            handleSearch(); // Atualizar lista
        } catch (error) {
            console.error("Erro ao registrar retirada:", error);
            alert("Erro ao registrar retirada");
        }
    };

    const handleReturn = async () => {
        if (!selectedFolder || !returnData.anotacoes) {
            alert("Preencha as anotações da devolução");
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const updateData: any = {
                status: 'ARQUIVADO',
                posse_nome: null,
                motivo_saida: null,
                data_saida: null,
                ultima_movimentacao: new Date().toISOString()
            };

            // Se mudou de local
            if (returnData.novo_armario) {
                updateData.armario = parseInt(returnData.novo_armario);
                updateData.gaveta = parseInt(returnData.nova_gaveta);
                updateData.pasta = parseInt(returnData.nova_pasta);
            }

            const { error: updateError } = await supabase
                .from('medical_folders')
                .update(updateData)
                .eq('id', selectedFolder.id);

            if (updateError) throw updateError;

            // Registrar no log
            const { error: logError } = await supabase
                .from('medical_folder_logs')
                .insert({
                    folder_id: selectedFolder.id,
                    tipo_acao: 'DEVOLUCAO',
                    servidor_nome: selectedFolder.posse_nome || '',
                    motivo: selectedFolder.motivo_saida || '',
                    anotacoes_devolucao: returnData.anotacoes,
                    data_hora: new Date().toISOString(),
                    operador_sistema: session.user.id
                });

            if (logError) throw logError;

            alert("Devolução registrada com sucesso!");
            setShowReturnModal(false);
            setReturnData({ anotacoes: "", novo_armario: "", nova_gaveta: "", nova_pasta: "" });
            handleSearch();
        } catch (error) {
            console.error("Erro ao registrar devolução:", error);
            alert("Erro ao registrar devolução");
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A111C] text-white font-sans overflow-x-hidden">

            {/* SIDEBAR MOBILE OVERLAY */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

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
                    {userRole !== 'social_assistant' && (
                        <>
                            <button onClick={() => router.push('/')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap">
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
                        <div className="group">
                            <button className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <HeartPulse className="w-4 h-4 shrink-0" />
                                <span>Benefícios</span>
                            </button>
                            {userRole !== 'social_assistant' && (
                                <>
                                    <button className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                        <Database className="w-3.5 h-3.5 shrink-0" />
                                        <span>Auxílio Doença</span>
                                    </button>
                                    <button className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                        <FileSearch className="w-3.5 h-3.5 shrink-0" />
                                        <span>Readaptação</span>
                                    </button>
                                </>
                            )}
                            {userRole !== 'nurse' && userRole !== 'operator' && (
                                <button onClick={() => router.push('/abono')} className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                                    <span>Abono Salarial</span>
                                </button>
                            )}
                            {userRole !== 'social_assistant' && (
                                <button className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                    <span>Redução de Jornada</span>
                                </button>
                            )}
                        </div>
                    )}

                    {userRole !== 'social_assistant' && userRole !== 'operator' && userRole !== 'viewer' && (
                        <>
                            <div className="group">
                                <button onClick={() => router.push('/history')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider truncate">
                                    <HistoryIcon className="w-4 h-4 shrink-0" />
                                    <span>Histórico</span>
                                </button>
                                <button onClick={() => router.push('/analytics')} className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                                    <span>Indicadores</span>
                                </button>
                            </div>
                            <button onClick={() => router.push('/archive')} className="w-full flex items-center gap-1.5 p-3 rounded-lg bg-white/10 text-white font-bold text-xs uppercase tracking-wider shadow-sm border border-white/5 transition-all hover:bg-white/20">
                                <FolderOpen className="w-4 h-4 shrink-0" />
                                <span>Arquivo Médico</span>
                            </button>
                        </>
                    )}

                    {userRole === 'admin' && (
                        <button onClick={() => router.push('/users')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                            <UsersIcon className="w-4 h-4 shrink-0" />
                            <span>Usuários</span>
                        </button>
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
                        <p className="text-[10px] font-normal text-white/60 leading-none mb-1 text-left">Powered by</p>
                        <p className="text-[18px] font-black text-white leading-none tracking-[0.1em] text-left">
                            UXBRAS<span className="text-[12px] font-normal align-top ml-0.5 tracking-normal">®</span>
                        </p>
                    </div>
                </div>
            </aside>

            {/* ÁREA PRINCIPAL */}
            <main className="flex-1 flex flex-col bg-[#D3D3D3] text-black min-h-screen lg:h-screen lg:overflow-hidden relative">

                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-1">
                        <h2 className="text-xl font-black leading-none uppercase tracking-tight text-[#1A3351]">Arquivo Médico</h2>
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1A3351] rounded text-white active:scale-90 transition-transform">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </section>

                {/* BARRA DE BUSCA */}
                <section className="bg-[#B0B0B0] p-6 border-b-2 border-[#999] shrink-0">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSearchType('nome')}
                                    className={`px-4 py-2 rounded font-bold text-sm uppercase transition-all ${searchType === 'nome'
                                        ? 'bg-[#1A3351] text-white shadow-md'
                                        : 'bg-white/50 text-slate-700 hover:bg-white/80'
                                        }`}
                                >
                                    Nome
                                </button>
                                <button
                                    onClick={() => setSearchType('cpf')}
                                    className={`px-4 py-2 rounded font-bold text-sm uppercase transition-all ${searchType === 'cpf'
                                        ? 'bg-[#1A3351] text-white shadow-md'
                                        : 'bg-white/50 text-slate-700 hover:bg-white/80'
                                        }`}
                                >
                                    CPF
                                </button>
                            </div>
                            <div className="flex-1 flex gap-3">
                                <input
                                    type="text"
                                    placeholder={searchType === 'nome' ? "Digite o nome do servidor..." : "Digite o CPF..."}
                                    className="flex-1 px-4 py-2 border-2 border-[#888] shadow-inner text-base font-normal bg-white outline-none focus:border-[#1A3351] rounded"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={loading}
                                    className="px-8 py-2 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-sm uppercase border border-black/10 disabled:opacity-50"
                                >
                                    {loading ? "Buscando..." : <Search className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* RESULTADOS */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {folders.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                            <Archive className="w-24 h-24 mb-4" />
                            <p className="text-xl font-black uppercase tracking-wider">Aguardando Pesquisa</p>
                            <p className="text-sm mt-2">Use a barra de busca acima para localizar prontuários</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        {folders.map((folder) => (
                            <div
                                key={folder.id}
                                onClick={() => handleSelectFolder(folder)}
                                className="bg-white rounded-xl shadow-lg border-2 border-slate-300 p-6 hover:border-[#1A3351] transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-black text-[#1A3351] uppercase group-hover:text-[#E31E24] transition-colors">
                                            {folder.servidor_nome}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-bold mt-1">CPF: {folder.servidor_cpf}</p>
                                    </div>
                                    {folder.status === 'ARQUIVADO' ? (
                                        <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-6 h-6 text-orange-600 shrink-0" />
                                    )}
                                </div>

                                {folder.status === 'ARQUIVADO' ? (
                                    <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                                        <p className="text-xs font-black text-green-900 uppercase mb-2">✓ Disponível no Arquivo</p>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-white p-2 rounded shadow-sm">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Armário</p>
                                                <p className="text-2xl font-black text-[#1A3351]">{folder.armario}</p>
                                            </div>
                                            <div className="bg-white p-2 rounded shadow-sm">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Gaveta</p>
                                                <p className="text-2xl font-black text-[#1A3351]">{folder.gaveta}</p>
                                            </div>
                                            <div className="bg-white p-2 rounded shadow-sm">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Pasta</p>
                                                <p className="text-2xl font-black text-[#1A3351]">{folder.pasta}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-orange-50 border-l-4 border-orange-600 p-4 rounded">
                                        <p className="text-xs font-black text-orange-900 uppercase mb-2">⚠ Em Posse de:</p>
                                        <p className="text-sm font-bold text-slate-900">{folder.posse_nome}</p>
                                        <p className="text-xs text-slate-600 mt-2 italic">Motivo: {folder.motivo_saida}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Desde: {new Date(folder.data_saida!).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2">
                                    {folder.status === 'ARQUIVADO' ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFolder(folder);
                                                setShowWithdrawModal(true);
                                            }}
                                            className="flex-1 px-3 py-2 bg-[#1A3351] text-white text-xs font-bold uppercase rounded hover:brightness-110 transition-all"
                                        >
                                            Registrar Retirada
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFolder(folder);
                                                setShowReturnModal(true);
                                            }}
                                            className="flex-1 px-3 py-2 bg-green-600 text-white text-xs font-bold uppercase rounded hover:brightness-110 transition-all"
                                        >
                                            Registrar Devolução
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectFolder(folder);
                                            setShowHistoryModal(true);
                                        }}
                                        className="px-3 py-2 bg-slate-600 text-white text-xs font-bold uppercase rounded hover:brightness-110 transition-all"
                                    >
                                        <Clock className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* MODAL: REGISTRAR RETIRADA */}
            {showWithdrawModal && selectedFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#D3D3D3] w-full max-w-xl rounded-xl shadow-2xl border-2 border-[#1A3351] overflow-hidden">
                        <div className="bg-[#1A3351] p-4 flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight text-white">Registrar Retirada</h3>
                            <button onClick={() => setShowWithdrawModal(false)} className="text-white/70 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-white p-4 rounded border-l-4 border-[#1A3351]">
                                <p className="text-sm font-black text-slate-700 uppercase mb-1">Prontuário de:</p>
                                <p className="text-lg font-bold text-[#1A3351]">{selectedFolder.servidor_nome}</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase text-slate-700">Quem está retirando?*</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 bg-white border border-slate-400 rounded-md font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351]"
                                    value={withdrawData.servidor_nome}
                                    onChange={(e) => setWithdrawData({ ...withdrawData, servidor_nome: e.target.value })}
                                    placeholder="Ex: Dr. João Silva"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase text-slate-700">Motivo da retirada*</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-white border border-slate-400 rounded-md font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] resize-none"
                                    rows={3}
                                    value={withdrawData.motivo}
                                    onChange={(e) => setWithdrawData({ ...withdrawData, motivo: e.target.value })}
                                    placeholder="Ex: Avaliação médica periódica"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-[#B0B0B0] flex justify-end gap-4 border-t border-slate-400">
                            <button
                                onClick={() => setShowWithdrawModal(false)}
                                className="px-8 py-2 bg-[#E31E24] text-white font-black uppercase rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleWithdraw}
                                className="px-8 py-2 bg-[#1A3351] text-white font-black uppercase rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-sm"
                            >
                                Confirmar Retirada
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: REGISTRAR DEVOLUÇÃO */}
            {showReturnModal && selectedFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#D3D3D3] w-full max-w-2xl rounded-xl shadow-2xl border-2 border-[#1A3351] overflow-hidden">
                        <div className="bg-[#1A3351] p-4 flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight text-white">Registrar Devolução</h3>
                            <button onClick={() => setShowReturnModal(false)} className="text-white/70 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-white p-4 rounded border-l-4 border-green-600">
                                <p className="text-sm font-black text-slate-700 uppercase mb-1">Prontuário de:</p>
                                <p className="text-lg font-bold text-[#1A3351]">{selectedFolder.servidor_nome}</p>
                                <p className="text-xs text-slate-600 mt-2">Estava com: {selectedFolder.posse_nome}</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase text-slate-700">Anotações/Mudanças durante a posse*</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-white border border-slate-400 rounded-md font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] resize-none"
                                    rows={4}
                                    value={returnData.anotacoes}
                                    onChange={(e) => setReturnData({ ...returnData, anotacoes: e.target.value })}
                                    placeholder="Ex: Adicionados 3 novos laudos de exames complementares"
                                />
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-sm font-black text-slate-700 uppercase mb-3">A pasta retornará para o local original?</p>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <div className="bg-white p-3 rounded text-center border-2 border-[#1A3351]">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Armário</p>
                                        <p className="text-xl font-black text-[#1A3351]">{selectedFolder.armario}</p>
                                    </div>
                                    <div className="bg-white p-3 rounded text-center border-2 border-[#1A3351]">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Gaveta</p>
                                        <p className="text-xl font-black text-[#1A3351]">{selectedFolder.gaveta}</p>
                                    </div>
                                    <div className="bg-white p-3 rounded text-center border-2 border-[#1A3351]">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Pasta</p>
                                        <p className="text-xl font-black text-[#1A3351]">{selectedFolder.pasta}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 mb-3">Ou realocar para novo endereço:</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <input
                                        type="number"
                                        placeholder="Armário"
                                        className="px-3 py-2 bg-white border border-slate-400 rounded text-center font-bold outline-none focus:border-[#1A3351]"
                                        value={returnData.novo_armario}
                                        onChange={(e) => setReturnData({ ...returnData, novo_armario: e.target.value })}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Gaveta"
                                        className="px-3 py-2 bg-white border border-slate-400 rounded text-center font-bold outline-none focus:border-[#1A3351]"
                                        value={returnData.nova_gaveta}
                                        onChange={(e) => setReturnData({ ...returnData, nova_gaveta: e.target.value })}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Pasta"
                                        className="px-3 py-2 bg-white border border-slate-400 rounded text-center font-bold outline-none focus:border-[#1A3351]"
                                        value={returnData.nova_pasta}
                                        onChange={(e) => setReturnData({ ...returnData, nova_pasta: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-[#B0B0B0] flex justify-end gap-4 border-t border-slate-400">
                            <button
                                onClick={() => setShowReturnModal(false)}
                                className="px-8 py-2 bg-[#E31E24] text-white font-black uppercase rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReturn}
                                className="px-8 py-2 bg-green-600 text-white font-black uppercase rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-sm"
                            >
                                Confirmar Devolução
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: HISTÓRICO */}
            {showHistoryModal && selectedFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#D3D3D3] w-full max-w-3xl rounded-xl shadow-2xl border-2 border-[#1A3351] overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="bg-[#1A3351] p-4 flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight text-white">Histórico de Movimentações</h3>
                            <button onClick={() => setShowHistoryModal(false)} className="text-white/70 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="bg-white p-4 rounded border-l-4 border-[#1A3351] mb-6">
                                <p className="text-sm font-black text-slate-700 uppercase mb-1">Prontuário de:</p>
                                <p className="text-lg font-bold text-[#1A3351]">{selectedFolder.servidor_nome}</p>
                            </div>

                            {folderLogs.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p className="font-bold uppercase">Nenhuma movimentação registrada</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-300"></div>
                                    <div className="space-y-6">
                                        {folderLogs.map((log, index) => (
                                            <div key={log.id} className="relative pl-16">
                                                <div className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center ${log.tipo_acao === 'RETIRADA'
                                                    ? 'bg-orange-600'
                                                    : 'bg-green-600'
                                                    }`}>
                                                    {log.tipo_acao === 'RETIRADA' ? (
                                                        <ArrowUpDown className="w-6 h-6 text-white" />
                                                    ) : (
                                                        <CheckCircle className="w-6 h-6 text-white" />
                                                    )}
                                                </div>
                                                <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className={`text-sm font-black uppercase ${log.tipo_acao === 'RETIRADA' ? 'text-orange-700' : 'text-green-700'
                                                                }`}>
                                                                {log.tipo_acao === 'RETIRADA' ? '⬆ Retirada' : '⬇ Devolução'}
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {new Date(log.data_hora).toLocaleString('pt-BR')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 text-sm">
                                                        <p><span className="font-bold text-slate-700">Servidor:</span> {log.servidor_nome}</p>
                                                        <p><span className="font-bold text-slate-700">Motivo:</span> {log.motivo}</p>
                                                        {log.anotacoes_devolucao && (
                                                            <div className="bg-green-50 p-3 rounded border-l-2 border-green-600 mt-2">
                                                                <p className="font-bold text-green-900 text-xs uppercase mb-1">Anotações da Devolução:</p>
                                                                <p className="text-slate-700">{log.anotacoes_devolucao}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-[#B0B0B0] border-t border-slate-400">
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="w-full px-8 py-2 bg-[#1A3351] text-white font-black uppercase rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-sm"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
