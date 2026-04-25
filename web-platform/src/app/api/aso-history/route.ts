import { createClient } from "@supabase/supabase-js";
import { maskCpf } from "@/lib/record-utils";

const REQUEST_ID_HEADER = "x-request-id";

function resolveRequestId(request: Request): string {
  const existing = request.headers.get(REQUEST_ID_HEADER);
  if (existing && /^[A-Za-z0-9_-]{4,64}$/.test(existing)) return existing;
  const random = Math.random().toString(36).slice(2, 10);
  return `aso-history-${Date.now()}-${random}`;
}

function jsonResponse(body: unknown, status: number, requestId: string) {
  const safeBody = body === undefined ? {} : body;
  return new Response(JSON.stringify(safeBody), {
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
) {
  return jsonResponse({ error: { code, message } }, status, requestId);
}

function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase auth configuration unavailable");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createDataClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // For writes we require the service role key. Do NOT fallback to the public anon key.
  if (!url || !serviceKey)
    throw new Error(
      "Supabase service role key unavailable for server-side writes",
    );

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

async function validateBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer "))
    return { status: "UNAUTHORIZED", error: "Missing bearer token" };

  const token = authHeader.split(" ")[1];
  const client = createAuthClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return { status: "UNAUTHORIZED", error: error?.message || "Invalid token" };
  }
  return { status: "AUTHORIZED", user: data.user };
}

