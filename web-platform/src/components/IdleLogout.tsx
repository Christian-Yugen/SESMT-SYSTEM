"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutos em milissegundos

export default function IdleLogout() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    console.log(
      "[SESMT] Sessão expirada por inatividade. Executando logout de segurança...",
    );
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, IDLE_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    // Monitorar eventos de atividade do usuário
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    // Iniciar o timer na montagem
    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);

  return null; // Este componente não renderiza nada, apenas executa a lógica
}
