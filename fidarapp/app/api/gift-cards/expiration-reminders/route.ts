import { NextRequest } from "next/server";

import { proxyGiftCardRequest } from "@/lib/gift-card-bff";

export function GET(request: NextRequest) {
  return proxyGiftCardRequest(
    request,
    `/api/gift-cards/expiration-reminders${request.nextUrl.search}`,
  );
}
