"use client";

import { useState } from "react";
import { X, Sparkles, MessageSquarePlus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface GreetingsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
}

export default function GreetingsManagerModal({ isOpen, onClose, userId }: GreetingsManagerModalProps) {
  const [newGreeting, setNewGreeting] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!newGreeting.trim()) return;
    setIsSaving(true);
    try {
      // Desativar todas as anteriores
      await supabase.from('system_greetings').update({ active: false }).eq('active', true);
      
      // Inserir a nova
      const { error } = await supabase.from('system_greetings').insert({
        content: newGreeting.trim(),
        active: true,
        priority: 10,
        created_by: userId
      });

      if (error) throw error;
      alert("Mensagem programada com sucesso!");
      onClose();
      setNewGreeting("");
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#D3D3D3] w-full max-w-xl rounded-2xl shadow-2xl border-4 border-[#1A3351] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 text-black">
        <div className="bg-[#1A3351] p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <MessageSquarePlus className="w-8 h-8 text-blue-400" />
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Programar Saudação</h3>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Configuração de Primeiro Acesso</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-blue-50 border-l-4 border-[#1A3351] p-4 rounded-r-xl">
            <p className="text-xs font-bold text-[#1A3351]/80 leading-relaxed italic">
              "Esta mensagem aparecerá no primeiro login do dia para todos os operadores, logo após a saudação de Bom dia/Boa tarde."
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#1A3351]/60 px-1">Texto da Mensagem Diária</label>
            <textarea 
              value={newGreeting}
              onChange={(e) => setNewGreeting(e.target.value)}
              placeholder="Ex: Que seu dia seja produtivo e repleto de realizações!"
              className="w-full h-32 p-4 bg-white border-2 border-slate-200 rounded-xl focus:border-[#1A3351] focus:ring-4 focus:ring-[#1A3351]/10 outline-none transition-all font-medium text-slate-700 resize-none"
            />
          </div>

          <div className="flex gap-4 pt-2">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-4 bg-[#1A3351] text-white font-black uppercase tracking-[0.2em] rounded-xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-xs border-b-4 border-blue-950 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isSaving ? "Salvando..." : "Atualizar Mensagem"}
              </button>
              <button 
                onClick={onClose}
                className="px-8 py-4 bg-slate-200 text-slate-500 font-black uppercase tracking-[0.2em] rounded-xl hover:bg-slate-300 transition-all text-xs"
              >
                Cancelar
              </button>
          </div>
        </div>

        <div className="p-6 bg-[#B0B0B0] flex justify-center border-t border-slate-400">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1A3351]/40">Console de Administração SESMT — Powered by UXBRAS®</p>
        </div>
      </div>
    </div>
  );
}
