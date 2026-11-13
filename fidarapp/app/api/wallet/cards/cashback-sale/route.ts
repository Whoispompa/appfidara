import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const apiUrl = (
  process.env.FIDARA_API_URL ??
  "https://api.fidara.mx"
).replace(/\/+$/, "");

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("fidara_token")?.value;

  const locationId =
    cookieStore.get("fidara_location_id")?.value;

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

  if (!locationId) {
    return NextResponse.json(
      {
        success: false,
        code: "LOCATION_REQUIRED",
        message:
          "Debes seleccionar una sucursal antes de registrar la compra.",
      },
      {
        status: 409,
      },
    );
  }

  try {
    const body = await request.json();

    const upstream = await fetch(
      `${apiUrl}/api/wallet/cards/cashback-sale`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          ...body,

          // La sucursal siempre se toma
          // de la sesión del usuario.
          locationId,
        }),

        cache: "no-store",
      },
    );

    const rawResponse =
      await upstream.text();

    let payload: Record<string, unknown>;

    try {
      payload = rawResponse
        ? JSON.parse(rawResponse)
        : {};
    } catch {
      payload = {
        success: false,
        message:
          `La API respondió con el código ${upstream.status}.`,
      };
    }

    return NextResponse.json(payload, {
      status: upstream.status,

      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error(
      "[wallet/cashback-sale] Error:",
      error,
    );

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