import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const apiUrl = (
  process.env.FIDARA_API_URL ??
  "https://api.fidara.mx"
).replace(/\/+$/, "");

export async function POST(
  request: NextRequest,
) {
  try {
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

    const body = await request.json();

    const upstreamUrl =
      `${apiUrl}/api/wallet/cards/lookup`;

    console.log(
      "[wallet/lookup] API destino:",
      upstreamUrl,
    );

    const upstream = await fetch(
      upstreamUrl,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

    const rawResponse = await upstream.text();

    let payload: {
      success?: boolean;
      message?: string;
      [key: string]: unknown;
    };

    try {
      payload = rawResponse
        ? JSON.parse(rawResponse)
        : {
            success: false,
            message:
              "La API respondió sin contenido.",
          };
    } catch {
      console.error(
        "[wallet/lookup] Respuesta no válida:",
        {
          url: upstreamUrl,
          status: upstream.status,
          statusText: upstream.statusText,
          response: rawResponse,
        },
      );

      payload = {
        success: false,
        message:
          `La API respondió con el código ${upstream.status}.`,
      };
    }

    if (!upstream.ok) {
      console.error(
        "[wallet/lookup] Error de la API:",
        {
          url: upstreamUrl,
          status: upstream.status,
          payload,
        },
      );
    }

    return NextResponse.json(
      payload,
      {
        status: upstream.status,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error(
      "[wallet/lookup] Error del proxy:",
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