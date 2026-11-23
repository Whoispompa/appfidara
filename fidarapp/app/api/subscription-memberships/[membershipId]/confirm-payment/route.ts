import { NextRequest } from "next/server";

import { proxySubscriptionRequest } from "@/lib/subscription-bff";

type RouteContext = { params: Promise<{ membershipId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { membershipId } = await context.params;
  return proxySubscriptionRequest(
    request,
    `/api/subscription-memberships/${encodeURIComponent(membershipId)}/confirm-payment`,
    { method: "POST", requireLocation: true },
  );
}
