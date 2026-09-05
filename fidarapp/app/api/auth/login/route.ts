import { NextRequest, NextResponse } from "next/server";
const apiUrl = process.env.FIDARA_API_URL ?? "https://api.fidara.mx";
export async function POST(request: NextRequest) {
  const body = await request.json();
  const upstream = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });
  const payload = await upstream
    .json()
    .catch(() => ({ message: "La API de Fidara no respondió correctamente." }));
  if (!upstream.ok)
    return NextResponse.json(payload, { status: upstream.status });
  const token = payload?.data?.token;
  if (!token)
    return NextResponse.json(
      { message: "La respuesta no incluyó un token de acceso." },
      { status: 502 },
    );
  const response = NextResponse.json({
    ...payload,
    data: { ...payload.data, token: undefined },
  });
  response.cookies.set("fidara_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: body.remember ? 60 * 60 * 24 * 14 : 60 * 60 * 8,
  });
  return response;
}
