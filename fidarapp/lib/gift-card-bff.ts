import "server-only";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const apiUrl = (process.env.FIDARA_API_URL ?? "https://api.fidara.mx").replace(
  /\/+$/,
  "",
);

type ProxyOptions = {
  method?: "GET" | "POST";
  requireLocation?: boolean;
};

function errorResponse(status: number, message: string, code?: string) {
  return NextResponse.json(
    { success: false, message, ...(code ? { code } : {}) },
    { status },
  );
}

export async function proxyGiftCardRequest(
  request: NextRequest,
  path: string,
  options: ProxyOptions = {},
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("fidara_token")?.value;
  const locationId = cookieStore.get("fidara_location_id")?.value;

  if (!token) {
    return errorResponse(401, "Tu sesión ha expirado.");
  }

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

    if (method === "POST") {
      const requestBody = (await request.json()) as Record<string, unknown>;
      body = JSON.stringify(
        options.requireLocation ? { ...requestBody, locationId } : requestBody,
      );
    }

    const upstream = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
    });

    const raw = await upstream.text();
    let payload: unknown;

    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = {
        success: false,
        message: `La API respondió con el código ${upstream.status}.`,
      };
    }

    return NextResponse.json(payload, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch {
    return errorResponse(502, "No fue posible conectar con Fidara.");
  }
}
