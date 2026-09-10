import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.FIDARA_API_URL ?? "https://api.fidara.mx";

type RouteContext = {
  params: Promise<{
    programId: string;
  }>;
};

async function getToken() {
  const cookieStore = await cookies();

  return cookieStore.get("fidara_token")?.value;
}

function unauthorizedResponse() {
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

function invalidProgramResponse() {
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

async function readPayload(response: Response) {
  return response.json().catch(() => ({
    success: false,
    message: "La API no respondió correctamente.",
  }));
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const token = await getToken();

  if (!token) {
    return unauthorizedResponse();
  }

  const { programId } = await context.params;

  if (!programId) {
    return invalidProgramResponse();
  }

  try {
    const upstream = await fetch(
      `${apiUrl}/api/programs/${encodeURIComponent(programId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    const payload = await readPayload(upstream);

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

export async function PUT(request: NextRequest, context: RouteContext) {
  const token = await getToken();

  if (!token) {
    return unauthorizedResponse();
  }

  const { programId } = await context.params;

  if (!programId) {
    return invalidProgramResponse();
  }

  try {
    const formData = await request.formData();

    const upstream = await fetch(
      `${apiUrl}/api/programs/${encodeURIComponent(programId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        cache: "no-store",
      },
    );

    const payload = await readPayload(upstream);

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

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  const token = await getToken();

  if (!token) {
    return unauthorizedResponse();
  }

  const { programId } =
    await context.params;

  if (!programId) {
    return invalidProgramResponse();
  }

  try {
    const upstream = await fetch(
      `${apiUrl}/api/programs/${encodeURIComponent(programId)}`,
      {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        cache: "no-store",
      },
    );

    const payload =
      await readPayload(upstream);

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