function isIsoDateString(v: unknown) {
  if (typeof v !== "string") return false;
  // Accepts YYYY-MM-DD or full ISO parseable by Date
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

function sanitizeString(s: unknown, max = 200) {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (t.length === 0) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function validateCpf(raw: unknown) {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return null;
  return digits;
}

function validateExams(exams: unknown) {
  if (!Array.isArray(exams)) return null;
  const MAX_EXAMS = 30;
  if (exams.length > MAX_EXAMS) return null;
  const out: Array<{ name: string; date?: string }> = [];
  for (const e of exams) {
    if (!e || typeof e !== "object") return null;
    const name = sanitizeString((e as any).name, 200);
    if (!name) return null;
    const dateRaw = (e as any).date;
    if (dateRaw) {
      if (!isIsoDateString(dateRaw)) return null;
      out.push({ name, date: new Date(dateRaw).toISOString() });
    } else {
      out.push({ name });
    }
  }
  return out;
}

export async function POST(request: Request) {
  const requestId = resolveRequestId(request);
  try {
    // 1) Autenticação
    const auth = await validateBearerToken(request);
    if (auth.status !== "AUTHORIZED") {
      console.warn(`[aso-history] auth_failed [${requestId}]`, auth.error);
      return errorResponse(
        requestId,
        "UNAUTHORIZED",
        "Sessão inválida ou expirada.",
        401,
      );
    }

    const user = auth.user as any;

    // 2) Autorização (consultar role em `profiles` via client server-side seguro)
    let authClient;
    try {
      authClient = createDataClient();
    } catch (cfgErr: any) {
      console.error(`[aso-history] [${requestId}] server_configuration`, {
        message: cfgErr?.message,
      });
      return errorResponse(
        requestId,
        "SERVER_CONFIGURATION",
        "Serviço indisponível.",
        500,
      );
    }

    const { data: profile, error: profileError } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", user?.id)
      .maybeSingle();

    if (profileError) {
      console.error(`[aso-history] [${requestId}] profile_query_error`, {
        code: profileError?.code,
        user: user?.id,
      });
      return errorResponse(
        requestId,
        "SERVER_ERROR",
        "Serviço indisponível.",
        500,
      );
    }

    const role = profile?.role || "viewer";
    const ALLOWED_ROLES = ["admin", "nurse", "operator", "doctor"];
    if (!ALLOWED_ROLES.includes(role)) {
      console.warn(`[aso-history] [${requestId}] forbidden_role`, {
        role,
        user: user?.id,
      });
      return errorResponse(requestId, "FORBIDDEN", "Acesso negado.", 403);
    }

    // 3) Agora parse e validação do payload
    let body: any;
    try {
      body = await request.json();
    } catch (err) {
      return errorResponse(
        requestId,
        "INVALID_JSON",
        "Payload não é JSON válido.",
        400,
      );
    }

    if (!body || typeof body !== "object") {
      return errorResponse(
        requestId,
        "INVALID_PAYLOAD",
        "Payload deve ser um objeto JSON.",
        400,
      );
    }

    const servidor_cpf = validateCpf(body.servidor_cpf);
    const servidor_nome = sanitizeString(body.servidor_nome, 200);
    const aso_type = sanitizeString(body.aso_type, 100);

    if (!servidor_cpf || !servidor_nome || !aso_type) {
      return errorResponse(
        requestId,
        "MISSING_FIELDS",
        "Campos obrigatórios ausentes ou inválidos: servidor_cpf, servidor_nome, aso_type.",
        400,
      );
    }

    const servidor_nascimento =
      body.servidor_nascimento && isIsoDateString(body.servidor_nascimento)
        ? new Date(body.servidor_nascimento).toISOString()
        : null;

    const contrato = sanitizeString(body.contrato, 50);
    const cargo = sanitizeString(body.cargo, 150);
    const secretaria = sanitizeString(body.secretaria, 150);
    const ghe_conj = sanitizeString(body.ghe_conj, 150);
    const function_name = sanitizeString(body.function_name, 150);
    const risks = sanitizeString(body.risks, 2000);

    const exams_json = body.exams_json ? validateExams(body.exams_json) : [];
    if (body.exams_json && exams_json === null) {
      return errorResponse(
        requestId,
        "INVALID_EXAMS",
        "exams_json inválido.",
        400,
      );
    }

    const generated_at =
      body.generated_at && isIsoDateString(body.generated_at)
        ? new Date(body.generated_at).toISOString()
        : new Date().toISOString();

    const generated_by = user?.id;
    const operator_name =
      (user?.user_metadata?.full_name as string) || user?.email || generated_by;

    const record: any = {
      servidor_cpf,
      servidor_nome,
      servidor_nascimento,
      contrato,
      aso_type,
      cargo,
      secretaria,
      ghe_conj,
      function_name,
      risks,
      exams_json,
      generated_at,
      generated_by,
      operator_name,
    };

    // 4) Criar client de escrita e inserir
    let dataClient;
    try {
      dataClient = createDataClient();
    } catch (cfgErr: any) {
      console.error(`[aso-history] [${requestId}] server_configuration`, {
        message: cfgErr?.message,
      });
      return errorResponse(
        requestId,
        "SERVER_CONFIGURATION",
        "Serviço indisponível.",
        500,
      );
    }

    const { data, error } = await dataClient
      .from("aso_history")
      .insert(record)
      .select("id")
      .maybeSingle();

    if (error) {
      // Log reduzido sem mensagem sensível do DB
      console.error(`[aso-history] [${requestId}] db_insert_error`, {
        code: error?.code,
        user: generated_by,
        cpf: maskCpf(servidor_cpf),
      });
      return errorResponse(
        requestId,
        "DB_ERROR",
        "Falha ao salvar registro.",
        500,
      );
    }

    const insertedId = data?.id ?? null;

    console.info(`[aso-history] [${requestId}] created`, {
      id: insertedId,
      user: generated_by,
      cpf: maskCpf(servidor_cpf),
    });

    return jsonResponse({ ok: true, id: insertedId }, 201, requestId);
  } catch (err: any) {
    console.error(
      `[aso-history] [${resolveRequestId(request)}] unexpected_error`,
      {
        message: err?.message,
        stack: err?.stack,
      },
    );
    return errorResponse(
      resolveRequestId(request),
      "INTERNAL_ERROR",
      "Falha ao processar requisição.",
      500,
    );
  }
}
