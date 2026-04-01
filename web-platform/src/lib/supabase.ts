import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

function createSafeAuthStorage(storageKey: string) {
  const noopStorage = {
    getItem: (_key: string) => null,
    setItem: (_key: string, _value: string) => {},
    removeItem: (_key: string) => {},
  };

  if (globalThis.window === undefined) return noopStorage;

  return {
    getItem: (key: string) => {
      try {
        const raw = globalThis.localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as {
          currentSession?: { refresh_token?: string | null };
        };
        const refreshToken = parsed?.currentSession?.refresh_token;

        // Evita loop de auto-refresh com sessão local corrompida.
        if (!refreshToken) {
          globalThis.localStorage.removeItem(storageKey);
          return null;
        }

        return raw;
      } catch {
        globalThis.localStorage.removeItem(storageKey);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      globalThis.localStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
      globalThis.localStorage.removeItem(key);
    },
  };
}

const authStorageKey = "sesmt-auth-session";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: authStorageKey,
    storage: createSafeAuthStorage(authStorageKey),
  },
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
  },
});

// Listener global para monitorar mudanças de estado e erros
if (globalThis.window !== undefined) {
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

      if (!globalThis.location.pathname.includes("/login")) {
        globalThis.location.href = "/login";
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

            if (!globalThis.location.pathname.includes("/login")) {
              supabase.auth.signOut().finally(() => {
                globalThis.location.href = "/login";
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
