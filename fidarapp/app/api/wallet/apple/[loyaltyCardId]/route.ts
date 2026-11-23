import { NextRequest, NextResponse } from "next/server";

const apiUrl = (process.env.FIDARA_API_URL ?? "https://api.fidara.mx").replace(/\/+$/, "");
type RouteContext = { params: Promise<{ loyaltyCardId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  if (process.env.FIDARA_SUBSCRIPTIONS_ENABLED !== "true") {
    return NextResponse.json({ success: false, code: "SUBSCRIPTIONS_DISABLED", message: "La modalidad Suscripciones aún no está disponible." }, { status: 404 });
  }
  const token = request.cookies.get("fidara_token")?.value;
  if (!token) return NextResponse.json({ success: false, message: "Tu sesión ha expirado." }, { status: 401 });
  const { loyaltyCardId } = await context.params;
  try {
    const upstream = await fetch(`${apiUrl}/api/apple-wallet/pass/${encodeURIComponent(loyaltyCardId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/vnd.apple.pkpass", "Content-Disposition": upstream.headers.get("content-disposition") ?? `attachment; filename="fidara-${loyaltyCardId}.pkpass"`, "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, message: "No fue posible conectar con Fidara." }, { status: 502 });
  }
}
