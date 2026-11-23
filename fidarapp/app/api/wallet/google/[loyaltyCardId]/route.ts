import { NextRequest } from "next/server";

import { proxySubscriptionRequest } from "@/lib/subscription-bff";

type RouteContext = { params: Promise<{ loyaltyCardId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { loyaltyCardId } = await context.params;
  return proxySubscriptionRequest(
    request,
    `/api/google-wallet/cards/${encodeURIComponent(loyaltyCardId)}/pass`,
    { method: "POST" },
  );
}
