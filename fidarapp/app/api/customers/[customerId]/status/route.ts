import { cookies } from "next/headers";
import {
  NextRequest,
  NextResponse,
} from "next/server";

const apiUrl =
  process.env.FIDARA_API_URL ??
  "https://api.fidara.mx";

interface RouteContext {
  params: Promise<{
    customerId: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
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

  const { customerId } = await context.params;

  if (!customerId) {
    return NextResponse.json(
      {
        success: false,
        message: "El cliente no es válido.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const body = await request.json();

    const upstream = await fetch(
      `${apiUrl}/api/customers/${customerId}/status`,
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

    const payload = await upstream
      .json()
      .catch(() => ({
        success: false,
        message:
          "La API no respondió correctamente.",
      }));

    return NextResponse.json(payload, {
      status: upstream.status,
    });
  } catch {
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