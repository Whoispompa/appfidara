import { NextRequest } from "next/server";

import { proxyGiftCardRequest } from "@/lib/gift-card-bff";

type RouteContext = { params: Promise<{ giftCardId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { giftCardId } = await context.params;
  return proxyGiftCardRequest(
    request,
    `/api/gift-cards/${encodeURIComponent(giftCardId)}/confirm-payment`,
    { method: "POST", requireLocation: true },
  );
}
