import {
  NextRequest,
  NextResponse,
} from "next/server";

import { cookies } from "next/headers";

const apiUrl = (
  process.env.FIDARA_API_URL ??
  "https://api.fidara.mx"
).replace(/\/+$/, "");

export async function POST(
  request: NextRequest,
) {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("fidara_token")?.value;

  const locationId =
    cookieStore.get(
      "fidara_location_id",
    )?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Tu sesión ha expirado.",
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
          "Debes seleccionar una sucursal antes de agregar sellos.",
      },
      {
        status: 409,
      },
    );
  }

  try {
    const body = await request.json();

    const upstream = await fetch(
      `${apiUrl}/api/wallet/cards/stamps`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          ...body,

          // La cookie tiene prioridad sobre
          // cualquier valor enviado por el navegador.
          locationId,
        }),

        cache: "no-store",
      },
    );

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
  } catch (error) {
    console.error(
      "[wallet/stamps] Error:",
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