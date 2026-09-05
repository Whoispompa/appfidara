import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.FIDARA_API_URL ?? "https://api.fidara.mx";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  const token = cookieStore.get("fidara_token")?.value;

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

  const body = await request.json();

  try {
    const upstream = await fetch(`${apiUrl}/api/wallet/cards/stamps`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => ({
      success: false,
      message: "La API no respondió correctamente.",
    }));

    return NextResponse.json(payload, {
      status: upstream.status,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "No fue posible conectar con Fidara.",
      },
      {
        status: 502,
      },
    );
  }
}
