"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/auth-utils";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, X, Menu,
    ClipboardList, Search, Save, ChevronLeft, Loader2, User, Calendar, History as HistoryIcon,
    BarChart3, FolderOpen, Users as UsersIcon, TrendingUp, Scale, FileText, Eye, ChevronDown
} from "lucide-react";
import { Servidor } from "@/types";
import { generatePortariaPDF, PortariaData } from "@/lib/portaria-pdf";
import { getLotadoGrammar } from "@/lib/portaria-utils";

export default function NewPortariaPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [foundServidores, setFoundServidores] = useState<any[]>([]);
    const [selectedServidor, setSelectedServidor] = useState<Servidor | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");
    const [nextNumero, setNextNumero] = useState(1934);
    const [showPreview, setShowPreview] = useState(false);
    const [isBenefitsOpen, setIsBenefitsOpen] = useState(true);
    const [isAbonoOpen, setIsAbonoOpen] = useState(true);
    const [mounted, setMounted] = useState(false);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        numero: "",
        periodo_inicio: "",
        periodo_fim: "",
        data_portaria: todayStr,
        genero: "F" as "M" | "F",
        lotacao: ""
    });

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) { await handleAuthError(error); return; }
                if (session) {
                    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                    if (data) {
                        setUserRole(data.role);
                        if (data.role === 'analytic_manager') {
                            alert("Acesso Negado: Gerente Analítico não possui permissão para criar portarias.");
                            router.push('/abono/portarias');
                            return;
                        }
                    }
                    const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Usuário";
                    setUserName(name);
                } else {
                    router.push("/login");
                }
            } catch (err) { await handleAuthError(err); }
        };
        checkAuth();
        loadNextNumero();
    }, [router]);

    async function loadNextNumero() {
        const currentYear = new Date().getFullYear();
        const { data, error } = await supabase
            .from('portarias_abono')
            .select('numero')
            .eq('ano', currentYear)
            .order('numero', { ascending: false })
            .limit(1);

        if (!error && data && data.length > 0) {
            const next = data[0].numero + 1;
            setNextNumero(next);
            setFormData(prev => ({ ...prev, numero: next.toString() }));
        } else {
            // Se não houver nenhuma portaria no banco, usa 1934 como padrão
            setNextNumero(1934);
            setFormData(prev => ({ ...prev, numero: "1934" }));
        }
    }

    // Busca Automática (Autocomplete)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 3 && !selectedServidor) {
                performSearch(searchQuery);
            } else if (searchQuery.trim().length < 3) {
                setFoundServidores([]);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const performSearch = async (queryStr: string) => {
        setSearching(true);
        const cleanQuery = queryStr.replace(/\D/g, "");
        const isNumeric = /^\d+$/.test(cleanQuery) && cleanQuery.length > 0;

        let query = supabase.from('servidores').select('*');

        if (isNumeric) {
            query = query.ilike('cpf', `${cleanQuery}%`).limit(8);
        } else {
            query = query.ilike('nome', `%${queryStr}%`).limit(8);
        }

        const { data, error } = await query;

        if (!error && data) {
            setFoundServidores(data);
        }
        setSearching(false);
    };

    const handleSearch = () => {
        if (searchQuery.trim()) {
            performSearch(searchQuery);
        }
    };

    const selectServidor = (s: any) => {
        setSelectedServidor({
            "CPF.": s.cpf,
            Nome: s.nome,
            Cargo: s.cargo,
            Matrícula: s.matricula,
            "Dt.Nascimento": s.nascimento,
            Secretaria: s.secretaria,
            // Adicionando os novos campos vindos do banco
            Sexo: s.sexo,
            "Local de Trabalho": s.local_trabalho
        });
        setFormData(prev => ({
            ...prev,
            lotacao: s.local_trabalho || s.secretaria || "",
            genero: (s.sexo === 'M' || s.sexo === 'MASCULINO') ? 'M' : 'F'
        }));
        setFoundServidores([]);
    };

    const formatDateBR = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const handlePreview = () => {
        if (!selectedServidor) {
            alert("Selecione um servidor primeiro.");
            return;
        }
        if (!formData.numero || !formData.periodo_inicio || !formData.periodo_fim) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }
        const portariaData: PortariaData = {
            numero: parseInt(formData.numero),
            ano: new Date().getFullYear(),
            servidor_nome: selectedServidor.Nome || "",
            servidor_matricula: selectedServidor.Matrícula || "",
            servidor_cargo: selectedServidor.Cargo || "",
            servidor_lotacao: formData.lotacao,
            servidor_genero: formData.genero,
            periodo_inicio: formatDateBR(formData.periodo_inicio),
            periodo_fim: formatDateBR(formData.periodo_fim),
            data_portaria: formatDateBR(formData.data_portaria)
        };
        generatePortariaPDF(portariaData, 'view');
    };

    const handleSave = async () => {
        if (!selectedServidor) {
            alert("Selecione um servidor primeiro.");
            return;
        }
        if (!formData.numero || !formData.periodo_inicio || !formData.periodo_fim) {
            alert("Preencha os campos obrigatórios (Número, Período Início e Período Fim).");
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const operatorName = session?.user?.email?.split('@')[0]?.toUpperCase() || "SISTEMA";

            const { error } = await supabase
                .from('portarias_abono')
                .insert({
                    numero: parseInt(formData.numero),
                    ano: new Date().getFullYear(),
                    servidor_nome: selectedServidor.Nome,
                    servidor_cpf: selectedServidor.CPF || selectedServidor["CPF."],
                    servidor_matricula: selectedServidor.Matrícula,
                    servidor_cargo: selectedServidor.Cargo,
                    servidor_lotacao: formData.lotacao,
                    servidor_genero: formData.genero,
                    periodo_inicio: formData.periodo_inicio,
                    periodo_fim: formData.periodo_fim,
                    data_portaria: formData.data_portaria,
                    criado_por: session?.user?.id,
                    criado_por_nome: operatorName
                });

            if (error) throw error;

            // Gerar PDF automaticamente
            const portariaData: PortariaData = {
                numero: parseInt(formData.numero),
                ano: new Date().getFullYear(),
                servidor_nome: selectedServidor.Nome || "",
                servidor_matricula: selectedServidor.Matrícula || "",
                servidor_cargo: selectedServidor.Cargo || "",
                servidor_lotacao: formData.lotacao,
                servidor_genero: formData.genero,
                periodo_inicio: formatDateBR(formData.periodo_inicio),
                periodo_fim: formatDateBR(formData.periodo_fim),
                data_portaria: formatDateBR(formData.data_portaria)
            };
            generatePortariaPDF(portariaData, 'view');

            alert("Portaria registrada com sucesso!");
            router.push('/abono/portarias');
        } catch (error: any) {
            console.error("Erro ao salvar portaria:", error);
            alert("Erro ao salvar: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

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

                    <div className="space-y-1">
                        <button onClick={() => setIsBenefitsOpen(!isBenefitsOpen)} className="w-full flex items-center justify-between p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                                <HeartPulse className="w-4 h-4 shrink-0" />
                                <span>Benefícios</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isBenefitsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isBenefitsOpen && (
                            <div className="flex flex-col space-y-1">
                                <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <Database className="w-3.5 h-3.5 shrink-0" />
                                    <span>Auxílio Doença</span>
                                </button>
                                <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <FileSearch className="w-3.5 h-3.5 shrink-0" />
                                    <span>Readaptação</span>
                                </button>

                                <div className="space-y-1">
                                    <button onClick={() => setIsAbonoOpen(!isAbonoOpen)} className="w-full flex items-center justify-between p-2 pl-9 rounded-lg text-white font-bold text-[10px] uppercase tracking-wider group">
                                        <div className="flex items-center gap-2">
                                            <ClipboardList className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                                            <span>Abono Salarial</span>
                                        </div>
                                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isAbonoOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isAbonoOpen && (
                                        <div className="flex flex-col space-y-1 pl-4">
                                            <button onClick={() => router.push('/abono')} className="w-full flex items-center gap-2 p-2 pl-9 rounded-lg font-bold text-[9px] uppercase tracking-wider whitespace-nowrap text-white/40 hover:bg-white/5 hover:text-white">
                                                <LayoutDashboard className="w-3 h-3 shrink-0" />
                                                <span>Painel de Gestão</span>
                                            </button>
                                            <button onClick={() => router.push('/abono/lei')} className="w-full flex items-center gap-2 p-2 pl-9 rounded-lg font-bold text-[9px] uppercase tracking-wider whitespace-nowrap text-white/40 hover:bg-white/5 hover:text-white">
                                                <Scale className="w-3 h-3 shrink-0" />
                                                <span>Legislação e Regras</span>
                                            </button>
                                            <button onClick={() => router.push('/abono/portarias')} className="w-full flex items-center gap-2 p-2 pl-9 rounded-lg font-bold text-[9px] uppercase tracking-wider whitespace-nowrap bg-white/5 text-amber-400 border-l-2 border-amber-500/50">
                                                <FileText className="w-3 h-3 shrink-0" />
                                                <span>Portarias</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                    <span>Redução de Jornada</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={() => router.push('/history')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                        <HistoryIcon className="w-4 h-4 shrink-0" />
                        <span>Histórico</span>
                    </button>
                    <button onClick={() => router.push('/archive')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                        <FolderOpen className="w-4 h-4 shrink-0" />
                        <span>Arquivo Médico</span>
                    </button>
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
                <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* ÁREA PRINCIPAL */}
            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden relative">

                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push('/abono/portarias')} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                <ChevronLeft className="w-6 h-6 text-[#1A3351]" />
                            </button>
                            <div>
                                <h2 className="text-xl font-black leading-none uppercase tracking-tight text-[#1A3351]">Nova Portaria</h2>
                                <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">Criação de Portaria de Abono Salarial</p>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1A3351] rounded text-white active:scale-90 transition-transform">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </section>

                <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    <div className="max-w-[1400px] mx-auto space-y-6">

                        {/* BUSCAR SERVIDOR */}
                        <div className="bg-white p-6 shadow-xl border-l-4 border-[#1A3351]">
                            <h3 className="text-sm font-black uppercase text-slate-400 mb-4 tracking-widest">Passo 1: Identificar Servidor</h3>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="NOME OU CPF DO SERVIDOR..."
                                    className="flex-1 px-4 py-3 border border-[#888] shadow-inner text-base font-bold bg-[#E8E8E8] outline-none uppercase"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (selectedServidor) setSelectedServidor(null);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={searching}
                                    className="px-8 py-3 bg-[#1A3351] text-white font-black uppercase text-sm rounded hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-2"
                                >
                                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    Buscar
                                </button>
                            </div>

                            {/* LISTA DE RESULTADOS */}
                            {foundServidores.length > 0 && !selectedServidor && (
                                <div className="mt-2 border-2 border-[#1A3351] bg-white overflow-hidden rounded shadow-2xl animate-in fade-in slide-in-from-top-2 z-10 relative">
                                    <div className="bg-[#1A3351] px-4 py-2 flex justify-between items-center">
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Sugestões Encontradas</p>
                                        <button onClick={() => setFoundServidores([])} className="text-white hover:text-red-400">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {foundServidores.map((s) => (
                                            <button
                                                key={s.id || s.cpf}
                                                onClick={() => selectServidor(s)}
                                                className="w-full text-left p-4 border-b border-slate-100 hover:bg-[#E31E24]/5 transition-colors group flex justify-between items-center"
                                            >
                                                <div>
                                                    <p className="text-sm font-black text-[#1A3351] group-hover:text-[#E31E24] transition-colors uppercase">{s.nome}</p>
                                                    <div className="flex gap-4 mt-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">CPF: {s.cpf}</p>
                                                        <p className="text-[10px] font-bold text-amber-600 uppercase">Matrícula: {s.matricula}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Cargo: {s.cargo}</p>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded text-[9px] font-black text-[#1A3351] group-hover:bg-[#E31E24] group-hover:text-white group-hover:border-[#E31E24] transition-all uppercase">
                                                    Selecionar
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedServidor && (
                                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Nome</p>
                                        <p className="text-lg font-black uppercase text-[#1A3351]">{selectedServidor.Nome}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Cargo</p>
                                        <p className="font-bold uppercase text-sm text-[#1A3351]">{selectedServidor.Cargo}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Matrícula</p>
                                        <p className="text-sm font-bold text-[#1A3351]">{selectedServidor.Matrícula}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Secretaria</p>
                                        <p className="font-bold uppercase text-sm text-[#1A3351]">{selectedServidor.Secretaria}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Sexo</p>
                                        <p className="font-bold uppercase text-sm text-pink-600">{selectedServidor.Sexo || "---"}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Lotação (Excel)</p>
                                        <p className="font-bold uppercase text-sm text-amber-600">{selectedServidor["Local de Trabalho"] || "---"}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DADOS DA PORTARIA */}
                        {selectedServidor && (
                            <div className="bg-white p-6 shadow-xl border-l-4 border-amber-500 animate-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-sm font-black uppercase text-slate-400 mb-6 tracking-widest">Passo 2: Dados da Portaria</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                    {/* Número da Portaria */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Nº da Portaria *</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                className="w-full px-4 py-3 border border-slate-300 rounded font-black bg-[#fcfcfc] uppercase text-2xl text-[#1A3351] text-center"
                                                value={formData.numero}
                                                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                            />
                                        </div>
                                        <p className="text-[9px] font-bold text-amber-600 uppercase pl-1">PORTARIA Nº {formData.numero || "---"}/SEMAD/DRH/{new Date().getFullYear()}</p>
                                    </div>

                                    {/* Gênero */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Gênero do Servidor *</label>
                                        <div className="flex gap-2 h-[52px]">
                                            <button
                                                onClick={() => setFormData({ ...formData, genero: "F" })}
                                                className={`flex-1 px-4 py-3 rounded font-black uppercase text-sm transition-all border-2 ${formData.genero === "F" ? 'bg-pink-50 border-pink-500 text-pink-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-400'}`}
                                            >
                                                Feminino
                                            </button>
                                            <button
                                                onClick={() => setFormData({ ...formData, genero: "M" })}
                                                className={`flex-1 px-4 py-3 rounded font-black uppercase text-sm transition-all border-2 ${formData.genero === "M" ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-400'}`}
                                            >
                                                Masculino
                                            </button>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase pl-1">
                                            Usará: "{formData.genero === 'F' ? 'a servidora Pública Municipal' : 'o servidor Público Municipal'}"
                                        </p>
                                    </div>

                                    {/* Lotação */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Lotação (Local de Trabalho) *</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] uppercase text-sm text-[#1A3351]"
                                            value={formData.lotacao}
                                            onChange={(e) => setFormData({ ...formData, lotacao: e.target.value })}
                                            placeholder="EX: ESCOLA MARIA DE LOURDES LOPES"
                                        />
                                    </div>

                                    {/* Período Início */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Período Início do Benefício *</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] text-lg text-[#1A3351]"
                                            value={formData.periodo_inicio}
                                            onChange={(e) => {
                                                const inicio = e.target.value;
                                                // Auto-calcular fim (+1 ano)
                                                if (inicio) {
                                                    const date = new Date(inicio + 'T00:00:00');
                                                    date.setFullYear(date.getFullYear() + 1);
                                                    const fimStr = date.toISOString().split('T')[0];
                                                    setFormData({ ...formData, periodo_inicio: inicio, periodo_fim: fimStr });
                                                } else {
                                                    setFormData({ ...formData, periodo_inicio: inicio, periodo_fim: "" });
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Período Fim */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Período Fim do Benefício *</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] text-lg text-[#1A3351]"
                                            value={formData.periodo_fim}
                                            onChange={(e) => setFormData({ ...formData, periodo_fim: e.target.value })}
                                        />
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase pl-1">
                                            {formData.periodo_inicio && formData.periodo_fim
                                                ? `${formatDateBR(formData.periodo_inicio)} → ${formatDateBR(formData.periodo_fim)}`
                                                : "Selecione o início para calcular automaticamente"
                                            }
                                        </p>
                                    </div>

                                    {/* Data da Portaria */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Data de Emissão da Portaria</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] text-lg text-[#1A3351]"
                                            value={formData.data_portaria}
                                            onChange={(e) => setFormData({ ...formData, data_portaria: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Barra de Preview */}
                                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Prévia do Cabeçalho</p>
                                    <p className="text-sm font-black text-[#1A3351] uppercase">
                                        PORTARIA Nº {formData.numero || "---"}/SEGP/DRH/{new Date().getFullYear()}
                                    </p>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                        ...{formData.genero === 'F' ? 'a servidora Pública Municipal' : 'o servidor Público Municipal'}{' '}
                                        <strong>{selectedServidor?.Nome}</strong>, matrícula {selectedServidor?.Matrícula}, no cargo de {selectedServidor?.Cargo}, {getLotadoGrammar(formData.genero, formData.lotacao)} {formData.lotacao || "---"}.
                                    </p>
                                </div>

                                <div className="mt-10 flex flex-col sm:flex-row justify-end gap-4">
                                    <button
                                        onClick={() => router.push('/abono/portarias')}
                                        className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handlePreview}
                                        className="px-8 py-3 bg-[#1A3351] text-white font-black uppercase text-sm rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Pré-Visualizar PDF
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-12 py-3 bg-green-600 text-white font-black uppercase text-sm rounded shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-green-800"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Salvar e Gerar PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
