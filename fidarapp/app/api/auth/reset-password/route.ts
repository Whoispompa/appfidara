import { NextRequest, NextResponse } from "next/server";

const apiUrl = (
  process.env.FIDARA_API_URL ?? "https://api.fidara.mx"
).replace(/\/+$/, "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const upstream = await fetch(`${apiUrl}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await upstream.text();
    let payload;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    return NextResponse.json(
      payload ?? {
        success: false,
        message: `La API respondió con el código ${upstream.status}.`,
      },
      {
        status: upstream.status,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "No fue posible conectar con Fidara." },
      { status: 502 },
    );
  }
}
