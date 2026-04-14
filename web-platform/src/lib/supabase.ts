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
        const response = await fetch(url, { ...options, cache: "no-store" });

        // Intercepta falhas críticas de autenticação no retorno da API
        // para evitar erros vermelhos ruidosos no console do navegador (AuthApiError)
        const isAuthUrl =
          typeof url === "string" && url.includes("/auth/v1/token");
        if (isAuthUrl && response.status === 400) {
          const clone = response.clone();
          try {
            const body = await clone.json();
            if (
              body?.error === "invalid_grant" ||
              body?.error_description?.includes("Refresh Token Not Found")
            ) {
              console.warn(
                "[sesmt-auth] Refresh Token inválido ou expirado. Sessão será reiniciada silenciosamente.",
              );
              // Retornamos uma resposta modificada que o Supabase entende como erro,
              // mas que já foi "tratada" pelo nosso log de aviso.
              return response;
            }
          } catch {
            // Ignora erro ao ler json do clone
          }
        }

        return response;
      } catch (err: any) {
        // Suprime erros de rede durante auto-refresh de token
        const isAuthUrl =
          typeof url === "string" && url.includes("/auth/v1/token");
        if (isAuthUrl) {
          console.warn(
            "[sesmt-auth] Falha de rede durante renovação de token.",
          );
          return new Response(
            JSON.stringify({
              error: "network_error",
              error_description: "Failed to fetch",
            }),
            {
              status: 0,
              headers: { "content-type": "application/json" },
            },
          );
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

  // Captura rejeições de promessa não tratadas originadas do fluxo de refresh
  // (por exemplo, quando o Supabase lança AuthApiError com "Refresh Token Not Found").
  // Tratamos limpando a sessão e redirecionando para /login para evitar erros ruidosos no console.
  window.addEventListener(
    "unhandledrejection",
    async (ev: PromiseRejectionEvent) => {
      try {
        const reason: any = ev?.reason;
        const message =
          (typeof reason === "string" ? reason : reason?.message) || "";
        const isRefreshError =
          /Refresh Token Not Found|invalid refresh token|invalid_grant/i.test(
            message,
          ) || reason?.name === "AuthApiError";

        if (isRefreshError) {
          ev.preventDefault();
          console.warn(
            "[sesmt-auth] Refresh token inválido detectado (unhandledrejection). Limpando sessão.",
          );
          try {
            localStorage.removeItem(storageKey);
            await supabase.auth.signOut();
          } catch {}
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
        }
      } catch (e) {
        // Não propagar erros secundários do handler
      }
    },
  );
}
