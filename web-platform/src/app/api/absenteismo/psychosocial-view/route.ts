import { createClient } from "@supabase/supabase-js";
import {
  PsychosocialApplicationError,
  reportPsychoRiskSignals,
  createSupabasePsychosocialRepository,
} from "@/lib/afastamentos-psychosocial";

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
  return `psy-view-${Date.now()}-${random}`;
}

function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
): Response {
  // Garantir que o body nunca seja undefined para evitar erro de JSON indevido
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
  const yyyy = String(dt.getUTCFullYear()).padStart(4, "0");
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  if (`${yyyy}-${mm}-${dd}` !== value) return null;
  return value;
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------
// Clientes Supabase para esta rota
// ---------------------------------------------------------------------------

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
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // No SESMT-SYSTEM, módulos de inteligência operam com bypass de RLS no esquema abs_intel
  // via service_role key. Se estiver ausente, o anonKey tentará acesso via RLS (o que pode falhar com permission denied).
  const key = serviceKey || anonKey;

  if (!url || !key) {
    throw new Error("Supabase data configuration unavailable (URL or Key missing)");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

async function validateBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { status: "UNAUTHORIZED", error: "Missing bearer token" };
  }

  const token = authHeader.split(" ")[1];
  const client = createAuthClient();

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    return { status: "UNAUTHORIZED", error: error?.message || "Invalid or expired session token" };
  }

  return { status: "AUTHORIZED", user };
}

// ---------------------------------------------------------------------------
// Handler principal (GET)
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const rawStart = url.searchParams.get("startDate");
  const rawEnd = url.searchParams.get("endDate");
  const isDebug = url.searchParams.get("debug") === "1";

  try {
    // Modo de Diagnóstico Automático
    if (isDebug) {
      console.info(`[psy-view] debug_mode_triggered [${requestId}]`);
      const dataClient = createDataClient();
      const tablesToScan = [
        "abs_dim_psychosocial_factor",
        "abs_dim_fator_psicossocial",
        "abs_dim_psicossocial_fator",
        "abs_fact_psychosocial_assessment",
        "abs_fact_avaliacao_psicossocial",
        "abs_fact_psicossocial_avaliacao",
        "abs_fact_psychosocial_signal",
        "abs_fact_sinal_psicossocial",
        "abs_fact_psicossocial_sinal",
        "abs_dim_vinculo_servidor",
        "abs_dim_servidor",
        "abs_dim_tempo"
      ];

      const diagnostics: any = {
        requestId,
        timestamp: new Date().toISOString(),
        env: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        discovery: []
      };

      for (const table of tablesToScan) {
        const { data, error } = await dataClient.schema("abs_intel").from(table).select("*").limit(1);
        diagnostics.discovery.push({
          table,
          status: error ? (error.code === 'PGRST205' ? 'MISSING' : `ERROR_${error.code}`) : 'FOUND',
          msg: error?.message || `Ok (${data?.length || 0} rows)`
        });
      }

      return jsonResponse({ diagnostics }, 200, requestId);
    }

    // 1. Autenticação
    const authResult = await validateBearerToken(request);
    if (authResult.status !== "AUTHORIZED") {
      console.warn(`[psy-view] auth_failed [${requestId}]:`, authResult.error);
      return errorResponse(
        requestId,
        "UNAUTHORIZED",
        "Sessão inválida ou expirada. Faça login novamente.",
        401,
      );
    }

    // 2. Parâmetros de data
    const startDate = parseIsoDate(rawStart);
    const endDate = parseIsoDate(rawEnd);

    if (!startDate || !endDate) {
      return errorResponse(
        requestId,
        "INVALID_PARAMETERS",
        "As datas de início e fim são obrigatórias (formato YYYY-MM-DD).",
        400,
      );
    }

    if (endDate < startDate) {
      return errorResponse(
        requestId,
        "INVALID_INTERVAL",
        "A data de fim não pode ser anterior à data de início.",
        400,
      );
    }

    const interval = daysBetween(startDate, endDate);
    if (interval > MAX_INTERVAL_DAYS) {
      return errorResponse(
        requestId,
        "INTERVAL_TOO_LARGE",
        `O intervalo máximo permitido é de ${MAX_INTERVAL_DAYS} dias.`,
        400,
      );
    }

    // 3. Inicialização de Repositórios e Aplicação
    console.info(`[psy-view] initializing [${requestId}]`);
    const dataClient = createDataClient();
    const repository = createSupabasePsychosocialRepository(dataClient);
    
    // 4. Execução da análise psicossocial
    console.info(`[psy-view] loading_dataset [${requestId}]`);
    const dataset = await repository.loadDataset();
    
    // Diagnóstico de Infraestrutura para o desenvolvedor
    console.log("[psy-view] Dataset Info:", {
      factors: dataset.factors.length,
      assessments: dataset.assessments.length,
      signals: dataset.signals.length,
      events: dataset.events.length,
      cids: dataset.cids.length,
      vinculos: dataset.vinculos.length
    });
    console.info(`[psy-view] dataset_loaded [${requestId}] size_assessments=${dataset.assessments.length}`);

    const result = reportPsychoRiskSignals(dataset, { startDate, endDate });
    console.info(`[psy-view] report_generated [${requestId}] signals=${result.signalsByAnalyticalGroup.length}`);

    // 5. Retorno dos dados
    return jsonResponse({ ...result, _v: "2.0-psy-strict" }, 200, requestId);
  } catch (err: any) {
    const isApplicationError = err instanceof PsychosocialApplicationError;
    const message = isApplicationError
      ? err.message
      : "Falha ao processar dados psicossociais.";
    
    // Captura detalhada para facilitar debug (ex: permission denied 42501)
    const dbErrorCode = err?.code || (err as any)?.originalError?.code;
    const dbErrorMessage = err?.message || (err as any)?.originalError?.message;
    
    let detailedMessage = message;
    if (dbErrorCode === '42501') {
      detailedMessage = `${message} [ERRO_ACESS_NEGADO_DB] A chave SUPABASE_SERVICE_ROLE_KEY pode estar ausente ou inválida para o esquema abs_intel.`;
    } else if (err instanceof Error) {
      detailedMessage = `${message} [${dbErrorCode || 'INTERNAL_ERROR'}] ${dbErrorMessage || err.message}`;
    }

    console.error(`[psy-view] error [${requestId}]:`, {
      code: dbErrorCode,
      message: dbErrorMessage,
      stack: err.stack,
      requestStart: rawStart,
      requestEnd: rawEnd
    });

    return errorResponse(
      requestId,
      isApplicationError ? "APP_ERROR" : "INTERNAL_ERROR",
      detailedMessage,
      500,
    );
  }
}
