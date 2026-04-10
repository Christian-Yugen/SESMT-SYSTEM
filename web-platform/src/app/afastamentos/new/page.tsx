"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import {
  Activity,
  Save,
  ChevronLeft,
  Loader2,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  Printer,
  Eye,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import {
  getCIDChapter,
  CIDDetails,
  searchCIDs,
  getCIDDetailsFromDB,
  normalizeCID,
} from "@/lib/cid-utils";
import {
  generateAfastamentoPDF,
  AfastamentoPortariaData,
} from "@/lib/afastamento-portaria-pdf";

interface Servidor {
  id?: number;
  cpf: string;
  nome: string;
  cargo: string;
  matricula: string;
  contrato: string;
  secretaria: string;
  natureza_cargo: string;
  sexo?: string; // M ou F
}

export default function NewAfastamentoPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [foundServidores, setFoundServidores] = useState<Servidor[]>([]);
  const [selectedServidor, setSelectedServidor] = useState<Servidor | null>(
    null,
  );
  const [allBonds, setAllBonds] = useState<Servidor[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedPortaria, setGeneratedPortaria] = useState<Omit<
    AfastamentoPortariaData,
    "data_portaria"
  > | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");
  const [isMaternidadeContext, setIsMaternidadeContext] = useState(false);
  // Quando houver múltiplos vínculos, permitir lançar em todos ou somente um
  const [applyToAll, setApplyToAll] = useState<boolean>(true);
  const [targetBondIndex, setTargetBondIndex] = useState<number | null>(null);
  useEffect(() => {
    // Ao trocar/receber vínculos, restaurar comportamento padrão (aplicar em todos)
    setApplyToAll(true);
    setTargetBondIndex(null);
  }, [allBonds]);

  // Form data
  const [formData, setFormData] = useState({
    tipo_afastamento: "AUX. DOENÇA",
    is_acidente_trabalho: false,
    data_inicio: "",
    data_fim: "",
    data_pericia: "",
    perito_nome: "",
    perito_crm: "",
    observacoes: "",
    renew_from_id: null as number | null,
  });

  const [selectedCids, setSelectedCids] = useState<CIDDetails[]>([]);
  const [cidInput, setCidInput] = useState("");
  const [foundCids, setFoundCids] = useState<CIDDetails[]>([]);
  const [searchingCids, setSearchingCids] = useState(false);
  const [diasAfastamento, setDiasAfastamento] = useState<string>("");

  const selectServidor = useCallback(
    async (s: Servidor) => {
      setSelectedServidor(s);

      // Se for homem, não pode estar em Licença Maternidade
      const isMale = s.sexo === "M" || s.sexo === "MASCULINO";
      if (isMale && formData.tipo_afastamento === "LICENÇA MATERNIDADE") {
        setFormData((prev) => ({ ...prev, tipo_afastamento: "AUX. DOENÇA" }));
      }

      const { data: bonds } = await supabase
        .from("servidores")
        .select("*")
        .eq("cpf", s.cpf);
      if (bonds) setAllBonds(bonds);
      setFoundServidores([]);
    },
    [formData.tipo_afastamento],
  );

  const performSearch = useCallback(
    async (queryStr: string, autoSelectFirst = false) => {
      setSearching(true);
      const cleanQuery = queryStr.replace(/\D/g, "");
      const isNumeric = /^\d+$/.test(cleanQuery) && cleanQuery.length > 0;

      let query = supabase.from("servidores").select("*");
      if (isNumeric) {
        query = query.ilike("cpf", `${cleanQuery}%`);
      } else {
        query = query.ilike("nome", `%${queryStr}%`);
      }

      const { data, error } = await query.limit(10);

      if (!error && data) {
        setFoundServidores(data);
        // Auto-select: se só houver 1 resultado, ou se vier de prorrogação (autoSelectFirst)
        if (data.length === 1 || (autoSelectFirst && data.length > 0)) {
          selectServidor(data[0]);
        }
      }
      setSearching(false);
    },
    [selectServidor],
  );

  // Debounce server search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        performSearch(searchQuery);
      } else {
        setFoundServidores([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Debounce CID search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (cidInput.trim().length >= 1) {
        setSearchingCids(true);
        const results = await searchCIDs(cidInput);
        setFoundCids(results);
        setSearchingCids(false);
      } else {
        setFoundCids([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cidInput]);

  // Auto calculate data_fim
  useEffect(() => {
    if (formData.data_inicio && diasAfastamento) {
      const [y, m, d] = formData.data_inicio.split("-").map(Number);
      const days = parseInt(diasAfastamento);
      if (!isNaN(days) && days > 0 && y && m && d) {
        const end = new Date(y, m - 1, d + days - 1);
        const endY = end.getFullYear();
        const endM = String(end.getMonth() + 1).padStart(2, "0");
        const endD = String(end.getDate()).padStart(2, "0");
        setFormData((prev) => ({
          ...prev,
          data_fim: `${endY}-${endM}-${endD}`,
        }));
      }
    }
  }, [formData.data_inicio, diasAfastamento]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { session, error } = await safeGetSession();
        if (error) {
          await handleAuthError(error);
          return;
        }
        if (session) {
          const { data } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (data) {
            setUserRole(data.role);
            if (data.role !== "admin" && data.role !== "nurse") {
              router.push("/afastamentos");
              return;
            }
          }
          const name =
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "Usuário";
          setUserName(name);

          // Check for extension (prorrogação) and tipo param
          const params = new URLSearchParams(window.location.search);
          const renewFrom = params.get("renew_from");
          const cpf = params.get("cpf");
          const tipoParam = params.get("tipo");
          if (tipoParam === "maternidade") {
            setIsMaternidadeContext(true);
            setFormData((prev) => ({
              ...prev,
              tipo_afastamento: "LICENÇA MATERNIDADE",
              is_acidente_trabalho: false,
            }));
          }
          if (renewFrom && cpf) {
            setFormData((prev) => ({
              ...prev,
              renew_from_id: parseInt(renewFrom),
            }));
            performSearch(cpf, true); // autoSelectFirst=true: seleciona mesmo com múltiplos vínculos
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        await handleAuthError(err);
      }
    };
    checkAuth();
  }, [router, performSearch]);

  const addCid = async (cidToUse?: CIDDetails) => {
    if (cidToUse) {
      const alreadyExists = selectedCids.some((c) => c.code === cidToUse.code);
      if (!alreadyExists) {
        setSelectedCids([...selectedCids, cidToUse]);
      }
      setCidInput("");
      setFoundCids([]);
      return;
    }

    const normalizedInput = normalizeCID(cidInput);
    if (!normalizedInput) return;

    setSearchingCids(true);
    const details = await getCIDDetailsFromDB(normalizedInput);
    const alreadyExists = selectedCids.some((c) => c.code === details.code);
    if (!alreadyExists) {
      setSelectedCids([...selectedCids, details]);
    }
    setCidInput("");
    setFoundCids([]);
    setSearchingCids(false);
  };

  const removeCid = (index: number) => {
    setSelectedCids(selectedCids.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedServidor || allBonds.length === 0) {
      alert("Selecione um servidor primeiro.");
      return;
    }

    if (!formData.data_inicio || !formData.data_fim) {
      alert("Preencha a data de início e a quantidade de dias.");
      return;
    }

    if (allBonds.length > 1 && !applyToAll && targetBondIndex === null) {
      alert("Selecione a matrícula alvo para o afastamento.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Obter próximo número de portaria
      const currentYear = new Date().getFullYear();
      const { data: lastPortaria } = await supabase
        .from("portarias_afastamento")
        .select("numero")
        .eq("ano", currentYear)
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNumber = (lastPortaria?.numero || 0) + 1;

      // Se for prorrogação, vamos buscar os registros anteriores (siblings) para vincular corretamente
      let previousRecords: Array<{
        id: number;
        servidor_matricula: string;
        servidor_contrato: string;
      }> = [];
      if (formData.renew_from_id) {
        const { data: baseRec } = await supabase
          .from("afastamentos")
          .select("*")
          .eq("id", formData.renew_from_id)
          .single();
        if (baseRec) {
          const { data: siblings } = await supabase
            .from("afastamentos")
            .select("*")
            .eq("servidor_cpf", baseRec.servidor_cpf)
            .eq("data_inicio", baseRec.data_inicio)
            .eq("data_fim", baseRec.data_fim)
            .eq("status", "ATIVO");
          if (siblings) previousRecords = siblings;
        }
      }

      // Lançar para vínculos conforme seleção do usuário (todos ou somente 1)
      const bondsToPersist = applyToAll
        ? allBonds
        : [allBonds[targetBondIndex as number]];
      const contractsForPortaria = bondsToPersist
        .map((b) => b.contrato)
        .join(" e ");

      for (const bond of bondsToPersist) {
        const { data: newAfastamento, error } = await supabase
          .from("afastamentos")
          .insert({
            servidor_cpf: bond.cpf,
            servidor_nome: bond.nome,
            servidor_matricula: bond.matricula,
            servidor_contrato: bond.contrato,
            servidor_secretaria: bond.secretaria,
            servidor_cargo: bond.cargo || bond.natureza_cargo,
            natureza_cargo: bond.natureza_cargo,
            tipo_afastamento: formData.tipo_afastamento,
            is_acidente_trabalho: formData.is_acidente_trabalho,
            data_inicio: formData.data_inicio,
            data_fim: formData.data_fim,
            data_pericia: formData.data_pericia || null,
            perito_nome: formData.perito_nome || null,
            perito_crm: formData.perito_crm || null,
            observacoes: formData.observacoes,
            situacao: "EM_ANDAMENTO",
            criado_por: user?.id || null,
            hash_auditoria: `AF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          })
          .select()
          .single();

        if (error) throw error;

        // Inserir CIDs
        for (const cid of selectedCids) {
          const chapter = getCIDChapter(cid.code);
          await supabase.from("afastamento_cids").insert({
            afastamento_id: newAfastamento.id,
            cid_codigo: cid.code,
            cid_descricao: cid.desc,
            cid_capitulo: chapter?.capitulo || "Desconhecido",
          });
        }

        // Gerar Registro de Portaria
        const { data: portariaRec } = await supabase
          .from("portarias_afastamento")
          .insert({
            afastamento_id: newAfastamento.id,
            numero: nextNumber,
            ano: currentYear,
            data_emissao: new Date().toISOString().split("T")[0],
            criado_por: user?.id || null,
          })
          .select()
          .single();

        setGeneratedPortaria({
          ...portariaRec,
          servidor_nome: bond.nome,
          servidor_matricula: bond.matricula,
          servidor_cargo: bond.cargo || bond.natureza_cargo,
          servidor_lotacao: bond.secretaria,
          data_inicio: formData.data_inicio.split("-").reverse().join("/"),
          data_fim: formData.data_fim.split("-").reverse().join("/"),
          tipo_afastamento: formData.tipo_afastamento,
          is_acidente_trabalho: formData.is_acidente_trabalho,
          perito_nome: formData.perito_nome,
          perito_crm: formData.perito_crm,
          servidor_contrato: contractsForPortaria,
        });

        // Prorrogação: Procurar o registro anterior correspondente a este vínculo
        const prevBondRec = previousRecords.find(
          (pr) =>
            pr.servidor_matricula === bond.matricula &&
            pr.servidor_contrato === bond.contrato,
        );
        if (prevBondRec) {
          await supabase
            .from("afastamentos")
            .update({
              situacao: "PRORROGADO",
              renovado_por_id: newAfastamento.id,
            })
            .eq("id", prevBondRec.id);
        } else if (formData.renew_from_id && bondsToPersist.length === 1) {
          // Fallback para caso simples de 1 vínculo ou se a matrícula mudou (raro)
          await supabase
            .from("afastamentos")
            .update({
              situacao: "PRORROGADO",
              renovado_por_id: newAfastamento.id,
            })
            .eq("id", formData.renew_from_id);
        }
      }

      setShowSuccess(true);
    } catch (err: unknown) {
      console.error(err);
      alert(
        "Erro ao salvar: " + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black overflow-x-hidden">
      <Sidebar
        userRole={userRole}
        userName={userName}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-visible relative">
        {/* HEADER */}
        <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-emerald-500 shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                router.push(
                  isMaternidadeContext
                    ? "/afastamentos/maternidade"
                    : "/afastamentos",
                )
              }
              className="p-2 hover:bg-black/5 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-[#1A3351]" />
            </button>
            <h2 className="text-xl font-bold uppercase tracking-tight text-[#1A3351]">
              {isMaternidadeContext
                ? formData.renew_from_id
                  ? "Prorrogar Licença Maternidade"
                  : "Nova Licença Maternidade"
                : formData.renew_from_id
                  ? "Prorrogar Afastamento"
                  : "Novo Afastamento"}
            </h2>
          </div>
        </section>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {/* BUSCA DE SERVIDOR */}
            <div className="bg-white p-6 shadow-xl border-l-4 border-[#1A3351]">
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-widest">
                Servidor
              </h3>
              {!selectedServidor ? (
                <div className="flex gap-3 h-14">
                  <input
                    type="text"
                    placeholder="NOME OU CPF DO SERVIDOR..."
                    className="flex-1 px-4 h-full border border-slate-300 shadow-inner text-base font-bold bg-[#E8E8E8] outline-none uppercase"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && performSearch(searchQuery)
                    }
                  />
                  <button
                    onClick={() => performSearch(searchQuery)}
                    className="bg-[#1A3351] text-white px-8 h-full font-bold uppercase text-sm shadow-lg hover:brightness-110 transition-all"
                  >
                    Buscar
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 p-6 border-2 border-slate-200 shadow-inner">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-6 items-center">
                      <div className="p-4 bg-[#1A3351] text-white shadow-lg">
                        <User className="w-8 h-8" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 flex-1">
                        <div className="md:col-span-2 border-b border-slate-200 pb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Servidor
                          </p>
                          <p className="text-2xl font-bold text-[#1A3351] uppercase leading-none">
                            {selectedServidor.nome}
                          </p>
                          <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                            CPF: {selectedServidor.cpf}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Matrícula / Vínculo
                          </p>
                          <p className="text-sm font-bold text-emerald-600 uppercase">
                            MAT: {selectedServidor.matricula} • CONTRATO:{" "}
                            {selectedServidor.contrato || "N/D"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Cargo / Natureza
                          </p>
                          <p className="text-xs font-bold text-slate-700 uppercase">
                            {selectedServidor.cargo || "N/D"}{" "}
                            {selectedServidor.natureza_cargo
                              ? `(${selectedServidor.natureza_cargo})`
                              : ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Secretaria
                          </p>
                          <p className="text-xs font-bold text-slate-700 uppercase">
                            {selectedServidor.secretaria || "NÃO INFORMADA"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedServidor(null);
                        setAllBonds([]);
                        setSearchQuery("");
                      }}
                      className="px-4 py-2 border-2 border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase text-[10px] font-bold rounded-none"
                    >
                      Trocar Servidor
                    </button>
                  </div>
                </div>
              )}

              {foundServidores.length > 0 && !selectedServidor && (
                <div className="mt-2 border-2 border-[#1A3351] bg-white rounded-none shadow-2xl relative z-20">
                  {foundServidores.map((s, idx) => (
                    <button
                      key={s.id || `${s.matricula}-${s.contrato}-${idx}`}
                      onClick={() => selectServidor(s)}
                      className="w-full text-left p-4 hover:bg-emerald-50 border-b last:border-0"
                    >
                      <p className="font-bold text-[#1A3351] uppercase">
                        {s.nome}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase">
                        CPF: {s.cpf} | Matrícula: {s.matricula} | Contrato:{" "}
                        {s.contrato}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {allBonds.length > 1 && (
                <div className="mt-4 bg-emerald-50 p-4 rounded-none border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2">
                    Atenção: Este servidor possui {allBonds.length} vínculos
                    ativos.
                  </p>

                  <div className="flex items-center gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setApplyToAll(true);
                        setTargetBondIndex(null);
                      }}
                      className={`px-3 py-2 text-[10px] font-bold uppercase ${applyToAll ? "bg-emerald-700 text-white" : "bg-white text-emerald-700"} border border-emerald-300`}
                    >
                      Aplicar em todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplyToAll(false)}
                      className={`px-3 py-2 text-[10px] font-bold uppercase ${!applyToAll ? "bg-emerald-700 text-white" : "bg-white text-emerald-700"} border border-emerald-300`}
                    >
                      Aplicar em apenas 1 matrícula
                    </button>
                  </div>

                  {applyToAll ? (
                    <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2">
                      O afastamento será aplicado a todos:
                    </p>
                  ) : (
                    <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2">
                      Escolha a matrícula alvo:
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {allBonds.map((b, idx) => {
                      const isSelected = targetBondIndex === idx;
                      return (
                        <button
                          key={b.id || `${b.matricula}-${b.contrato}-${idx}`}
                          onClick={() => {
                            if (!applyToAll) setTargetBondIndex(idx);
                          }}
                          className={`px-3 py-1 rounded-none text-[10px] font-bold shadow-sm border ${applyToAll ? "bg-white border-emerald-300 text-slate-700" : isSelected ? "bg-emerald-700 text-white border-emerald-700" : "bg-white border-emerald-300 text-emerald-700"}`}
                        >
                          Matrícula: {b.matricula} (C. {b.contrato})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* DADOS DO AFASTAMENTO */}
            {selectedServidor && (
              <div className="bg-white p-6 shadow-xl border-l-4 border-emerald-500 space-y-6">
                <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-widest">
                  Informações do Afastamento
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {!isMaternidadeContext && (
                    <div className="flex flex-col">
                      <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 block">
                        Acidente de Trabalho
                      </label>
                      <div
                        className={`flex items-center gap-3 px-4 py-3 border-2 rounded-none cursor-pointer select-none transition-all group ${
                          formData.is_acidente_trabalho
                            ? "bg-red-50 border-red-500 shadow-md shadow-red-100"
                            : "bg-white border-slate-400 hover:border-red-400 hover:bg-red-50"
                        }`}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            is_acidente_trabalho: !prev.is_acidente_trabalho,
                          }))
                        }
                      >
                        <div
                          className={`w-5 h-5 rounded-none border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            formData.is_acidente_trabalho
                              ? "bg-red-600 border-red-600"
                              : "border-slate-400 bg-white group-hover:border-red-500"
                          }`}
                        >
                          {formData.is_acidente_trabalho && (
                            <Activity className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span
                            className={`text-[12px] font-bold uppercase leading-tight ${
                              formData.is_acidente_trabalho
                                ? "text-red-700"
                                : "text-slate-700"
                            }`}
                          >
                            {formData.is_acidente_trabalho
                              ? "Sim — acidente de trabalho"
                              : "Não — marcar se for o caso"}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase font-medium">
                            Relacionado à atividade ocupacional
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isMaternidadeContext ? "md:col-span-2" : ""}`}
                  >
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 block">
                        Início
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border border-slate-300 rounded-none font-bold"
                        value={formData.data_inicio}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            data_inicio: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 block">
                        Dias de Afastamento
                      </label>
                      <input
                        type="number"
                        placeholder="QTDE DIAS..."
                        className="w-full px-4 py-3 border border-slate-300 rounded-none font-bold"
                        value={diasAfastamento}
                        onChange={(e) => setDiasAfastamento(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 block font-bold text-emerald-600">
                        Fim (Calculado)
                      </label>
                      <div className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-none font-bold text-emerald-700">
                        {formData.data_fim
                          ? new Date(
                              formData.data_fim + "T12:00:00",
                            ).toLocaleDateString("pt-BR")
                          : "---"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SELEÇÃO DE CID */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 block">
                    CIDs (CID-10 / CID-11)
                  </label>
                  <div className="flex gap-2 relative">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="CÓDIGO OU NOME DA DOENÇA (Ex: J45 ou Asma)..."
                        className="w-full px-4 py-3 border border-slate-300 rounded-none font-bold uppercase"
                        value={cidInput}
                        onChange={(e) =>
                          setCidInput(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) => e.key === "Enter" && addCid()}
                      />
                      {searchingCids && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        </div>
                      )}
                      {foundCids.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-[#1A3351] rounded-none shadow-2xl z-50 max-h-60 overflow-y-auto">
                          {foundCids.map((cid, idx) => (
                            <button
                              key={cid.code + idx}
                              onClick={() => addCid(cid)}
                              className="w-full text-left p-3 hover:bg-emerald-50 border-b last:border-0 transition-colors group"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-[#1A3351]">
                                  {cid.code}
                                </span>
                                <span className="text-[8px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-none uppercase">
                                  Cap. {cid.chapter}
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-600 uppercase group-hover:text-emerald-700">
                                {cid.desc}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => addCid()}
                      className="bg-[#1A3351] text-white px-4 rounded-none hover:bg-emerald-600 transition-colors h-[46px]"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCids.map((cid, i) => (
                      <div
                        key={i}
                        className="flex items-baseline gap-2 bg-emerald-50 border-2 border-emerald-200 px-3 py-2 rounded-none shadow-sm w-full md:w-[calc(50%-8px)]"
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-emerald-800">
                              {cid.code}
                            </span>
                            <span className="text-[8px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-none uppercase">
                              Cap. {cid.chapter}
                            </span>
                          </div>
                          <p
                            className="text-[10px] font-bold text-emerald-700 uppercase leading-tight mt-1 truncate"
                            title={cid.desc}
                          >
                            {cid.desc}
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase italic truncate">
                            {cid.chapter_desc}
                          </p>
                        </div>
                        <button
                          onClick={() => removeCid(i)}
                          className="ml-2 text-emerald-400 hover:text-red-500 hover:scale-125 transition-all shrink-0"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DADOS DE PERÍCIA (Requisito Especial) */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-[11px] font-bold uppercase text-emerald-600 flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-600 rounded-none" />
                    Dados da Perícia Médica (Obrigatório para Prorrogação)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 block">
                        Data da Perícia
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border border-slate-300 rounded-none font-bold"
                        value={formData.data_pericia}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            data_pericia: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 block">
                        Médico Perito
                      </label>
                      {formData.perito_nome ? (
                        <div className="flex items-center justify-between px-4 py-3 bg-[#1A3351] border-2 border-[#1A3351]">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-bold uppercase text-white leading-tight">
                              {formData.perito_nome.startsWith("JULIA")
                                ? "Dra."
                                : "Dr."}{" "}
                              {formData.perito_nome}
                            </span>
                            <span className="text-[10px] font-medium text-blue-200 uppercase">
                              {formData.perito_crm}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                perito_nome: "",
                                perito_crm: "",
                              }))
                            }
                            className="text-[10px] font-bold uppercase text-blue-300 hover:text-white underline underline-offset-2 transition-colors ml-6 flex-shrink-0"
                          >
                            Trocar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          {[
                            {
                              nome: "ISSAM FARES JUNIOR",
                              crm: "CRM/MS 3744",
                              titulo: "Dr.",
                            },
                            {
                              nome: "JULIA OLIVEIRA MENDES PEREIRA",
                              crm: "CRM/MS 14653",
                              titulo: "Dra.",
                            },
                          ].map((perito) => (
                            <button
                              key={perito.crm}
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  perito_nome: perito.nome,
                                  perito_crm: perito.crm,
                                }))
                              }
                              className="flex-1 flex flex-col items-start px-4 py-3 border-2 border-slate-300 bg-white hover:border-[#1A3351] hover:bg-slate-50 transition-all text-left"
                            >
                              <span className="text-[11px] font-bold uppercase text-slate-700 leading-tight">
                                {perito.titulo} {perito.nome}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 uppercase">
                                {perito.crm}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 block">
                    Observações Gerais
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-none font-bold uppercase resize-none"
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData({ ...formData, observacoes: e.target.value })
                    }
                    placeholder="Informaçõe adicionais..."
                  />
                </div>

                <div className="mt-10 flex justify-end gap-4 border-t pt-8">
                  <button
                    onClick={() => router.push("/afastamentos")}
                    className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-12 py-3 bg-emerald-600 text-white font-bold uppercase text-sm rounded-none shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 border-b-4 border-emerald-900"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar e Gerar Portaria
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL DE SUCESSO E PORTARIA */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full p-8 shadow-2xl border-t-[8px] border-emerald-500 animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-none flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-[#1A3351] uppercase tracking-tighter mb-2">
                  Afastamento Registrado!
                </h3>
                <p className="text-slate-500 text-sm font-bold uppercase mb-8">
                  O registro foi concluído e a Portaria Nº{" "}
                  {generatedPortaria?.numero}/{generatedPortaria?.ano} foi
                  gerada com sucesso.
                </p>

                <div className="grid grid-cols-1 gap-3 w-full">
                  <button
                    onClick={() => {
                      if (!generatedPortaria) return;
                      generateAfastamentoPDF(
                        {
                          ...generatedPortaria,
                          data_portaria: new Date().toLocaleDateString("pt-BR"),
                        },
                        "view",
                      );
                    }}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-[#1A3351] text-white font-bold uppercase text-xs rounded-none hover:brightness-110 transition-all shadow-lg"
                  >
                    <Eye className="w-4 h-4" /> Visualizar Portaria PDF
                  </button>
                  <button
                    onClick={() => {
                      if (!generatedPortaria) return;
                      generateAfastamentoPDF(
                        {
                          ...generatedPortaria,
                          data_portaria: new Date().toLocaleDateString("pt-BR"),
                        },
                        "download",
                      );
                    }}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-emerald-600 text-white font-bold uppercase text-xs rounded-none hover:brightness-110 transition-all shadow-lg"
                  >
                    <Printer className="w-4 h-4" /> Baixar Portaria PDF
                  </button>
                  <button
                    onClick={() => router.push("/afastamentos")}
                    className="w-full py-4 text-slate-400 font-bold uppercase text-[10px] hover:text-[#1A3351] transition-all pt-4"
                  >
                    Voltar ao Painel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
