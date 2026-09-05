import { NextRequest, NextResponse } from "next/server";
const apiUrl = process.env.FIDARA_API_URL ?? "https://api.fidara.mx";
export async function POST(request: NextRequest) {
  const body = await request.json();
  const upstream = await fetch(`${apiUrl}/api/auth/register-business`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await upstream
    .json()
    .catch(() => ({ message: "La API de Fidara no respondió correctamente." }));
  return NextResponse.json(payload, { status: upstream.status });
}
