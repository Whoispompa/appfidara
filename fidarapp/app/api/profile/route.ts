import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.FIDARA_API_URL ?? "https://api.fidara.mx";

async function readPayload(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getToken(request: NextRequest) {
  return request.cookies.get("fidara_token")?.value;
}

export async function GET(request: NextRequest) {
  const token = getToken(request);

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sesión no válida." },
      { status: 401 },
    );
  }

  try {
    const upstream = await fetch(`${API_URL}/api/profile`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    return NextResponse.json(await readPayload(upstream), {
      status: upstream.status,
    });
  } catch (error) {
    console.error("[profile/get] Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible comunicarse con la API de Fidara.",
      },
      { status: 502 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const token = getToken(request);

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sesión no válida." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const upstream = await fetch(`${API_URL}/api/profile`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    return NextResponse.json(await readPayload(upstream), {
      status: upstream.status,
    });
  } catch (error) {
    console.error("[profile/put] Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible comunicarse con la API de Fidara.",
      },
      { status: 502 },
    );
  }
}

