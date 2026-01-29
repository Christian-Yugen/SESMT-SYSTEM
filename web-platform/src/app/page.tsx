"use client";

import { useState, useMemo } from "react";
import { LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity } from "lucide-react";
import Image from "next/image";
import servidoresData from "@/data/servidores.json";
import funcoesData from "@/data/funcoes.json";
import examesDataRaw from "@/data/exames.json";
import { Servidor, Funcao, ExameData, ExamesMap } from "@/types";

const examesData = examesDataRaw as unknown as ExamesMap;

export default function Home() {
  const [cpf, setCpf] = useState("");
  const [selectedServidor, setSelectedServidor] = useState<Servidor | null>(null);
  const [functionSearch, setFunctionSearch] = useState("");
  const [selectedFuncao, setSelectedFuncao] = useState<Funcao | null>(null);
  const [asoType, setAsoType] = useState<"Admissional" | "Periódico" | "Demissional">("Admissional");

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

  const filteredFuncoes = useMemo(() => {
    if (!functionSearch || (selectedFuncao && (selectedFuncao.Nome || selectedFuncao.FUNÇÃO) === functionSearch)) return [];
    return (funcoesData as Funcao[]).filter(f =>
      (f.Nome || f.FUNÇÃO || "").toLowerCase().includes(functionSearch.toLowerCase()) ||
      f.Cod.includes(functionSearch)
    ).slice(0, 10);
  }, [functionSearch, selectedFuncao]);

  const handleSearch = () => {
    const cleanCpf = cpf.replace(/\D/g, "");
    const found = (servidoresData as Servidor[]).find(s => {
      const sCpf = (s.CPF || s["CPF."] || "").replace(/\D/g, "");
      return sCpf === cleanCpf;
    });
    if (found) {
      setSelectedServidor(found);
    } else {
      alert("Servidor não encontrado.");
    }
  };

  const currentExams = useMemo((): ExameData => {
    if (!selectedFuncao) return { exames: [], riscos: "", detalhes: "" };
    const ghe = selectedFuncao.GHE;
    const type = asoType === "Demissional" ? "demissional" : "admissional";
    const data = examesData[type][ghe];
    if (asoType === "Periódico") return { exames: ["Exame Clínico"], riscos: data?.riscos || "Não informado", detalhes: data?.detalhes || "" };
    return data || { exames: [], riscos: "GHE não encontrado", detalhes: "" };
  }, [selectedFuncao, asoType]);

  return (
    <div className="h-screen flex bg-[#0A111C] text-white font-sans overflow-hidden">

      {/* SIDEBAR - AZUL ESCURO (MARINHO #1A3351) */}
      <aside className="w-52 bg-[#1A3351] border-r border-white/10 flex flex-col p-4 shrink-0 shadow-2xl relative">
        <div className="mb-8 flex flex-col items-center">
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
          <button className="w-full flex items-center gap-2 p-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all font-black text-[11px] uppercase tracking-tight transition-colors">
            <HeartPulse className="w-4 h-4" />
            <span>Benefícios</span>
          </button>
        </nav>

        <div className="mt-auto space-y-4">
          <button className="flex items-center gap-2 p-2 text-white/30 hover:text-white transition-all font-black uppercase tracking-widest text-[9px] px-4">
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
      <main className="flex-1 flex flex-col bg-[#D3D3D3] text-black overflow-hidden relative">

        {/* BUSCAR SERVIDOR (HEADER) COM LINHA VERMELHA NA BASE */}
        <section className="bg-[#B0B0B0] p-4 py-3 border-b-[6px] border-[#E31E24] shrink-0 shadow-lg">
          <h2 className="text-xl font-black mb-3 leading-none uppercase tracking-tight">Buscar Servidor</h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="000.000.000-00"
              className="w-80 px-4 py-2 border border-[#888] outline-none shadow-inner text-base font-normal bg-[#E8E8E8]"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="px-10 py-2 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-sm uppercase border border-black/10">Buscar</button>
            <button className="px-8 py-2 bg-[#1A3351] text-white font-black rounded shadow-md hover:brightness-110 active:scale-95 transition-all text-sm uppercase border border-black/10">Inclusão Manual</button>
          </div>
        </section>

        {/* CONTAINER DE DADOS (2 COLUNAS) */}
        <div className="flex-1 p-6 grid grid-cols-12 gap-10 max-w-[1600px] overflow-hidden min-h-0">

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
                  <p className="flex gap-4 items-baseline"><span className="font-black text-slate-900 w-48 shrink-0">GHE Correspondente:</span> <span className="text-[#1A3351] font-normal text-xl underline decoration-slate-300 underline-offset-4 decoration-1">{selectedFuncao?.GHE || "---"}</span></p>
                  <p className="flex gap-4 items-baseline">
                    <span className="font-black text-slate-900 w-48 shrink-0">GHE CONJ:</span>
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
                  <div className="flex bg-[#888] border-2 border-[#888] rounded-md overflow-hidden w-fit shadow-md">
                    {(["Admissional", "Periódico", "Demissional"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setAsoType(type)}
                        className={`px-8 py-2.5 text-xs font-black transition-all border-r last:border-0 border-[#777] uppercase tracking-tighter ${asoType === type ? "bg-[#1A3351] text-white shadow-inner" : "text-white/70 hover:text-white hover:bg-white/10"
                          }`}
                      >
                        {type}
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
                <div className="flex-1 bg-[#E8E8E8] border border-[#BBB] p-5 rounded-md overflow-y-auto shadow-inner">
                  <ul className="grid grid-cols-2 gap-x-8 gap-y-2 font-normal text-[13px] text-slate-900">
                    {selectedFuncao && currentExams.exames.length > 0 ? (
                      currentExams.exames.map((ex, i) => (
                        <li key={i} className="flex items-center gap-3 border-b border-slate-300 pb-1.5 last:border-0 uppercase tracking-tight leading-none group">
                          <span className="text-[#1A3351] font-black text-xl leading-none">•</span>
                          <span className="truncate group-hover:text-[#1A3351] transition-colors">{ex}</span>
                        </li>
                      ))
                    ) : (
                      <div className="col-span-2 h-full flex flex-col items-center justify-center text-slate-400 opacity-50 py-10">
                        <Activity className="w-16 h-16 mb-4" />
                        <p className="font-black uppercase tracking-[0.4em] text-base">Aguardando Seleção</p>
                      </div>
                    )}
                  </ul>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="shrink-0 pt-3 flex gap-4 h-[72px]">
                <button className="flex-1 px-4 py-2 bg-[#1A3351] text-white font-black rounded shadow-xl hover:brightness-110 active:translate-y-px transition-all text-[13px] uppercase border-b-4 border-blue-950 tracking-wider flex items-center justify-center text-center leading-tight">
                  Gerar Encaminhamento
                </button>
                <button className="flex-1 px-4 py-2 bg-[#28A745] text-white font-black rounded shadow-xl hover:brightness-110 active:translate-y-px transition-all text-[13px] uppercase border-b-4 border-green-800 tracking-wider flex items-center justify-center text-center leading-tight">
                  Gerar Arquivo ASO
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
