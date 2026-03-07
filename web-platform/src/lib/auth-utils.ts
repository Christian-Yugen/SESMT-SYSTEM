import { supabase } from './supabase';

export interface Profile {
    id: string;
    email: string;
    role: string;
    full_name?: string | null;
}

export const NURSE_EMAILS = [
    'eliane.tavares@treslagoas.ms.gov.br',
    'yvy.coelho@treslagoas.ms.gov.br'
];

/**
 * Sincroniza o perfil do usuário atual com a tabela 'profiles'.
 * Se o perfil não existir, ele cria um novo.
 * Se houver um perfil pré-autorizado pelo e-mail, ele vincula ao ID atual.
 */
export async function syncProfile(session: any): Promise<string> {
    const user = session.user;
    const userEmail = user.email?.toLowerCase() || '';

    // 1. Verificar se já existe perfil para este ID
    const { data: existingProfileById } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (existingProfileById) {
        // Se for enfermeira, garante que tem o cargo certo
        if (NURSE_EMAILS.includes(userEmail) && existingProfileById.role !== 'nurse') {
            await supabase.from('profiles').update({ role: 'nurse' }).eq('id', user.id);
            return 'nurse';
        }
        return existingProfileById.role;
    }

    // 2. Não existe pelo ID. Verificar se existe pelo E-MAIL (pré-autorizado pelo admin)
    const { data: existingProfileByEmail } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

    let roleToApply = 'viewer';

    // Regra especial para enfermeiras
    if (NURSE_EMAILS.includes(userEmail)) {
        roleToApply = 'nurse';
    } else if (existingProfileByEmail) {
        roleToApply = existingProfileByEmail.role;
    }

    // Se existia pelo e-mail com outro ID (ID temporário do admin), vamos deletar o temporário
    if (existingProfileByEmail && existingProfileByEmail.id !== user.id) {
        await supabase.from('profiles').delete().eq('id', existingProfileByEmail.id);
    }

    // 3. Criar o perfil definitivo
    const { error: insertError } = await supabase.from('profiles').insert({
        id: user.id,
        email: userEmail,
        role: roleToApply,
        full_name: user.user_metadata?.full_name || ''
    });

    if (insertError) {
        console.error("Erro ao inserir perfil:", insertError.message);
    }

    return roleToApply;
}

/**
 * Trata erros de autenticação, especialmente o erro de Refresh Token inválido.
 * Força o logout local para limpar o estado corrompido em caso de falha crítica.
 */
export async function handleAuthError(error: any) {
    if (!error) return;

    console.error("Erro crítico de autenticação:", error.message || error);

    // Se for erro de refresh token, precisamos garantir que o estado local seja limpo
    const isRefreshError = error.message?.includes('Refresh Token Not Found') ||
        error.message?.includes('invalid refresh token') ||
        error.status === 400;

    if (isRefreshError) {
        console.warn("Detectado erro de token inválido. Limpando sessão local...");
        if (typeof window !== 'undefined') {
            // Limpar storage corrompido antes do signOut
            localStorage.removeItem('sesmt-auth-session');
            // Em v2, signOut limpa o storage local mesmo que a chamada ao servidor falhe
            try { await supabase.auth.signOut(); } catch (_) { /* ignora erro no signOut */ }
            // Redirecionamento forçado se o signOut não disparar onAuthStateChange corretamente
            window.location.href = '/login';
        }
    } else {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('sesmt-auth-session');
        }
        await supabase.auth.signOut();
    }
}

/**
 * Gera um UUID v4 compatível com todos os navegadores (incluindo ambientes não-secure).
 */
export function generateUUID() {
    // Tenta usar a API nativa se disponível
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback para navegadores antigos ou ambientes sem HTTPS
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
