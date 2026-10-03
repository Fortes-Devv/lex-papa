// Números do painel da marca atualizam a cada hora.
export const revalidate = 3600;
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { AosProvider } from "@/components/providers/aos-provider";

// Números reais da plataforma para o painel da marca (só mostra o que existe).
async function brandStats() {
  try {
    const students = await db.enrollment.count({ where: { status: { in: ["active", "completed"] } } });
    const lessons = await db.lesson.count({ where: { status: "published" } });
    const rated = await db.product.aggregate({ where: { status: "published", reviewCount: { gt: 0 } }, _avg: { rating: true } });
    return [
      students > 0 ? { value: students.toLocaleString("pt-BR"), label: "alunos matriculados" } : null,
      lessons > 0 ? { value: lessons.toLocaleString("pt-BR"), label: "aulas e PDFs" } : null,
      rated._avg.rating ? { value: rated._avg.rating.toFixed(1).replace(".", ","), label: "avaliação média" } : null,
    ].filter(Boolean) as { value: string; label: string }[];
  } catch {
    return [];
  }
}

// Entrar / cadastro (modelo 7i): marca e prova social à esquerda, formulário à direita.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const stats = await brandStats();
  return (
    <div className="flex min-h-screen bg-background">
      <AosProvider />
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-navy p-10 text-white lg:flex xl:p-14">
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-white"><Image src="/logo.png" alt="" width={38} height={32} className="object-contain" priority /></span>
          <span className="text-lg font-extrabold">Lex Concursos</span>
        </Link>

        <div className="relative space-y-5">
          <h2 className="text-[40px] font-extrabold leading-[1.05] tracking-tight xl:text-[46px]">
            Estude com o edital na mão e a <span className="text-brand">aula no bolso.</span>
          </h2>
          <p className="max-w-md text-[15px] leading-relaxed text-white/70">
            Aulas em vídeo e PDFs para concursos do Ceará. Continue de onde parou em qualquer dispositivo.
          </p>
          {stats.length > 0 && (
            <dl className="flex flex-wrap gap-8 pt-2">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-[28px] font-extrabold leading-none">{s.value}</dd>
                  <dd className="mt-1 text-xs text-white/60">{s.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} Lex Concursos · <Link href="/termos" className="hover:text-white">Termos</Link> · <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
