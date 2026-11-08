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

  try {
    const body = await request.json();

    if (!body.locationId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Debes seleccionar una sucursal.",
        },
        {
          status: 400,
        },
      );
    }

    const upstream = await fetch(
      `${apiUrl}/api/session/location`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          locationId: body.locationId,
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

    if (!upstream.ok) {
      return NextResponse.json(payload, {
        status: upstream.status,
      });
    }

    const locationId =
      payload?.data?.id;

    if (!locationId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La API no confirmó la sucursal.",
        },
        {
          status: 502,
        },
      );
    }

    const response =
      NextResponse.json(payload);

    response.cookies.set(
      "fidara_location_id",
      locationId,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",
        path: "/",

        // La cookie no da acceso sin el JWT.
        maxAge: 60 * 60 * 24 * 14,
      },
    );

    return response;
  } catch (error) {
    console.error(
      "[session/location] Error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible seleccionar la sucursal.",
      },
      {
        status: 502,
      },
    );
  }
}