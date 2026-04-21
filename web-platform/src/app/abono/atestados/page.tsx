"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import {
  Menu,
  FileText,
  Users,
  Clock3,
  RefreshCcw,
  Calendar,
  X,
  Info,
} from "lucide-react";
import ActionIconButton from "@/components/filters/ActionIconButton";
import { supabase } from "@/lib/supabase";
import { getCIDDetailsFromDB, normalizeCID } from "@/lib/cid-utils";
import { safeGetSession, handleAuthError, syncProfile } from "@/lib/auth-utils";
import StatisticCard from "@/components/statistics/StatisticCard";
import StatisticCardRow from "@/components/statistics/StatisticCardRow";

export default function AtestadosPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuário");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [expandedCargos, setExpandedCargos] = useState<Set<string>>(new Set());

  const toggleCargoExpansion = (id: string) => {
    setExpandedCargos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  type TabId =
    | "visao-geral"
    | "cid-e-capitulos"
    | "visao-ocupacional"
    | "casos-recorrencia";

  const TABS: { id: TabId; title: string }[] = [
    { id: "visao-geral", title: "Visão Geral" },
    { id: "cid-e-capitulos", title: "CID e Capítulos" },
    { id: "visao-ocupacional", title: "Visão Ocupacional" },
    { id: "casos-recorrencia", title: "Casos e Recorrência" },
  ];

  const [activeTab, setActiveTab] = useState<TabId>("visao-geral");

  const fetchData = async (sd?: string, ed?: string) => {
    setLoading(true);
    try {
      // Supabase/PostgREST pode limitar a 1000 rows por requisição.
      // Fazemos fetch em lotes (batch) para obter todo o conjunto e
      // manter os cálculos de métricas no cliente.
      const BATCH = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const sdVal = typeof sd === "string" ? sd : startDate;
        const edVal = typeof ed === "string" ? ed : endDate;
        let q: any = supabase.from("atestados_import").select("*");
        if (sdVal) q = q.gte("periodo", sdVal);
        if (edVal) q = q.lte("periodo", edVal);
        q = q.order("nome", { ascending: true }).range(from, from + BATCH - 1);

        const { data, error } = await q;
        if (error) {
          console.error("Erro ao buscar atestados (batch):", error);
          all.length = 0;
          break;
        }
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < BATCH) break;
        from += BATCH;
      }
      setRows(all);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { session, error } = await safeGetSession();
        if (error) {
          await handleAuthError(error);
          return;
        }
        if (session) {
          const role = await syncProfile(session);
          setUserRole(role);
          const name =
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "Usuário";
          setUserName(name);
        } else {
          router.push("/login");
          return;
        }
      } catch (err) {
        await handleAuthError(err);
        return;
      }

      // fetch após autenticação para garantir sessão válida
      await fetchData();
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    const total = rows.length;
    const employees = new Set(rows.map((r) => String(r.matricula))).size;
    const totalDays = rows.reduce((s, r) => s + (Number(r.qtde_dias) || 0), 0);
    const avgDays = total ? (totalDays / total).toFixed(2) : "0";

    const cidMap: Record<string, { count: number; days: number }> = {};
    rows.forEach((r) => {
      const raw = r.cid || "";
      const cid =
        raw && String(raw).trim().length > 0 ? String(raw).trim() : "SEM CID";
      const entry = cidMap[cid] || { count: 0, days: 0 };
      entry.count += 1;
      entry.days += Number(r.qtde_dias) || 0;
      cidMap[cid] = entry;
    });

    const topCid = Object.entries(cidMap)
      .map(([cid, v]) => ({ cid, count: v.count, days: v.days }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return { total, employees, totalDays, avgDays, topCid };
  }, [rows]);

  const [cidDetailsMap, setCidDetailsMap] = useState<
    Record<string, { desc: string; chapter: string }>
  >({});

  // Fetch CID descriptions for the top CIDs shown in the first block
  useEffect(() => {
    const originalCodes = metrics.topCid
      .map((t) => String(t.cid))
      .filter((c) => c && c !== "SEM CID");
    const normalizedKeys = Array.from(
      new Set(originalCodes.map((c) => normalizeCID(c))),
    );
    if (normalizedKeys.length === 0) {
      setCidDetailsMap({});
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const results = await Promise.all(
          normalizedKeys.map(async (nkey) => {
            try {
              const details = await getCIDDetailsFromDB(nkey);
              return {
                nkey,
                desc: details.desc || "—",
                chapter: details.chapter || details.chapter_desc || "—",
              };
            } catch (e) {
              return { nkey, desc: "—", chapter: "—" };
            }
          }),
        );

        if (cancelled) return;
        const map: Record<string, { desc: string; chapter: string }> = {};
        results.forEach(
          (r) => (map[r.nkey] = { desc: r.desc, chapter: r.chapter }),
        );
        setCidDetailsMap(map);
      } catch (e) {
        if (!cancelled) setCidDetailsMap({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(metrics.topCid.map((t) => normalizeCID(String(t.cid))))]);

  const filteredRows = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const fields = [
        r.matricula,
        r.nome,
        r.nome_cargo,
        r.cid,
        r.local_de_trabalho,
        r.nome_unidade,
      ]
        .map((v) => (v || "") + "")
        .join(" ")
        .toLowerCase();
      return fields.includes(term);
    });
  }, [rows, searchTerm]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F3F4F6] text-black font-sans overflow-x-hidden">
      <Sidebar
        userRole={userRole}
        userName={userName}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <main className="flex-1 flex flex-col bg-[#F3F4F6] min-h-screen lg:h-screen lg:overflow-visible relative">
        {showMethodology && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMethodology(false)}
            />
            <div className="relative bg-white w-full max-w-3xl rounded-none shadow-2xl overflow-hidden border-2 border-[#1A3351] animate-in fade-in zoom-in duration-300">
              <div className="bg-[#1A3351] px-4 py-1.5 text-white relative flex justify-between items-center border-b-2 border-[#E31E24]">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-[#E31E24]" />
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                    Metodologia: Risco de Absenteísmo (Atestados)
                  </h2>
                </div>
                <button
                  onClick={() => setShowMethodology(false)}
                  className="h-5 w-5 rounded-none bg-white/5 flex items-center justify-center hover:bg-[#E31E24] transition-all border border-white/10"
                >
                  <span className="text-base font-light leading-none">×</span>
                </button>
              </div>

              <div className="p-4 font-sans text-black">
                <div className="border border-slate-200 rounded-none overflow-hidden mb-4">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-500 tracking-widest">
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-2 w-[80px] text-center border-r border-slate-200">
                          Peso
                        </th>
                        <th className="px-3 py-2 w-[180px] border-r border-slate-200">
                          Indicador Estrutural
                        </th>
                        <th className="px-3 py-2">Descrição Técnica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        {
                          weight: "20%",
                          label: "Concentração CID F",
                          desc: "Prevalência de afastamentos por transtornos mentais (F) em relação ao total de eventos clínicos compatíveis.",
                        },
                        {
                          weight: "20%",
                          label: "Exposição Estimada",
                          desc: "Média de escores em avaliações e questionários de vigilância ativa (NR-1/PGR).",
                        },
                        {
                          weight: "5%",
                          label: "Recorrência",
                          desc: "Fração de servidores com episódios repetidos no período. Usado como sinal sentinela complementar.",
                        },
                        {
                          weight: "5%",
                          label: "Tendência Temporal",
                          desc: "Razão de evolução da patologia entre a primeira e segunda metade do período monitorado.",
                        },
                        {
                          weight: "50%",
                          label: "Morbidade Relativa (DEA)",
                          desc: "Impacto absoluto do grupo em relação ao pior caso da mesma Secretaria: combina dias perdidos (70%) e volume de servidores afetados (30%).",
                        },
                      ].map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-3 py-1 text-center border-r border-slate-100">
                            <span className="text-[11px] font-normal text-[#E31E24] tabular-nums">
                              {row.weight}
                            </span>
                          </td>
                          <td className="px-3 py-1 border-r border-slate-100">
                            <div className="text-[10px] font-normal text-slate-900 uppercase tracking-tighter leading-none">
                              {row.label}
                            </div>
                          </td>
                          <td className="px-3 py-1">
                            <p className="text-[10px] text-slate-700 leading-tight font-normal">
                              {row.desc}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mb-4">
                  <p className="text-[9px] text-slate-500 uppercase tracking-tight text-center mb-2">
                    Matriz de Soma Ponderada aplicada aos registros de
                    atestados.
                  </p>
                  <div className="w-full bg-slate-50 p-3 border border-slate-200 text-center">
                    <p className="text-[11px] font-bold text-[#1A3351] uppercase mb-1.5 tracking-wider">
                      Algoritmo de Risco: Matriz Ponderada
                    </p>
                    <p className="text-[10px] text-slate-900 leading-none font-sans">
                      Score = (Severidade × 0.30) + (Concentração CID × 0.25) +
                      (Impacto Operacional × 0.20) + (Recorrência × 0.15) +
                      (Tendência × 0.10)
                    </p>
                    <p className="text-[10px] text-slate-700 mt-2">
                      Classificação: ≥75% — Crítico; 50–74% — Alto; &lt;50% —
                      Moderado.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowMethodology(false)}
                    className="px-5 py-2 bg-[#1A3351] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-none shadow-md hover:bg-[#E31E24] transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-[8px] font-bold text-[#1A3351]/40 uppercase tracking-widest leading-none">
                  SESMT SYSTEM · GOVERNANÇA DIGITAL
                </span>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Powered by
                  </span>
                  <div className="flex items-start">
                    <span className="text-[12px] font-black text-slate-900 tracking-[0.10em] uppercase leading-none">
                      UXBRAS
                    </span>
                    <span className="text-[10px] font-bold text-slate-900 ml-[1px]">
                      ®
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <section className="bg-white px-4 py-3 border-b-[6px] border-[#1A3351]">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold uppercase text-[#1A3351]">
              Atestados — Análise Rápida
            </h1>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-3">
                {startDate || endDate ? (
                  <div className="inline-flex items-center h-9 px-3 bg-[#1A3351]/10 border border-[#1A3351]/20 text-base font-bold text-[#1A3351] uppercase tracking-wide rounded-none">
                    <span className="px-2">
                      {startDate || "..."} → {endDate || "..."}
                    </span>
                    <button
                      onClick={async () => {
                        setStartDate("");
                        setEndDate("");
                        await fetchData("", "");
                      }}
                      aria-label="Limpar período"
                      title="Limpar período"
                      className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-sm text-[#1A3351] hover:bg-[#1A3351]/20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : null}

                <ActionIconButton
                  icon={<Calendar className="w-4 h-4" />}
                  label="Período"
                  variant="filter"
                  open={isDateFilterOpen}
                  onToggle={setIsDateFilterOpen}
                  active={Boolean(startDate || endDate)}
                >
                  <div className="bg-white border border-slate-200 shadow-2x shadow-slate-300 w-72 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">
                        Data Inicial
                      </span>
                      <input
                        type="date"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-[11px] font-bold uppercase outline-none focus:border-[#1A3351] transition-colors"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">
                        Data Final
                      </span>
                      <input
                        type="date"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-[11px] font-bold uppercase outline-none focus:border-[#1A3351] transition-colors"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={async () => {
                          setStartDate("");
                          setEndDate("");
                          setIsDateFilterOpen(false);
                          await fetchData("", "");
                        }}
                        className="flex-1 h-9 border border-slate-200 text-[9px] font-bold uppercase text-slate-500 hover:text-[#E31E24] hover:bg-red-50 hover:border-red-100 transition-all"
                      >
                        Limpar
                      </button>
                      <button
                        onClick={() => {
                          setIsDateFilterOpen(false);
                          fetchData();
                        }}
                        className="flex-1 h-9 bg-[#1A3351] text-white text-[9px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md"
                      >
                        Consultar
                      </button>
                    </div>
                  </div>
                </ActionIconButton>
              </div>

              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 bg-[#1A3351] rounded-none text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </section>

        <div className="p-6">
          <div className="bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#B0B0B0] px-4 sm:px-6 py-2.5 border-b-2 border-slate-400 flex items-center justify-between gap-3 flex-wrap min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A3351]">
                Núcleo Analítico Atestados
              </h3>
              <div className="w-full sm:w-auto min-w-0 max-w-full flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 h-8 px-3 border text-[10px] font-bold uppercase tracking-wide transition-all ${
                      activeTab === tab.id
                        ? "bg-[#1A3351] text-white border-[#1A3351]"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {activeTab === "visao-geral" && (
                <>
                  <StatisticCardRow columns={4} className="mb-4">
                    <StatisticCard
                      title="Total Atestados"
                      value={metrics.total}
                      helperText="Registros importados"
                      icon={<FileText className="w-6 h-6" />}
                      accent="primary"
                    />
                    <StatisticCard
                      title="Colaboradores"
                      value={metrics.employees}
                      helperText="Colaboradores distintos"
                      icon={<Users className="w-6 h-6" />}
                      accent="info"
                    />
                    <StatisticCard
                      title="Total de Dias"
                      value={metrics.totalDays}
                      helperText="Dias perdidos somados"
                      icon={<Clock3 className="w-6 h-6" />}
                      accent="warning"
                    />
                    <StatisticCard
                      title="Média por Registro"
                      value={metrics.avgDays}
                      helperText="Dias médios"
                      icon={<Clock3 className="w-6 h-6" />}
                      accent="neutral"
                    />
                  </StatisticCardRow>

                  <div>
                    <h2 className="text-sm font-bold text-slate-700 uppercase mb-2">
                      Top CIDs
                    </h2>
                    {loading ? (
                      <div className="py-6 text-center text-slate-500">
                        Carregando...
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-[11px] uppercase text-slate-400 border-b">
                              <th className="py-2 px-3">CID</th>
                              <th className="py-2 px-3">Descrição</th>
                              <th className="py-2 px-3">Capítulo</th>
                              <th className="py-2 px-3">Registros</th>
                              <th className="py-2 px-3">Dias Perdidos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.topCid.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-4 text-slate-500">
                                  Nenhum dado disponível para o período
                                  selecionado.
                                </td>
                              </tr>
                            ) : (
                              metrics.topCid.map((t) => {
                                const key = normalizeCID(String(t.cid || ""));
                                return (
                                  <tr key={t.cid} className="text-sm border-b">
                                    <td className="py-2 px-3">{t.cid}</td>
                                    <td className="py-2 px-3">
                                      {cidDetailsMap[key]?.desc || "—"}
                                    </td>
                                    <td className="py-2 px-3">
                                      {cidDetailsMap[key]?.chapter || "—"}
                                    </td>
                                    <td className="py-2 px-3">{t.count}</td>
                                    <td className="py-2 px-3">{t.days}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="search"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                          }}
                          placeholder="Buscar matrícula, nome, CID ou unidade..."
                          className="h-9 px-3 border rounded-none text-sm"
                        />
                        <div className="text-sm text-slate-500">
                          Total filtrados: {filteredRows.length}
                        </div>
                      </div>
                      <div className="text-sm text-slate-500">
                        Mostrando {pageRows.length} registros
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-[11px] uppercase text-slate-400 bg-slate-50">
                          <tr>
                            <th className="py-2 px-3">Matrícula</th>
                            <th className="py-2 px-3">Nome</th>
                            <th className="py-2 px-3">Cargo</th>
                            <th className="py-2 px-3">CID</th>
                            <th className="py-2 px-3">Dias</th>
                            <th className="py-2 px-3">Período</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((r: any, idx: number) => (
                            <tr
                              key={`${r.matricula}-${r.periodo}-${idx}`}
                              className="text-sm border-b"
                            >
                              <td className="py-2 px-3">{r.matricula}</td>
                              <td className="py-2 px-3">{r.nome}</td>
                              <td className="py-2 px-3">{r.nome_cargo}</td>
                              <td className="py-2 px-3">
                                {r.cid || "SEM CID"}
                              </td>
                              <td className="py-2 px-3">{r.qtde_dias ?? ""}</td>
                              <td className="py-2 px-3">
                                {r.periodo ?? r.dt_admissao ?? ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="text-sm text-slate-500">
                        Página {page} de {pageCount}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1 border rounded-none"
                          disabled={page <= 1}
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() =>
                            setPage((p) => Math.min(pageCount, p + 1))
                          }
                          className="px-3 py-1 border rounded-none"
                          disabled={page >= pageCount}
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab !== "visao-geral" && (
                <>
                  <div className="text-sm font-bold text-slate-700 uppercase">
                    {activeTab === "cid-e-capitulos"
                      ? "CID e Capítulos"
                      : activeTab === "visao-ocupacional"
                        ? "Visão Ocupacional"
                        : "Casos e Recorrência"}
                  </div>
                  <p className="text-sm text-slate-500">
                    Visão alternativa (mesmos dados de Atestados). Nesta aba os
                    componentes e layouts seguem o padrão analítico; a fonte dos
                    dados é a tabela <strong>atestados_import</strong>.
                  </p>

                  <StatisticCardRow columns={4} className="my-4">
                    <StatisticCard
                      title="Total Atestados"
                      value={metrics.total}
                      helperText="Registros importados"
                      icon={<FileText className="w-6 h-6" />}
                      accent="primary"
                    />
                    <StatisticCard
                      title="Colaboradores"
                      value={metrics.employees}
                      helperText="Colaboradores distintos"
                      icon={<Users className="w-6 h-6" />}
                      accent="info"
                    />
                    <StatisticCard
                      title="Total de Dias"
                      value={metrics.totalDays}
                      helperText="Dias perdidos somados"
                      icon={<Clock3 className="w-6 h-6" />}
                      accent="warning"
                    />
                    <StatisticCard
                      title="Média por Registro"
                      value={metrics.avgDays}
                      helperText="Dias médios"
                      icon={<Clock3 className="w-6 h-6" />}
                      accent="neutral"
                    />
                  </StatisticCardRow>

                  {activeTab === "cid-e-capitulos" ? (
                    <div className="space-y-6 pb-20">
                      <div className="grid grid-cols-1 gap-6">
                        <div className="bg-white border-2 border-slate-200 shadow-lg overflow-hidden">
                          <div className="bg-[#1A3351] px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">
                              Capítulo CID Dominante
                            </h4>
                            <span className="text-[9px] text-white/50 font-bold uppercase">
                              Vigilância Atestados
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-[#1A3351] text-[12px] font-bold uppercase border-b border-slate-200">
                                  <th className="px-3 py-1 border-r border-slate-200 w-56">
                                    Cargo / PGR
                                  </th>
                                  <th className="px-4 py-1 border-r border-slate-200">
                                    Unidade / Local
                                  </th>
                                  <th className="px-4 py-1 border-r border-slate-200 w-[120px]">
                                    CIDS PRINCIPAIS
                                  </th>
                                  <th className="px-4 py-1 text-right w-[60px]">
                                    Freq.
                                  </th>
                                  <th className="px-4 py-1 text-right w-[80px]">
                                    Dias
                                  </th>
                                  <th className="px-4 py-1 text-center w-[140px] relative group overflow-visible">
                                    <div className="flex items-center justify-center gap-1.5 py-1">
                                      Risco de Absenteísmo
                                      <button
                                        title="Clique para ver o detalhamento do cálculo"
                                        onClick={() => setShowMethodology(true)}
                                        className="flex items-center justify-center transition-all"
                                      >
                                        <Info className="w-4 h-4 text-[#E31E24] hover:text-[#c4191f] cursor-pointer animate-pulse-subtle active:scale-90" />
                                      </button>
                                    </div>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(() => {
                                  const groups = rows.reduce(
                                    (acc: Record<string, any>, r: any) => {
                                      const secKey =
                                        (
                                          r.nome_divisao ||
                                          r.nome_unidade ||
                                          "SEM SECRETARIA"
                                        )
                                          ?.toString()
                                          .trim() || "SEM SECRETARIA";
                                      if (!acc[secKey]) {
                                        acc[secKey] = {
                                          name: secKey,
                                          maxScore: 0,
                                          cargos: {},
                                        };
                                      }

                                      const sec = acc[secKey];
                                      const cargoKey = (r.nome_cargo || "---")
                                        .toString()
                                        .trim();
                                      if (!sec.cargos[cargoKey]) {
                                        sec.cargos[cargoKey] = {
                                          cargo: cargoKey,
                                          unidades: new Set<string>(),
                                          cids: new Set<string>(),
                                          totalWeight: 0,
                                          totalDays: 0,
                                          maxScore: 0,
                                          impactedServerCount: 0,
                                        };
                                      }

                                      const c = sec.cargos[cargoKey];
                                      const unidadeLabel =
                                        (r.local_de_trabalho &&
                                          String(r.local_de_trabalho).trim()) ||
                                        (r.nome_unidade &&
                                          String(r.nome_unidade).trim());
                                      if (unidadeLabel)
                                        c.unidades.add(unidadeLabel);
                                      const rawCid = (r.cid || "")
                                        .toString()
                                        .trim();
                                      if (rawCid)
                                        c.cids.add(normalizeCID(rawCid));
                                      const weight = rawCid ? 1 : 0;
                                      c.totalWeight += weight;
                                      c.totalDays += Number(r.qtde_dias) || 0;
                                      c.impactedServerCount += 1;

                                      return acc;
                                    },
                                    {} as Record<string, any>,
                                  );

                                  const sortedSecretarias = Object.values(
                                    groups,
                                  ).sort((a: any, b: any) => {
                                    const totalA = Object.values(
                                      a.cargos,
                                    ).reduce(
                                      (s: number, c: any) =>
                                        s + (c.impactedServerCount || 0),
                                      0,
                                    );
                                    const totalB = Object.values(
                                      b.cargos,
                                    ).reduce(
                                      (s: number, c: any) =>
                                        s + (c.impactedServerCount || 0),
                                      0,
                                    );
                                    if (totalB !== totalA)
                                      return totalB - totalA;
                                    return b.maxScore - a.maxScore;
                                  });

                                  return sortedSecretarias.map(
                                    (sec: any, secIdx: number) => {
                                      const cargosArr = Object.values(
                                        sec.cargos,
                                      );
                                      const maxDays = cargosArr.reduce(
                                        (m: number, c: any) =>
                                          Math.max(m, c.totalDays || 0),
                                        0,
                                      );
                                      const maxWeight = cargosArr.reduce(
                                        (m: number, c: any) =>
                                          Math.max(m, c.totalWeight || 0),
                                        0,
                                      );

                                      cargosArr.forEach((c: any) => {
                                        const weightPct =
                                          maxWeight > 0
                                            ? c.totalWeight / maxWeight
                                            : 0;
                                        const daysPct =
                                          maxDays > 0
                                            ? c.totalDays / maxDays
                                            : 0;
                                        c.maxScore = Math.round(
                                          (weightPct * 0.6 + daysPct * 0.4) *
                                            100,
                                        );
                                        sec.maxScore = Math.max(
                                          sec.maxScore,
                                          c.maxScore,
                                        );
                                      });

                                      return (
                                        <React.Fragment key={secIdx}>
                                          <tr className="bg-slate-100/90 border-t-2 border-slate-300">
                                            <td
                                              colSpan={6}
                                              className="px-4 py-3 border-y border-slate-200"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                  <div
                                                    className={`w-2 h-5 ${sec.maxScore >= 75 ? "bg-[#E31E24]" : "bg-[#1A3351]"}`}
                                                  ></div>
                                                  <span className="text-[14px] font-black text-[#1A3351] uppercase tracking-normal">
                                                    {sec.name}
                                                  </span>
                                                  <span className="text-[9px] font-bold text-slate-400 border-l border-slate-300 pl-3 ml-1 uppercase tracking-tight">
                                                    {
                                                      Object.values(
                                                        sec.cargos,
                                                      ).filter(
                                                        (c: any) =>
                                                          c.impactedServerCount >
                                                          0,
                                                      ).length
                                                    }{" "}
                                                    CARGOS EM ALERTA
                                                  </span>
                                                </div>
                                                <div className="flex items-center">
                                                  <div className="px-3 py-1 bg-[#1A3351] text-white text-[10px] font-black rounded shadow-sm">
                                                    SCORE MÁXIMO:{" "}
                                                    {sec.maxScore.toFixed(0)}%
                                                  </div>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>

                                          {Object.values(sec.cargos)
                                            .sort((a: any, b: any) => {
                                              const diff =
                                                b.maxScore - a.maxScore;
                                              if (diff !== 0) return diff;
                                              return b.totalDays - a.totalDays;
                                            })
                                            .map((cargo: any, i: number) => {
                                              const rowId = `${sec.name}-${cargo.cargo}`;
                                              const isExpanded =
                                                expandedCargos.has(rowId);
                                              const unidadesList = Array.from(
                                                cargo.unidades as Set<string>,
                                              ).sort((a: string, b: string) =>
                                                a.localeCompare(b),
                                              );
                                              const displayedUnits = isExpanded
                                                ? unidadesList
                                                : unidadesList.slice(0, 3);

                                              return (
                                                <tr
                                                  key={i}
                                                  className="hover:bg-slate-50 text-[11px] border-b border-slate-200 last:border-0 transition-all"
                                                >
                                                  <td className="px-3 py-1 align-middle w-56">
                                                    <div className="text-[#1A3351] uppercase leading-tight text-sm tracking-tight whitespace-nowrap">
                                                      {cargo.cargo}
                                                      <span className="ml-2 text-xs font-medium">
                                                        (
                                                        {
                                                          cargo.impactedServerCount
                                                        }{" "}
                                                        casos)
                                                      </span>
                                                    </div>
                                                  </td>
                                                  <td className="px-3 py-1 align-middle max-w-[280px]">
                                                    <div className="flex flex-col gap-0.5">
                                                      {displayedUnits.map(
                                                        (
                                                          unidade: string,
                                                          idx: number,
                                                        ) => (
                                                          <div
                                                            key={idx}
                                                            className="text-[11px] text-slate-700 leading-tight font-normal truncate"
                                                            title={unidade}
                                                          >
                                                            {unidade}
                                                          </div>
                                                        ),
                                                      )}
                                                      {unidadesList.length >
                                                        3 && (
                                                        <button
                                                          onClick={() =>
                                                            toggleCargoExpansion(
                                                              rowId,
                                                            )
                                                          }
                                                          className="text-[10px] text-[#1A3351] font-bold mt-1 uppercase tracking-tighter hover:underline flex items-center gap-1"
                                                        >
                                                          {isExpanded
                                                            ? "▲ RECOLHER LISTA"
                                                            : `▼ + ${unidadesList.length - 3} UNIDADES ADICIONAIS (VER TODAS)`}
                                                        </button>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-3 py-1 align-middle">
                                                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                                                      {Array.from(
                                                        cargo.cids as Set<string>,
                                                      )
                                                        .slice(0, 5)
                                                        .map(
                                                          (
                                                            cid: string,
                                                            idx: number,
                                                          ) => (
                                                            <span
                                                              key={idx}
                                                              className="text-slate-800 text-[11px] font-normal"
                                                            >
                                                              {cid}
                                                            </span>
                                                          ),
                                                        )}
                                                      {cargo.cids.size > 5 && (
                                                        <span className="text-[10px] text-slate-500 font-bold">
                                                          +{cargo.cids.size - 5}
                                                        </span>
                                                      )}
                                                      {cargo.cids.size ===
                                                        0 && (
                                                        <span className="text-[10px] text-slate-400 italic">
                                                          N/A
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-2 text-right tabular-nums text-slate-700 font-normal text-[12px] align-middle">
                                                    {cargo.totalWeight.toFixed(
                                                      1,
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-2 text-right tabular-nums text-slate-800 text-[13px] align-middle">
                                                    {(
                                                      cargo.totalDays || 0
                                                    ).toLocaleString("pt-BR")}
                                                  </td>
                                                  <td className="px-4 py-2 align-middle">
                                                    <div className="flex flex-col gap-1 w-[140px]">
                                                      <div className="flex justify-between text-[11px] font-normal uppercase">
                                                        <span
                                                          className={`text-[13px] ${cargo.maxScore >= 50 ? "text-[#E31E24]" : "text-slate-800"}`}
                                                        >
                                                          {cargo.maxScore.toFixed(
                                                            0,
                                                          )}
                                                          %
                                                        </span>
                                                        <span className="text-slate-800 font-normal">
                                                          {cargo.maxScore >= 75
                                                            ? "Crítico"
                                                            : cargo.maxScore >=
                                                                50
                                                              ? "Alto"
                                                              : "Moderado"}
                                                        </span>
                                                      </div>
                                                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                                        <div
                                                          className={`${cargo.maxScore >= 75 ? "bg-[#E31E24]" : cargo.maxScore >= 50 ? "bg-orange-500" : "bg-blue-400"} h-full transition-all duration-700`}
                                                          style={{
                                                            width: `${cargo.maxScore}%`,
                                                          }}
                                                        />
                                                      </div>
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                        </React.Fragment>
                                      );
                                    },
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-slate-50 p-3 border-t border-slate-200">
                            <p className="text-[9px] text-slate-400 font-medium">
                              <span className="font-bold text-slate-500">
                                DIRETRIZES:
                              </span>{" "}
                              Este painel apresenta agregações por
                              Secretaria/Cargo usando os registros de{" "}
                              <strong>atestados_import</strong>.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[11px] uppercase text-slate-400 border-b">
                            <th className="py-2 px-3">CID</th>
                            <th className="py-2 px-3">Descrição</th>
                            <th className="py-2 px-3">Capítulo</th>
                            <th className="py-2 px-3">Registros</th>
                            <th className="py-2 px-3">Dias Perdidos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.topCid.map((t) => {
                            const key = normalizeCID(String(t.cid || ""));
                            return (
                              <tr key={t.cid} className="text-sm border-b">
                                <td className="py-2 px-3">{t.cid}</td>
                                <td className="py-2 px-3">
                                  {cidDetailsMap[key]?.desc || "—"}
                                </td>
                                <td className="py-2 px-3">
                                  {cidDetailsMap[key]?.chapter || "—"}
                                </td>
                                <td className="py-2 px-3">{t.count}</td>
                                <td className="py-2 px-3">{t.days}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
