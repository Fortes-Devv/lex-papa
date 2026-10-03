import { NextResponse } from "next/server";
import { clientIpFrom, hitRateLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/error-report";

// Erros que acontecem só no navegador (tela "Algo deu errado"). Limite por IP para não virar spam.
export async function POST(request: Request) {
  const ip = clientIpFrom(request.headers);
  if (!(await hitRateLimit(`client-error:${ip}`, 10, 600)).allowed) return new NextResponse(null, { status: 204 });
  const body = (await request.json().catch(() => null)) as { message?: unknown; path?: unknown } | null;
  if (!body || typeof body.message !== "string") return new NextResponse(null, { status: 204 });
  await reportError({ kind: "client", message: body.message, path: typeof body.path === "string" ? body.path : undefined, extra: { userAgent: request.headers.get("user-agent")?.slice(0, 200) } });
  return new NextResponse(null, { status: 204 });
}
