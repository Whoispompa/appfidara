import "server-only";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const apiUrl = (process.env.FIDARA_API_URL ?? "https://api.fidara.mx").replace(
  /\/+$/,
  "",
);

type ProxyOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  requireLocation?: boolean;
};

function errorResponse(status: number, message: string, code?: string) {
  return NextResponse.json(
    { success: false, message, ...(code ? { code } : {}) },
    { status },
  );
}

export async function proxySubscriptionRequest(
  request: NextRequest,
  path: string,
  options: ProxyOptions = {},
) {
  if (process.env.FIDARA_SUBSCRIPTIONS_ENABLED !== "true") {
    return errorResponse(
      404,
      "La modalidad Suscripciones aún no está disponible.",
      "SUBSCRIPTIONS_DISABLED",
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("fidara_token")?.value;
  const locationId = cookieStore.get("fidara_location_id")?.value;
  if (!token) return errorResponse(401, "Tu sesión ha expirado.");
  if (options.requireLocation && !locationId) {
    return errorResponse(
      409,
      "Debes seleccionar una sucursal antes de continuar.",
      "LOCATION_REQUIRED",
    );
  }

  const method = options.method ?? "GET";
  try {
    let body: string | undefined;
    if (method !== "GET") {
      const requestBody = (await request.json()) as Record<string, unknown>;
      body = JSON.stringify(
        options.requireLocation ? { ...requestBody, locationId } : requestBody,
      );
    }
    const upstream = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
    });
    const raw = await upstream.text();
    const contentType = upstream.headers.get("content-type")?.toLowerCase() ?? "";
    const responseHeaders = {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    if (!raw.trim()) {
      if (
        upstream.status === 204 ||
        upstream.status === 205 ||
        upstream.status === 304
      ) {
        return new NextResponse(null, {
          status: upstream.status,
          headers: responseHeaders,
        });
      }

      return NextResponse.json(
        {
          success: false,
          code: "EMPTY_UPSTREAM_RESPONSE",
          message: `Fidara.Api respondió sin contenido (HTTP ${upstream.status}).`,
        },
        { status: upstream.status, headers: responseHeaders },
      );
    }

    if (!contentType.includes("json")) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_UPSTREAM_CONTENT_TYPE",
          message: `Fidara.Api devolvió una respuesta no JSON (HTTP ${upstream.status}).`,
        },
        { status: upstream.status, headers: responseHeaders },
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_UPSTREAM_JSON",
          message: `Fidara.Api devolvió JSON inválido (HTTP ${upstream.status}).`,
        },
        { status: upstream.status, headers: responseHeaders },
      );
    }
    return NextResponse.json(payload, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return errorResponse(502, "No fue posible conectar con Fidara.");
  }
}
