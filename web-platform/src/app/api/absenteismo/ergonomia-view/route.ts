import { createClient } from "@supabase/supabase-js";
import {
  ErgonomicApplicationError,
  integrateErgonomicRiskProfile,
  createSupabaseErgonomicRepository,
} from "@/lib/afastamentos-ergonomia";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_ID_HEADER = "x-request-id";
const MAX_INTERVAL_DAYS = 1096; // 3 anos

// ---------------------------------------------------------------------------
// Utilitários internos
// ---------------------------------------------------------------------------

function resolveRequestId(request: Request): string {
  const existing = request.headers.get(REQUEST_ID_HEADER);
  if (existing && /^[A-Za-z0-9_-]{4,64}$/.test(existing)) {
    return existing;
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `ergo-view-${Date.now()}-${random}`;
}

function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
): Response {
  const safeBody = body === undefined ? {} : body;
  const content = JSON.stringify(safeBody);

  return new Response(content, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      [REQUEST_ID_HEADER]: requestId,
    },
  });
}

function errorResponse(
  requestId: string,
  code: string,
  message: string,
  status: number,
): Response {
  return jsonResponse({ error: { code, message } }, status, requestId);
}

function parseIsoDate(value: string | null): string | null {
  if (!value || !DATE_PATTERN.test(value)) return null;
  const dt = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  return value;
}

function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase auth configuration unavailable");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createDataClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase data configuration unavailable");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

async function validateBearerToken(
  request: Request,
): Promise<{ valid: true } | { valid: false; reason: string }> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, reason: "missing_bearer_token" };
  }

  const token = authHeader.slice(7);
  if (!token) {
    return { valid: false, reason: "empty_token" };
  }

  try {
    const authClient = createAuthClient();
    const {
      data: { user },
      error,
    } = await authClient.auth.getUser(token);

    if (error || !user) {
      return { valid: false, reason: "invalid_or_expired_token" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "auth_check_failed" };
  }
}

// ---------------------------------------------------------------------------
// Handler Principal (GET)
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const rawStart = url.searchParams.get("startDate");
  const rawEnd = url.searchParams.get("endDate");
  const isDebug = url.searchParams.get("debug") === "1";

  try {
    // 1. Permissão de Bypass Debug (Ambiente Seguro/Preview)
    const debugHeader = request.headers.get("x-debug-ergonomia") === "1";
    const debugQuery = url.searchParams.get("debug") === "1" || url.searchParams.get("debugErgo") === "1";
    const previewEnv = process.env.VERCEL_ENV === "preview" || process.env.DEBUG_ERGONOMIA === "1";

    const debugBypassAuthorized = previewEnv && (debugHeader || debugQuery);

    if (!debugBypassAuthorized) {
      // 1. Validar sessão do usuário
      const authResult = await validateBearerToken(request);
      if (!authResult.valid) {
        console.warn("[ergo-view] auth_rejected", {
          requestId,
          reason: authResult.reason,
        });
        return errorResponse(
          requestId,
          "UNAUTHORIZED",
          "Sessão inválida. Faça login novamente.",
          401,
        );
      }
    } else {
      console.info(`[ergo-view] debug_bypass [${requestId}]`);
    }

    // 2. Parâmetros
    const startDate = parseIsoDate(rawStart);
    const endDate = parseIsoDate(rawEnd);

    if (!startDate || !endDate) {
      return errorResponse(requestId, "INVALID_PARAMS", "Datas obrigatórias (YYYY-MM-DD).", 400);
    }

    // 3. Processamento
    console.info(`[ergo-view] processing [${requestId}] period=${startDate}~${endDate}`);
    const dataClient = createDataClient();
    const repository = createSupabaseErgonomicRepository(dataClient);
    
    const dataset = await repository.loadDataset();
    console.info(`[ergo-view] dataset_loaded [${requestId}] assessments=${dataset.assessments.length}`);

    const result = integrateErgonomicRiskProfile(dataset, { startDate, endDate });
    console.info(`[ergo-view] analysis_concluded [${requestId}] signals=${result.signalsByAnalyticalGroup.length}`);

    return jsonResponse({ ...result, _v: "2.0-cid-strict" }, 200, requestId);
  } catch (err: any) {
    const isAppError = err instanceof ErgonomicApplicationError;
    const dbErrorCode = err?.code || (err as any)?.originalError?.code;
    
    console.error(`[ergo-view] failure [${requestId}]:`, {
      code: dbErrorCode,
      message: err.message,
      stack: err.stack
    });

    return errorResponse(
      requestId,
      isAppError ? "APP_ERROR" : "INTERNAL_ERROR",
      err.message || "Falha na análise ergonômica.",
      500
    );
  }
}
