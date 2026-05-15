"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Printer,
  Loader2,
  FileText,
  Eye,
  PlusCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import CompactFilterBar from "@/components/filters/CompactFilterBar";
import FilterChips from "@/components/filters/FilterChips";
import ActionIconButton from "@/components/filters/ActionIconButton";
import SortAlphaToggle from "@/components/filters/SortAlphaToggle";
import {
  countActiveFilters,
  normalizeSearchTerm,
} from "@/components/filters/filtersUtils";
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
  servidor_sexo?: "F" | "M" | undefined;
}

export default function AfastamentoPortariasPage() {
  const formatDate = (d: string) => {
    if (!d) return "";
    const p = d.split("-");
    if (p.length !== 3) return new Date(d).toLocaleDateString("pt-BR");
    return new Date(
      parseInt(p[0]),
      parseInt(p[1]) - 1,
      parseInt(p[2]),
    ).toLocaleDateString("pt-BR");
  };
  const [records, setRecords] = useState<PortariaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [portariaNumeroTerm, setPortariaNumeroTerm] = useState("");
  const [portariaAnoTerm, setPortariaAnoTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"numero" | "alpha">("numero");
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
            if (
              data.role !== "admin" &&
              data.role !== "nurse" &&
              data.role !== "analytic_manager"
            ) {
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

  const clearAllFilters = () => {
    setSearchTerm("");
    setPortariaNumeroTerm("");
    setPortariaAnoTerm("");
  };

  const headerActiveFilterCount =
    countActiveFilters({ searchTerm }) +
    (portariaNumeroTerm.trim() ? 1 : 0) +
    (portariaAnoTerm.trim() ? 1 : 0);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const normalizedNumero = portariaNumeroTerm.trim();
    const normalizedAno = portariaAnoTerm.trim();

    return records.filter((r: PortariaRecord) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        r.servidor_nome.toLowerCase().includes(normalizedSearch) ||
        r.servidor_matricula.toLowerCase().includes(normalizedSearch) ||
        r.servidor_secretaria.toLowerCase().includes(normalizedSearch) ||
        r.tipo_afastamento.toLowerCase().includes(normalizedSearch);

      const matchesNumero =
        normalizedNumero.length === 0 ||
        r.numero.toString().includes(normalizedNumero);

      const matchesAno =
        normalizedAno.length === 0 || r.ano.toString().includes(normalizedAno);

      return matchesSearch && matchesNumero && matchesAno;
    });
  }, [records, searchTerm, portariaNumeroTerm, portariaAnoTerm]);

  const sortedRecords = useMemo(() => {
    const base = [...filteredRecords];
    if (sortOrder === "alpha") {
      return base.sort((a, b) =>
        a.servidor_nome.localeCompare(b.servidor_nome, "pt-BR"),
      );
    }

    return base.sort((a, b) => {
      if (b.ano !== a.ano) return b.ano - a.ano;
      return b.numero - a.numero;
    });
  }, [filteredRecords, sortOrder]);

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
        sexo: record.servidor_sexo as "F" | "M" | undefined,
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
        <section className="bg-[#B0B0B0] p-2.5 sm:p-4 lg:p-6 py-3 border-b-[6px] border-emerald-500 shrink-0 shadow-lg font-sans">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:flex-nowrap md:gap-3">
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 shrink-0 text-[#1A3351]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 lg:w-6 h-5 lg:h-6" />
                <div>
                  <h2 className="text-[15px] sm:text-lg md:text-xl font-bold leading-none uppercase tracking-tight">
                    Portarias de Afastamento
                  </h2>
                  <p className="text-[8px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                    Digital Ledger • Portarias Oficiais
                  </p>
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-[#1A3351]/20 shrink-0 hidden md:block" />

            <div className="w-full md:flex-1 md:w-auto min-w-0">
              <CompactFilterBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
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
                searchPlaceholder="BUSCAR POR NOME, MATRÍCULA, SECRETARIA OU TIPO..."
                showUserFilter={false}
                showDateFilter={false}
                showSecretariaFilter={false}
                showAsoTypeFilter={false}
                activeFilterCount={headerActiveFilterCount}
                extraActions={
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Nº"
                        className="h-9 w-20 px-2 bg-white border border-slate-200 shadow-sm text-[10px] font-bold text-center text-[#1A3351] outline-none rounded-none"
                        value={portariaNumeroTerm}
                        onChange={(e) => setPortariaNumeroTerm(e.target.value)}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Ano"
                        className="h-9 w-22 px-2 bg-white border border-slate-200 shadow-sm text-[10px] font-bold text-center text-[#1A3351] outline-none rounded-none"
                        value={portariaAnoTerm}
                        onChange={(e) => setPortariaAnoTerm(e.target.value)}
                      />
                    </div>
                    {userRole !== "analytic_manager" ? (
                      <ActionIconButton
                        icon={<PlusCircle className="w-4 h-4" />}
                        label="Nova portaria"
                        variant="success"
                        onClick={() => router.push("/afastamentos/new")}
                      />
                    ) : undefined}
                  </>
                }
              />
            </div>
          </div>

          <div className="mt-3">
            <FilterChips
              searchTerm={normalizeSearchTerm(searchTerm)}
              startDate=""
              endDate=""
              filterUser="all"
              filterSecretaria="all"
              filterAsoType="all"
              referrals={[]}
              operatorsMap={{}}
              extraChips={[
                ...(portariaNumeroTerm.trim()
                  ? [
                      {
                        key: "numero",
                        label: `Portaria: ${portariaNumeroTerm.trim()}`,
                      },
                    ]
                  : []),
                ...(portariaAnoTerm.trim()
                  ? [{ key: "ano", label: `Ano: ${portariaAnoTerm.trim()}` }]
                  : []),
              ]}
            />
          </div>
        </section>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className="bg-white border-2 border-slate-300 shadow-xl rounded-none overflow-visible">
            <div className="bg-[#B0B0B0] px-4 sm:px-6 py-3 border-b-2 border-slate-400 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase text-[#1A3351]">
                Registro de Portarias Geradas
              </h3>
              <SortAlphaToggle
                active={sortOrder === "alpha"}
                onToggle={() =>
                  setSortOrder(sortOrder === "alpha" ? "numero" : "alpha")
                }
                count={sortedRecords.length}
              />
            </div>
            <div className="divide-y divide-slate-100">
              {sortedRecords.length > 0 ? (
                sortedRecords.map((record: PortariaRecord) => (
                  <div
                    key={record.id}
                    className="p-4 lg:px-8 hover:bg-slate-50 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 transition-all"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="p-2 bg-[#1A3351] text-white rounded-none shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-[#1A3351] uppercase text-sm sm:text-base truncate">
                          {record.servidor_nome}
                        </h4>
                        <p className="text-[11px] font-normal text-slate-600 uppercase mt-1 break-words">
                          Matrícula {record.servidor_matricula} • {record.natureza_cargo} • {record.servidor_secretaria}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                          {record.tipo_afastamento} • emitida em {formatDate(record.data_emissao)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 xl:gap-4 shrink-0">
                      <div className="min-w-[124px] border-2 border-[#1A3351] bg-[#1A3351]/5 px-3 py-2 text-center rounded-none">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.18em]">
                          Portaria
                        </p>
                        <p className="text-lg font-bold text-[#1A3351] leading-none mt-1">
                          {record.numero}/{record.ano}
                        </p>
                      </div>
                      <div className="flex gap-2 justify-end">
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
                                sexo: record.servidor_sexo as "F" | "M" | undefined,
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
                  </div>
                ))
              ) : (
                <div className="px-6 py-10 text-center bg-slate-50">
                  <p className="text-sm font-bold text-[#1A3351] uppercase tracking-wide">
                    Nenhuma portaria encontrada com os filtros atuais.
                  </p>
                  <p className="text-[11px] text-slate-500 uppercase mt-2">
                    Ajuste a busca por nome, número ou ano para localizar o registro.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
