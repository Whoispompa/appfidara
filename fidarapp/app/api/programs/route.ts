import { cookies } from "next/headers";
import {
  NextRequest,
  NextResponse,
} from "next/server";

const apiUrl = process.env.FIDARA_API_URL ?? "https://api.fidara.mx";

export async function GET() {
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

  try {
    const upstream = await fetch(`${apiUrl}/api/programs`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => ({
      success: false,
      message: "La API no respondió correctamente.",
    }));

    return NextResponse.json(payload, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
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
        message: "Tu sesión ha expirado.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const formData =
      await request.formData();

    const upstream = await fetch(
      `${apiUrl}/api/programs`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
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