"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  X,
  Menu,
  Search,
  ClipboardList,
  FileText,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

import { Servidor, Funcao, ExameData } from "@/types";
import { generateASOPDF, generateReferralPDF } from "@/lib/pdf-generator";
import { syncProfile, handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { maskCpf } from "@/lib/record-utils";
import { appendPendingAsoHistory } from "@/lib/pending-aso-storage";
import { ensureISO, formatBirthInfo } from "@/lib/utils";
import Sidebar from "@/components/layout/Sidebar";
import CompactFilterBar from "@/components/filters/CompactFilterBar";
import FilterChips from "@/components/filters/FilterChips";
import ActionIconButton from "@/components/filters/ActionIconButton";
import {
  countActiveFilters,
  normalizeSearchTerm,
} from "@/components/filters/filtersUtils";

const normalizeExamName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const CLINICAL_EXAM_ALIASES = new Set([
  "EXAME CLINICO",
  "EXAME CLINICO OCUPACIONAL",
  "AVALIACAO CLINICA OCUPACIONAL",
]);

const isClinicalOccupationalExam = (value: string) => {
  const normalized = normalizeExamName(value);
  return CLINICAL_EXAM_ALIASES.has(normalized);
};

export default function Home() {
  const [cpf, setCpf] = useState("");
  const [selectedServidor, setSelectedServidor] = useState<Servidor | null>(
    null,
  );
  const [functionSearch, setFunctionSearch] = useState("");
  const [selectedFuncao, setSelectedFuncao] = useState<Funcao | null>(null);
  const [asoType, setAsoType] = useState<
    "Admissional" | "de Retorno ao Trabalho" | "Demissional"
  >("Admissional");
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Servidor[]>([]);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");

  // Smart Header Logic
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [scrollUpStart, setScrollUpStart] = useState(0);

  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const isScrollingDown = scrollTop > lastScrollTop;

    if (isScrollingDown) {
      setScrollUpStart(scrollTop);
      if (scrollTop > 150 && showHeader) setShowHeader(false);
    } else {
      // Só mostra se subiu mais de 250px desde o ponto mais baixo ou chegou no topo
      if (scrollUpStart - scrollTop > 250 || scrollTop < 50) {
        if (!showHeader) setShowHeader(true);
      }
    }
    setLastScrollTop(scrollTop);
  };

  // Verificar autenticação e carregar perfil
  useEffect(() => {
    safeGetSession()
      .then(({ session, error }) => {
        if (error) {
          handleAuthError(error);
          return;
        }

        setSession(session);
        setAuthLoading(false);
        if (session) {
          syncProfile(session).then((role) => setUserRole(role));
          const name =
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "Usuário";
          setUserName(name);
        } else {
          router.push("/login");
        }
      })
      .catch((err) => {
        handleAuthError(err);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        syncProfile(session).then((role) => setUserRole(role));
        const name =
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "Usuário";
        setUserName(name);
      } else if (event === "SIGNED_OUT") {
        router.push("/login");
      } else if (!session) {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, userRole]);

  // Redirecionamento para perfis com acesso restrito
  useEffect(() => {
    if (userRole === "social_assistant") {
      router.push("/abono");
    }
  }, [userRole, router]);

  const [manualData, setManualData] = useState({
    cpf: "",
    nome: "",
    nascimento: "",
    cargo: "",
    secretaria: "",
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
        .from("servidores")
        .select("secretaria")
        .not("secretaria", "is", null);

      if (data) {
        const unique = Array.from(new Set(data.map((s) => s.secretaria)))
          .filter((s) => s !== "APOSENTADOS" && s !== "PENSIONISTAS")
          .sort();
        setSecretarias(unique);
      }
    }
    loadSecretarias();
  }, []);

  const clearAllFilters = () => {
    setCpf("");
  };

  const headerActiveFilterCount = countActiveFilters({ searchTerm: cpf });

  const handleSearch = async () => {
    const cleanQuery = cpf.trim();
    if (!cleanQuery) return;

    const cleanCpf = cleanQuery.replace(/\D/g, "");

    let query = supabase.from("servidores").select("*");

    // Busca por Nome se não for puramente numérico ou se o usuário desejar
    // A busca sempre tenta os dois campos para maior flexibilidade
    if (cleanCpf.length > 0) {
      query = query.or(`cpf.ilike.%${cleanCpf}%,nome.ilike.%${cleanQuery}%`);
    } else {
      query = query.ilike("nome", `%${cleanQuery}%`);
    }

    const { data: results, error } = await query;

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
        Secretaria: s.secretaria,
        contrato: s.contrato,
      });
    } else {
      setSearchResults(
        results.map((s) => ({
          "CPF.": s.cpf,
          Nome: s.nome,
          Cargo: s.cargo,
          Matrícula: s.matricula,
          "Dt.Nascimento": s.nascimento,
          Secretaria: s.secretaria,
          contrato: s.contrato,
        })),
      );
      setShowSelectionModal(true);
    }
  };

  // Carregar dados de exames e riscos do Supabase com base no GHE e asoType
  const [currentExams, setCurrentExams] = useState<ExameData>({
    exames: [],
    riscos: "",
    detalhes: "",
  });

  useEffect(() => {
    async function loadConfig() {
      if (!selectedFuncao) return;

      if (asoType === "de Retorno ao Trabalho") {
        // Para Retorno ao Trabalho, usamos uma regra fixa mas pegamos os riscos do admissional
        const { data } = await supabase
          .from("exames_config")
          .select("riscos, detalhes")
          .eq("aso_type", "admissional")
          .eq("ghe", selectedFuncao.GHE)
          .single();

        setCurrentExams({
          exames: ["Exame Clínico"],
          riscos: data?.riscos || "Não informado",
          detalhes: data?.detalhes || "",
        });
        return;
      }

      const type = asoType === "Demissional" ? "demissional" : "admissional";
      const { data, error } = await supabase
        .from("exames_config")
        .select("*")
        .eq("aso_type", type)
        .eq("ghe", selectedFuncao.GHE)
        .single();

      if (error) {
        console.error("Erro ao carregar exames:", error);
        setCurrentExams({
          exames: [],
          riscos: "GHE não encontrado no banco",
          detalhes: "",
        });
      } else {
        setCurrentExams({
          exames: data.exames,
          riscos: data.riscos,
          detalhes: data.detalhes,
        });
      }
    }
    loadConfig();
  }, [selectedFuncao, asoType]);

  // Carregar funções do Supabase conforme o usuário digita
  const [filteredFuncoes, setFilteredFuncoes] = useState<Funcao[]>([]);
  useEffect(() => {
    async function searchFuncoes() {
      if (
        !functionSearch ||
        (selectedFuncao &&
          (selectedFuncao.Nome || selectedFuncao.FUNÇÃO) === functionSearch)
      ) {
        setFilteredFuncoes([]);
        return;
      }

      const { data, error } = await supabase
        .from("funcoes")
        .select("*")
        .or(`nome.ilike.%${functionSearch}%,cod.ilike.%${functionSearch}%`)
        .limit(10);

      if (!error && data) {
        setFilteredFuncoes(
          data.map((f) => ({
            Cod: f.cod,
            Nome: f.nome,
            GHE: f.ghe,
            "GHE CONJ": f.ghe_conj,
          })),
        );
      }
    }
    const timer = setTimeout(searchFuncoes, 300);
    return () => clearTimeout(timer);
  }, [functionSearch, selectedFuncao]);

  useEffect(() => {
    setMounted(true);
    const today = new Date().toLocaleDateString("pt-BR");
    setExamDates(currentExams.exames.map(() => today));
  }, [currentExams.exames]);

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
    try {
      const { session } = await safeGetSession();
      const operatorName =
        session?.user?.email?.split("@")[0].toUpperCase() || "USUARIO";

      // Geração de PDF Local (Online / Browser-side) - Removeu dependência do server.py
      if (endpoint.includes("aso")) {
        generateASOPDF(
          selectedServidor,
          currentExams,
          asoType,
          dates || examDates,
          operatorName,
        );
      } else {
        generateReferralPDF(
          selectedServidor,
          currentExams,
          asoType,
          dates || examDates,
          operatorName,
        );
      }

      // Salva Histórico no Supabase (Processo Online)
      try {
        // Prepara lista de exames para o histórico (Evidência Digital) - Filtra Exame Clínico para Encaminhamentos
        const functionName =
          selectedFuncao?.Nome ||
          selectedFuncao?.FUNÇÃO ||
          "Função não identificada";
        const risksText = selectedFuncao ? currentExams.detalhes : "";

        // Encaminhamento nunca deve persistir exame clinico/clinico ocupacional
        const isReferral = endpoint.includes("referral");
        const rawDates = dates || examDates;
        const examsJson = currentExams.exames
          .map((exam, idx) => {
            const rawDate = rawDates?.[idx] ?? null;
            if (!rawDate) {
              // sem data explícita: usar data atual em ISO
              return { name: exam, date: new Date().toISOString() };
            }
            const iso = ensureISO(rawDate);
            if (!iso) {
              // data inválida: omitir o campo date para não quebrar validação
              return { name: exam };
            }
            try {
              return {
                name: exam,
                date: new Date(`${iso}T00:00:00.000Z`).toISOString(),
              };
            } catch {
              return { name: exam };
            }
          })
          .filter(
            (exam) => !isReferral || !isClinicalOccupationalExam(exam.name),
          );

        const payload = {
          servidor_cpf: selectedServidor.CPF || selectedServidor["CPF."],
          servidor_nome: selectedServidor.Nome,
          servidor_nascimento: ensureISO(
            selectedServidor["Dt.Nascimento"] || selectedServidor.Nascimento,
          ),
          contrato: selectedServidor.contrato || null,
          aso_type: endpoint.includes("referral")
            ? `Encaminhamento (${asoType})`
            : `ASO (${asoType})`,
          cargo: selectedServidor.Cargo,
          secretaria: selectedServidor.Secretaria,
          ghe_conj: selectedFuncao?.["GHE CONJ"] || "-",
          generated_by: session?.user?.id,
          operator_name: operatorName,
          function_name: functionName,
          risks: risksText,
          exams_json: examsJson,
        };

        // Não logar payload completo — somente CPF mascarado para diagnóstico
        console.log(
          "Tentando gravar histórico — CPF:",
          maskCpf(payload.servidor_cpf),
        );

        // Envia para a rota server-side segura
        const _token = session?.access_token;
        const resp = await fetch("/api/aso-history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(typeof _token === "string" && _token
              ? { Authorization: `Bearer ${_token}` }
              : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!resp || resp.status !== 201) {
          throw new Error(`API_ERROR:${resp?.status ?? "NO_RESPONSE"}`);
        }

        // Se chegou aqui, salvou com sucesso no banco de dados
        resetForm();
        setShowDateModal(false);
        alert("Documento gerado e salvo no histórico com sucesso!");
      } catch (histError: unknown) {
        // Log reduzido sem expor detalhes sensíveis
        console.error("Erro ao gravar histórico (resumido).", {
          reason:
            histError instanceof Error ? histError.message : String(histError),
          cpf: maskCpf(selectedServidor?.CPF || selectedServidor?.["CPF."]),
        });
        const histErrorMessage =
          "Falha ao salvar registro no servidor. Uma cópia foi guardada localmente.";

        // BACKUP AUTOMÁTICO EM CASO DE FALHA
        try {
          const functionName =
            selectedFuncao?.Nome ||
            selectedFuncao?.FUNÇÃO ||
            "Função não identificada";
          const risksText = selectedFuncao ? currentExams.detalhes : "";
          const today = new Date().toLocaleDateString("pt-BR");

          const isReferral = endpoint.includes("referral");
          const rawDates = dates || examDates;
          const backupPayload = {
            servidor_cpf: selectedServidor.CPF || selectedServidor["CPF."],
            servidor_nome: selectedServidor.Nome,
            servidor_nascimento: ensureISO(
              selectedServidor["Dt.Nascimento"] || selectedServidor.Nascimento,
            ),
            aso_type: endpoint.includes("referral")
              ? `Encaminhamento (${asoType})`
              : `ASO (${asoType})`,
            cargo: selectedServidor.Cargo,
            secretaria: selectedServidor.Secretaria,
            ghe_conj: selectedFuncao?.["GHE CONJ"] || "-",
            function_name: functionName,
            risks: risksText,
            exams_json: currentExams.exames
              .map((exam, idx) => {
                const rawDate = rawDates?.[idx] ?? null;
                if (!rawDate) return { name: exam };
                const iso = ensureISO(rawDate);
                if (!iso) return { name: exam };
                try {
                  return {
                    name: exam,
                    date: new Date(`${iso}T00:00:00.000Z`).toISOString(),
                  };
                } catch {
                  return { name: exam };
                }
              })
              .filter(
                (exam) => !isReferral || !isClinicalOccupationalExam(exam.name),
              ),
            generated_at: new Date().toISOString(),
          };

          // Persistir somente o mínimo necessário; helper tratará TTL/limpeza
          appendPendingAsoHistory(backupPayload);
        } catch (e) {
          console.error("Erro ao criar backup local:", e);
        }

        alert(
          `AVISO CRÍTICO: O PDF foi gerado, mas NÃO foi possível salvar o registro no banco de dados agora.\n\nMOTIVO: ${histErrorMessage}\n\nAÇÃO AUTOMÁTICA: O sistema salvou uma cópia de segurança no seu navegador e tentará enviar ao banco de dados automaticamente quando a conexão voltar.\n\nO formulário permanecerá aberto se você desejar tentar novamente agora.`,
        );
      }
    } catch (error) {
      console.error("Erro na geração do PDF:", error);
      alert(
        "Erro ao processar o documento. Verifique os dados e tente novamente.",
      );
    } finally {
      setIsGenerating(false);
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
  if (!mounted) return <div className="h-screen bg-[#0A111C]" />;

  if (authLoading) {
    return (
      <div className="h-screen w-full bg-[#0A111C] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
        <p className="text-white/40 uppercase tracking-[0.3em] font-semibold text-[10px]">
          Autenticando...
        </p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A111C] text-white font-sans overflow-x-hidden selection:bg-[#E31E24]/30">
      {/* SIDEBAR */}
      <Sidebar
        userRole={userRole}
        userName={userName}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col bg-[#D3D3D3] text-black min-h-screen lg:h-screen lg:overflow-visible relative">
        <div className="flex-1 flex flex-col relative overflow-visible">
          {/* BUSCAR SERVIDOR (HEADER) - Smart Dynamic Header com Colapso de Espaço */}
          <div
            className={`grid transition-all duration-500 ease-in-out ${showHeader ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}
          >
            <div className="overflow-visible">
              <section
                className={`bg-[#B0B0B0] px-2.5 sm:px-4 lg:px-6 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg transition-all duration-500 ease-in-out transform ${showHeader ? "translate-y-0" : "-translate-y-1/2"}`}
              >
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:flex-nowrap md:gap-3">
                  <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0 text-[#1A3351]">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      <div>
                        <h2 className="text-[15px] sm:text-lg md:text-xl font-bold leading-none uppercase tracking-tight">
                          Buscar Registro
                        </h2>
                        <p className="text-[8px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                          SESMT • Emissão Operacional
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 bg-[#1A3351] text-white active:scale-95 transition-all shadow-md flex items-center justify-center rounded-none"
                    >
                      <Menu className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="h-6 w-px bg-[#1A3351]/20 shrink-0 hidden md:block" />

                  <div className="w-full md:flex-1 md:w-auto min-w-0">
                    <CompactFilterBar
                      searchTerm={cpf}
                      setSearchTerm={setCpf}
                      startDate=""
                      setStartDate={() => {}}
                      endDate=""
                      setEndDate={() => {}}
                      isDateFilterOpen={false}
                      setIsDateFilterOpen={() => {}}
                      filterUser="all"
                      setFilterUser={() => {}}
                      filterSecretaria="all"
                      setFilterSecretaria={() => {}}
                      filterAsoType="all"
                      setFilterAsoType={() => {}}
                      uniqueUsersList={[]}
                      uniqueSecretarias={[]}
                      referrals={[]}
                      operatorsMap={{}}
                      clearAllFilters={clearAllFilters}
                      searchPlaceholder="NOME OU CPF DO SERVIDOR..."
                      showUserFilter={false}
                      showDateFilter={false}
                      showSecretariaFilter={false}
                      showAsoTypeFilter={false}
                      activeFilterCount={headerActiveFilterCount}
                      onSearchKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch();
                      }}
                      extraActions={
                        <>
                          <ActionIconButton
                            icon={<Search className="w-4 h-4" />}
                            label="Buscar servidor"
                            variant="primary"
                            onClick={handleSearch}
                          />
                          {userRole !== "analytic_manager" &&
                            userRole !== "viewer" && (
                              <ActionIconButton
                                className="hidden md:block"
                                icon={<FileText className="w-4 h-4" />}
                                label="Inclusão manual"
                                variant="primary"
                                onClick={() => setShowManualModal(true)}
                              />
                            )}
                        </>
                      }
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <FilterChips
                    searchTerm={normalizeSearchTerm(cpf)}
                    startDate=""
                    endDate=""
                    filterUser="all"
                    filterSecretaria="all"
                    filterAsoType="all"
                    referrals={[]}
                    operatorsMap={{}}
                  />
                </div>
              </section>
            </div>
          </div>

          {/* CONTAINER DE DADOS (2 COLUNAS) */}
          <div
            onScroll={handleMainScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-10 grid grid-cols-12 gap-8 lg:gap-6 xl:gap-10 max-w-[1600px] min-h-0 mx-auto w-full relative"
          >
            {/* COLUNA ESQUERDA (DADOS E GHE) */}
            <div className="col-span-12 xl:col-span-6 flex flex-col gap-6 min-h-0">
              {/* DADOS DO SERVIDOR */}
              <div className="shrink-0">
                <h2 className="text-xl lg:text-2xl font-bold mb-4 leading-none uppercase tracking-tight border-b-2 border-[#999] pb-2 text-[#1A3351]">
                  Dados do Servidor
                </h2>
                <div className="space-y-4 lg:space-y-4 text-sm lg:text-lg leading-snug pl-1 lg:pl-2">
                  <p className="flex gap-4 items-baseline">
                    <span className="font-medium text-slate-500 w-32 shrink-0 uppercase text-[12px] tracking-wider">
                      Data Nasc.:
                    </span>
                    <span className="font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 decoration-1">
                      {formatBirthInfo(
                        selectedServidor?.["Dt.Nascimento"] ||
                          selectedServidor?.Nascimento,
                      )}
                    </span>
                  </p>
                  <p className="flex gap-4 items-baseline">
                    <span className="font-medium text-slate-500 w-32 shrink-0 uppercase text-[12px] tracking-wider">
                      Nome:
                    </span>
                    <span className="font-semibold text-slate-700 uppercase underline decoration-slate-300 underline-offset-4 decoration-1">
                      {selectedServidor?.Nome || "---"}
                    </span>
                  </p>
                  <p className="flex gap-4 items-baseline">
                    <span className="font-medium text-slate-500 w-32 shrink-0 uppercase text-[12px] tracking-wider">
                      Cargo:
                    </span>
                    <span className="font-semibold text-slate-700 uppercase leading-tight underline decoration-slate-300 underline-offset-4 decoration-1">
                      {selectedServidor?.Cargo || "---"}
                    </span>
                  </p>
                  <p className="flex gap-4 items-baseline">
                    <span className="font-medium text-slate-500 w-32 shrink-0 uppercase text-[12px] tracking-wider">
                      Secretaria:
                    </span>
                    <span className="font-semibold text-slate-700 uppercase leading-tight underline decoration-slate-300 underline-offset-4 decoration-1">
                      {selectedServidor?.Secretaria || "---"}
                    </span>
                  </p>
                </div>
              </div>

              {/* DEFINIÇÃO DE GHE */}
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                <h2 className="text-xl lg:text-2xl font-bold leading-none uppercase tracking-tight border-b-2 border-[#999] pb-2 text-[#1A3351]">
                  Definição de GHE
                </h2>
                <div className="flex flex-col gap-6 min-h-0">
                  <div className="pl-2">
                    <p className="text-[12px] font-bold mb-2 uppercase text-slate-500 tracking-wider">
                      Função Laboral:
                    </p>
                    <div className="relative w-full max-w-xl">
                      <input
                        type="text"
                        className="w-full px-4 h-10 border border-[#888] shadow-inner text-base font-medium bg-[#E8E8E8] uppercase tracking-tight focus:border-[#1A3351] outline-none rounded-none"
                        value={functionSearch}
                        onChange={(e) => setFunctionSearch(e.target.value)}
                      />
                      {filteredFuncoes.length > 0 && (
                        <div className="absolute z-20 w-full mt-0 bg-[#E8E8E8] border-2 border-[#888] shadow-2xl max-h-56 overflow-y-auto rounded-none">
                          {filteredFuncoes.map((f, i) => (
                            <button
                              key={i}
                              className="w-full text-left px-4 py-3 hover:bg-[#1A3351] hover:text-white border-b border-slate-300 last:border-0 font-bold text-sm uppercase transition-colors"
                              onClick={() => {
                                setSelectedFuncao(f);
                                setFunctionSearch(
                                  `${f.Cod} - ${f.Nome || f.FUNÇÃO}`,
                                );
                              }}
                            >
                              <span className="text-[#1A3351] font-bold mr-4 group-hover:text-white">
                                [{f.Cod}]
                              </span>
                              <span className="font-medium">
                                {f.Nome || f.FUNÇÃO}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 lg:space-y-4 text-sm lg:text-lg pl-1 lg:pl-2 mt-2">
                    <p className="flex flex-col sm:flex-row gap-1 sm:gap-4 items-baseline">
                      <span className="font-medium text-slate-500 w-full sm:w-48 shrink-0 uppercase text-[12px] tracking-wider">
                        GHE Correspondente:
                      </span>{" "}
                      <span className="text-[#1A3351] font-bold text-xl lg:text-2xl underline decoration-slate-300 underline-offset-4 decoration-1">
                        {selectedFuncao?.GHE || "---"}
                      </span>
                    </p>
                    <p className="flex flex-col sm:flex-row gap-1 sm:gap-4 items-baseline">
                      <span className="font-medium text-slate-500 w-full sm:w-48 shrink-0 uppercase text-[12px] tracking-wider">
                        GHE CONJ:
                      </span>
                      <span className="text-slate-600 font-semibold underline underline-offset-4 decoration-slate-300 decoration-1 tracking-wide text-base lg:text-lg">
                        {selectedFuncao?.["GHE CONJ"]
                          ? selectedFuncao["GHE CONJ"]
                              .toString()
                              .toUpperCase()
                              .startsWith("ACT")
                            ? selectedFuncao["GHE CONJ"]
                            : `Act.${selectedFuncao["GHE CONJ"]}`
                          : "---"}
                      </span>
                    </p>
                  </div>

                  <div className="pl-2">
                    <p className="text-[12px] font-bold mb-2 uppercase text-slate-500 tracking-wider">
                      Tipo de Exame Requerido:
                    </p>
                    <div className="flex flex-wrap bg-[#888] border-2 border-[#888] overflow-hidden w-full sm:w-fit shadow-md rounded-none">
                      {(
                        [
                          "Admissional",
                          "de Retorno ao Trabalho",
                          "Demissional",
                        ] as const
                      ).map((type) => (
                        <button
                          key={type}
                          onClick={() => setAsoType(type)}
                          className={`flex-1 sm:flex-none px-4 sm:px-8 h-10 text-[10px] sm:text-xs font-bold transition-all border-r last:border-0 border-[#777] uppercase tracking-tighter rounded-none ${
                            asoType === type
                              ? "bg-[#1A3351] text-white shadow-inner"
                              : "text-white/70 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {type === "de Retorno ao Trabalho"
                            ? "Retorno ao Trabalho"
                            : type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedFuncao && (
                    <div className="mt-auto pb-2 pl-2 border-t border-slate-400 pt-2">
                      <p className="text-sm font-normal text-slate-600 uppercase leading-none italic">
                        {selectedFuncao.Cod} -{" "}
                        {selectedFuncao.Nome || selectedFuncao.FUNÇÃO}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA (EXAMES E RISCOS) */}
            <div className="col-span-12 xl:col-span-6 flex flex-col gap-4 min-h-0 overflow-hidden text-black pb-10 xl:pb-0">
              <h2 className="text-xl lg:text-2xl font-bold leading-none uppercase tracking-tight border-b-2 border-[#999] pb-2 shrink-0 text-[#1A3351]">
                Exames e Riscos
              </h2>

              <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                {/* RISCOS E DETALHES */}
                <div className="shrink-0 space-y-3">
                  <div>
                    <p className="text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider pl-1">
                      Riscos Ocupacionais:
                    </p>
                    <div className="w-full p-4 bg-[#E8E8E8] border border-[#BBB] font-semibold text-sm text-slate-800 shadow-inner uppercase min-h-[44px] flex items-center leading-tight">
                      {selectedFuncao ? currentExams.riscos : ""}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider pl-1">
                      Detalhes Adicionais:
                    </p>
                    <div className="w-full p-4 bg-[#E8E8E8] border border-[#BBB] font-semibold text-sm text-slate-800 shadow-inner uppercase min-h-[44px] flex items-center leading-tight">
                      {selectedFuncao ? currentExams.detalhes : ""}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <p className="text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider pl-1">
                    Protocolo de Exames:
                  </p>
                  <div className="flex-1 bg-[#E8E8E8] border border-[#BBB] p-3 sm:p-5 overflow-y-auto shadow-inner min-h-[150px]">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 font-semibold text-[13px] text-slate-900">
                      {selectedFuncao && currentExams.exames.length > 0 ? (
                        currentExams.exames.map((ex, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-3 border-b border-slate-300 pb-1.5 last:border-0 uppercase tracking-tight leading-none group text-[11px] sm:text-[13px]"
                          >
                            <span className="text-[#1A3351] font-bold text-xl leading-none">
                              •
                            </span>
                            <span className="truncate group-hover:text-[#1A3351] transition-colors">
                              {ex}
                            </span>
                          </li>
                        ))
                      ) : (
                        <div className="col-span-1 sm:col-span-2 h-full flex flex-col items-center justify-center text-slate-400 opacity-50 py-10">
                          <Activity className="w-12 h-12 mb-4" />
                          <p className="font-bold uppercase tracking-[0.2em] sm:tracking-[0.4em] text-sm sm:text-base text-center">
                            Aguardando Seleção
                          </p>
                        </div>
                      )}
                    </ul>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="shrink-0 pt-3 flex flex-col sm:flex-row gap-4 sm:h-10 pb-4 sm:pb-0">
                  <button
                    disabled={
                      isGenerating || !selectedFuncao || userRole === "viewer"
                    }
                    onClick={() => requestGeneration("/generate-referral")}
                    className="w-full sm:flex-1 h-full bg-[#1A3351] text-white font-bold shadow-xl hover:brightness-110 active:translate-y-px transition-all text-[12px] sm:text-[13px] uppercase border-b-4 border-blue-950 tracking-wider flex items-center justify-center text-center leading-tight disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-none"
                  >
                    {isGenerating ? "Gerando..." : "Gerar Encaminhamento"}
                  </button>
                  {(userRole === "admin" || userRole === "nurse") && (
                    <button
                      disabled={isGenerating || !selectedFuncao}
                      onClick={() => setShowDateModal(true)}
                      className="w-full sm:flex-1 h-full bg-[#28A745] text-white font-bold shadow-xl hover:brightness-110 active:translate-y-px transition-all text-[12px] sm:text-[13px] uppercase border-b-4 border-green-800 tracking-wider flex items-center justify-center text-center leading-tight disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-none"
                    >
                      {isGenerating ? "Gerando..." : "Gerar Arquivo ASO"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL DE DATAS DOS EXAMES */}
      {showDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#D3D3D3] w-full max-w-4xl shadow-2xl border-2 border-[#1A3351] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 rounded-none">
            <div className="bg-[#1A3351] p-4 lg:p-6 flex justify-between items-center text-white">
              <h3 className="text-lg lg:text-xl font-bold uppercase tracking-tight">
                Datas dos Exames
              </h3>
              <button
                onClick={() => setShowDateModal(false)}
                className="text-white/70 hover:text-white transition-all bg-white/10 p-2 rounded-none"
              >
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>

            <div className="p-4 lg:p-8 overflow-y-auto max-h-[70vh]">
              <p className="text-slate-700 font-bold uppercase text-[10px] lg:text-sm mb-6 border-b border-slate-400 pb-2">
                Informe as datas (DD/MM/AAAA):
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-black">
                {currentExams.exames.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 bg-[#B0B0B0]/30 p-3 border border-slate-300 shadow-sm rounded-none"
                  >
                    <span className="text-[11px] lg:text-sm font-bold text-slate-800 uppercase line-clamp-2 flex-1">
                      {ex}:
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-28 lg:w-32 h-10 px-3 bg-white border border-slate-400 font-bold text-center text-sm outline-none focus:border-[#1A3351] shadow-inner text-slate-900 rounded-none"
                      value={examDates[i] || ""}
                      onChange={(e) => handleDateChange(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 lg:p-6 bg-[#B0B0B0] flex flex-col lg:flex-row justify-center gap-3 lg:gap-6 border-t border-slate-400">
              <button
                disabled={isGenerating}
                onClick={() => requestGeneration("/generate-aso", examDates)}
                className="w-full lg:w-auto px-12 h-12 bg-[#28A745] text-white font-bold uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm border-b-4 border-green-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
              >
                {isGenerating ? "Gerando..." : "Confirmar e Gerar ASO"}
              </button>
              <button
                onClick={() => setShowDateModal(false)}
                className="w-full lg:w-auto px-12 h-12 bg-[#E31E24] text-white font-bold uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm border-b-4 border-red-900 rounded-none"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INCLUSÃO MANUAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-black">
          <div className="bg-[#D3D3D3] w-full max-w-xl shadow-2xl border-2 border-[#1A3351] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 rounded-none">
            <div className="bg-[#1A3351] p-4 flex justify-between items-center text-white">
              <h3 className="text-xl font-bold uppercase tracking-tight">
                Inclusão Manual de Servidor
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-700">
                    CPF:
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    className="w-full h-10 px-4 bg-white border border-slate-400 font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] rounded-none"
                    value={manualData.cpf}
                    onChange={(e) =>
                      setManualData({ ...manualData, cpf: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-700">
                    Data Nasc. (DD/MM/AAAA):
                  </label>
                  <input
                    type="text"
                    placeholder="01/01/1980"
                    className="w-full h-10 px-4 bg-white border border-slate-400 font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] rounded-none"
                    value={manualData.nascimento}
                    onChange={(e) =>
                      setManualData({
                        ...manualData,
                        nascimento: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700">
                  Nome Completo:
                </label>
                <input
                  type="text"
                  className="w-full h-10 px-4 bg-white border border-slate-400 font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] uppercase rounded-none"
                  value={manualData.nome}
                  onChange={(e) =>
                    setManualData({
                      ...manualData,
                      nome: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700">
                  Cargo:
                </label>
                <input
                  type="text"
                  className="w-full h-10 px-4 bg-white border border-slate-400 font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] uppercase rounded-none"
                  value={manualData.cargo}
                  onChange={(e) =>
                    setManualData({
                      ...manualData,
                      cargo: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700">
                  Secretaria:
                </label>
                <select
                  className="w-full h-10 px-4 bg-white border border-slate-400 font-normal text-slate-900 shadow-inner outline-none focus:border-[#1A3351] rounded-none"
                  value={manualData.secretaria}
                  onChange={(e) =>
                    setManualData({ ...manualData, secretaria: e.target.value })
                  }
                >
                  <option value="">Selecione uma secretaria</option>
                  {secretarias.map((s, i) => (
                    <option key={i} value={s}>
                      {s}
                    </option>
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
                    Matrícula: "NOVO (Manual)",
                  } as Servidor);
                  setShowManualModal(false);
                  setCpf(manualData.cpf);
                }}
                className="w-full sm:w-auto px-12 h-12 bg-[#1A3351] text-white font-bold uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm border-b-4 border-blue-950 rounded-none"
              >
                Confirmar Inclusão
              </button>
              <button
                onClick={() => setShowManualModal(false)}
                className="w-full sm:w-auto px-12 h-12 bg-[#E31E24] text-white font-bold uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm border-b-4 border-red-900 rounded-none"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE MÚLTIPLAS MATRÍCULAS */}
      {showSelectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-black">
          <div className="bg-[#D3D3D3] w-full max-w-2xl shadow-2xl border-2 border-[#1A3351] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 rounded-none">
            <div className="bg-[#1A3351] p-4 flex justify-between items-center text-white">
              <h3 className="text-xl font-bold uppercase tracking-tight">
                Múltiplas Matrículas Encontradas
              </h3>
              <button
                onClick={() => setShowSelectionModal(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-slate-700 font-bold mb-4 uppercase text-sm border-b border-slate-400 pb-2">
                Selecione o registro correspondente para o {asoType}:
              </p>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {searchResults.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedServidor(s);
                      setShowSelectionModal(false);
                    }}
                    className="w-full text-left p-4 bg-white border-2 border-slate-300 hover:border-[#1A3351] hover:bg-slate-50 transition-all group shadow-sm flex flex-col gap-1 rounded-none"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1A3351] text-lg uppercase">
                        {s.Nome}
                      </span>
                      <div className="flex gap-2">
                        {s.contrato && (
                          <span className="bg-[#E31E24] text-white text-[10px] font-bold px-2 py-1 rounded-none uppercase tracking-wider">
                            Contrato: {s.contrato}
                          </span>
                        )}
                        <span className="bg-[#1A3351] text-white text-[10px] font-bold px-2 py-1 rounded-none uppercase tracking-wider">
                          Mat: {s.Matrícula}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-500 uppercase text-[9px]">
                          Cargo:
                        </span>
                        <span className="font-medium text-slate-700 uppercase line-clamp-1">
                          {s.Cargo}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-500 uppercase text-[9px]">
                          Secretaria:
                        </span>
                        <span className="font-medium text-slate-700 uppercase line-clamp-1">
                          {s.Secretaria}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#B0B0B0] flex justify-end border-t border-slate-400">
              <button
                onClick={() => setShowSelectionModal(false)}
                className="px-8 h-10 bg-[#E31E24] text-white font-bold uppercase tracking-widest shadow-md hover:brightness-110 active:scale-95 transition-all text-xs border-b-4 border-red-900 rounded-none"
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
