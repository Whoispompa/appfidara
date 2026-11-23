import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const apiUrl =
  process.env.FIDARA_API_URL ??
  "https://api.fidara.mx";

export async function GET(
  request: NextRequest,
) {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("fidara_token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "Tu sesión ha expirado.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const query =
      request.nextUrl.searchParams.toString();

    const endpoint = query
      ? `${apiUrl}/api/customers?${query}`
      : `${apiUrl}/api/customers`;

    const upstream = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const payload = await upstream
      .json()
      .catch(() => ({
        success: false,
        message:
          "La API no respondió correctamente.",
      }));

    return NextResponse.json(payload, {
      status: upstream.status,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible conectar con Fidara.",
      },
      {
        status: 502,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  if (
    process.env.FIDARA_SUBSCRIPTIONS_ENABLED !== "true"
  ) {
    return NextResponse.json(
      {
        success: false,
        code: "SUBSCRIPTIONS_DISABLED",
        message: "La modalidad Suscripciones aún no está disponible.",
      },
      { status: 404 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("fidara_token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Tu sesión ha expirado." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const upstream = await fetch(`${apiUrl}/api/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: body.firstName,
        lastName: body.lastName ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        birthDate: body.birthDate ?? null,
        marketingConsent: body.marketingConsent === true,
      }),
      cache: "no-store",
    });
    const raw = await upstream.text();
    const contentType = upstream.headers.get("content-type")?.toLowerCase() ?? "";

    if (!raw.trim() || !contentType.includes("json")) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_UPSTREAM_RESPONSE",
          message: `Fidara.Api no respondió correctamente (HTTP ${upstream.status}).`,
        },
        { status: upstream.status || 502 },
      );
    }

    try {
      return NextResponse.json(JSON.parse(raw), {
        status: upstream.status,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_UPSTREAM_JSON",
          message: `Fidara.Api devolvió JSON inválido (HTTP ${upstream.status}).`,
        },
        { status: upstream.status || 502 },
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, message: "No fue posible conectar con Fidara." },
      { status: 502 },
    );
  }
}
