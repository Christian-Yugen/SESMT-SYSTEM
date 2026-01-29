"use client";

import { useState, useMemo, useEffect } from "react";
import { LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu, ChevronRight, History as HistoryIcon, Users as UsersIcon } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Servidor, Funcao, ExameData } from "@/types";

export default function Home() {
  const [cpf, setCpf] = useState("");
  const [selectedServidor, setSelectedServidor] = useState<Servidor | null>(null);
  const [functionSearch, setFunctionSearch] = useState("");
  const [selectedFuncao, setSelectedFuncao] = useState<Funcao | null>(null);
  const [asoType, setAsoType] = useState<"Admissional" | "de Retorno ao Trabalho" | "Demissional">("Admissional");
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [searchResults, setSearchResults] = useState<Servidor[]>([]);
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  const [showManualModal, setShowManualModal] = useState(false);
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Verificar autenticação e carregar perfil
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) {
        syncProfile(session);
      } else {
        router.push("/login");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        syncProfile(session);
      } else {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function syncProfile(session: any) {
    const nurseEmails = ['eliane.tavares@treslagoas.ms.gov.br', 'yvy.coelho@treslagoas.ms.gov.br'];
    const userEmail = session.user.email?.toLowerCase() || '';

    // Primeiro, tentamos ver se o perfil já existe para não sobrescrever cargo se ele já foi mudado pelo admin
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    // Se não existir, criamos com cargo padrão. Se existir, apenas mantemos/atualizamos e-mail.
    // Especial: Se for Eliane ou Yvy, forçamos 'nurse' independente de já existir (ou apenas se não tiver cargo)
    let profileRole = existingProfile?.role || 'viewer';
    if (nurseEmails.includes(userEmail)) {
      profileRole = 'nurse';
    }

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: session.user.id,
      email: session.user.email,
      role: profileRole,
      updated_at: new Date().toISOString()
    });

    if (upsertError) {
      console.error("Erro ao sincronizar perfil:", upsertError.message);
    } else {
      setUserRole(profileRole);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };
  const [manualData, setManualData] = useState({
    cpf: "",
    nome: "",
    nascimento: "",
    cargo: "",
    secretaria: ""
  });

  // Estados para geração de PDF
  const [showDateModal, setShowDateModal] = useState(false);
  const [examDates, setExamDates] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Extrair secretarias únicas do Supabase (Otimizado: apenas as top/comuns inicialmente)
  const [secretarias, setSecretarias] = useState<string[]>([]);
  useEffect(() => {
    async function loadSecretarias() {
      const { data } = await supabase
        .from('servidores')
        .select('secretaria')
        .not('secretaria', 'is', null);

      if (data) {
        const unique = Array.from(new Set(data.map(s => s.secretaria))).sort();
        setSecretarias(unique);
      }
    }
    loadSecretarias();
  }, []);

  // Função para formatar data e calcular idade
  const formatBirthInfo = (dateStr: string | undefined) => {
    if (!dateStr) return "---";

    const cleanDate = dateStr.split(' ')[0].split('T')[0];
    const parts = cleanDate.includes('-') ? cleanDate.split('-') : cleanDate.split('/');

    let day, month, year;

    if (cleanDate.includes('-')) {
      [year, month, day] = parts;
    } else {
      [day, month, year] = parts;
    }

    if (!day || !month || !year) return dateStr;

    const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} (${age} anos)`;
  };



  const handleSearch = async () => {
    const cleanCpf = cpf.replace(/\D/g, "");
    if (!cleanCpf) return;

    const { data: results, error } = await supabase
      .from('servidores')
      .select('*')
      .eq('cpf', cleanCpf);

    if (error) {
      console.error("Erro ao buscar servidor:", error);
      alert("Erro ao buscar no banco de dados.");
      return;
    }

    if (!results || results.length === 0) {
      alert("Servidor não encontrado.");
      return;
    }

    if (results.length === 1) {
      // Mapear campos do Supabase para o formato esperado pelo componente
      const s = results[0];
      setSelectedServidor({
        "CPF.": s.cpf,
        Nome: s.nome,
        Cargo: s.cargo,
        Matrícula: s.matricula,
        "Dt.Nascimento": s.nascimento,
        Secretaria: s.secretaria
      });
    } else {
      setSearchResults(results.map(s => ({
        "CPF.": s.cpf,
        Nome: s.nome,
        Cargo: s.cargo,
        Matrícula: s.matricula,
        "Dt.Nascimento": s.nascimento,
        Secretaria: s.secretaria
      })));
      setShowSelectionModal(true);
    }
  };

  // Carregar dados de exames e riscos do Supabase com base no GHE e asoType
  const [currentExams, setCurrentExams] = useState<ExameData>({ exames: [], riscos: "", detalhes: "" });

  useEffect(() => {
    async function loadConfig() {
      if (!selectedFuncao) return;

      if (asoType === "de Retorno ao Trabalho") {
        // Para Retorno ao Trabalho, usamos uma regra fixa mas pegamos os riscos do admissional
        const { data } = await supabase
          .from('exames_config')
          .select('riscos, detalhes')
          .eq('aso_type', 'admissional')
          .eq('ghe', selectedFuncao.GHE)
          .single();

        setCurrentExams({
          exames: ["Exame Clínico"],
          riscos: data?.riscos || "Não informado",
          detalhes: data?.detalhes || ""
        });
        return;
      }

      const type = asoType === "Demissional" ? "demissional" : "admissional";
      const { data, error } = await supabase
        .from('exames_config')
        .select('*')
        .eq('aso_type', type)
        .eq('ghe', selectedFuncao.GHE)
        .single();

      if (error) {
        console.error("Erro ao carregar exames:", error);
        setCurrentExams({ exames: [], riscos: "GHE não encontrado no banco", detalhes: "" });
      } else {
        setCurrentExams({
          exames: data.exames,
          riscos: data.riscos,
          detalhes: data.detalhes
        });
      }
    }
    loadConfig();
  }, [selectedFuncao, asoType]);

  // Carregar funções do Supabase conforme o usuário digita
  const [filteredFuncoes, setFilteredFuncoes] = useState<Funcao[]>([]);
  useEffect(() => {
    async function searchFuncoes() {
      if (!functionSearch || (selectedFuncao && (selectedFuncao.Nome || selectedFuncao.FUNÇÃO) === functionSearch)) {
        setFilteredFuncoes([]);
        return;
      }

      const { data, error } = await supabase
        .from('funcoes')
        .select('*')
        .or(`nome.ilike.%${functionSearch}%,cod.ilike.%${functionSearch}%`)
        .limit(10);

      if (!error && data) {
        setFilteredFuncoes(data.map(f => ({
          Cod: f.cod,
          Nome: f.nome,
          GHE: f.ghe,
          "GHE CONJ": f.ghe_conj
        })));
      }
    }
    const timer = setTimeout(searchFuncoes, 300);
    return () => clearTimeout(timer);
  }, [functionSearch, selectedFuncao]);

  useEffect(() => {
    setMounted(true);
    const today = new Date().toLocaleDateString('pt-BR');
    setExamDates(currentExams.exames.map(() => today));
  }, [currentExams.exames]);

  if (!mounted) return <div className="h-screen bg-[#0A111C]" />;

  const handleDateChange = (index: number, value: string) => {
    const newDates = [...examDates];
    newDates[index] = value;
    setExamDates(newDates);
  };

  const requestGeneration = async (endpoint: string, dates?: string[]) => {
    if (!selectedServidor || !selectedFuncao) {
      alert("Por favor, selecione um servidor e uma função primeiro.");
      return;
    }

    setIsGenerating(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_data: {
            nome: selectedServidor.Nome || "",
            cpf: selectedServidor.CPF || selectedServidor["CPF."] || "",
            nascimento: formatBirthInfo(selectedServidor["Dt.Nascimento"] || selectedServidor.Nascimento).split(' ')[0],
            cargo: selectedServidor.Cargo || "",
            matricula: selectedServidor.Matrícula || "",
            secretaria: selectedServidor.Secretaria || ""
          },
          exams_data: currentExams,
          aso_type: asoType,
          exam_dates: dates,
          ghe_conj: selectedFuncao["GHE CONJ"] || "-"
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.click();

        // Pequeno delay para garantir que o navegador processe o clique antes de revogar a URL
        setTimeout(() => window.URL.revokeObjectURL(url), 100);

        // Gravar no histórico do Supabase
        try {
          await supabase.from('aso_history').insert({
            servidor_cpf: selectedServidor.CPF || selectedServidor["CPF."],
            servidor_nome: selectedServidor.Nome,
            aso_type: endpoint.includes('referral') ? `Encaminhamento (${asoType})` : `ASO (${asoType})`,
            cargo: selectedServidor.Cargo,
            secretaria: selectedServidor.Secretaria,
            ghe_conj: selectedFuncao?.["GHE CONJ"] || "-",
            generated_by: session?.user?.id,
            operator_name: session?.user?.email?.split('@')[0].toUpperCase()
          });
        } catch (histError) {
          console.error("Erro ao gravar histórico:", histError);
        }

        // Limpar o formulário após o sucesso para evitar erros no próximo processo
        resetForm();
      } else {
        const errorData = await response.json();
        alert("Erro ao gerar documento: " + (errorData.detail || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("Erro na chamada do backend:", error);
      alert("Erro ao conectar com o servidor local de PDF. Verifique se o server.py está rodando.");
    } finally {
      setIsGenerating(false);
      setShowDateModal(false);
    }
  };

  const resetForm = () => {
    setCpf("");
    setSelectedServidor(null);
    setFunctionSearch("");
    setSelectedFuncao(null);
    setSearchResults([]);
    setAsoType("Admissional");
    setCurrentExams({ exames: [], riscos: "", detalhes: "" });
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full bg-[#0A111C] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
        <p className="text-white/40 uppercase tracking-[0.3em] font-bold text-[10px]">Autenticando...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A111C] text-white font-sans overflow-x-hidden">

      {/* SIDEBAR - MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR - AZUL ESCURO (MARINHO #1A3351) */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-52 bg-[#1A3351] border-r border-white/10 flex flex-col p-4 shrink-0 shadow-2xl transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="mb-8 flex flex-col items-center">
          <div className="flex justify-between items-center w-full lg:hidden mb-4">
            <span className="text-white font-black text-xs uppercase">Menu</span>
            <button onClick={() => setIsSidebarOpen(false)}>
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="relative w-full h-16 mb-2">
            <Image src="/images/logo_white.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">SESMT SYSTEM</p>
        </div>

        <nav className="flex-1 space-y-1">
          <button className="w-full flex items-center gap-2 p-3 rounded-lg bg-white/10 text-white font-black text-[11px] uppercase tracking-tight shadow-sm border border-white/5">
            <LayoutDashboard className="w-4 h-4" />
            <span>ASO</span>
          </button>
          <button className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight">
            <Database className="w-4 h-4" />
            <span>Afastamentos</span>
          </button>
          <button className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight">
            <FileSearch className="w-4 h-4" />
            <span>Readaptação</span>
          </button>
          <button
            onClick={() => router.push('/history')}
            className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight"
          >
            <HistoryIcon className="w-4 h-4" />
            <span>Histórico</span>
          </button>
          <button
            onClick={() => router.push('/users')}
            className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight"
          >
            <UsersIcon className="w-4 h-4" />
            <span>Usuários</span>
          </button>
          <button className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight transition-colors">
            <HeartPulse className="w-4 h-4" />
            <span>Benefícios</span>
          </button>
        </nav>

        <div className="mt-auto space-y-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 p-2 text-white/30 hover:text-white transition-all font-black uppercase tracking-widest text-[9px] px-4"
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

        {/* BUSCAR SERVIDOR (HEADER) COM LINHA VERMELHA NA BASE */}
        <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-black leading-none uppercase tracking-tight">Buscar Servidor</h2>
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1A3351] rounded text-white active:scale-90 transition-transform">
              <Menu className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <input
              type="text"
              placeholder="000.000.000-00"
              className="w-full md:w-80 px-4 py-2 border border-[#888] shadow-inner text-base font-normal bg-[#E8E8E8] outline-none"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <div className="flex gap-2">
              <button onClick={handleSearch} className="flex-1 md:flex-none px-6 md:px-10 py-2 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-sm uppercase border border-black/10">Buscar</button>
              <button
                onClick={() => setShowManualModal(true)}
                className="flex-1 md:flex-none px-4 md:px-8 py-2 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-sm uppercase border border-black/10"
              >
                Inclusão Manual
              </button>
            </div>
          </div>
        </section>

        {/* CONTAINER DE DADOS (2 COLUNAS) */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 xl:p-10 grid grid-cols-12 gap-6 xl:gap-10 max-w-[1600px] overflow-y-auto min-h-0">

          {/* COLUNA ESQUERDA (DADOS E GHE) */}
          <div className="col-span-12 xl:col-span-6 flex flex-col gap-6 min-h-0">

            {/* DADOS DO SERVIDOR */}
            <div className="shrink-0">
              <h2 className="text-2xl font-black mb-4 leading-none uppercase tracking-tight border-b-2 border-[#999] pb-2">Dados do Servidor</h2>
              <div className="space-y-3 text-base leading-snug pl-2">
                <p className="flex gap-4 items-baseline">
                  <span className="font-black text-slate-900 w-32 shrink-0">Matrícula:</span>
                  <span className="font-normal text-slate-700 underline decoration-slate-300 underline-offset-4 decoration-1">{selectedServidor?.Matrícula || "---"}</span>
                </p>
                <p className="flex gap-4 items-baseline">
                  <span className="font-black text-slate-900 w-32 shrink-0">Data Nasc.:</span>
                  <span className="font-normal text-slate-700 underline decoration-slate-300 underline-offset-4 decoration-1">{formatBirthInfo(selectedServidor?.["Dt.Nascimento"] || selectedServidor?.Nascimento)}</span>
                </p>
                <p className="flex gap-4 items-baseline">
                  <span className="font-black text-slate-900 w-32 shrink-0">Nome:</span>
                  <span className="font-normal text-slate-700 uppercase underline decoration-slate-300 underline-offset-4 decoration-1">{selectedServidor?.Nome || "---"}</span>
                </p>
                <p className="flex gap-4 items-baseline">
                  <span className="font-black text-slate-900 w-32 shrink-0">Cargo:</span>
                  <span className="font-normal text-slate-700 uppercase leading-tight underline decoration-slate-300 underline-offset-4 decoration-1">{selectedServidor?.Cargo || "---"}</span>
                </p>
                <p className="flex gap-4 items-baseline">
                  <span className="font-black text-slate-900 w-32 shrink-0">Secretaria:</span>
                  <span className="font-normal text-slate-700 uppercase leading-tight underline decoration-slate-300 underline-offset-4 decoration-1">{selectedServidor?.Secretaria || "---"}</span>
                </p>
              </div>
            </div>

            {/* DEFINIÇÃO DE GHE */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              <h2 className="text-2xl font-black leading-none uppercase tracking-tight border-b-2 border-[#999] pb-2">Definição de GHE</h2>
              <div className="flex flex-col gap-5 min-h-0">
                <div className="pl-2">
                  <p className="text-sm font-black mb-2 uppercase text-slate-900">Função Laboral:</p>
                  <div className="relative w-full max-w-xl">
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-[#888] shadow-inner text-base font-normal bg-[#E8E8E8] uppercase tracking-tight focus:border-[#1A3351]"
                      value={functionSearch}
                      onChange={(e) => setFunctionSearch(e.target.value)}
                    />
                    {filteredFuncoes.length > 0 && (
                      <div className="absolute z-20 w-full mt-0.5 bg-[#E8E8E8] border-2 border-[#888] shadow-2xl max-h-56 overflow-y-auto">
                        {filteredFuncoes.map((f, i) => (
                          <button
                            key={i}
                            className="w-full text-left px-4 py-3 hover:bg-[#1A3351] hover:text-white border-b border-slate-300 last:border-0 font-black text-sm uppercase transition-colors"
                            onClick={() => {
                              setSelectedFuncao(f);
                              setFunctionSearch(`${f.Cod} - ${f.Nome || f.FUNÇÃO}`);
                            }}
                          >
                            <span className="text-[#1A3351] font-black mr-4 group-hover:text-white">[{f.Cod}]</span>
                            <span className="font-normal">{(f.Nome || f.FUNÇÃO)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-base pl-2">
                  <p className="flex flex-col sm:flex-row gap-1 sm:gap-4 items-baseline"><span className="font-black text-slate-900 w-full sm:w-48 shrink-0">GHE Correspondente:</span> <span className="text-[#1A3351] font-normal text-lg sm:text-xl underline decoration-slate-300 underline-offset-4 decoration-1">{selectedFuncao?.GHE || "---"}</span></p>
                  <p className="flex flex-col sm:flex-row gap-1 sm:gap-4 items-baseline">
                    <span className="font-black text-slate-900 w-full sm:w-48 shrink-0">GHE CONJ:</span>
                    <span className="text-slate-600 font-normal underline underline-offset-4 decoration-slate-300 decoration-1 tracking-wide">
                      {selectedFuncao?.["GHE CONJ"]
                        ? (selectedFuncao["GHE CONJ"].toString().toUpperCase().startsWith("ACT")
                          ? selectedFuncao["GHE CONJ"]
                          : `Act.${selectedFuncao["GHE CONJ"]}`)
                        : "---"}
                    </span>
                  </p>
                </div>

                <div className="pl-2">
                  <p className="text-sm font-black mb-2 uppercase text-slate-900">Tipo de Exame Requerido:</p>
                  <div className="flex flex-wrap bg-[#888] border-2 border-[#888] rounded-md overflow-hidden w-full sm:w-fit shadow-md">
                    {(["Admissional", "de Retorno ao Trabalho", "Demissional"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setAsoType(type)}
                        className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 text-[10px] sm:text-xs font-black transition-all border-r last:border-0 border-[#777] uppercase tracking-tighter ${asoType === type ? "bg-[#1A3351] text-white shadow-inner" : "text-white/70 hover:text-white hover:bg-white/10"
                          }`}
                      >
                        {type === "de Retorno ao Trabalho" ? "Retorno ao Trabalho" : type}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedFuncao && (
                  <div className="mt-auto pb-2 pl-2 border-t border-slate-400 pt-2">
                    <p className="text-sm font-normal text-slate-600 uppercase leading-none italic">{selectedFuncao.Cod} - {selectedFuncao.Nome || selectedFuncao.FUNÇÃO}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA (EXAMES E RISCOS) */}
          <div className="col-span-12 xl:col-span-6 flex flex-col gap-4 min-h-0 overflow-hidden text-black">
            <h2 className="text-2xl font-black leading-none uppercase tracking-tight border-b-2 border-[#999] pb-2 shrink-0">Exames e Riscos</h2>

            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              {/* RISCOS E DETALHES */}
              <div className="shrink-0 space-y-3">
                <div>
                  <p className="text-[13px] font-black text-slate-900 mb-1.5 uppercase tracking-wider pl-1">Riscos Ocupacionais:</p>
                  <div className="w-full p-4 bg-[#E8E8E8] border border-[#BBB] font-normal text-sm text-slate-800 rounded shadow-inner uppercase min-h-[44px] flex items-center leading-tight">
                    {selectedFuncao ? currentExams.riscos : ""}
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-black text-slate-900 mb-1.5 uppercase tracking-wider pl-1">Detalhes Adicionais:</p>
                  <div className="w-full p-4 bg-[#E8E8E8] border border-[#BBB] font-normal text-sm text-slate-800 rounded shadow-inner uppercase min-h-[44px] flex items-center leading-tight">
                    {selectedFuncao ? currentExams.detalhes : ""}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <p className="text-[13px] font-black text-slate-900 mb-1.5 uppercase tracking-wider pl-1">Protocolo de Exames:</p>
                <div className="flex-1 bg-[#E8E8E8] border border-[#BBB] p-3 sm:p-5 rounded-md overflow-y-auto shadow-inner min-h-[150px]">
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 font-normal text-[13px] text-slate-900">
                    {selectedFuncao && currentExams.exames.length > 0 ? (
                      currentExams.exames.map((ex, i) => (
                        <li key={i} className="flex items-center gap-3 border-b border-slate-300 pb-1.5 last:border-0 uppercase tracking-tight leading-none group text-[11px] sm:text-[13px]">
                          <span className="text-[#1A3351] font-black text-xl leading-none">•</span>
                          <span className="truncate group-hover:text-[#1A3351] transition-colors">{ex}</span>
                        </li>
                      ))
                    ) : (
                      <div className="col-span-1 sm:col-span-2 h-full flex flex-col items-center justify-center text-slate-400 opacity-50 py-10">
                        <Activity className="w-12 h-12 mb-4" />
                        <p className="font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-sm sm:text-base text-center">Aguardando Seleção</p>
                      </div>
                    )}
                  </ul>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="shrink-0 pt-3 flex flex-col sm:flex-row gap-4 sm:h-[72px] pb-4 sm:pb-0">
                <button
                  disabled={isGenerating || !selectedFuncao || userRole === 'viewer'}
                  onClick={() => requestGeneration('/generate-referral')}
                  className="w-full sm:flex-1 px-4 py-4 sm:py-2 bg-[#1A3351] text-white font-black rounded shadow-xl hover:brightness-110 active:translate-y-px transition-all text-[12px] sm:text-[13px] uppercase border-b-4 border-blue-950 tracking-wider flex items-center justify-center text-center leading-tight disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGenerating ? "Gerando..." : "Gerar Encaminhamento"}
                </button>
                {(userRole === 'admin' || userRole === 'nurse') && (
                  <button
                    disabled={isGenerating || !selectedFuncao}
                    onClick={() => setShowDateModal(true)}
                    className="w-full sm:flex-1 px-4 py-4 sm:py-2 bg-[#28A745] text-white font-black rounded shadow-xl hover:brightness-110 active:translate-y-px transition-all text-[12px] sm:text-[13px] uppercase border-b-4 border-green-800 tracking-wider flex items-center justify-center text-center leading-tight disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isGenerating ? "Gerando..." : "Gerar Arquivo ASO"}
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* MODAL DE DATAS DOS EXAMES */}
      {showDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#D3D3D3] w-full max-w-4xl rounded-xl shadow-2xl border-2 border-[#1A3351] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="bg-[#1A3351] p-4 flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight text-white">Definir Datas dos Exames</h3>
              <button onClick={() => setShowDateModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[70vh]">
              <p className="text-slate-700 font-black uppercase text-sm mb-6 border-b border-slate-400 pb-2">Informe as datas dos exames (DD/MM/AAAA):</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {currentExams.exames.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 bg-[#B0B0B0]/30 p-2 rounded-lg border border-slate-300 shadow-sm">
                    <span className="text-sm font-black text-slate-800 uppercase line-clamp-1 flex-1">{ex}:</span>
                    <input
                      type="text"
                      className="w-32 px-3 py-1.5 bg-white border border-slate-400 rounded font-normal text-center text-sm outline-none focus:border-[#1A3351] shadow-inner text-slate-900"
                      value={examDates[i] || ""}
                      onChange={(e) => handleDateChange(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-[#B0B0B0] flex justify-center gap-6 border-t border-slate-400">
              <button
                disabled={isGenerating}
                onClick={() => requestGeneration('/generate-aso', examDates)}
                className="px-12 py-3 bg-[#28A745] text-white font-black uppercase tracking-widest rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm border-b-4 border-green-800 disabled:opacity-50 disabled:cursor-not-allowed min-w-[300px]"
              >
                {isGenerating ? "Gerando Documento..." : "Confirmar e Gerar ASO"}
              </button>
              <button
                onClick={() => setShowDateModal(false)}
                className="px-12 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm border-b-4 border-red-900"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INCLUSÃO MANUAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#D3D3D3] w-full max-w-xl rounded-xl shadow-2xl border-2 border-[#1A3351] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="bg-[#1A3351] p-4 flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight text-white">Inclusão Manual de Servidor</h3>
              <button onClick={() => setShowManualModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-700">CPF:</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    className="w-full px-4 py-2 bg-white border border-slate-400 rounded-md font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351]"
                    value={manualData.cpf}
                    onChange={(e) => setManualData({ ...manualData, cpf: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-700">Data Nasc. (DD/MM/AAAA):</label>
                  <input
                    type="text"
                    placeholder="01/01/1980"
                    className="w-full px-4 py-2 bg-white border border-slate-400 rounded-md font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351]"
                    value={manualData.nascimento}
                    onChange={(e) => setManualData({ ...manualData, nascimento: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700">Nome Completo:</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white border border-slate-400 rounded-md font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] uppercase"
                  value={manualData.nome}
                  onChange={(e) => setManualData({ ...manualData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700">Cargo:</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white border border-slate-400 rounded-md font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] uppercase"
                  value={manualData.cargo}
                  onChange={(e) => setManualData({ ...manualData, cargo: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700">Secretaria:</label>
                <select
                  className="w-full px-4 py-2 bg-white border border-slate-400 rounded-md font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351]"
                  value={manualData.secretaria}
                  onChange={(e) => setManualData({ ...manualData, secretaria: e.target.value })}
                >
                  <option value="">Selecione uma secretaria</option>
                  {secretarias.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 bg-[#B0B0B0] flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 border-t border-slate-400">
              <button
                onClick={() => {
                  if (!manualData.cpf || !manualData.nome) {
                    alert("Por favor, preencha pelo menos o CPF e o Nome.");
                    return;
                  }
                  setSelectedServidor({
                    Nome: manualData.nome,
                    CPF: manualData.cpf,
                    Nascimento: manualData.nascimento,
                    "Dt.Nascimento": manualData.nascimento,
                    Cargo: manualData.cargo,
                    Secretaria: manualData.secretaria,
                    Matrícula: "NOVO (Manual)"
                  } as Servidor);
                  setShowManualModal(false);
                  setCpf(manualData.cpf);
                }}
                className="w-full sm:w-auto px-12 py-3 bg-[#1A3351] text-white font-black uppercase tracking-widest rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm border-b-4 border-blue-950"
              >
                Confirmar Inclusão
              </button>
              <button
                onClick={() => setShowManualModal(false)}
                className="w-full sm:w-auto px-12 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm border-b-4 border-red-900"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE MÚLTIPLAS MATRÍCULAS */}
      {showSelectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#D3D3D3] w-full max-w-2xl rounded-xl shadow-2xl border-2 border-[#1A3351] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="bg-[#1A3351] p-4 flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight text-white">Múltiplas Matrículas Encontradas</h3>
              <button onClick={() => setShowSelectionModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-slate-700 font-bold mb-4 uppercase text-sm border-b border-slate-400 pb-2">Selecione o registro correspondente para o {asoType}:</p>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {searchResults.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedServidor(s);
                      setShowSelectionModal(false);
                    }}
                    className="w-full text-left p-4 bg-white border-2 border-slate-300 rounded-lg hover:border-[#1A3351] hover:bg-slate-50 transition-all group shadow-sm flex flex-col gap-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-[#1A3351] text-lg uppercase">{s.Nome}</span>
                      <span className="bg-[#1A3351] text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">Mat: {s.Matrícula}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-500 uppercase text-[9px]">Cargo:</span>
                        <span className="font-bold text-slate-700 uppercase line-clamp-1">{s.Cargo}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-500 uppercase text-[9px]">Secretaria:</span>
                        <span className="font-bold text-slate-700 uppercase line-clamp-1">{s.Secretaria}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#B0B0B0] flex justify-end border-t border-slate-400">
              <button
                onClick={() => setShowSelectionModal(false)}
                className="px-8 py-2 bg-[#E31E24] text-white font-black uppercase tracking-widest rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all text-xs border-b-4 border-red-900"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
