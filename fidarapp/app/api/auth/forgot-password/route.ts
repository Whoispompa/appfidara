import { NextRequest, NextResponse } from "next/server";

const apiUrl = (
  process.env.FIDARA_API_URL ??
  "https://api.fidara.mx"
).replace(/\/+$/, "");

export async function POST(
  request: NextRequest,
) {
  try {
    const body = await request.json();

    const endpoint =
      `${apiUrl}/api/auth/forgot-password`;

    console.log(
      "[forgot-password] Endpoint:",
      endpoint,
    );

    console.log(
      "[forgot-password] Email recibido:",
      body.email,
    );

    const upstream = await fetch(endpoint, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        email: body.email,
      }),

      cache: "no-store",
    });

    const responseText =
      await upstream.text();

    console.log(
      "[forgot-password] Status API:",
      upstream.status,
    );

    console.log(
      "[forgot-password] Respuesta API:",
      responseText,
    );

    let payload;

    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = {
        success: false,
        message:
          responseText ||
          "La API no respondió correctamente.",
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
      "[forgot-password] Error del proxy:",
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