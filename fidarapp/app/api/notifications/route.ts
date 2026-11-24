import { NextRequest, NextResponse } from "next/server";

import type { CreateNotificationCampaignRequest } from "@/lib/notifications";

const API_URL = process.env.FIDARA_API_URL ?? "https://api.fidara.mx";
const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function GET(request: NextRequest) {
  const token = getToken(request);

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sesión no válida." },
      { status: 401 },
    );
  }

  try {
    const query = request.nextUrl.searchParams.toString();
    const upstream = await fetch(
      `${API_URL}/api/notifications${query ? `?${query}` : ""}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    return NextResponse.json(await readPayload(upstream), {
      status: upstream.status,
    });
  } catch (error) {
    console.error("[notifications/get] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "No fue posible comunicarse con la API de Fidara.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const token = getToken(request);

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sesión no válida." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as Partial<CreateNotificationCampaignRequest>;
    const validLocation =
      body.audience === "all"
        ? body.locationId === null
        : body.audience === "location" &&
          typeof body.locationId === "string" &&
          GUID_PATTERN.test(body.locationId);

    if (
      typeof body.programId !== "string" ||
      !GUID_PATTERN.test(body.programId) ||
      typeof body.idempotencyKey !== "string" ||
      !GUID_PATTERN.test(body.idempotencyKey) ||
      (body.audience !== "all" && body.audience !== "location") ||
      !validLocation ||
      typeof body.title !== "string" ||
      !body.title.trim() ||
      body.title.length > 80 ||
      typeof body.message !== "string" ||
      !body.message.trim() ||
      body.message.length > 300
    ) {
      return NextResponse.json(
        { success: false, message: "Los datos de la campaña no son válidos." },
        { status: 400 },
      );
    }

    const campaignRequest: CreateNotificationCampaignRequest = {
      programId: body.programId,
      idempotencyKey: body.idempotencyKey,
      audience: body.audience,
      locationId: body.audience === "all" ? null : body.locationId!,
      title: body.title.trim(),
      message: body.message.trim(),
    };
    const upstream = await fetch(`${API_URL}/api/notifications`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(campaignRequest),
      cache: "no-store",
    });

    return NextResponse.json(await readPayload(upstream), {
      status: upstream.status,
    });
  } catch (error) {
    console.error("[notifications/post] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "No fue posible comunicarse con la API de Fidara.",
      },
      { status: 502 },
    );
  }
}
