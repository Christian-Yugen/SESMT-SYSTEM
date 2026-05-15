"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, Loader2, Menu, Save } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { supabase } from "@/lib/supabase";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { generateAfastamentoPDF } from "@/lib/afastamento-portaria-pdf";
import { AfastamentoPortariaJoinRow } from "@/types";

interface EditablePortariaRecord {
  id: number;
  numero: number;
  ano: number;
  data_emissao: string;
  created_at: string;
  afastamento_id: number;
  servidor_nome: string;
  servidor_matricula: string;
  natureza_cargo: string;
  servidor_secretaria: string;
  tipo_afastamento: string;
  data_inicio: string;
  data_fim: string;
  perito_nome: string;
  perito_crm: string;
  servidor_contrato?: string;
  servidor_sexo?: "F" | "M";
}

interface PortariaAuditRecord {
  id: number;
  old_numero: number | null;
  new_numero: number | null;
  ano: number | null;
  operation: string | null;
  changed_at: string;
  changed_by: string | null;
}

export default function EditAfastamentoPortariaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("Usuário");
  const [record, setRecord] = useState<EditablePortariaRecord | null>(null);
  const [auditRecords, setAuditRecords] = useState<PortariaAuditRecord[]>([]);
  const [formData, setFormData] = useState({
    numero: "",
    ano: "",
    data_emissao: "",
  });

  const formatDate = (value: string) => {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length !== 3) return new Date(value).toLocaleDateString("pt-BR");
    return new Date(
      Number.parseInt(parts[0], 10),
      Number.parseInt(parts[1], 10) - 1,
      Number.parseInt(parts[2], 10),
    ).toLocaleDateString("pt-BR");
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { session, error } = await safeGetSession();
        if (error) {
          await handleAuthError(error);
          return;
        }

        if (!session) {
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
          if (profile.role !== "admin" && profile.role !== "nurse") {
            alert("Apenas admin e enfermagem podem editar portarias.");
            router.push("/afastamentos/portarias");
            return;
          }
        }

        const name =
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "Usuário";
        setUserName(name);

        await loadData();
      } catch (err) {
        await handleAuthError(err);
      }
    };

    async function loadData() {
      setLoading(true);

      const { data: portaria, error: portariaError } = await supabase
        .from("portarias_afastamento")
        .select(
          `
            *,
            afastamentos!inner (
              servidor_nome,
              servidor_matricula,
              natureza_cargo,
              servidor_secretaria,
              tipo_afastamento,
              data_inicio,
              data_fim,
              perito_nome,
              perito_crm,
              servidor_contrato,
              servidor_sexo
            )
          `,
        )
        .eq("id", id)
        .single<AfastamentoPortariaJoinRow>();

      if (portariaError || !portaria) {
        alert("Erro ao carregar a portaria para edição.");
        router.push("/afastamentos/portarias");
        return;
      }

      const normalizedRecord: EditablePortariaRecord = {
        ...portaria,
        servidor_nome: portaria.afastamentos.servidor_nome,
        servidor_matricula: portaria.afastamentos.servidor_matricula,
        natureza_cargo: portaria.afastamentos.natureza_cargo,
        servidor_secretaria: portaria.afastamentos.servidor_secretaria,
        tipo_afastamento: portaria.afastamentos.tipo_afastamento,
        data_inicio: portaria.afastamentos.data_inicio,
        data_fim: portaria.afastamentos.data_fim,
        perito_nome: portaria.afastamentos.perito_nome,
        perito_crm: portaria.afastamentos.perito_crm,
        servidor_contrato: portaria.afastamentos.servidor_contrato,
        servidor_sexo: portaria.afastamentos.servidor_sexo,
      };

      setRecord(normalizedRecord);
      setFormData({
        numero: normalizedRecord.numero.toString(),
        ano: normalizedRecord.ano.toString(),
        data_emissao: normalizedRecord.data_emissao,
      });

      const { data: auditData } = await supabase
        .from("portarias_afastamento_audit")
        .select(
          "id, old_numero, new_numero, ano, operation, changed_at, changed_by",
        )
        .eq("portaria_id", id)
        .order("changed_at", { ascending: false });

      setAuditRecords((auditData as PortariaAuditRecord[] | null) ?? []);
      setLoading(false);
    }

    checkAuth();
  }, [id, router]);

  const handlePreview = () => {
    if (!record) return;

    generateAfastamentoPDF(
      {
        numero: Number.parseInt(formData.numero, 10),
        ano: Number.parseInt(formData.ano, 10),
        servidor_nome: record.servidor_nome,
        servidor_matricula: record.servidor_matricula,
        servidor_cargo: record.natureza_cargo,
        servidor_lotacao: record.servidor_secretaria,
        tipo_afastamento: record.tipo_afastamento,
        data_inicio: formatDate(record.data_inicio),
        data_fim: formatDate(record.data_fim),
        data_portaria: formatDate(formData.data_emissao),
        perito_nome: record.perito_nome,
        perito_crm: record.perito_crm,
        servidor_contrato: record.servidor_contrato,
        sexo: record.servidor_sexo,
      },
      "view",
    );
  };

  const handleUpdate = async () => {
    if (!record) return;

    const numero = Number.parseInt(formData.numero, 10);
    const ano = Number.parseInt(formData.ano, 10);

    if (Number.isNaN(numero) || numero <= 0) {
      alert("Informe um número de portaria válido.");
      return;
    }

    if (Number.isNaN(ano) || ano < 2000) {
      alert("Informe um ano válido para a portaria.");
      return;
    }

    if (!formData.data_emissao) {
      alert("Informe a data de emissão da portaria.");
      return;
    }

    if (numero !== record.numero || ano !== record.ano) {
      const { data: availability, error: availabilityError } =
        await supabase.rpc("check_portaria_availability", { numero, ano });

      if (availabilityError) {
        alert("Erro ao verificar disponibilidade do número da portaria.");
        return;
      }

      const available =
        availability === true ||
        (Array.isArray(availability) && availability[0] === true) ||
        Boolean(availability);

      if (!available) {
        alert(`O número ${numero}/${ano} já está em uso.`);
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("portarias_afastamento")
        .update({
          numero,
          ano,
          data_emissao: formData.data_emissao,
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      alert("Portaria atualizada com sucesso.");
      router.push("/afastamentos/portarias");
    } catch (error) {
      console.error("Erro ao atualizar portaria de afastamento:", error);
      alert(
        "Erro ao atualizar a portaria: " +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !record) {
    return (
      <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-[#1A3351] uppercase tracking-[0.3em] font-bold text-xs">
          Carregando portaria...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black overflow-x-hidden">
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

      <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-visible">
        <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-amber-500 shrink-0 shadow-lg">
          <div className="flex justify-between items-center mb-1 gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/afastamentos/portarias")}
                className="p-2 hover:bg-black/5 rounded-none transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-[#1A3351]" />
              </button>
              <div>
                <h2 className="text-xl font-bold leading-none uppercase tracking-tight text-[#1A3351]">
                  Editar Portaria
                </h2>
                <p className="text-[9px] font-bold text-black/40 uppercase tracking-[0.2em] mt-1">
                  Ajuste histórico do número oficial
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

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white p-6 shadow-xl border-l-4 border-[#1A3351] rounded-none">
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-widest">
                Dados do Registro
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Servidor
                  </p>
                  <p className="text-lg font-bold uppercase text-[#1A3351] leading-tight">
                    {record.servidor_nome}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Matrícula
                  </p>
                  <p className="text-sm font-bold uppercase text-slate-700">
                    {record.servidor_matricula}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Tipo
                  </p>
                  <p className="text-sm font-bold uppercase text-slate-700">
                    {record.tipo_afastamento}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 shadow-xl border-l-4 border-amber-500 rounded-none">
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-6 tracking-widest">
                Correção da Portaria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 pl-1">
                    Número da Portaria
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-3 border border-slate-300 rounded-none font-bold bg-white text-xl text-[#1A3351] text-center outline-none"
                    value={formData.numero}
                    onChange={(e) =>
                      setFormData((current) => ({
                        ...current,
                        numero: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 pl-1">
                    Ano
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-3 border border-slate-300 rounded-none font-bold bg-white text-xl text-[#1A3351] text-center outline-none"
                    value={formData.ano}
                    onChange={(e) =>
                      setFormData((current) => ({
                        ...current,
                        ano: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 pl-1">
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-3 border border-slate-300 rounded-none font-bold bg-white text-sm text-[#1A3351] outline-none"
                    value={formData.data_emissao}
                    onChange={(e) =>
                      setFormData((current) => ({
                        ...current,
                        data_emissao: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-none">
                <p className="text-[11px] font-bold text-amber-700 uppercase">
                  Use esta tela para corrigir portarias históricas que receberam
                  numeração automática incorreta.
                </p>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={handlePreview}
                  className="px-8 py-3 bg-[#1A3351] text-white font-bold uppercase text-[10px] rounded-none shadow-lg hover:brightness-110 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Visualizar PDF
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="px-8 py-3 bg-emerald-600 text-white font-bold uppercase text-[10px] rounded-none shadow-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Correção
                </button>
              </div>
            </div>

            <div className="bg-white p-6 shadow-xl border-l-4 border-slate-400 rounded-none">
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-widest">
                Auditoria de Numeração
              </h3>
              {auditRecords.length > 0 ? (
                <div className="space-y-3">
                  {auditRecords.map((audit) => (
                    <div
                      key={audit.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-none"
                    >
                      <p className="text-[10px] font-bold text-[#1A3351] uppercase">
                        {audit.operation || "UPDATE"} •{" "}
                        {new Date(audit.changed_at).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-[11px] text-slate-600 uppercase mt-2">
                        {audit.old_numero ?? "---"} →{" "}
                        {audit.new_numero ?? "---"}/{audit.ano ?? "---"}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase mt-1">
                        Alterado por: {audit.changed_by || "SISTEMA"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 uppercase">
                  Ainda não há histórico de alteração para esta portaria.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
