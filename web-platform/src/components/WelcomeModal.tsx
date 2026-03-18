"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Sun, CloudSun, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface WelcomeModalProps {
  userName: string;
}

export default function WelcomeModal({ userName }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [systemMessage, setSystemMessage] = useState("");
  const [icon, setIcon] = useState(<Sun className="w-12 h-12 text-amber-400" />);

  useEffect(() => {
    const checkFirstAccess = async () => {
      const today = new Date().toLocaleDateString('pt-BR');
      const lastAccess = localStorage.getItem(`last_access_${userName}`);

      if (lastAccess !== today) {
        // DEFINIR SAUDAÇÃO POR HORA
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
          setGreeting("Bom dia");
          setIcon(<Sun className="w-16 h-16 text-amber-400 animate-pulse" />);
        } else if (hour >= 12 && hour < 18) {
          setGreeting("Boa tarde");
          setIcon(<CloudSun className="w-16 h-16 text-orange-400 animate-pulse" />);
        } else {
          setGreeting("Boa noite");
          setIcon(<Moon className="w-16 h-16 text-blue-300 animate-pulse" />);
        }

        // BUSCAR MENSAGEM DO ADMINISTRADOR
        try {
          const { data, error } = await supabase
            .from('system_greetings')
            .select('content')
            .eq('active', true)
            .order('priority', { ascending: false })
            .limit(1)
            .single();

          if (data && !error) {
            setSystemMessage(data.content);
          } else {
             setSystemMessage("Desejamos que o seu dia seja repleto de realizações e produtividade em nosso sistema.");
          }
        } catch (e) {
          console.error("Erro ao buscar saudação:", e);
        }

        setIsOpen(true);
        localStorage.setItem(`last_access_${userName}`, today);
      }
    };

    if (userName) {
      checkFirstAccess();
    }
  }, [userName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#1A3351]/40 backdrop-blur-md transition-all animate-in fade-in duration-500">
      <div className="bg-white/95 w-full max-w-lg rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(26,51,81,0.5)] border-t border-white overflow-hidden relative group animate-in zoom-in slide-in-from-bottom-12 duration-700">
        
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#1A3351] to-transparent opacity-20" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full blur-[80px] opacity-60" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-50 rounded-full blur-[80px] opacity-60" />

        <div className="relative p-10 flex flex-col items-center text-center">
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-6 right-8 text-slate-300 hover:text-[#1A3351] transition-colors p-2 rounded-full hover:bg-slate-50 active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="mb-8 p-6 bg-slate-50 rounded-[2rem] shadow-inner border border-white inline-flex relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent" />
             {icon}
          </div>

          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Mensagem do Sistema</h2>
            <h1 className="text-4xl font-black text-[#1A3351] leading-tight tracking-tight">
              {greeting}, <span className="bg-gradient-to-r from-[#1A3351] to-blue-600 bg-clip-text text-transparent">{userName}</span>!
            </h1>
            
            <div className="h-0.5 w-12 bg-[#1A3351] mx-auto rounded-full opacity-10" />
            
            <p className="text-lg text-slate-600 font-medium leading-relaxed px-4">
              {systemMessage}
            </p>
          </div>

          <div className="mt-12 w-full pt-8 border-t border-slate-50 flex flex-col items-center gap-4">
            <button
               onClick={() => setIsOpen(false)}
               className="w-full bg-[#1A3351] text-white py-5 rounded-[1.5rem] font-bold uppercase tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-95 transition-all text-sm group"
            >
               <span className="flex items-center justify-center gap-2">
                 Iniciar Expediente <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
               </span>
            </button>
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Powered by UXBRAS® SESMT Digital</p>
          </div>
        </div>
      </div>
    </div>
  );
}
