import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.FIDARA_API_URL ?? "https://api.fidara.mx";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get("fidara_token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sesión no válida." },
      { status: 401 },
    );
  }

  try {
    const { campaignId } = await context.params;
    const upstream = await fetch(
      `${API_URL}/api/notifications/${encodeURIComponent(campaignId)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    const text = await upstream.text();
    let payload: unknown = {};

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }
    }

    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    console.error("[notifications/detail] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "No fue posible comunicarse con la API de Fidara.",
      },
      { status: 502 },
    );
  }
}
