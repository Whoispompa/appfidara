import { NextRequest } from "next/server";

import { proxyGiftCardRequest } from "@/lib/gift-card-bff";

export function POST(request: NextRequest) {
  return proxyGiftCardRequest(request, "/api/gift-cards/lookup", {
    method: "POST",
  });
}
