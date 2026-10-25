import { NextResponse, type NextRequest } from "next/server";

// Sessão encerrada no servidor (logout em outro aparelho, limite de aparelhos ou conta
// suspensa): apaga o cookie de login e manda para o login com o aviso. Sem isso, o
// middleware (que não consulta o banco) acharia que a pessoa ainda está logada.
const COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];
const isSessionCookie = (name: string) => COOKIES.some((n) => name === n || name.startsWith(`${n}.`));

export function GET(req: NextRequest) {
  const had = req.cookies.getAll().some((c) => isSessionCookie(c.name));
  const res = NextResponse.redirect(new URL(had ? "/login?sessao=encerrada" : "/login", req.url));
  const secure = req.nextUrl.protocol === "https:";
  for (const c of req.cookies.getAll()) {
    if (!isSessionCookie(c.name)) continue;
    // Cookie "__Secure-" só é apagado se a resposta também vier com Secure e o mesmo path.
    res.cookies.set(c.name, "", { path: "/", maxAge: 0, expires: new Date(0), httpOnly: true, sameSite: "lax", secure: secure || c.name.startsWith("__Secure-") });
  }
  return res;
}
