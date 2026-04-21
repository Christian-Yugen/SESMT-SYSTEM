"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Menu, FileText, Users, Clock3, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
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

  const fetchData = async () => {
    setLoading(true);
    try {
      // Supabase/PostgREST pode limitar a 1000 rows por requisição.
      // Fazemos fetch em lotes (batch) para obter todo o conjunto e
      // manter os cálculos de métricas no cliente.
      const BATCH = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        let q: any = supabase.from("atestados_import").select("*");
        if (startDate) q = q.gte("periodo", startDate);
        if (endDate) q = q.lte("periodo", endDate);
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
      // reset page to first when data set changes (avoids stale page index)
      setPage(1);
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

      <main className="flex-1 pl-0 lg:pl-60">
        <section className="bg-white px-4 py-3 border-b-[6px] border-[#1A3351]">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold uppercase text-[#1A3351]">
              Atestados — Análise Rápida
            </h1>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 px-2 border rounded-none"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 px-2 border rounded-none"
                />
                <button
                  onClick={() => fetchData()}
                  className="h-9 px-3 bg-[#1A3351] text-white rounded-none"
                  disabled={loading}
                  title="Filtrar"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
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
          <div className="bg-white p-6 border-2 border-slate-200 shadow-sm">
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
                        <th className="py-2 px-3">Registros</th>
                        <th className="py-2 px-3">Dias Perdidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.topCid.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-slate-500">
                            Nenhum dado disponível para o período selecionado.
                          </td>
                        </tr>
                      ) : (
                        metrics.topCid.map((t) => (
                          <tr key={t.cid} className="text-sm border-b">
                            <td className="py-2 px-3">{t.cid}</td>
                            <td className="py-2 px-3">{t.count}</td>
                            <td className="py-2 px-3">{t.days}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-white p-6 border-2 border-slate-200 shadow-sm">
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
                      <td className="py-2 px-3">{r.cid || "SEM CID"}</td>
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
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="px-3 py-1 border rounded-none"
                  disabled={page >= pageCount}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
