"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import {
  Menu,
  Save,
  ChevronLeft,
  Loader2,
  User,
  Calendar,
  History as HistoryIcon,
  Eye,
  Download,
} from "lucide-react";
import { Servidor, AuditLogRecord } from "@/types";
import { generatePortariaPDF, PortariaData } from "@/lib/portaria-pdf";
import { generatePortariaDOCX } from "@/lib/portaria-docx";
import { capitalizeName } from "@/lib/portaria-utils";

interface PortariaRecord {
  id: number;
  numero: number;
  ano: number;
  servidor_nome: string;
  servidor_cpf: string;
  servidor_matricula: string;
  servidor_cargo: string;
  servidor_lotacao: string;
  servidor_genero: "M" | "F";
  periodo_inicio: string;
  periodo_fim: string;
  data_portaria: string;
  servidor_contrato?: string;
  criado_por: string;
  criado_por_nome: string;
  created_at: string;
  motivo_alteracao?: string;
}

export default function EditPortariaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [selectedServidor, setSelectedServidor] = useState<Servidor | null>(
    null,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");
  const [, setMounted] = useState(false);
  const [originalData, setOriginalData] = useState<PortariaRecord | null>(null);
  const [changeLogs, setChangeLogs] = useState<AuditLogRecord[]>([]);

  const [formData, setFormData] = useState({
    numero: "",
    periodo_inicio: "",
    periodo_fim: "",
    data_portaria: "",
    genero: "F" as "M" | "F",
    lotacao: "",
    motivo_alteracao: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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
            if (data.role === "analytic_manager") {
              alert(
                "Acesso Negado: Gerente Analítico não possui permissão para editar portarias.",
              );
              router.push("/abono/portarias");
              return;
            }
          }
          const name =
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "Usuário";
          setUserName(name);
          await loadData();
        } else {
          router.push("/login");
        }
      } catch (err) {
        await handleAuthError(err);
      }
    };

    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch Portaria Record
        const { data: portaria, error: portariaError } = await supabase
          .from("portarias_abono")
          .select("*")
          .eq("id", id)
          .single();

        if (portariaError || !portaria) {
          alert("Erro ao carregar registro de portaria.");
          router.push("/abono/portarias");
          return;
        }

        setFormData({
          numero: portaria.numero.toString(),
          periodo_inicio: portaria.periodo_inicio,
          periodo_fim: portaria.periodo_fim,
          data_portaria: portaria.data_portaria,
          genero: portaria.servidor_genero,
          lotacao: portaria.servidor_lotacao,
          motivo_alteracao: "",
        });
        setOriginalData(portaria);

        // Fetch Logs
        const { data: logs } = await supabase
          .from("portarias_abono_logs")
          .select("*")
          .eq("portaria_id", id)
          .order("data_alteracao", { ascending: false });
        if (logs) setChangeLogs(logs);

        // 2. Mock selected servidor for UI from portaria data
        setSelectedServidor({
          Nome: portaria.servidor_nome,
          Cargo: portaria.servidor_cargo,
          Matrícula: portaria.servidor_matricula,
          Secretaria: "---", // Could fetch from servidores table but portaria has main info
          "CPF.": portaria.servidor_cpf,
          Sexo: portaria.servidor_genero,
          "Local de Trabalho": portaria.servidor_lotacao,
          contrato: portaria.servidor_contrato,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [id, router]);

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handlePreview = () => {
    if (!formData.numero || !formData.periodo_inicio || !formData.periodo_fim) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    const portariaData: PortariaData = {
      numero: parseInt(formData.numero),
      ano: originalData?.ano || new Date().getFullYear(),
      servidor_nome: selectedServidor?.Nome || "",
      servidor_matricula: selectedServidor?.Matrícula || "",
      servidor_cargo: selectedServidor?.Cargo || "",
      servidor_lotacao: formData.lotacao,
      servidor_genero: formData.genero,
      periodo_inicio: formatDateBR(formData.periodo_inicio),
      periodo_fim: formatDateBR(formData.periodo_fim),
      data_portaria: formatDateBR(formData.data_portaria),
      servidor_contrato: selectedServidor?.contrato,
    };
    generatePortariaPDF(portariaData, "view");
  };

  const handleDownloadDOCX = async () => {
    if (!formData.numero || !formData.periodo_inicio || !formData.periodo_fim) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    const portariaData: PortariaData = {
      numero: parseInt(formData.numero),
      ano: originalData?.ano || new Date().getFullYear(),
      servidor_nome: selectedServidor?.Nome || "",
      servidor_matricula: selectedServidor?.Matrícula || "",
      servidor_cargo: selectedServidor?.Cargo || "",
      servidor_lotacao: formData.lotacao,
      servidor_genero: formData.genero,
      periodo_inicio: formatDateBR(formData.periodo_inicio),
      periodo_fim: formatDateBR(formData.periodo_fim),
      data_portaria: formatDateBR(formData.data_portaria),
      servidor_contrato: selectedServidor?.contrato,
    };
    await generatePortariaDOCX(portariaData);
  };

  const handleUpdate = async () => {
    if (!formData.numero || !formData.periodo_inicio || !formData.periodo_fim) {
      alert(
        "Preencha os campos obrigatórios (Número, Período Início e Período Fim).",
      );
      return;
    }

    if (!formData.motivo_alteracao || formData.motivo_alteracao.length < 5) {
      alert(
        "Para sua segurança, descreva o motivo desta alteração (mínimo 5 caracteres).",
      );
      return;
    }

    setSaving(true);
    try {
      const { session } = await safeGetSession();
      const operatorName =
        session?.user?.email?.split("@")[0]?.toUpperCase() || "SISTEMA";

      // 1. Update record
      const { error: updateError } = await supabase
        .from("portarias_abono")
        .update({
          numero: parseInt(formData.numero),
          periodo_inicio: formData.periodo_inicio,
          periodo_fim: formData.periodo_fim,
          data_portaria: formData.data_portaria,
          servidor_lotacao: capitalizeName(formData.lotacao),
          servidor_genero: formData.genero,
          servidor_contrato: selectedServidor?.contrato,
          motivo_alteracao: formData.motivo_alteracao,
          alterado_por: operatorName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // 2. Insert into audit logs
      const { error: logError } = await supabase
        .from("portarias_abono_logs")
        .insert({
          portaria_id: id,
          usuario_email: session?.user?.email || "desconhecido",
          motivo: formData.motivo_alteracao,
          dados_anteriores: originalData,
          dados_novos: {
            numero: parseInt(formData.numero),
            periodo_inicio: formData.periodo_inicio,
            periodo_fim: formData.periodo_fim,
            data_portaria: formData.data_portaria,
            servidor_lotacao: capitalizeName(formData.lotacao),
            servidor_genero: formData.genero,
            servidor_contrato: selectedServidor?.contrato,
          },
        });

      if (logError) console.error("Erro ao registrar log:", logError);

      alert("Portaria atualizada com sucesso!");
      router.push("/abono/portarias");
    } catch (error: unknown) {
      console.error("Erro ao atualizar portaria:", error);
      alert(
        "Erro ao atualizar: " +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
        <p className="text-[#1A3351] uppercase tracking-[0.3em] font-bold text-xs">
          Carregando dados...
        </p>
      </div>
    );
  }

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
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-visible relative">
        {/* HEADER */}
        <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/abono/portarias")}
                className="p-2 hover:bg-black/5 rounded-none transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-[#1A3351]" />
              </button>
              <div>
                <h2 className="text-xl font-bold leading-none uppercase tracking-tight text-[#1A3351]">
                  Editar Portaria
                </h2>
                <p className="text-[9px] font-bold text-black/40 uppercase tracking-[0.2em] mt-1">
                  Ref: {id}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-[#1A3351] rounded-none text-white active:scale-90 transition-transform"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </section>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto font-sans">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {/* SERVIDOR (BLOQUEADO) */}
            <div className="bg-white p-6 shadow-xl border-l-4 border-[#1A3351]">
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-widest">
                Informações do Servidor
              </h3>
              {selectedServidor && (
                <div className="p-5 bg-slate-100 border border-slate-200 rounded-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Nome Completo
                    </p>
                    <p className="text-lg font-bold uppercase text-[#1A3351] leading-tight">
                      {selectedServidor.Nome}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      CPF
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      {selectedServidor["CPF."]}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Matrícula
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-700">
                        {selectedServidor.Matrícula}
                      </p>
                      {selectedServidor.contrato && (
                        <span className="bg-[#E31E24] text-white text-[9px] px-1.5 py-0.5 rounded-none font-bold uppercase">
                          Contrato {selectedServidor.contrato}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Cargo
                    </p>
                    <p className="text-sm font-bold uppercase text-[#1A3351]">
                      {selectedServidor.Cargo}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Lotação Original
                    </p>
                    <p className="text-sm font-bold uppercase text-amber-600">
                      {selectedServidor["Local de Trabalho"] || "---"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* DADOS EDITAIS */}
            <div className="bg-white p-6 shadow-xl border-l-4 border-amber-500">
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-6 tracking-widest text-left">
                Editar Dados da Portaria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Número da Portaria */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 pl-1">
                    Nº da Portaria *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-3 border border-slate-300 rounded-none font-bold bg-white uppercase text-xl text-[#1A3351] text-center focus:border-amber-500 outline-none"
                    value={formData.numero}
                    onChange={(e) =>
                      setFormData({ ...formData, numero: e.target.value })
                    }
                  />
                  <p className="text-[8px] font-bold text-amber-600 uppercase pl-1 leading-none text-left">
                    Nº {formData.numero || "---"}/SEGP/DGP/{originalData?.ano}
                  </p>
                </div>

                {/* Período Início */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 pl-1 text-left">
                    Período Início *
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-3 border border-slate-300 rounded-none font-bold bg-[#fcfcfc] text-sm text-[#1A3351] focus:border-amber-500 outline-none"
                    value={formData.periodo_inicio}
                    onChange={(e) => {
                      const inicio = e.target.value;
                      if (inicio) {
                        const date = new Date(inicio + "T00:00:00");
                        if (!isNaN(date.getTime())) {
                          date.setFullYear(date.getFullYear() + 1);
                          const fimStr = date.toISOString().split("T")[0];
                          setFormData({
                            ...formData,
                            periodo_inicio: inicio,
                            periodo_fim: fimStr,
                          });
                        } else {
                          setFormData({
                            ...formData,
                            periodo_inicio: inicio,
                            periodo_fim: "",
                          });
                        }
                      } else {
                        setFormData({
                          ...formData,
                          periodo_inicio: inicio,
                          periodo_fim: "",
                        });
                      }
                    }}
                  />
                </div>

                {/* Período Fim */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 pl-1 text-left">
                    Período Fim (Auto)
                  </label>
                  <input
                    type="date"
                    readOnly
                    className="w-full px-3 py-3 border border-slate-300 rounded-none font-bold bg-slate-100 text-sm text-[#1A3351] cursor-not-allowed"
                    value={formData.periodo_fim}
                  />
                </div>

                {/* Data Emissão */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 pl-1 text-left">
                    Data Emissão
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-3 border border-slate-300 rounded-none font-bold bg-[#fcfcfc] text-sm text-[#1A3351] focus:border-amber-500 outline-none"
                    value={formData.data_portaria}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        data_portaria: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="md:col-span-12">
                  <label className="text-[10px] font-bold uppercase text-slate-600 pl-1 text-left">
                    Lotação para o Documento
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-3 border border-slate-300 rounded-none font-bold bg-white text-sm text-[#1A3351] focus:border-amber-500 outline-none uppercase"
                    value={formData.lotacao}
                    onChange={(e) =>
                      setFormData({ ...formData, lotacao: e.target.value })
                    }
                  />
                </div>

                {/* MOTIVO DA ALTERAÇÃO */}
                <div className="md:col-span-2 space-y-1 bg-amber-50 p-4 rounded-none border border-amber-200">
                  <label className="text-[11px] font-bold uppercase text-amber-700 pl-1 flex items-center gap-2 mb-1">
                    <HistoryIcon className="w-4 h-4" /> Motivo da Alteração
                    (Obrigatório)
                  </label>
                  <input
                    type="text"
                    placeholder="EX: CORREÇÃO DE DATA DE INÍCIO CONFORME SOLICITAÇÃO"
                    className="w-full px-4 py-3 border border-amber-300 rounded-none font-bold bg-white outline-none focus:border-amber-500 uppercase text-xs text-[#1A3351]"
                    value={formData.motivo_alteracao}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        motivo_alteracao: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* PREVIEW */}
              <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-none">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-left">
                  Resumo da Vigência
                </p>
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-none border border-emerald-100 text-xs font-bold uppercase">
                    {formData.periodo_inicio
                      ? formatDateBR(formData.periodo_inicio)
                      : "---"}
                  </div>
                  <div className="h-px w-8 bg-slate-300" />
                  <div className="bg-red-50 text-red-700 px-3 py-1 rounded-none border border-red-100 text-xs font-bold uppercase">
                    {formData.periodo_fim
                      ? formatDateBR(formData.periodo_fim)
                      : "---"}
                  </div>
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row justify-end gap-4">
                <button
                  onClick={() => router.push("/abono/portarias")}
                  className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 transition-all text-left"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePreview}
                  className="px-8 py-3 bg-[#1A3351] text-white font-bold uppercase text-[10px] lg:text-sm rounded-none shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={handleDownloadDOCX}
                  className="px-8 py-3 bg-blue-600 text-white font-bold uppercase text-[10px] lg:text-sm rounded-none shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Word
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="px-12 py-3 bg-green-600 text-white font-bold uppercase text-[10px] lg:text-sm rounded-none shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-green-800"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Alterações
                </button>
              </div>
            </div>

            {/* HISTÓRICO DE AUDITORIA */}
            {changeLogs.length > 0 && (
              <div className="bg-white p-6 shadow-xl border-l-4 border-slate-400">
                <h3 className="text-sm font-bold uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2 text-left">
                  <HistoryIcon className="w-4 h-4" /> Trilha de Auditoria
                </h3>
                <div className="space-y-4">
                  {changeLogs.map((log) => (
                    <div
                      key={log.id}
                      className="text-[11px] p-4 bg-slate-50 rounded-none border border-slate-200"
                    >
                      <div className="flex justify-between font-bold uppercase text-slate-500 mb-2 border-b border-slate-200 pb-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {log.usuario_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{" "}
                          {new Date(log.data_alteracao).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="font-bold text-[#1A3351] uppercase underline decoration-amber-500/50 mb-1">
                        Motivo:
                      </p>
                      <p className="font-bold text-slate-700 uppercase leading-relaxed">
                        {log.motivo}
                      </p>
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
