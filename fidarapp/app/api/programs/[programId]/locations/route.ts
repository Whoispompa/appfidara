import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const apiUrl = (process.env.FIDARA_API_URL ?? "https://api.fidara.mx").replace(
  /\/+$/,
  "",
);

type RouteContext = { params: Promise<{ programId: string }> };

async function proxyLocations(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "PUT",
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("fidara_token")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Tu sesión ha expirado." },
      { status: 401 },
    );
  }

  const { programId } = await context.params;
  if (!programId) {
    return NextResponse.json(
      { success: false, message: "El programa no es válido." },
      { status: 400 },
    );
  }

  try {
    const body = method === "PUT" ? JSON.stringify(await request.json()) : undefined;
    const upstream = await fetch(
      `${apiUrl}/api/programs/${encodeURIComponent(programId)}/locations`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
        },
        body,
        cache: "no-store",
      },
    );

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
    return NextResponse.json(
      { success: false, message: "No fue posible conectar con Fidara." },
      { status: 502 },
    );
  }
}

export function GET(request: NextRequest, context: RouteContext) {
  return proxyLocations(request, context, "GET");
}

export function PUT(request: NextRequest, context: RouteContext) {
  return proxyLocations(request, context, "PUT");
}
