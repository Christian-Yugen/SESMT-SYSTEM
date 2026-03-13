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
            // Limpar storage key ao fazer logout
            localStorage.removeItem('sesmt-auth-session');
            console.log("Auth event: SIGNED_OUT");
        }

        // Captura falha no refresh do token (sessão nula após tentativa de refresh)
        if (event === 'TOKEN_REFRESHED' && !session) {
            console.warn("Token refresh falhou. Limpando sessão corrompida...");
            localStorage.removeItem('sesmt-auth-session');
            try { await supabase.auth.signOut(); } catch (_) { /* ignora erro no signOut */ }
            window.location.href = '/login';
        }
    });

    // Intercepta erros silenciosos do auto-refresh ao inicializar
    supabase.auth.getSession().then(({ error }) => {
        if (error?.message?.includes('Refresh Token Not Found') ||
            error?.message?.includes('invalid refresh token')) {
            console.warn("Sessão inválida detectada na inicialização. Redirecionando...");
            localStorage.removeItem('sesmt-auth-session');
            supabase.auth.signOut().finally(() => {
                window.location.href = '/login';
            });
        }
    });
}
