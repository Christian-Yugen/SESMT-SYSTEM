import {
  PsychosocialApplicationError,
  type PsychosocialRepository,
} from "@/lib/afastamentos-psychosocial";
import {
  buildPsychosocialConsumptionContractFromRepository,
  type PsychosocialConsumptionContract,
} from "@/lib/afastamentos-psychosocial-contrato";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_ID_HEADER = "x-request-id";
const INTERNAL_ACCESS_HEADER = "x-internal-api-key";
const MAX_INTERVAL_DAYS = 1096;
const MAX_QUERY_LENGTH = 256;
const ALLOWED_QUERY_PARAMS = new Set([
  "startDate",
  "endDate",
  "minAssessmentsForStableCriticality",
  "minSignalsForStableCriticality",
]);

interface EndpointDependencies {
  repository: PsychosocialRepository;
  now?: () => Date;
  requiredAccessToken?: string;
  logger?: EndpointLogger;
}

interface EndpointErrorBody {
  error: {
    code:
      | "INVALID_QUERY_PARAMS"
      | "UNSUPPORTED_METHOD"
      | "UNAUTHORIZED"
      | "INTERNAL_ERROR";
    message: string;
  };
}

interface EndpointLogEntry {
  level: "info" | "warn" | "error";
  event: string;
  requestId: string;
  status?: number;
  detail?: string;
  durationMs?: number;
}

type EndpointLogger = (entry: EndpointLogEntry) => void;

