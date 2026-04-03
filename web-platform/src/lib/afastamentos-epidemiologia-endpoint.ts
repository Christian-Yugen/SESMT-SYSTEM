import {
  EpidemiologyApplicationError,
  type EpidemiologyApplicationRepository,
  buildEpidemiologyContractFromRepository,
} from "@/lib/afastamentos-epidemiologia-application";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_ID_HEADER = "x-request-id";
const INTERNAL_ACCESS_HEADER = "x-internal-api-key";
const MAX_INTERVAL_DAYS = 1096;

interface EndpointDependencies {
  repository: EpidemiologyApplicationRepository;
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
}

type EndpointLogger = (entry: EndpointLogEntry) => void;

function buildRequestId(request: Request): string {
  const existing = request.headers.get(REQUEST_ID_HEADER);
  if (existing && /^[A-Za-z0-9_-]{4,64}$/.test(existing)) {
    return existing;
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `epi-${Date.now()}-${random}`;
}

function defaultLogger(entry: EndpointLogEntry): void {
  const payload = {
    requestId: entry.requestId,
    status: entry.status,
    detail: entry.detail,
  };

  const message = `[absenteismo-epidemiologia] ${entry.event}`;
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

export async function handleEpidemiologyContractRequest(
  request: Request,
  deps: EndpointDependencies,
): Promise<Response> {
  const requestId = buildRequestId(request);

  writeLog(deps, {
    level: "info",
    event: "request_received",
    requestId,
    detail: request.method,
  });

  if (!isInternalAccessAuthorized(request, deps.requiredAccessToken)) {
    writeLog(deps, {
      level: "warn",
      event: "request_rejected",
      requestId,
      status: 401,
      detail: "invalid_internal_access",
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
    });
    return errorResponse(
      requestId,
      "UNSUPPORTED_METHOD",
      "Metodo nao suportado para este endpoint.",
      405,
    );
  }

  const url = new URL(request.url);
  const startDate = parseIsoDate(url.searchParams.get("startDate"));
  const endDate = parseIsoDate(url.searchParams.get("endDate"));
  const minPopulationRaw = url.searchParams.get("minPopulationForStableCut");
  const minPopulation = parsePositiveInteger(minPopulationRaw);

  if (!startDate || !endDate) {
    writeLog(deps, {
      level: "warn",
      event: "request_rejected",
      requestId,
      status: 400,
      detail: "missing_or_invalid_dates",
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
    });
    return errorResponse(
      requestId,
      "INVALID_QUERY_PARAMS",
      `Intervalo excede limite maximo de ${MAX_INTERVAL_DAYS} dias.`,
      400,
    );
  }

  if (minPopulationRaw !== null && minPopulation === null) {
    writeLog(deps, {
      level: "warn",
      event: "request_rejected",
      requestId,
      status: 400,
      detail: "invalid_min_population",
    });
    return errorResponse(
      requestId,
      "INVALID_QUERY_PARAMS",
      "minPopulationForStableCut deve ser inteiro positivo.",
      400,
    );
  }

  try {
    const contract = await buildEpidemiologyContractFromRepository(
      deps.repository,
      {
        period: {
          startDate,
          endDate,
        },
        options: {
          generatedAt: (deps.now || (() => new Date()))().toISOString(),
          minPopulationForStableCut: minPopulation ?? undefined,
        },
      },
    );

    writeLog(deps, {
      level: "info",
      event: "request_succeeded",
      requestId,
      status: 200,
      detail: "contract_generated",
    });

    return jsonResponse(contract, 200, requestId);
  } catch (error) {
    if (error instanceof EpidemiologyApplicationError) {
      writeLog(deps, {
        level: "error",
        event: "request_failed",
        requestId,
        status: 500,
        detail: "controlled_application_error",
      });
      return errorResponse(
        requestId,
        "INTERNAL_ERROR",
        "Falha controlada ao montar contrato epidemiologico.",
        500,
      );
    }

    writeLog(deps, {
      level: "error",
      event: "request_failed",
      requestId,
      status: 500,
      detail: "unexpected_error",
    });

    return errorResponse(
      requestId,
      "INTERNAL_ERROR",
      "Falha interna ao processar solicitacao epidemiologica.",
      500,
    );
  }
}
