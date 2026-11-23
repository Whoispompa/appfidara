import { NextRequest } from "next/server";

import { proxySubscriptionRequest } from "@/lib/subscription-bff";

type RouteContext = {
  params: Promise<{ programId: string; planId: string }>;
};

function path(programId: string, planId: string) {
  return `/api/programs/${encodeURIComponent(programId)}/subscription-plans/${encodeURIComponent(planId)}`;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { programId, planId } = await context.params;
  return proxySubscriptionRequest(request, path(programId, planId), {
    method: "PUT",
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { programId, planId } = await context.params;
  return proxySubscriptionRequest(request, `${path(programId, planId)}/status`, {
    method: "PATCH",
  });
}