function buildRequestId(request: Request): string {
  const existing = request.headers.get(REQUEST_ID_HEADER);
  if (existing && /^[A-Za-z0-9_-]{4,64}$/.test(existing)) {
    return existing;
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `psy-${Date.now()}-${random}`;
}

function defaultLogger(entry: EndpointLogEntry): void {
  const payload = {
    requestId: entry.requestId,
    status: entry.status,
    detail: entry.detail,
    durationMs: entry.durationMs,
  };

  const message = `[absenteismo-psychosocial] ${entry.event}`;
  if (entry.level === "error") {
    console.error(message, payload);
    return;
  }

  if (entry.level === "warn") {
    console.warn(message, payload);
    return;
  }

  console.info(message, payload);
}

function writeLog(deps: EndpointDependencies, entry: EndpointLogEntry): void {
  try {
    (deps.logger || defaultLogger)(entry);
  } catch {
    // Log deve ser best effort e nunca afetar o fluxo do endpoint.
  }
}

function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
): Response {
  return new Response(JSON.stringify(body), {
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
  code: EndpointErrorBody["error"]["code"],
  message: string,
  status: number,
): Response {
  return jsonResponse(
    { error: { code, message } } satisfies EndpointErrorBody,
    status,
    requestId,
  );
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

function isInternalAccessAuthorized(
  request: Request,
  requiredAccessToken?: string,
): boolean {
  if (!requiredAccessToken) {
    return true;
  }

  const providedToken = request.headers.get(INTERNAL_ACCESS_HEADER);
  return providedToken === requiredAccessToken;
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function containsCausalLanguage(text: string): boolean {
  return /causad|culpa|provou que|determinou/i.test(text);
}

function isContractNonCausal(
  contract: PsychosocialConsumptionContract,
): boolean {
  const textToAudit = [
    ...contract.overview.audit.observacoes,
    ...contract.cuts.secretaria.map((item) => item.audit.justification),
    ...contract.cuts.cargo.map((item) => item.audit.justification),
    ...contract.cuts.localTrabalho.map((item) => item.audit.justification),
    ...contract.cuts.grupoAnalitico.map((item) => item.audit.justification),
    ...contract.cuts.cidCapitulo.map((item) => item.audit.justification),
    ...contract.cuts.cidCompativel.map((item) => item.audit.justification),
    ...contract.cuts.criticidade.map((item) => item.audit.justification),
  ].join(" ");

  return (
    contract.validation.consistency.isNonCausalLanguageConsistent &&
    !containsCausalLanguage(textToAudit)
  );
}

function validateQueryScope(url: URL): string | null {
  if (url.search.length > MAX_QUERY_LENGTH) {
    return "query_too_large";
  }

  for (const key of url.searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMS.has(key)) {
      return `unsupported_param:${key}`;
    }
  }

  return null;
}

export async function handlePsychosocialContractRequest(
  request: Request,
  deps: EndpointDependencies,
): Promise<Response> {
  const requestId = buildRequestId(request);
  const startedAt = Date.now();

  const elapsed = () => Date.now() - startedAt;

  writeLog(deps, {
    level: "info",
    event: "request_received",
    requestId,
    detail: request.method,
    durationMs: elapsed(),
  });

  if (!isInternalAccessAuthorized(request, deps.requiredAccessToken)) {
    writeLog(deps, {
      level: "warn",
      event: "request_rejected",
      requestId,
      status: 401,
      detail: "invalid_internal_access",
      durationMs: elapsed(),
    });
    return errorResponse(
      requestId,
      "UNAUTHORIZED",
      "Acesso interno nao autorizado para este endpoint.",
      401,
    );
  }

  if (request.method !== "GET") {
    writeLog(deps, {
      level: "warn",
      event: "request_rejected",
      requestId,
      status: 405,
      detail: "unsupported_method",
      durationMs: elapsed(),
    });
    return errorResponse(
      requestId,
      "UNSUPPORTED_METHOD",
      "Metodo nao suportado para este endpoint.",
      405,
    );
  }

  const url = new URL(request.url);
  const queryIssue = validateQueryScope(url);
  if (queryIssue) {
    writeLog(deps, {
      level: "warn",
      event: "request_rejected",
      requestId,
      status: 400,
      detail: queryIssue,
      durationMs: elapsed(),
    });
    return errorResponse(
      requestId,
      "INVALID_QUERY_PARAMS",
      "A consulta contem parametros nao suportados ou excede o limite permitido.",
      400,
    );
  }

  const startDate = parseIsoDate(url.searchParams.get("startDate"));
  const endDate = parseIsoDate(url.searchParams.get("endDate"));
  const minAssessmentsRaw = url.searchParams.get(
    "minAssessmentsForStableCriticality",
  );
  const minSignalsRaw = url.searchParams.get("minSignalsForStableCriticality");
  const minAssessmentsForStableCriticality =
    parsePositiveInteger(minAssessmentsRaw);
  const minSignalsForStableCriticality = parsePositiveInteger(minSignalsRaw);

  if (!startDate || !endDate) {
    writeLog(deps, {
      level: "warn",
      event: "request_rejected",
      requestId,
      status: 400,
      detail: "missing_or_invalid_dates",
      durationMs: elapsed(),
    });
    return errorResponse(
      requestId,
      "INVALID_QUERY_PARAMS",
      "Parametros startDate e endDate sao obrigatorios no formato YYYY-MM-DD.",
      400,
    );
  }

  if (startDate > endDate) {
    writeLog(deps, {
      level: "warn",
      event: "request_rejected",
      requestId,
      status: 400,
      detail: "invalid_date_interval",
      durationMs: elapsed(),
    });
    return errorResponse(
      requestId,
      "INVALID_QUERY_PARAMS",
      "startDate nao pode ser maior que endDate.",
      400,
    );
  }

  if (daysBetween(startDate, endDate) > MAX_INTERVAL_DAYS) {
    writeLog(deps, {
      level: "warn",
      event: "request_rejected",
      requestId,
      status: 400,
      detail: "interval_above_limit",
      durationMs: elapsed(),
    });
    return errorResponse(
      requestId,
      "INVALID_QUERY_PARAMS",
      `Intervalo excede limite maximo de ${MAX_INTERVAL_DAYS} dias.`,
      400,
    );
  }

  if (
    minAssessmentsRaw !== null &&
    minAssessmentsForStableCriticality === null
  ) {
    writeLog(deps, {
      level: "warn",
      event: "request_rejected",
      requestId,
      status: 400,
      detail: "invalid_min_assessments",
      durationMs: elapsed(),
    });
    return errorResponse(
      requestId,
      "INVALID_QUERY_PARAMS",
      "minAssessmentsForStableCriticality deve ser inteiro positivo.",
      400,
    );
  }

  if (minSignalsRaw !== null && minSignalsForStableCriticality === null) {
    writeLog(deps, {
      level: "warn",
      event: "request_rejected",
      requestId,
      status: 400,
      detail: "invalid_min_signals",
      durationMs: elapsed(),
    });
    return errorResponse(
      requestId,
      "INVALID_QUERY_PARAMS",
      "minSignalsForStableCriticality deve ser inteiro positivo.",
      400,
    );
  }

  try {
    const contract = await buildPsychosocialConsumptionContractFromRepository(
      deps.repository,
      {
        period: {
          startDate,
          endDate,
        },
        options: {
          generatedAt: (deps.now || (() => new Date()))().toISOString(),
          minAssessmentsForStableCriticality:
            minAssessmentsForStableCriticality ?? undefined,
          minSignalsForStableCriticality:
            minSignalsForStableCriticality ?? undefined,
        },
      },
    );

    writeLog(deps, {
      level: "info",
      event: "request_succeeded",
      requestId,
      status: 200,
      detail: "contract_generated",
      durationMs: elapsed(),
    });

    if (!isContractNonCausal(contract)) {
      writeLog(deps, {
        level: "error",
        event: "request_failed",
        requestId,
        status: 500,
        detail: "non_causal_language_guard_violation",
        durationMs: elapsed(),
      });
      return errorResponse(
        requestId,
        "INTERNAL_ERROR",
        "Falha de conformidade de linguagem do contrato psicossocial.",
        500,
      );
    }

    return jsonResponse(contract, 200, requestId);
  } catch (error) {
    if (error instanceof PsychosocialApplicationError) {
      writeLog(deps, {
        level: "error",
        event: "request_failed",
        requestId,
        status: 500,
        detail: "controlled_application_error",
        durationMs: elapsed(),
      });
      return errorResponse(
        requestId,
        "INTERNAL_ERROR",
        "Falha controlada ao montar contrato psicossocial.",
        500,
      );
    }

    writeLog(deps, {
      level: "error",
      event: "request_failed",
      requestId,
      status: 500,
      detail: "unexpected_error",
      durationMs: elapsed(),
    });

    return errorResponse(
      requestId,
      "INTERNAL_ERROR",
      "Falha interna ao processar solicitacao psicossocial.",
      500,
    );
  }
}
