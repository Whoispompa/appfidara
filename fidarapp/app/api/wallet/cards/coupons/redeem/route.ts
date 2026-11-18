import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.FIDARA_API_URL ?? "https://api.fidara.mx").replace(
  /\/+$/,
  "",
);

async function readPayload(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("fidara_token")?.value;
  const locationId = cookieStore.get("fidara_location_id")?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "Tu sesión ha expirado.",
      },
      { status: 401 },
    );
  }

  if (!locationId) {
    return NextResponse.json(
      {
        success: false,
        code: "LOCATION_REQUIRED",
        message: "Debes seleccionar una sucursal antes de canjear el cupón.",
      },
      { status: 409 },
    );
  }

  try {
    const body = await request.json();

    const upstream = await fetch(`${API_URL}/api/wallet/cards/redeem-coupon`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, locationId }),
      cache: "no-store",
    });

    return NextResponse.json(await readPayload(upstream), {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[wallet/cards/coupons/redeem] Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible comunicarse con la API de Fidara.",
      },
      { status: 502 },
    );
  }
}
