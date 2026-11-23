import { NextRequest } from "next/server";

import { proxySubscriptionRequest } from "@/lib/subscription-bff";

export function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return proxySubscriptionRequest(
    request,
    `/api/subscription-memberships/statistics${query ? `?${query}` : ""}`,
  );
}
