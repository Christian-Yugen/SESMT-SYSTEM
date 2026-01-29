"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { History, FileText, Search, User, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface HistoryEntry {
    id: number;
    servidor_cpf: string;
    servidor_nome: string;
    aso_type: string;
    generated_at: string;
    generated_by: string;
}

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }
            setSession(session);
            loadHistory();
        };
        checkAuth();
    }, [router]);

    async function loadHistory() {
        setLoading(true);
        const { data, error } = await supabase
            .from('aso_history')
            .select('*')
            .order('generated_at', { ascending: false });

        if (!error && data) {
            setHistory(data);
        }
        setLoading(false);
    }

    const filteredHistory = history.filter(entry =>
        entry.servidor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.servidor_cpf.includes(searchTerm) ||
        entry.aso_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#0A111C] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-[#E31E24] animate-spin" />
                <p className="text-white/40 uppercase tracking-[0.3em] font-bold text-[10px]">Carregando Histórico...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A111C] text-white font-sans p-4 md:p-10">
            <div className="max-w-6xl mx-auto flex flex-col gap-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6 text-white/50" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <History className="w-8 h-8 text-[#E31E24]" />
                                <h1 className="text-3xl font-black uppercase tracking-tight">Histórico de Emissões</h1>
                            </div>
                            <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Registro centralizado de ASOs e Encaminhamentos</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                            type="text"
                            placeholder="BUSCAR POR NOME OU CPF..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm font-bold uppercase tracking-wider outline-none focus:border-[#E31E24] transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="grid gap-4">
                    {filteredHistory.length > 0 ? (
                        filteredHistory.map((entry) => (
                            <div key={entry.id} className="bg-white/5 border border-white/10 p-5 rounded-xl hover:bg-white/[0.07] transition-all flex flex-col md:flex-row justify-between gap-4 group">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white/5 rounded-lg text-white/50 group-hover:text-[#E31E24] transition-colors">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase leading-tight mb-1">{entry.servidor_nome}</h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold uppercase tracking-wider text-white/30">
                                            <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> CPF: {entry.servidor_cpf}</span>
                                            <span className="text-[#E31E24]">{entry.aso_type}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-2 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8">
                                    <div className="flex items-center gap-2 text-white/40 font-bold text-[10px] uppercase tracking-widest">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(entry.generated_at).toLocaleString('pt-BR')}
                                    </div>
                                    <div className="text-[9px] text-[#28A745] font-black uppercase bg-[#28A745]/10 px-2 py-1 rounded">Emitido</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border-2 border-dashed border-white/10 italic text-white/20">
                            <History className="w-16 h-16 mb-4 opacity-20" />
                            <p className="uppercase tracking-[0.2em] font-bold">Nenhum registro encontrado</p>
                        </div>
                    )}
                </div>

                {/* Footer info */}
                <div className="mt-8 text-center">
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Powered by UXBRAS®</p>
                </div>
            </div>
        </div>
    );
}
