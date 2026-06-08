import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  email: string;
  role: string;
  full_name?: string | null;
}

// Nota: roles são gerenciadas exclusivamente pelo admin via painel/DB.
// Removemos a atribuição automática de `role` no cliente para evitar
// sobrescrita por fluxos de login. Qualquer alteração de role deve ser
// feita apenas por um administrador ou via chave de serviço (server-side).

/**
 * Sincroniza o perfil do usuário atual com a tabela 'profiles'.
 * Se o perfil não existir, ele cria um novo.
 * Se houver um perfil pré-autorizado pelo e-mail, ele vincula ao ID atual.
 */
export async function syncProfile(session: Session | null): Promise<string> {
  if (!session?.user) return "viewer";

  const user = session.user;
  const userEmail = user.email?.toLowerCase() || "";

  try {
    // 1. Verificar se já existe perfil para este ID
    const { data: existingProfileById } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfileById) {
      // Não alteramos `role` aqui — somente campos não sensíveis.
      const updates: Record<string, unknown> = {};
      const fullName = user.user_metadata?.full_name || "";
      if (existingProfileById.email !== userEmail) updates.email = userEmail;
      if ((existingProfileById.full_name || "") !== fullName)
        updates.full_name = fullName;
      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("id", user.id);
      }

      return existingProfileById.role || "viewer";
    }

    // 2. Não existe pelo ID. Verificar se existe pelo E-MAIL (pré-autorizado pelo admin)
    const { data: existingProfileByEmail } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", userEmail)
      .maybeSingle();

    // Decide criar o profile sem tocar em `role` — somente admin pode gerenciar roles.
    // Se existir um registro pelo e-mail com outro ID, mantemos esse registro (não o deletamos),
    // para evitar remover configurações feitas por administradores. Criamos/atualizamos apenas
    // o registro associado ao `user.id` com dados não-sensíveis.

    const upsertPayload: any = {
      id: user.id,
      email: userEmail,
      full_name: user.user_metadata?.full_name || "",
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(upsertPayload, {
        onConflict: "id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("Erro ao sincronizar perfil:", upsertError.message);
    }

    // Ler o profile definitivo e devolver o `role` real (pode ser null)
    const { data: finalProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return finalProfile?.role || "viewer";
  } catch (err) {
    console.error("Erro na sincronização de perfil:", err);
    return "viewer";
  }
}

/**
 * Helper para buscar sessão de forma silenciosa, tratando erros de token expirado.
 */
export async function safeGetSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      const errorMessage = error.message || "";
      // Se for erro de refresh token, limpamos o storage e retornamos nulo silenciosamente
      if (
        errorMessage.includes("Refresh Token Not Found") ||
        errorMessage.includes("invalid refresh token") ||
        error.status === 400
      ) {
        console.warn("Sessão inválida detectada pelo geSession. Limpando...");
        if (typeof window !== "undefined") {
          const storageKey = "sesmt-auth-session";
          localStorage.removeItem(storageKey);
          // Força um signOut interno para limpar o estado do cliente Supabase
          supabase.auth.signOut().catch(() => {});
        }
        return { session: null, error: null };
      }
      return { session: null, error };
    }

    return { session: data.session, error: null };
  } catch (err: unknown) {
    console.error("Erro inesperado ao buscar sessão:", err);
    return { session: null, error: err };
  }
}

/**
 * Trata erros de autenticação, especialmente o erro de Refresh Token inválido.
 * Força o logout local para limpar o estado corrompido em caso de falha crítica.
 */
export async function handleAuthError(error: unknown) {
  if (!error) return;

  const errorObj =
    typeof error === "object" && error !== null
      ? (error as { message?: string; status?: number; code?: string })
      : {};

  // Se for erro de refresh token, tratamos como aviso e limpamos pro-ativamente
  const errorMessage =
    errorObj.message || (typeof error === "string" ? error : "");
  const isRefreshError =
    errorMessage.includes("Refresh Token Not Found") ||
    errorMessage.includes("invalid refresh token") ||
    errorObj.status === 400 ||
    errorObj.code === "refresh_token_not_found";

  if (isRefreshError) {
    console.warn(
      "Sessão expirada ou Refresh Token inválido. Redirecionando para login...",
    );

    if (typeof window !== "undefined") {
      // Limpa explicitamente o storage para evitar loops de tentativa do Supabase
      const storageKey = "sesmt-auth-session";
      localStorage.removeItem(storageKey);

      // Tenta o signOut mas não aguarda se falhar
      supabase.auth.signOut().catch(() => {});

      // Evita redirecionamento se já estivermos no login
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
  } else {
    console.error("Erro crítico de autenticação:", errorMessage);
    await supabase.auth.signOut();
  }
}

/**
 * Gera um UUID v4 compatível com todos os navegadores (incluindo ambientes não-secure).
 */
export function generateUUID() {
  // Tenta usar a API nativa se disponível
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback para navegadores antigos ou ambientes sem HTTPS
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
