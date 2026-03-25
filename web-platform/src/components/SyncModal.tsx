"use client";

import { X, CloudDownload, AlertTriangle, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";

interface SyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendingSyncs: any[];
    isSyncing: boolean;
    onForceSync?: () => void;
}

export default function SyncModal({ isOpen, onClose, pendingSyncs, isSyncing, onForceSync }: SyncModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-[#D3D3D3] w-full max-w-2xl rounded-none shadow-2xl border-4 border-[#1A3351] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                <div className="bg-[#1A3351] p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <CloudDownload className={`w-8 h-8 ${pendingSyncs.length > 0 ? 'text-amber-500' : 'text-green-500'}`} />
                        <div>
                            <h3 className="text-xl font-bold uppercase tracking-tight text-white">Central de Sincronização</h3>
                            <p className="text-[10px] font-medium text-white/50 uppercase tracking-widest">Monitoramento de Integridade de Dados</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                </div>

                <div className="p-8">
                    {pendingSyncs.length > 0 ? (
                        <div className="space-y-6">
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-none">
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-800 uppercase">Registros em Fila Local</p>
                                        <p className="text-xs font-medium text-amber-700/80 leading-relaxed mt-1">
                                            Existem {pendingSyncs.length} registros que não puderam ser enviados ao banco de dados devido a instabilidades de conexão. 
                                            O sistema tentará sincronizá-los automaticamente a cada minuto.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {pendingSyncs.map((s, i) => (
                                    <div key={i} className="bg-white p-3 border-2 border-slate-200 rounded-none flex justify-between items-center group">
                                        <div>
                                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">Servidor:</p>
                                            <p className="text-sm font-bold text-[#1A3351] uppercase">{s.servidor_nome}</p>
                                            <p className="text-[10px] font-medium text-slate-500 uppercase">{s.aso_type}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">Status:</p>
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-none border border-amber-200 animate-pulse">PENDENTE</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                             <button 
                                onClick={() => {
                                    if (onForceSync) onForceSync();
                                    else alert("Sincronização automática em segundo plano...");
                                }}
                                className="w-full h-12 bg-[#1A3351] text-white font-bold uppercase tracking-[0.2em] rounded-none shadow-xl hover:brightness-110 active:scale-95 transition-all text-xs border-b-4 border-blue-950 flex items-center justify-center gap-3"
                            >
                                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                {isSyncing ? "Sincronizando..." : "Forçar Sincronização Agora"}
                            </button>
                        </div>
                    ) : (
                        <div className="py-12 text-center flex flex-col items-center gap-6">
                            <div className="w-20 h-20 bg-green-50 rounded-none flex items-center justify-center border-2 border-green-100">
                                <CheckCircle2 className="w-12 h-12 text-green-500" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-[#1A3351] uppercase">Tudo em Ordem!</h4>
                                <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                                    Não existem registros pendentes no seu dispositivo. Todos os dados foram sincronizados com sucesso na nuvem.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-[#B0B0B0] flex justify-center border-t border-slate-400">
                    <button
                        onClick={onClose}
                        className="px-12 h-10 bg-[#1A3351] text-white font-bold uppercase tracking-widest rounded-none shadow-md hover:brightness-110 active:scale-95 transition-all text-xs border-b-4 border-blue-950"
                    >
                        Fechar Painel
                    </button>
                </div>
            </div>
        </div>
    );
}
