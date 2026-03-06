"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/auth-utils";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ClipboardList, Search, Save, ChevronLeft, Loader2, User, Calendar, History as HistoryIcon,
    BarChart3, FolderOpen, Users as UsersIcon, TrendingUp, Scale, FileText
} from "lucide-react";
import { Servidor, AbonoRecord } from "@/types";

export default function EditAbonoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [selectedServidor, setSelectedServidor] = useState<Servidor | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");

    // Form data
    const [formData, setFormData] = useState({
        portaria: "",
        assomasul_data: "",
        inicio: "",
        quant: "12",
        observacoes: "",
        motivo_alteracao: "",
        beneficiario_nome: ""
    });
    const [originalData, setOriginalData] = useState<any>(null);
    const [changeLogs, setChangeLogs] = useState<any[]>([]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    await handleAuthError(error);
                    return;
                }
                if (session) {
                    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                    if (data) {
                        setUserRole(data.role);
                        if (data.role === 'analytic_manager') {
                            alert("Acesso Negado: Gerente Analítico não possui permissão para editar registros.");
                            router.push('/abono');
                            return;
                        }
                    }
                    const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Usuário";
                    setUserName(name);
                    loadData();
                } else {
                    router.push("/login");
                }
            } catch (err) {
                await handleAuthError(err);
            }
        };
        checkAuth();
    }, [id, router]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Abono Record
            const { data: abono, error: abonoError } = await supabase
                .from('abono_salarial')
                .select('*')
                .eq('id', id)
                .single();

            if (abonoError || !abono) {
                alert("Erro ao carregar registro de abono.");
                router.push('/abono');
                return;
            }

            setFormData({
                portaria: abono.portaria || "",
                assomasul_data: abono.assomasul_data || "",
                inicio: abono.inicio || "",
                quant: abono.quant?.toString() || "12",
                observacoes: abono.observacoes || "",
                motivo_alteracao: "",
                beneficiario_nome: abono.beneficiario_nome || ""
            });
            setOriginalData(abono);

            // Fetch Logs
            const { data: logs } = await supabase
                .from('abono_salarial_logs')
                .select('*')
                .eq('abono_id', id)
                .order('data_alteracao', { ascending: false });
            if (logs) setChangeLogs(logs);

            // 2. Fetch Servidor info by CPF
            const { data: servidor, error: servError } = await supabase
                .from('servidores')
                .select('*')
                .eq('cpf', abono.cpf)
                .single();

            if (servidor) {
                setSelectedServidor({
                    "CPF.": servidor.cpf,
                    Nome: servidor.nome,
                    Cargo: servidor.cargo,
                    Matrícula: servidor.matricula,
                    "Dt.Nascimento": servidor.nascimento,
                    Secretaria: servidor.secretaria
                });
            } else {
                // Fallback if servidor deleted but abono remains
                setSelectedServidor({
                    "CPF.": abono.cpf,
                    Nome: abono.nome,
                    Cargo: "---",
                    Matrícula: "---",
                    "Dt.Nascimento": "---",
                    Secretaria: "---"
                } as any);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!formData.inicio || !formData.portaria) {
            alert("Preencha os campos obrigatórios (Portaria e Início).");
            return;
        }

        if (!formData.motivo_alteracao || formData.motivo_alteracao.length < 5) {
            alert("Para sua segurança, descreva o motivo desta alteração (mínimo 5 caracteres).");
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userEmail = session?.user?.email || "desconhecido";

            // 1. Update main record
            const { error: updateError } = await supabase
                .from('abono_salarial')
                .update({
                    portaria: formData.portaria,
                    assomasul_data: formData.assomasul_data || null,
                    inicio: formData.inicio,
                    quant: 12,
                    observacoes: formData.observacoes,
                    motivo_alteracao: formData.motivo_alteracao,
                    alterado_por: userEmail,
                    beneficiario_nome: formData.beneficiario_nome.toUpperCase() || 'PRÓPRIO',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // 2. Insert into audit logs
            await supabase.from('abono_salarial_logs').insert({
                abono_id: id,
                usuario_email: userEmail,
                motivo: formData.motivo_alteracao,
                dados_anteriores: originalData,
                dados_novos: {
                    portaria: formData.portaria,
                    assomasul_data: formData.assomasul_data,
                    inicio: formData.inicio,
                    observacoes: formData.observacoes
                }
            });

            alert("Registro atualizado com sucesso!");
            router.push('/abono');
        } catch (error: any) {
            console.error("Erro ao atualizar abono:", error);
            alert("Erro ao atualizar: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
                <p className="text-[#1A3351] uppercase tracking-[0.3em] font-black text-xs">Carregando dados...</p>
            </div>
        );
    }

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
                            <h2 className="text-xl font-black leading-none uppercase tracking-tight text-[#1A3351]">Editar Registro de Abono Salarial</h2>
                        </div>
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1A3351] rounded text-white active:scale-90 transition-transform">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </section>

                <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    <div className="max-w-[1400px] mx-auto space-y-6">

                        {/* INFORMAÇÕES DO SERVIDOR (LEITURA) */}
                        <div className="bg-white p-6 shadow-xl border-l-4 border-[#1A3351]">
                            <h3 className="text-sm font-black uppercase text-slate-400 mb-4 tracking-widest">Servidor Vinculado</h3>
                            {selectedServidor && (
                                <div className="p-4 bg-slate-100/50 border border-slate-200 rounded grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="col-span-2 lg:col-span-1">
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Nome</p>
                                        <p className="text-xl font-black uppercase text-[#1A3351]">{selectedServidor.Nome}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">CPF</p>
                                        <p className="text-sm font-bold text-[#1A3351]">{selectedServidor["CPF."]}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Cargo</p>
                                        <p className="font-bold uppercase text-sm text-[#1A3351]">{selectedServidor.Cargo}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Matrícula</p>
                                        <p className="text-sm font-bold text-[#1A3351]">{selectedServidor.Matrícula}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[11px] font-black text-slate-400 uppercase">Secretaria</p>
                                        <p className="font-bold uppercase text-sm text-[#1A3351]">{selectedServidor.Secretaria}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* EDITAR DADOS DO ABONO */}
                        <div className="bg-white p-6 shadow-xl border-l-4 border-[#E31E24]">
                            <h3 className="text-sm font-black uppercase text-slate-400 mb-6 tracking-widest">Dados do Benefício</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Número da Portaria *</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] uppercase outline-none focus:border-[#E31E24] text-lg text-[#1A3351]"
                                        value={formData.portaria}
                                        onChange={(e) => setFormData({ ...formData, portaria: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Beneficiário / Dependente</label>
                                    <input
                                        type="text"
                                        placeholder="EX: PRÓPRIO, FILHO 1..."
                                        className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] uppercase outline-none focus:border-[#E31E24] text-lg text-[#1A3351]"
                                        value={formData.beneficiario_nome}
                                        onChange={(e) => setFormData({ ...formData, beneficiario_nome: e.target.value })}
                                    />
                                </div>
                                {originalData?.renovado_por_id && (
                                    <div className="md:col-span-2 bg-blue-50 border-l-4 border-blue-500 p-4 mb-2 flex items-center gap-3">
                                        <TrendingUp className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <p className="text-[10px] font-black text-blue-600 uppercase">Status: Renovado</p>
                                            <p className="text-xs font-bold text-blue-800">Este benefício já possui uma renovação vinculada.</p>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Data Publicação Assomasul</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] outline-none focus:border-[#E31E24] text-lg text-[#1A3351]"
                                        value={formData.assomasul_data}
                                        onChange={(e) => setFormData({ ...formData, assomasul_data: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black uppercase text-slate-600 pl-1">Data Início do Benefício *</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 border border-slate-300 rounded font-bold bg-[#fcfcfc] outline-none focus:border-[#E31E24] text-lg text-[#1A3351]"
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
                                <div className="md:col-span-2 space-y-1 bg-amber-50 p-4 rounded-lg border border-amber-200">
                                    <label className="text-[11px] font-black uppercase text-amber-600 pl-1 flex items-center gap-2">
                                        <HistoryIcon className="w-4 h-4" /> Motivo da Alteração (Obrigatório para Auditoria)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="EX: CORREÇÃO DE DATA DE PORTARIA SOLICITADA PELO RH"
                                        className="w-full px-4 py-4 border border-amber-300 rounded font-black bg-white outline-none focus:border-amber-500 uppercase text-sm text-[#1A3351]"
                                        value={formData.motivo_alteracao}
                                        onChange={(e) => setFormData({ ...formData, motivo_alteracao: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mt-10 flex justify-end gap-4">
                                <button
                                    onClick={() => router.push('/abono')}
                                    className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-all font-bold"
                                >
                                    Descartar Alterações
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    disabled={saving}
                                    className="px-12 py-3 bg-[#E31E24] text-white font-black uppercase text-sm rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 border-b-4 border-red-900"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Atualizar Registro
                                </button>
                            </div>
                        </div>

                        {/* HISTÓRICO DE AUDITORIA */}
                        {changeLogs.length > 0 && (
                            <div className="bg-white p-6 shadow-xl border-l-4 border-slate-400">
                                <h3 className="text-sm font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2">
                                    <HistoryIcon className="w-4 h-4" /> Log de Alterações (Segurança)
                                </h3>
                                <div className="space-y-4">
                                    {changeLogs.map((log: any) => (
                                        <div key={log.id} className="text-[11px] p-3 bg-slate-50 rounded border border-slate-200">
                                            <div className="flex justify-between font-black uppercase text-slate-500 mb-1">
                                                <span>{log.usuario_email}</span>
                                                <span>{new Date(log.data_alteracao).toLocaleString('pt-BR')}</span>
                                            </div>
                                            <p className="font-bold text-[#1A3351] uppercase">MOTIVO: {log.motivo}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
