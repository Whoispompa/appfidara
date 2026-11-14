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

export async function GET(request: NextRequest) {
  const token = request.cookies.get("fidara_token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "Sesión no válida.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const upstream = await fetch(
      `${API_URL}/api/subscription/overview`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    return NextResponse.json(
      await readPayload(upstream),
      {
        status: upstream.status,
      },
    );
  } catch (error) {
    console.error(
      "[subscription/overview] Error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible cargar la información del plan.",
      },
      {
        status: 502,
      },
    );
  }
}