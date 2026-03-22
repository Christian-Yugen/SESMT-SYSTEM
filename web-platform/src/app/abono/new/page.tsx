"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ClipboardList, Search, Save, ChevronLeft, Loader2, User, Calendar, History as HistoryIcon,
    BarChart3, FolderOpen, Users as UsersIcon, TrendingUp, Scale, FileText
} from "lucide-react";
import { Servidor } from "@/types";

export default function NewAbonoPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [foundServidores, setFoundServidores] = useState<any[]>([]);
    const [selectedServidor, setSelectedServidor] = useState<Servidor | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");

    // Form data
    const [formData, setFormData] = useState({
        portaria: "",
        assomasul_numero: "",
        assomasul_data: "",
        inicio: "",
        quant: "12",
        observacoes: "",
        beneficiario_nome: "",
        renew_from_id: null as number | null
    });

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
                        if (data.role === 'analytic_manager') {
                            alert("Acesso Negado: Gerente Analítico não possui permissão para criar registros.");
                            router.push('/abono');
                            return;
                        }
                    }
                    const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Usuário";
                    setUserName(name);

                    // Lógica de Renovação via URL Params
                    const params = new URLSearchParams(window.location.search);
                    const renewFrom = params.get('renew_from');
                    const cpfParam = params.get('cpf');
                    const beneficiarioParam = params.get('beneficiario');

                    if (renewFrom && cpfParam) {
                        setSearching(true);
                        const cleanCpf = cpfParam.replace(/\D/g, "");
                        const { data: servidor } = await supabase
                            .from('servidores')
                            .select('*')
                            .or(`cpf.eq.${cleanCpf},cpf.eq.${cpfParam}`)
                            .maybeSingle();

                        if (servidor) {
                            setSelectedServidor({
                                Nome: servidor.nome,
                                CPF: servidor.cpf,
                                "CPF.": servidor.cpf,
                                Cargo: servidor.cargo,
                                Matrícula: servidor.matricula,
                                Secretaria: servidor.secretaria
                            });
                            setFormData(prev => ({
                                ...prev,
                                beneficiario_nome: beneficiarioParam || "",
                                renew_from_id: parseInt(renewFrom)
                            }));
                        }
                        setSearching(false);
                    }
                } else {
                    router.push("/login");
                }
            } catch (err) {
                await handleAuthError(err);
            }
        };
        checkAuth();
    }, [router]);

    // Busca Automática (Autocomplete)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 3 && !selectedServidor) {
                performSearch(searchQuery);
            } else if (searchQuery.trim().length < 3) {
                setFoundServidores([]);
            }
        }, 400); // 400ms de delay para não sobrecarregar o banco

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const performSearch = async (queryStr: string) => {
        setSearching(true);
        const cleanQuery = queryStr.replace(/\D/g, "");
        const isNumeric = /^\d+$/.test(cleanQuery) && cleanQuery.length > 0;

        let query = supabase.from('servidores').select('*');

        if (isNumeric) {
            // Se for número, busca por CPF que COMEÇA com esses números
            query = query.ilike('cpf', `${cleanQuery}%`).limit(8);
        } else {
            // Se for texto, busca por nome
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
            natureza_cargo: s.natureza_cargo,
            contrato: s.contrato
        });
        setFoundServidores([]);
    };

    const handleSave = async () => {
        if (!selectedServidor) {
            alert("Selecione um servidor primeiro.");
            return;
        }

        if (!formData.inicio || !formData.portaria) {
            alert("Preencha os campos obrigatórios (Portaria e Início).");
            return;
        }

        setSaving(true);
        try {
            // 1. Inserir o novo Abono
            const rawCpf = (selectedServidor.CPF || selectedServidor["CPF."] || "").replace(/\D/g, '');
            const formattedCpf = rawCpf.length === 11
                ? `${rawCpf.slice(0, 3)}.${rawCpf.slice(3, 6)}.${rawCpf.slice(6, 9)}-${rawCpf.slice(9, 11)}`
                : selectedServidor.CPF || selectedServidor["CPF."] || "";

            const { data: newAbono, error } = await supabase
                .from('abono_salarial')
                .insert({
                    cpf: formattedCpf,
                    nome: selectedServidor.Nome,
                    secretaria: selectedServidor.Secretaria,
                    portaria: formData.portaria,
                    assomasul_numero: formData.assomasul_numero || null,
                    assomasul_data: formData.assomasul_data || null,
                    inicio: formData.inicio,
                    quant: 12,
                    observacoes: formData.observacoes,
                    beneficiario_nome: formData.beneficiario_nome.toUpperCase() || 'PRÓPRIO',
                    natureza_cargo: selectedServidor.natureza_cargo || null,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // 2. Se for uma renovação, vincular no registro antigo
            if (formData.renew_from_id && newAbono) {
                const { error: updateError } = await supabase
                    .from('abono_salarial')
                    .update({ renovado_por_id: newAbono.id })
                    .eq('id', formData.renew_from_id);

                if (updateError) console.error("Erro ao vincular renovação:", updateError);
            }

            alert(formData.renew_from_id ? "Benefício renovado com sucesso!" : "Abono salarial registrado com sucesso!");
            router.push('/abono');
        } catch (error: any) {
            console.error("Erro ao salvar abono:", error);
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
                        <button onClick={() => router.push('/abono')} className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg bg-white/10 text-white font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                            <span>Abono Salarial</span>
                        </button>
                        <button onClick={() => router.push('/abono/lei')} className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <Scale className="w-3.5 h-3.5 shrink-0" />
                            <span>Legislação e Regras</span>
                        </button>
                        <button onClick={() => router.push('/abono/portarias')} className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span>Portarias</span>
                        </button>
                        <button className="hidden group-hover:flex w-full items-center gap-1.5 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                            <span>Redução de Jornada</span>
                        </button>
                    </div>

                    {(userRole === 'admin' || userRole === 'social_assistant') && (
                        <>
                            <div className="group">
                                <button onClick={() => router.push('/history')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                    <HistoryIcon className="w-4 h-4 shrink-0" />
                                    <span>Histórico</span>
                                </button>
                            </div>

                            <button onClick={() => router.push('/archive')} className="w-full flex items-center gap-1.5 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <FolderOpen className="w-4 h-4 shrink-0" />
                                <span>Arquivo Médico</span>
                            </button>
                        </>
                    )}
                </nav>

                <div className="mt-auto space-y-4">
                    <button onClick={handleLogout} className="w-full flex items-center gap-1.5 p-2 text-white/30 hover:text-white transition-all font-bold uppercase tracking-widest text-[10px] px-4">
                        <LogOut className="w-4 h-4" /> Sair
                    </button>
                </div>
            </aside>

            {/* ÁREA PRINCIPAL */}
            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden relative">

                {/* HEADER */}
                <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push('/abono')} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                <ChevronLeft className="w-6 h-6 text-[#1A3351]" />
                            </button>
                            <h2 className="text-xl font-black leading-none uppercase tracking-tight text-[#1A3351]">Lançamento de Abono Salarial</h2>
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

                            {/* LISTA DE RESULTADOS (Autocomplete em tempo real) */}
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
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase text-amber-600">Matrícula: {s.matricula}</p>
                                                        {s.contrato && (
                                                            <p className="text-[10px] font-black text-[#E31E24] uppercase">Contrato: {s.contrato}</p>
                                                        )}
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
                                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Nome</p>
                                        <p className="text-xl font-black uppercase text-[#1A3351]">{selectedServidor.Nome}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Cargo</p>
                                        <p className="font-bold uppercase text-sm text-[#1A3351]">{selectedServidor.Cargo}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Matrícula</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-[#1A3351]">{selectedServidor.Matrícula}</p>
                                            {selectedServidor.contrato && (
                                                <span className="bg-[#E31E24] text-white text-[9px] px-1.5 py-0.5 rounded font-black">C. {selectedServidor.contrato}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Secretaria</p>
                                        <p className="font-bold uppercase text-sm text-[#1A3351]">{selectedServidor.Secretaria}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DADOS DO ABONO */}
                        {selectedServidor && (
                            <div className="bg-white p-6 shadow-xl border-l-4 border-[#E31E24] animate-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-sm font-black uppercase text-slate-400 mb-6 tracking-widest">Passo 2: Dados do Benefício</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Número da Portaria *</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] uppercase text-lg text-[#1A3351]"
                                            value={formData.portaria}
                                            onChange={(e) => setFormData({ ...formData, portaria: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Beneficiário / Dependente</label>
                                        <input
                                            type="text"
                                            placeholder="EX: PRÓPRIO, FILHO 1, CÔNJUGE..."
                                            className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] uppercase text-lg text-[#1A3351]"
                                            value={formData.beneficiario_nome}
                                            onChange={(e) => setFormData({ ...formData, beneficiario_nome: e.target.value })}
                                        />
                                    </div>
                                    {formData.renew_from_id && (
                                        <div className="md:col-span-2 bg-amber-50 border-l-4 border-amber-500 p-4 mb-2 flex items-center gap-3">
                                            <TrendingUp className="w-5 h-5 text-amber-600" />
                                            <div>
                                                <p className="text-[10px] font-black text-amber-600 uppercase">Atenção: Modo de Renovação</p>
                                                <p className="text-xs font-bold text-amber-800">Este novo lançamento dará continuidade ao benefício selecionado.</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Número Assomasul</label>
                                        <input
                                            type="text"
                                            placeholder="EX: 4041"
                                            className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] uppercase text-lg text-[#1A3351]"
                                            value={formData.assomasul_numero}
                                            onChange={(e) => setFormData({ ...formData, assomasul_numero: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Data Publicação Assomasul</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] text-lg text-[#1A3351]"
                                            value={formData.assomasul_data}
                                            onChange={(e) => setFormData({ ...formData, assomasul_data: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Data Início do Benefício *</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] text-lg text-[#1A3351]"
                                            value={formData.inicio}
                                            onChange={(e) => setFormData({ ...formData, inicio: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Data de Término (Automático)</label>
                                        <div className="w-full px-4 py-3 border border-slate-200 rounded font-black bg-slate-50 text-xl text-[#E31E24]">
                                            {formData.inicio ? (
                                                (() => {
                                                    const date = new Date(formData.inicio + 'T00:00:00');
                                                    date.setFullYear(date.getFullYear() + 1);
                                                    return date.toLocaleDateString('pt-BR');
                                                })()
                                            ) : '---'}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Informações Adicionais / Observações</label>
                                        <textarea
                                            rows={3}
                                            placeholder="INSIRA AQUI OBSERVAÇÕES RELEVANTES SOBRE ESTE BENEFÍCIO..."
                                            className="w-full px-4 py-4 border border-slate-300 rounded font-bold bg-[#fcfcfc] outline-none focus:border-[#E31E24] uppercase text-base text-[#1A3351]"
                                            value={formData.observacoes}
                                            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="mt-10 flex justify-end gap-4">
                                    <button
                                        onClick={() => router.push('/abono')}
                                        className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-12 py-3 bg-[#E31E24] text-white font-black uppercase text-sm rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 border-b-4 border-red-900"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Salvar Lançamento
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
