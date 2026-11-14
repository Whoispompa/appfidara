import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.FIDARA_API_URL ??
  "https://api.fidara.mx";

type RouteContext = {
  params: Promise<{
    programId: string;
  }>;
};

async function readPayload(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getToken(request: NextRequest) {
  return request.cookies.get("fidara_token")?.value;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const token = getToken(request);

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "Sesión no válida.",
      },
      { status: 401 },
    );
  }

  try {
    const { programId } = await context.params;

    const upstream = await fetch(
      `${API_URL}/api/programs/${encodeURIComponent(programId)}/geo-push`,
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
    console.error("[geo-push/get] Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible comunicarse con la API de Fidara.",
      },
      { status: 502 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  const token = getToken(request);

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "Sesión no válida.",
      },
      { status: 401 },
    );
  }

  try {
    const { programId } = await context.params;
    const body = await request.json();

    const upstream = await fetch(
      `${API_URL}/api/programs/${encodeURIComponent(programId)}/geo-push`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
    console.error("[geo-push/put] Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible comunicarse con la API de Fidara.",
      },
      { status: 502 },
    );
  }
}