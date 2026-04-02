import { createClient } from "@supabase/supabase-js";

import { createSupabaseEpidemiologyRepository } from "@/lib/afastamentos-epidemiologia-application";
import { handleEpidemiologyContractRequest } from "@/lib/afastamentos-epidemiologia-endpoint";

const REQUEST_ID_HEADER = "x-request-id";

function resolveRequestId(request: Request): string {
  const requestId = request.headers.get(REQUEST_ID_HEADER);
  if (requestId && /^[A-Za-z0-9_-]{4,64}$/.test(requestId)) {
    return requestId;
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `epi-${Date.now()}-${random}`;
}

function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration unavailable");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const requestId = resolveRequestId(request);

  try {
    const internalAccessToken = process.env.ABSENTEISMO_INTERNAL_API_KEY;
    if (!internalAccessToken) {
      throw new Error("Internal endpoint access token unavailable");
    }

    const client = createServerSupabaseClient();
    const repository = createSupabaseEpidemiologyRepository(client);
    return handleEpidemiologyContractRequest(request, {
      repository,
      requiredAccessToken: internalAccessToken,
    });
  } catch {
    console.error("[absenteismo-epidemiologia] route_unavailable", {
      requestId,
      status: 503,
    });

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Servico indisponivel para contrato epidemiologico.",
        },
      }),
      {
        status: 503,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          [REQUEST_ID_HEADER]: requestId,
        },
      },
    );
  }
}
