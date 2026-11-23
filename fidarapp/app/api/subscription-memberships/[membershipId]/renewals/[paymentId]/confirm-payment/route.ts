import { NextRequest } from "next/server";

import { proxySubscriptionRequest } from "@/lib/subscription-bff";

type RouteContext = {
  params: Promise<{ membershipId: string; paymentId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { membershipId, paymentId } = await context.params;
  return proxySubscriptionRequest(
    request,
    `/api/subscription-memberships/${encodeURIComponent(membershipId)}/renewals/${encodeURIComponent(paymentId)}/confirm-payment`,
    { method: "POST", requireLocation: true },
  );
}
