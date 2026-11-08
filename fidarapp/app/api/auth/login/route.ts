import {
  NextRequest,
  NextResponse,
} from "next/server";

const apiUrl = (
  process.env.FIDARA_API_URL ??
  "https://api.fidara.mx"
).replace(/\/+$/, "");

export async function POST(
  request: NextRequest,
) {
  try {
    const body = await request.json();

    const upstream = await fetch(
      `${apiUrl}/api/auth/login`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          email: body.email,
          password: body.password,
        }),

        cache: "no-store",
      },
    );

    const payload = await upstream
      .json()
      .catch(() => ({
        success: false,
        message:
          "La API de Fidara no respondió correctamente.",
      }));

    if (!upstream.ok) {
      return NextResponse.json(payload, {
        status: upstream.status,
      });
    }

    const data = payload?.data;
    const token = data?.token;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La respuesta no incluyó un token de acceso.",
        },
        {
          status: 502,
        },
      );
    }

    const locations = Array.isArray(data.locations)
      ? data.locations
      : [];

    const defaultLocationId =
      data.defaultLocationId ??
      (locations.length === 1
        ? locations[0]?.id
        : null);

    const requiresLocationSelection =
      locations.length > 1 ||
      data.requiresLocationSelection === true;

    let nextPath = "/dashboard";

    if (requiresLocationSelection) {
      nextPath = "/seleccionar-sucursal";
    } else if (
      locations.length === 0 &&
      (data.roleId === 1 || data.roleId === 2)
    ) {
      nextPath = "/dashboard/ubicaciones";
    }

    const response = NextResponse.json({
      ...payload,

      data: {
        ...data,

        // Nunca exponemos el JWT al navegador.
        token: undefined,

        defaultLocationId,
        requiresLocationSelection,
        nextPath,
      },
    });

    const secure =
      process.env.NODE_ENV === "production";

    const sessionMaxAge = body.remember
      ? 60 * 60 * 24 * 14
      : 60 * 60 * 8;

    response.cookies.set(
      "fidara_token",
      token,
      {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAge,
      },
    );

    // Evita conservar una sucursal de una sesión anterior.
    response.cookies.delete(
      "fidara_location_id",
    );

    // Si solamente tiene una sucursal,
    // se selecciona automáticamente.
    if (
      defaultLocationId &&
      !requiresLocationSelection
    ) {
      response.cookies.set(
        "fidara_location_id",
        defaultLocationId,
        {
          httpOnly: true,
          secure,
          sameSite: "lax",
          path: "/",
          maxAge: sessionMaxAge,
        },
      );
    }

    return response;
  } catch (error) {
    console.error(
      "[auth/login] Error:",
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