import { createClient } from "@supabase/supabase-js";

import {
  EpidemiologyApplicationError,
  buildEpidemiologyContractFromRepository,
  createSupabaseEpidemiologyRepository,
} from "@/lib/afastamentos-epidemiologia-application";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_ID_HEADER = "x-request-id";
const MAX_INTERVAL_DAYS = 1096;

// ---------------------------------------------------------------------------
// Utilitários internos
// ---------------------------------------------------------------------------

function resolveRequestId(request: Request): string {
  const existing = request.headers.get(REQUEST_ID_HEADER);
  if (existing && /^[A-Za-z0-9_-]{4,64}$/.test(existing)) {
    return existing;
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `epi-view-${Date.now()}-${random}`;
}

function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isPreview = process.env.VERCEL_ENV === "preview" || process.env.DEBUG_EPIDEMIOLOGIA === "1";

      // Caso comum em previews: variáveis de ambiente do Supabase não foram
      // configuradas (ex: SUPABASE_SERVICE_ROLE_KEY). Retornamos um erro
      // explícito para facilitar diagnóstico na UI do PR.
      if (
        errMsg.includes("Supabase data configuration unavailable") ||
        (errMsg.includes("Supabase") && errMsg.includes("configuration"))
      ) {
        console.error("[epi-view] config_missing", { requestId, message: errMsg });
        return errorResponse(
          requestId,
          "CONFIG_MISSING",
          "Variáveis de ambiente do Supabase ausentes no deploy. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) no ambiente de preview.",
          500,
        );
      }

      if (error instanceof EpidemiologyApplicationError) {
        console.error("[epi-view] application_error", {
          requestId,
          message: errMsg,
        });

        if (isPreview) {
          // Em previews, retornamos detalhe do erro para facilitar diagnóstico
          return jsonResponse(
            {
              error: {
                code: "DATA_ERROR",
                message: "Falha ao processar dados epidemiológicos.",
                detail: errMsg,
              },
            },
            500,
            requestId,
          );
        }

        return errorResponse(
          requestId,
          "INTERNAL_ERROR",
          "Falha ao processar dados epidemiológicos.",
          500,
        );
      }

      console.error("[epi-view] unexpected_error", { requestId, message: errMsg });
      if (isPreview) {
        return jsonResponse(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "Erro interno ao consultar indicadores epidemiológicos.",
              detail: errMsg,
            },
          },
          503,
          requestId,
        );
      }

      return errorResponse(
        requestId,
        "INTERNAL_ERROR",
        "Erro interno ao consultar indicadores epidemiológicos.",
        503,
      );
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

// ---------------------------------------------------------------------------
// Validação de sessão via Bearer token
// ---------------------------------------------------------------------------

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
// Handler GET
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  const requestId = resolveRequestId(request);

  // 1. Validar sessão do usuário
  const authResult = await validateBearerToken(request);
  if (!authResult.valid) {
    console.warn("[epi-view] auth_rejected", {
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

  // 2. Validar parâmetros de data
  const url = new URL(request.url);
  const startDate = parseIsoDate(url.searchParams.get("startDate"));
  const endDate = parseIsoDate(url.searchParams.get("endDate"));

  if (!startDate || !endDate) {
    return errorResponse(
      requestId,
      "INVALID_QUERY_PARAMS",
      "Parâmetros startDate e endDate são obrigatórios no formato YYYY-MM-DD.",
      400,
    );
  }

  if (startDate > endDate) {
    return errorResponse(
      requestId,
      "INVALID_QUERY_PARAMS",
      "startDate não pode ser maior que endDate.",
      400,
    );
  }

  if (daysBetween(startDate, endDate) > MAX_INTERVAL_DAYS) {
    return errorResponse(
      requestId,
      "INVALID_QUERY_PARAMS",
      `Intervalo excede limite máximo de ${MAX_INTERVAL_DAYS} dias.`,
      400,
    );
  }

  // 3. Construir contrato epidemiológico
  try {
    const dataClient = createDataClient();
    const repository = createSupabaseEpidemiologyRepository(dataClient);

    const contract = await buildEpidemiologyContractFromRepository(repository, {
      period: { startDate, endDate },
    });

    console.info("[epi-view] contract_generated", {
      requestId,
      startDate,
      endDate,
    });

    return jsonResponse(contract, 200, requestId);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Caso comum em previews: variáveis de ambiente do Supabase não foram
    // configuradas (ex: SUPABASE_SERVICE_ROLE_KEY). Retornamos um erro
    // explícito para facilitar diagnóstico na UI do PR.
    if (
      errMsg.includes("Supabase data configuration unavailable") ||
      (errMsg.includes("Supabase") && errMsg.includes("configuration"))
    ) {
      console.error("[epi-view] config_missing", {
        requestId,
        message: errMsg,
      });
      return errorResponse(
        requestId,
        "CONFIG_MISSING",
        "Variáveis de ambiente do Supabase ausentes no deploy. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) no ambiente de preview.",
        500,
      );
    }

    if (error instanceof EpidemiologyApplicationError) {
      console.error("[epi-view] application_error", {
        requestId,
        message: (error as Error).message,
      });
      return errorResponse(
        requestId,
        "INTERNAL_ERROR",
        "Falha ao processar dados epidemiológicos.",
        500,
      );
    }

    console.error("[epi-view] unexpected_error", {
      requestId,
      message: errMsg,
    });
    return errorResponse(
      requestId,
      "INTERNAL_ERROR",
      "Erro interno ao consultar indicadores epidemiológicos.",
      503,
    );
  }
}
