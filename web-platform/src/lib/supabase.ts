import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sesmt-auth-session'
    },
    global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
    },
});

// Listener global para monitorar mudanças de estado e erros
if (typeof window !== 'undefined') {
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            localStorage.removeItem('sesmt-auth-session');
            console.log("Auth event: SIGNED_OUT");
        }

        // Se o refresh falhar (eventual TOKEN_REFRESHED sem sessão) ou se houver erro crítico
        if (event === 'TOKEN_REFRESHED' && !session) {
            console.warn("Token refresh falhou. Limpando sessão...");
            localStorage.removeItem('sesmt-auth-session');
            try { await supabase.auth.signOut(); } catch (_) {}
            
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
    });

    // Intercepta erros silenciosos do auto-refresh ao inicializar
    supabase.auth.getSession().then(({ error }) => {
        if (error) {
            const isRefreshError = error.message?.includes('Refresh Token Not Found') || 
                                 error.message?.includes('invalid refresh token') ||
                                 error.status === 400;
            
            if (isRefreshError) {
                console.warn("Sessão expirada detectada. Limpando storage...");
                localStorage.removeItem('sesmt-auth-session');
                // Não forçamos redirect aqui se já estivermos na login, o middleware/páginas tratam
                if (!window.location.pathname.includes('/login')) {
                    supabase.auth.signOut().finally(() => {
                        window.location.href = '/login';
                    });
                }
            }
        }
    });
}
