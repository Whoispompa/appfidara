import { NextRequest, NextResponse } from "next/server";

const apiUrl = (process.env.FIDARA_API_URL ?? "https://api.fidara.mx").replace(
  /\/+$/,
  "",
);

export async function PUT(request: NextRequest) {
  const token = request.cookies.get("fidara_token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sesión no válida." },
      { status: 401 },
    );
  }

  const incoming = await request.formData().catch(() => null);
  const logo = incoming?.get("Logo");

  if (!(logo instanceof File) || !logo.size) {
    return NextResponse.json(
      { success: false, message: "Selecciona una imagen para el logo del negocio." },
      { status: 400 },
    );
  }

  try {
    const formData = new FormData();
    formData.append("Logo", logo);

    const upstream = await fetch(`${apiUrl}/api/organizations/me/logo`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => ({
      success: false,
      message: "La API de Fidara no respondió correctamente.",
    }));

    return NextResponse.json(payload, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "No fue posible comunicarse con la API de Fidara." },
      { status: 502 },
    );
  }
}
