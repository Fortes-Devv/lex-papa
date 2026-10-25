import { NextResponse, type NextRequest } from "next/server";

// Sessão encerrada no servidor (logout em outro aparelho, limite de aparelhos ou conta
// suspensa): apaga o cookie de login e manda para o login com o aviso. Sem isso, o
// middleware (que não consulta o banco) acharia que a pessoa ainda está logada.
const COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function GET(req: NextRequest) {
  const had = req.cookies.getAll().some((c) => COOKIES.some((n) => c.name === n || c.name.startsWith(`${n}.`)));
  const res = NextResponse.redirect(new URL(had ? "/login?sessao=encerrada" : "/login", req.url));
  for (const c of req.cookies.getAll()) {
    if (COOKIES.some((n) => c.name === n || c.name.startsWith(`${n}.`))) res.cookies.delete(c.name);
  }
  return res;
}
