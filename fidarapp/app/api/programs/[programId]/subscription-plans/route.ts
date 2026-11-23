import { NextRequest } from "next/server";

import { proxySubscriptionRequest } from "@/lib/subscription-bff";

type RouteContext = { params: Promise<{ programId: string }> };

const guidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidProgramResponse() {
  return Response.json(
    {
      success: false,
      code: "INVALID_PROGRAM_ID",
      message: "Guarda el programa antes de configurar sus planes.",
    },
    { status: 400 },
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { programId } = await context.params;
  if (!guidPattern.test(programId)) return invalidProgramResponse();
  return proxySubscriptionRequest(
    request,
    `/api/programs/${encodeURIComponent(programId)}/subscription-plans`,
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { programId } = await context.params;
  if (!guidPattern.test(programId)) return invalidProgramResponse();
  return proxySubscriptionRequest(
    request,
    `/api/programs/${encodeURIComponent(programId)}/subscription-plans`,
    { method: "POST" },
  );
}
