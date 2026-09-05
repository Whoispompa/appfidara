import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.FIDARA_API_URL ?? "https://api.fidara.mx";

type RouteContext = {
  params: Promise<{
    programId: string;
  }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
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

  const { programId } = await context.params;

  if (!programId) {
    return NextResponse.json(
      {
        success: false,
        message: "El programa no es válido.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const formData = await request.formData();

    const upstream = await fetch(`${apiUrl}/api/programs/${programId}`, {
      method: "PUT",

      headers: {
        Authorization: `Bearer ${token}`,
      },

      body: formData,
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
