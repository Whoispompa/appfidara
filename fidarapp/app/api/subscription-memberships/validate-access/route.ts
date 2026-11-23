import { NextRequest } from "next/server";

import { proxySubscriptionRequest } from "@/lib/subscription-bff";

export function POST(request: NextRequest) {
  return proxySubscriptionRequest(
    request,
    "/api/subscription-memberships/validate-access",
    { method: "POST", requireLocation: true },
  );
}
