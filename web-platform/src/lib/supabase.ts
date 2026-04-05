import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "sesmt-auth-session",
  },
  global: {
    fetch: async (url, options) => {
      try {
        return await fetch(url, { ...options, cache: "no-store" });
      } catch (err: any) {
        // Suprime erros de rede durante auto-refresh de token (ex: offline, token expirado)
        // para evitar TypeError: Failed to fetch no console.
        const isAuthUrl = typeof url === "string" && url.includes("/auth/v1/token");
        if (isAuthUrl) {
          console.warn("[sesmt-auth] Falha de rede durante renovação de token. Sessão pode ter expirado.");
          // Retorna uma resposta vazia mas valida para o Supabase processar
          return new Response(JSON.stringify({ error: "network_error", error_description: "Failed to fetch" }), {
            status: 0,
            headers: { "content-type": "application/json" },
          });
        }
        throw err;
      }
    },
  },
});

// Listener global para monitorar mudanças de estado e erros
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      localStorage.removeItem("sesmt-auth-session");
      console.log("Auth event: SIGNED_OUT");
    }

    // Se o refresh falhar (eventual TOKEN_REFRESHED sem sessão) ou se houver erro crítico
    if (event === "TOKEN_REFRESHED" && !session) {
      console.warn("Token refresh falhou. Limpando sessão...");
      localStorage.removeItem("sesmt-auth-session");
      try {
        await supabase.auth.signOut();
      } catch {}

      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
  });

  // Intercepta erros do auto-refresh ao inicializar para continuar a sincronização de dados mesmo sem sessão
  const storageKey = "sesmt-auth-session";
  const hasExistingSession = !!localStorage.getItem(storageKey);

  if (hasExistingSession) {
    supabase.auth
      .getSession()
      .then(({ error }) => {
        if (error) {
          const errorMessage = error.message || "";
          const isRefreshError =
            errorMessage.includes("Refresh Token Not Found") ||
            errorMessage.includes("invalid refresh token") ||
            error.status === 400;

          if (isRefreshError) {
            console.warn(
              "Sessão expirada detectada na inicialização. Limpando...",
            );
            localStorage.removeItem(storageKey);

            if (!window.location.pathname.includes("/login")) {
              supabase.auth.signOut().finally(() => {
                window.location.href = "/login";
              });
            }
          }
        }
      })
      .catch(() => {
        // Suprime erros de rede ou outros na inicialização silenciosa, mas nao completamente de modo a não atrapalhar o funcionamento do sistema
      });
  }
}
