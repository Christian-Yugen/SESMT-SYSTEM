"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, X, Menu,
    ClipboardList, Search, Save, ChevronLeft, Loader2, User, Calendar, History as HistoryIcon,
    BarChart3, FolderOpen, Users as UsersIcon, TrendingUp, Scale, FileText, Eye, ChevronDown, Download
} from "lucide-react";
import { Servidor } from "@/types";
import { generatePortariaPDF, PortariaData } from "@/lib/portaria-pdf";
import { generatePortariaDOCX } from "@/lib/portaria-docx";
import { getLotadoGrammar, capitalizeName } from "@/lib/portaria-utils";

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
                const { session, error } = await safeGetSession();
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
    }, [router]);


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
            "Local de Trabalho": s.local_trabalho,
            contrato: s.contrato
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
            data_portaria: formatDateBR(formData.data_portaria),
            servidor_contrato: selectedServidor.contrato
        };
        generatePortariaPDF(portariaData, 'view');
    };

    const handleDownloadDOCX = async () => {
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
            data_portaria: formatDateBR(formData.data_portaria),
            servidor_contrato: selectedServidor.contrato
        };
        await generatePortariaDOCX(portariaData);
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
            const { session } = await safeGetSession();
            const operatorName = session?.user?.email?.split('@')[0]?.toUpperCase() || "SISTEMA";

            const { error } = await supabase
                .from('portarias_abono')
                .insert({
                    numero: parseInt(formData.numero),
                    ano: new Date().getFullYear(),
                    servidor_nome: capitalizeName(selectedServidor.Nome || ""),
                    servidor_cpf: selectedServidor.CPF || selectedServidor["CPF."],
                    servidor_matricula: selectedServidor.Matrícula,
                    servidor_contrato: selectedServidor.contrato,
                    servidor_cargo: capitalizeName(selectedServidor.Cargo || ""),
                    servidor_lotacao: capitalizeName(formData.lotacao),
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
                data_portaria: formatDateBR(formData.data_portaria),
                servidor_contrato: selectedServidor.contrato
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
            <Sidebar
                userRole={userRole}
                userName={userName}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
            />

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
                                                        {s.contrato && (
                                                            <p className="text-[10px] font-black text-[#E31E24] uppercase">Contrato: {s.contrato}</p>
                                                        )}
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
                                <div className="mt-6 p-5 bg-white border-2 border-slate-200 rounded-lg shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-4 pb-2 border-b border-slate-100">
                                        <div className="w-12 h-12 bg-[#1A3351] rounded flex items-center justify-center text-white shrink-0">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servidor Selecionado</p>
                                            <p className="text-xl font-black uppercase text-[#1A3351]">{selectedServidor.Nome}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 pt-2 text-sm">
                                        <div className="flex items-center gap-2 md:col-span-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase w-20 shrink-0">Cargo:</p>
                                            <p className="font-bold uppercase text-[#1A3351]">{selectedServidor.Cargo}</p>
                                        </div>
                                        <div className="flex items-center gap-2 md:col-span-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase w-20 shrink-0">Secretaria:</p>
                                            <p className="font-bold uppercase text-[#1A3351]">{selectedServidor.Secretaria}</p>
                                        </div>
                                        <div className="flex items-center gap-2 md:col-span-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase w-20 shrink-0">Lotação:</p>
                                            <p className="font-bold uppercase text-[#1A3351]">{selectedServidor["Local de Trabalho"] || "---"}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase w-20 shrink-0">Matrícula:</p>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-700">{selectedServidor.Matrícula}</p>
                                                {selectedServidor.contrato && (
                                                    <span className="bg-[#E31E24] text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">Contrato {selectedServidor.contrato}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase w-20 shrink-0">Sexo:</p>
                                            <p className="font-bold uppercase text-slate-700">{selectedServidor.Sexo === 'F' ? 'Feminino' : 'Masculino'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DADOS DA PORTARIA */}
                        {selectedServidor && (
                            <div className="bg-white p-6 shadow-xl border-l-4 border-amber-500 animate-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-sm font-black uppercase text-slate-400 mb-6 tracking-widest">Passo 2: Dados da Portaria</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                                    {/* Número da Portaria */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-600 pl-1">Nº da Portaria *</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border border-slate-300 rounded font-black bg-white uppercase text-xl text-[#1A3351] text-center focus:border-amber-500 outline-none"
                                            value={formData.numero}
                                            onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                        />
                                        <p className="text-[8px] font-bold text-amber-600 uppercase pl-1 leading-none">Nº {formData.numero || "---"}/SEGP/DGP/{new Date().getFullYear()}</p>
                                    </div>


                                    {/* Período Início */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-600 pl-1">Período Início *</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-slate-300 rounded font-bold bg-[#fcfcfc] text-sm text-[#1A3351]"
                                            value={formData.periodo_inicio}
                                            onChange={(e) => {
                                                const inicio = e.target.value;
                                                // Auto-calcular fim (+1 ano)
                                                if (inicio) {
                                                    const date = new Date(inicio + 'T00:00:00');
                                                    if (!isNaN(date.getTime())) {
                                                        date.setFullYear(date.getFullYear() + 1);
                                                        const fimStr = date.toISOString().split('T')[0];
                                                        setFormData({ ...formData, periodo_inicio: inicio, periodo_fim: fimStr });
                                                    } else {
                                                        setFormData({ ...formData, periodo_inicio: inicio, periodo_fim: "" });
                                                    }
                                                } else {
                                                    setFormData({ ...formData, periodo_inicio: inicio, periodo_fim: "" });
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Período Fim */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-600 pl-1">Período Fim *</label>
                                        <input
                                            type="date"
                                            readOnly
                                            className="w-full px-3 py-2 border border-slate-300 rounded font-bold bg-slate-100 text-sm text-[#1A3351] cursor-not-allowed"
                                            value={formData.periodo_fim}
                                        />
                                    </div>

                                    {/* Data da Portaria */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-600 pl-1">Data Emissão</label>
                                        <input
                                            type="date"
                                            readOnly
                                            className="w-full px-3 py-2 border border-slate-300 rounded font-bold bg-slate-100 text-sm text-[#1A3351] cursor-not-allowed"
                                            value={formData.data_portaria}
                                        />
                                    </div>

                                    <div className="lg:col-span-12 flex items-center">
                                        <div className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded w-full">
                                            <p className="text-[8px] font-black text-emerald-700 uppercase mb-0.5">Vigência Calculada</p>
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase">
                                                {formData.periodo_inicio && formData.periodo_fim
                                                    ? `${formatDateBR(formData.periodo_inicio)} até ${formatDateBR(formData.periodo_fim)}`
                                                    : "Defina a data inicial"
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Barra de Preview */}
                                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Prévia do Cabeçalho</p>
                                    <p className="text-sm font-black text-[#1A3351] uppercase">
                                        PORTARIA Nº {formData.numero || "---"}/SEGP/DGP/{new Date().getFullYear()}
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
                                        PDF
                                    </button>
                                    <button
                                        onClick={handleDownloadDOCX}
                                        className="px-8 py-3 bg-blue-600 text-white font-black uppercase text-sm rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Word
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
