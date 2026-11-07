import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.FIDARA_API_URL ?? "https://api.fidara.mx";

interface RouteContext {
  params: Promise<{ organizationUserId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  const token = cookieStore.get("fidara_token")?.value;
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
      `${apiUrl}/api/team/${organizationUserId}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

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
  } catch {
    return NextResponse.json(
      { success: false, message: "No fue posible conectar con Fidara." },
      { status: 502 },
    );
  }
}
