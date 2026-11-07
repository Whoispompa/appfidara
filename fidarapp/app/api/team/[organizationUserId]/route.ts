import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.FIDARA_API_URL ?? "https://api.fidara.mx";

interface RouteContext {
  params: Promise<{ organizationUserId: string }>;
}

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get("fidara_token")?.value;
}

async function respond(upstream: Response) {
  const payload = await upstream.json().catch(() => ({
    success: false,
    message: "La API no respondió correctamente.",
  }));

  return NextResponse.json(payload, {
    status: upstream.status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const token = await getToken();
  const { organizationUserId } = await context.params;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Tu sesión ha expirado." },
      { status: 401 },
    );
  }

  try {
    const upstream = await fetch(
      `${apiUrl}/api/team/${organizationUserId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );

    return respond(upstream);
  } catch {
    return NextResponse.json(
      { success: false, message: "No fue posible conectar con Fidara." },
      { status: 502 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const token = await getToken();
  const { organizationUserId } = await context.params;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Tu sesión ha expirado." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const upstream = await fetch(
      `${apiUrl}/api/team/${organizationUserId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

    return respond(upstream);
  } catch {
    return NextResponse.json(
      { success: false, message: "No fue posible conectar con Fidara." },
      { status: 502 },
    );
  }
}
