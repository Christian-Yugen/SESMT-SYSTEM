"use client";

import { useState, useEffect } from "react";
import {
    LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu,
    ChevronDown, History as HistoryIcon,
    BarChart3, ClipboardList, Printer, Users as UsersIcon, TrendingUp, FolderOpen,
    Trash2, BookOpen, Info, ShieldCheck, CalendarCheck, Scale, Award, FileText
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { handleAuthError } from "@/lib/auth-utils";

export default function AbonoLeiPage() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuário");
    const [isBenefitsOpen, setIsBenefitsOpen] = useState(true);
    const [isAbonoOpen, setIsAbonoOpen] = useState(true);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
                    }
                    const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Usuário";
                    setUserName(name);
                } else {
                    router.push("/login");
                }
            } catch (err) {
                await handleAuthError(err);
            }
        };
        checkAuth();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#F0F2F5] text-slate-900 font-sans overflow-x-hidden">
            <style jsx global>{`
                @media print {
                    @page { size: portrait; margin: 0.8cm 1.2cm; }
                    body { background: white !important; color: black !important; }
                    .print-hidden { display: none !important; }
                    
                    /* Reset de fontes para impressão */
                    * { 
                        font-size: 10pt !important; 
                        line-height: 1.1 !important; 
                        color: black !important;
                    }
                    
                    .law-paper { 
                        box-shadow: none !important; border: none !important; 
                        padding: 0 !important; margin: 0 !important; width: 100% !important;
                    }
                    .law-paper-header { 
                        border-bottom: 1px solid black !important;
                        padding: 0 !important; margin-bottom: 10px !important;
                        text-align: center !important;
                    }
                    .law-title { 
                        font-size: 12pt !important; 
                        font-weight: bold !important;
                        text-decoration: underline !important;
                        margin: 0 !important;
                    }
                    .law-paper-body { padding: 0 !important; }
                    .law-article { margin-bottom: 5px !important; }
                    .law-intro { font-size: 9pt !important; margin-bottom: 8px !important; font-style: italic !important; }
                    .line-through { display: none !important; }
                    
                    .law-amendment-box { 
                        border-left: 1px solid #999 !important;
                        padding: 0 0 0 8px !important;
                        margin: 2px 0 2px 25px !important;
                    }
                    
                    .law-signature-area { margin-top: 15px !important; page-break-inside: avoid; }
                    .law-signature-line { border-top: 1px solid black !important; width: 180px !important; margin-bottom: 2px !important; }
                    
                    /* Ajuste de gaps do grid/flex que o Tailwind impõe */
                    .space-y-12, .space-y-6, .space-y-4 { margin-top: 0 !important; gap: 0 !important; }
                    .gap-4, .gap-6, .gap-12 { gap: 4px !important; }
                    p, div { margin-top: 2px !important; margin-bottom: 2px !important; }
                }
            `}</style>

            {/* SIDEBAR */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 bg-[#1A3351] border-r border-white/10 flex flex-col p-6 lg:p-4 shrink-0 shadow-2xl transition-transform duration-300 transform ease-in-out print:hidden
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="mb-8 flex flex-col items-center">
                    <div className="flex justify-between items-center w-full lg:hidden mb-4">
                        <span className="text-white font-bold text-xs uppercase text-white/50">Navegação</span>
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
                    {(userRole === 'admin' || userRole === 'social_assistant') && (
                        <>
                            <button onClick={() => router.push('/')} className="w-full flex items-center gap-2 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                <LayoutDashboard className="w-4 h-4 shrink-0 text-sky-400" />
                                <span>Criar documentos</span>
                            </button>

                            <button onClick={() => router.push('/referrals')} className="w-full flex items-center gap-2 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                <ClipboardList className="w-4 h-4 shrink-0 text-emerald-400" />
                                <span>Central de Evidências</span>
                            </button>
                        </>
                    )}

                    <div className="space-y-1">
                        <button
                            onClick={() => setIsBenefitsOpen(!isBenefitsOpen)}
                            className="w-full flex items-center justify-between p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
                        >
                            <div className="flex items-center gap-2">
                                <HeartPulse className="w-4 h-4 shrink-0 text-red-400" />
                                <span>Benefícios</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isBenefitsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {(isBenefitsOpen || (mounted && typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
                            <div className={`${isBenefitsOpen ? 'flex' : 'hidden lg:group-hover:flex'} flex-col space-y-1`}>
                                <button className="w-full flex items-center gap-2 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap group">
                                    <Database className="w-3.5 h-3.5 shrink-0 group-hover:text-amber-400 transition-colors" />
                                    <span>Auxílio Doença</span>
                                </button>
                                <button className="w-full flex items-center gap-2 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap group">
                                    <FileSearch className="w-3.5 h-3.5 shrink-0 group-hover:text-purple-400 transition-colors" />
                                    <span>Readaptação</span>
                                </button>

                                <div className="space-y-1">
                                    <button
                                        onClick={() => setIsAbonoOpen(!isAbonoOpen)}
                                        className="w-full flex items-center justify-between p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ClipboardList className="w-3.5 h-3.5 shrink-0 group-hover:text-indigo-400 transition-colors" />
                                            <span>Abono Salarial</span>
                                        </div>
                                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isAbonoOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isAbonoOpen && (
                                        <div className="flex flex-col space-y-1 pl-4">
                                            <button onClick={() => router.push('/abono')} className="w-full flex items-center gap-2 p-2 pl-9 rounded-lg text-white/40 hover:bg-white/5 hover:text-white transition-all font-bold text-[9px] uppercase tracking-wider whitespace-nowrap group">
                                                <LayoutDashboard className="w-3 h-3 shrink-0" />
                                                <span>Painel de Gestão</span>
                                            </button>
                                            <button className="w-full flex items-center gap-2 p-2 pl-9 rounded-lg bg-white/5 text-sky-400 font-bold text-[9px] uppercase tracking-wider whitespace-nowrap shadow-inner border-l-2 border-sky-500/50">
                                                <Scale className="w-3 h-3 shrink-0" />
                                                <span>Legislação e Regras</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button className="w-full flex items-center gap-2 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap group">
                                    <TrendingUp className="w-3.5 h-3.5 shrink-0 group-hover:text-cyan-400 transition-colors" />
                                    <span>Redução de Jornada</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {(userRole === 'admin' || userRole === 'social_assistant') && (
                        <div className="space-y-1">
                            <div className="space-y-1">
                                <button
                                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
                                >
                                    <div className="flex items-center gap-2">
                                        <HistoryIcon className="w-4 h-4 shrink-0 text-slate-400" />
                                        <span>Histórico</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {(isHistoryOpen || (mounted && typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
                                    <div className={`${isHistoryOpen ? 'flex' : 'hidden lg:group-hover:flex'} flex-col space-y-1`}>
                                        <button onClick={() => router.push('/history')} className="w-full flex items-center gap-2 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                            <HistoryIcon className="w-3.5 h-3.5 shrink-0" />
                                            <span>Log Principal</span>
                                        </button>
                                        <button onClick={() => router.push('/abono/analytics')} className="w-full flex items-center gap-2 p-2 pl-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                                            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                                            <span>Indicadores</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => router.push('/archive')} className="w-full flex items-center gap-2 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
                                <span>Arquivo Médico</span>
                            </button>
                        </div>
                    )}

                    {userRole === 'admin' && (
                        <>
                            <button onClick={() => router.push('/users')} className="w-full flex items-center gap-2 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider">
                                <UsersIcon className="w-4 h-4 shrink-0 text-indigo-400" />
                                <span>Usuários</span>
                            </button>
                            <button onClick={() => router.push('/deletion-requests')} className="w-full flex items-center gap-2 p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                <Trash2 className="w-4 h-4 shrink-0 text-rose-500" />
                                <span>Exclusões Pendentes</span>
                            </button>
                        </>
                    )}
                </nav>

                <div className="mt-auto space-y-4">
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 p-2 text-white/30 hover:text-rose-400 transition-all font-bold uppercase tracking-widest text-[10px] px-4 group">
                        <LogOut className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /> Sair do Sistema
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
            <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-hidden print:bg-white">

                {/* TOP BAR / GLASS HEADER */}
                <header className="bg-white/90 backdrop-blur-md border-b-4 border-blue-600 px-6 py-4 flex items-center justify-between shadow-lg shrink-0 z-30 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-[#1A3351] rounded-xl shadow-lg shadow-blue-900/10">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Legislação Municipal</h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Abono Salarial para Servidores com Filhos Deficientes</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.print()}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-bold border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-xs uppercase"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir
                        </button>
                        <button
                            onClick={() => router.push('/abono')}
                            className="px-5 py-2 bg-[#1A3351] text-white font-black rounded-lg hover:brightness-110 active:scale-95 transition-all text-xs uppercase shadow-md shadow-blue-900/20"
                        >
                            Voltar
                        </button>
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                {/* CONTEÚDO SCROLLÁVEL */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-10 pb-20 scroll-smooth">

                    {/* HERO / STATS CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 print-hidden">
                        <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 group hover:border-blue-200 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <Scale className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex flex-col text-left min-w-0">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5">Base Legal</p>
                                <h3 className="text-[11px] font-black text-slate-800 uppercase truncate">Lei 1.562/99</h3>
                            </div>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 group hover:border-emerald-200 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <Award className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="flex flex-col text-left min-w-0">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5">Valor do Abono</p>
                                <h3 className="text-[11px] font-black text-slate-800 uppercase truncate">01 Salário Mínimo</h3>
                            </div>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 group hover:border-amber-200 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <HeartPulse className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="flex flex-col text-left min-w-0">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5">Destinatário</p>
                                <h3 className="text-[11px] font-black text-slate-800 uppercase truncate">Filhos ou Tutelados</h3>
                                <p className="text-[7px] font-bold text-amber-700 uppercase leading-none mt-0.5">Deficiência Sensorial/Mental</p>
                            </div>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 group hover:border-indigo-200 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="flex flex-col text-left min-w-0">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5">Natureza</p>
                                <h3 className="text-[11px] font-black text-slate-800 uppercase truncate">Não-Remuneratória</h3>
                            </div>
                        </div>
                    </div>

                    {/* MAIN DOCUMENT CONTAINER */}
                    <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                        {/* THE LAW PAPER */}
                        <div className="bg-white shadow-2xl shadow-slate-200 border border-slate-200 rounded-3xl overflow-hidden relative z-10 law-paper">

                            {/* PAPER HEADER */}
                            <div className="bg-slate-50 border-b border-slate-200 p-8 lg:p-12 text-center space-y-4 law-paper-header">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4 shadow-sm print-hidden">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                    Documento Integrado e Atualizado
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight uppercase underline decoration-4 decoration-blue-500 underline-offset-8 law-title">
                                    LEI Nº 1562, DE 14/09/1999
                                </h2>
                                <p className="text-base font-serif italic text-slate-600 max-w-2xl mx-auto leading-relaxed pt-4">
                                    "Disciplina o abono salarial para servidores com filhos deficientes."
                                </p>
                            </div>

                            {/* PAPER BODY */}
                            <div className="p-6 lg:p-10 space-y-4 font-serif text-slate-800 text-lg leading-snug text-justify law-paper-body">

                                {/* INTRO */}
                                <div className="border-l-4 border-slate-200 pl-6 py-2 italic text-slate-700 bg-slate-50/50 rounded-r-lg law-intro">
                                    FAÇO SABER QUE A CÂMARA MUNICIPAL DE TRÊS LAGOAS-MS, APROVOU E EU, NA QUALIDADE DE SEU PRESIDENTE REMETO O SEGUINTE AUTÓGRAFO DE LEI PARA SANÇÃO DO PODER EXECUTIVO:
                                </div>

                                {/* ARTICLES CONTAINER */}
                                <div className="space-y-4 max-w-4xl mx-auto">

                                    {/* ART 1 */}
                                    <div className="space-y-1 group law-article">
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.1 rounded text-sm shrink-0 mt-1 print:bg-transparent print:text-black">Art. 1º</span>
                                            <div className="space-y-1">
                                                <p className="line-through text-slate-400 text-base italic decoration-slate-300">
                                                    Fica o Poder Executivo autorizado a conceder um abono mensal aos servidores municipais que tenham, sob seu sustento, filhos ou tutelados dependentes com deficiência sensorial ou mental.
                                                </p>
                                                <div className="p-4 bg-slate-50 border-l-2 border-slate-300 rounded-r-lg law-amendment-box">
                                                    <p>
                                                        Fica o Poder Executivo e Legislativo Municipal autorizado a conceder um abono mensal aos servidores municipais que tenham, sob seu sustento, filhos ou tutelados dependentes com deficiência sensorial ou mental.
                                                        <span className="block mt-2 text-[11px] font-sans font-black text-emerald-600 uppercase tracking-wider print:text-black print:text-[8pt]">(Redação dada pela Lei nº 3353/2017)</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ml-14 bg-slate-50/30 p-4 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-base text-slate-700">
                                                <span className="font-bold">Parágrafo único.</span> O abono referido no "caput" deste Artigo será equivalente a 01 (um) salário mínimo e perdurará como pensão vitalícia ao beneficiário em caso de morte do servidor.
                                            </p>
                                        </div>
                                    </div>

                                    {/* ART 2 */}
                                    <div className="space-y-1 law-article">
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.1 rounded text-sm shrink-0 mt-1 print:bg-transparent print:text-black">Art. 2º</span>
                                            <div className="space-y-1">
                                                <p className="line-through text-slate-400 text-base italic decoration-slate-300">
                                                    Fará jus ao abono referido no Artigo 1º desta Lei, o servidor municipal estável ou ocupante de cargo efetivo e inativos, que comprovar, anualmente, os seguintes requisitos:
                                                </p>
                                                <div className="p-4 bg-slate-50 border-l-2 border-slate-300 rounded-r-lg law-amendment-box">
                                                    <p>
                                                        Fará jus ao abono referido no Artigo 1º desta Lei, o servidor municipal, estável ou ocupante de cargo efetivo, inativos e contratados, que comprovar anualmente, os seguintes requisitos:
                                                        <span className="block mt-2 text-[11px] font-sans font-black text-emerald-600 uppercase tracking-wider print:text-black print:text-[8pt]">(Redação dada pela Lei nº 1599/2000)</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ml-14 space-y-4 pt-4">
                                            <div className="flex gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-100 last:border-0">
                                                <span className="font-bold text-slate-400">1.</span>
                                                <p className="text-base">ter filho ou tutelado com deficiência sensorial ou mental, que o incapacite para a vida independente e para o trabalho, comprovado por laudo de avaliação expedido por junta médica do município;</p>
                                            </div>
                                            <div className="flex gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-100 last:border-0">
                                                <span className="font-bold text-slate-400">2.</span>
                                                <p className="text-base">que o filho ou tutelado deficiente e incapacitado para o trabalho dependa, exclusivamente, da família para sua manutenção;</p>
                                            </div>
                                            <div className="flex gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-100 last:border-0">
                                                <span className="font-bold text-slate-400">3.</span>
                                                <p className="text-base">que o dependente referido nesta Lei não receba benefício pecuniário no âmbito da Previdência Social, amparado pela LOAS.</p>
                                            </div>
                                        </div>

                                        <div className="ml-14 grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                                <p className="text-sm">
                                                    <span className="font-bold">§ 1º</span> Permanecem inalterados os itens 1, 2 e 3 do Artigo 2º.
                                                    <span className="block mt-1 text-[10px] font-sans font-bold text-indigo-400 uppercase tracking-tighter">(Lei nº 1599/2000)</span>
                                                </p>
                                            </div>
                                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                                <p className="text-sm">
                                                    <span className="font-bold">§ 2º</span> O abono salarial referido no "Caput" deste Artigo, cessará após o término do contrato do servidor para com a municipalidade.
                                                    <span className="block mt-1 text-[10px] font-sans font-bold text-indigo-400 uppercase tracking-tighter">(Lei nº 1599/2000)</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ART 3 */}
                                    <div className="flex items-start gap-3 law-article">
                                        <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.1 rounded text-sm shrink-0 mt-1 print:bg-transparent print:text-black">Art. 3º</span>
                                        <p className="text-base font-bold text-slate-800 print:font-normal leading-snug">
                                            O abono, referido no Artigo 1º, não constitui vantagem que se agregue à remuneração do servidor, seja para fins de cálculo de benedícios, como décimo-terceiro salário e férias, ou para fins previdenciários.
                                        </p>
                                    </div>

                                    {/* ART 4 */}
                                    <div className="space-y-1 law-article">
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.1 rounded text-sm shrink-0 mt-1 print:bg-transparent print:text-black">Art. 4º</span>
                                            <div className="space-y-1">
                                                <p className="line-through text-slate-400 text-base italic decoration-slate-300">
                                                    O servidor beneficiário do abono, referido no Artigo 1º desta Lei, deverá comunicar imediatamente à Prefeitura Municipal qualquer fato que altere os requisitos estabelecidos no Artigo 2º desta Lei.
                                                </p>
                                                <div className="p-4 bg-slate-50 border-l-2 border-slate-300 rounded-r-lg law-amendment-box">
                                                    <p>
                                                        O servidor beneficiário do abono, referido no Artigo 1º desta Lei, deverá comunicar imediatamente ao Administrador Público do órgão ao qual pertence, sobre qualquer fato que altere os requisitos estabelecidos no Artigo 2º.
                                                        <span className="block mt-2 text-[11px] font-sans font-black text-emerald-600 uppercase tracking-wider print:text-black print:text-[8pt]">(Redação dada pela Lei nº 3353/2017)</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ART 5 & 6 */}
                                    <div className="space-y-1 pt-6 border-t border-slate-100 print:border-black/20">
                                        <div className="flex items-start gap-3 law-article">
                                            <span className="font-bold text-slate-500 bg-slate-100 px-2 py-0.1 rounded text-sm shrink-0 mt-1 print:bg-transparent print:text-black">Art. 5º</span>
                                            <p className="text-base text-slate-600 print:text-black leading-snug">As despesas decorrentes da aplicação desta Lei correrão por conta de dotação existente no orçamento.</p>
                                        </div>
                                        <div className="flex items-start gap-3 law-article">
                                            <span className="font-bold text-slate-500 bg-slate-100 px-2 py-0.1 rounded text-sm shrink-0 mt-1 print:bg-transparent print:text-black">Art. 6º</span>
                                            <p className="text-base text-slate-600 print:text-black leading-snug">Esta Lei entra em vigor na data de sua publicação, revogando as disposições em contrário.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* SIGNATURES */}
                                <div className="pt-4 text-center space-y-4 law-signature-area">
                                    <div className="space-y-1">
                                        <p className="text-sm font-sans font-bold text-slate-400 uppercase tracking-widest print:text-black print:text-[8pt]">Local e Data</p>
                                        <p className="text-lg font-bold">Câmara Municipal, Sala das Sessões, Três Lagoas - MS, 15 de setembro de 1999.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-2xl mx-auto pt-10">
                                        <div className="flex flex-col items-center">
                                            <div className="w-48 h-px bg-slate-300 mb-4 law-signature-line" />
                                            <p className="text-lg font-black text-slate-900 leading-tight uppercase">Walter Augusto Martinho</p>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter print:text-black">Presidente da CMTL</p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="w-48 h-px bg-slate-300 mb-4 law-signature-line" />
                                            <p className="text-lg font-black text-slate-900 leading-tight uppercase">Luiz Akira Yoshio Otsubo</p>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter print:text-black">1º Secretário da CMTL</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PAPER FOOTER */}
                            <div className="bg-slate-900 p-8 text-center text-white/50 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest">SESMT SYSTEM - Módulo de Legislação Municipal</p>
                                <p className="text-[9px] font-medium opacity-50">Documento gerado eletronicamente em conformidade com as leis 1562/99, 1599/00 e 3353/17.</p>
                            </div>
                        </div>

                        {/* BACKGROUND ACCENT */}
                        <div className="absolute -inset-4 bg-blue-600/5 blur-3xl rounded-full -z-10" />
                    </div>

                </div>
            </main>
        </div>
    );
}

// Subcomponente de ícone para Building2 que não estava no import inicial mas usei no texto
function Building2({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" />
            <path d="M10 10h4" />
            <path d="M10 14h4" />
            <path d="M10 18h4" />
        </svg>
    );
}
