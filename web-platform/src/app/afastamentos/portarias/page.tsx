"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Printer, Loader2, FileText, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { handleAuthError, safeGetSession } from "@/lib/auth-utils";
import { generateAfastamentoPDF } from "@/lib/afastamento-portaria-pdf";
import { AfastamentoPortariaJoinRow } from "@/types";

interface PortariaRecord {
  id: number;
  numero: number;
  ano: number;
  afastamento_id: number;
  data_emissao: string;
  created_at: string;
  // Joined fields
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
  servidor_sexo?: string;
}

export default function AfastamentoPortariasPage() {
  const formatDate = (d: string) => {
    if (!d) return "";
    const p = d.split("-");
    if (p.length !== 3) return new Date(d).toLocaleDateString("pt-BR");
    return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])).toLocaleDateString("pt-BR");
  };
  const [records, setRecords] = useState<PortariaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");

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
            if (data.role !== "admin" && data.role !== "nurse" && data.role !== "analytic_manager") {
              router.push("/");
              return;
            }
          }
          const name =
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "Usuário";
          setUserName(name);
        } else {
          router.push("/login");
          return;
        }
        await loadRecords();
      } catch (err) {
        await handleAuthError(err);
      }
    };

    async function loadRecords() {
      setLoading(true);
      // Joins with 'afastamentos' to get server details
      const { data, error } = await supabase
        .from("portarias_afastamento")
        .select(
          `
                  *,
                  afastamentos (
                      servidor_nome,
                      servidor_matricula,
                      natureza_cargo,
                      servidor_secretaria,
                      tipo_afastamento,
                      data_inicio,
                      data_fim,
                      perito_nome,
                      perito_crm,
                      servidor_contrato
                  )
              `,
        )
        .order("numero", { ascending: false });

      if (!error && data) {
        const formatted: PortariaRecord[] = data.map(
          (r: AfastamentoPortariaJoinRow) => ({
            ...r,
            servidor_nome: r.afastamentos.servidor_nome,
            servidor_matricula: r.afastamentos.servidor_matricula,
            natureza_cargo: r.afastamentos.natureza_cargo,
            servidor_secretaria: r.afastamentos.servidor_secretaria,
            tipo_afastamento: r.afastamentos.tipo_afastamento,
            data_inicio: r.afastamentos.data_inicio,
            data_fim: r.afastamentos.data_fim,
            perito_nome: r.afastamentos.perito_nome,
            perito_crm: r.afastamentos.perito_crm,
            servidor_contrato: r.afastamentos.servidor_contrato,
            servidor_sexo: r.afastamentos.servidor_sexo,
          }),
        );
        setRecords(formatted);
      }
      setLoading(false);
    }

    checkAuth();
  }, [router]);

  const filteredRecords = useMemo(() => {
    return records.filter(
      (r: PortariaRecord) =>
        r.servidor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.numero.toString().includes(searchTerm),
    );
  }, [records, searchTerm]);

  const handleViewPDF = (record: PortariaRecord) => {
    generateAfastamentoPDF(
      {
        numero: record.numero,
        ano: record.ano,
        servidor_nome: record.servidor_nome,
        servidor_matricula: record.servidor_matricula,
        servidor_cargo: record.natureza_cargo,
        servidor_lotacao: record.servidor_secretaria,
        tipo_afastamento: record.tipo_afastamento,
        data_inicio: formatDate(record.data_inicio),
        data_fim: formatDate(record.data_fim),
        data_portaria: formatDate(record.data_emissao),
        perito_nome: record.perito_nome,
        perito_crm: record.perito_crm,
        servidor_contrato: record.servidor_contrato,
        sexo: record.servidor_sexo,
      },
      "view",
    );
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#D3D3D3] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-[#1A3351] uppercase tracking-[0.3em] font-bold text-xs">
          Carregando Portarias...
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

      <main className="flex-1 flex flex-col bg-[#D3D3D3] min-h-screen lg:h-screen lg:overflow-visible">
        {/* HEADER */}
        <section className="bg-[#B0B0B0] p-4 lg:p-6 py-3 border-b-[6px] border-emerald-500 shrink-0 shadow-lg font-sans">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
            <div className="flex items-center gap-3 text-[#1A3351]">
              <FileText className="w-6 h-6" />
              <h2 className="text-xl font-bold uppercase tracking-tight">
                Portarias de Afastamento
              </h2>
            </div>
            {userRole !== "analytic_manager" && (
              <button
                onClick={() => router.push("/afastamentos/new")}
                className="bg-emerald-600 text-white px-6 py-2 rounded-none font-bold text-[10px] uppercase shadow-md w-full sm:w-auto"
              >
                Nova Portaria
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="BUSCAR POR NOME OU Nº DA PORTARIA..."
              className="w-full px-10 py-2.5 border border-[#888] shadow-inner text-sm font-bold bg-[#E8E8E8] outline-none uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </section>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className="bg-white border-2 border-slate-300 shadow-xl rounded-none overflow-visible">
            <div className="bg-[#B0B0B0] px-6 py-4 border-b-2 border-slate-400">
              <h3 className="text-sm font-bold uppercase text-[#1A3351]">
                Registro de Portarias Geradas
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredRecords.map((record: PortariaRecord) => (
                <div
                  key={record.id}
                  className="p-4 lg:px-8 hover:bg-slate-50 flex flex-col lg:flex-row justify-between items-center gap-4 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#1A3351] text-white rounded-none">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A3351] uppercase">
                        {record.servidor_nome}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Portaria Nº {record.numero}/{record.ano} •{" "}
                        {record.tipo_afastamento}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewPDF(record)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1A3351] text-white text-[10px] font-bold uppercase rounded-none shadow hover:brightness-110"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver PDF
                    </button>
                    <button
                      onClick={() => {
                        generateAfastamentoPDF(
                          {
                            numero: record.numero,
                            ano: record.ano,
                            servidor_nome: record.servidor_nome,
                            servidor_matricula: record.servidor_matricula,
                            servidor_cargo: record.natureza_cargo,
                            servidor_lotacao: record.servidor_secretaria,
                            tipo_afastamento: record.tipo_afastamento,
                            data_inicio: formatDate(record.data_inicio),
                            data_fim: formatDate(record.data_fim),
                            data_portaria: formatDate(record.data_emissao),
                            perito_nome: record.perito_nome,
                            perito_crm: record.perito_crm,
                            servidor_contrato: record.servidor_contrato,
                            sexo: record.servidor_sexo,
                          },
                          "download",
                        );
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[10px] font-bold uppercase rounded-none shadow hover:brightness-110"
                    >
                      <Printer className="w-3.5 h-3.5" /> Baixar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
