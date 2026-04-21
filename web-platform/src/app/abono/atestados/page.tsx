"use client";

import { useEffect, useMemo, useState } from "react";
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
      const fields = [r.matricula, r.nome, r.nome_cargo, r.cid, r.nome_unidade]
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
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
