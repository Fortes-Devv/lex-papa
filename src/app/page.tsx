import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, PlayCircle, FileText, Smartphone, MessageCircle, ShieldCheck, BookOpen, Clock } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { CdnImg } from "@/components/ui/cdn-img";
import { formatCurrency, formatDuration } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "LEX Concursos — Sua aprovação começa aqui" },
  description: "Cursos para concursos do Ceará com aulas em vídeo, PDFs e professores especialistas. Estude no celular ou no computador.",
  alternates: { canonical: "/" },
};

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  moderator: "/admin/dashboard",
  teacher: "/sem-acesso",
  student: "/student/dashboard",
};

const STEPS = [
  { title: "Escolha o curso", text: "Veja o conteúdo, as disciplinas e assista a uma aula grátis." },
  { title: "Pague como preferir", text: "Pix com liberação na hora, cartão em até 12x ou boleto." },
  { title: "Comece a estudar", text: "O acesso chega na hora, com e-mail de confirmação." },
];
const FEATURES = [
  { icon: PlayCircle, title: "Aulas em vídeo", text: "Continue exatamente de onde parou, em qualquer aparelho." },
  { icon: FileText, title: "PDFs de cada aula", text: "Material para baixar, ler ao lado do vídeo e revisar." },
  { icon: MessageCircle, title: "Dúvidas na aula", text: "Pergunte direto na aula e receba a resposta ali mesmo." },
  { icon: Smartphone, title: "App no celular", text: "Instale a LEX na tela inicial e estude onde estiver." },
];

// Vitrine pública (raiz do domínio): quem chega sem conta vê o que a LEX oferece e os cursos.
// Quem já está logado vai direto para o seu painel.
export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect(ROLE_HOME[session.user.role] ?? "/student/dashboard");

  const settings = await getSettings().catch(() => DEFAULT_SETTINGS);
  const products = await db.product.findMany({
    where: { type: "course", status: "published", isPublic: true },
    orderBy: [{ isFeatured: "desc" }, { enrolledCount: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, slug: true, title: true, shortDescription: true, thumbnail: true, price: true, comparePrice: true,
      category: { select: { name: true } },
      course: { select: { totalLessons: true, totalDuration: true, _count: { select: { modules: true } } } },
    },
  });
  const whatsapp = settings.integrations.whatsappNumber.replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-background">
      {/* Topo */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-3 px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="LEX Concursos">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-border"><Image src="/logo.png" alt="" width={30} height={26} className="object-contain" priority /></span>
            <span className="text-[16px] font-extrabold text-foreground">Lex Concursos</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <a href="#cursos" className="hidden h-10 items-center px-3 text-sm font-semibold text-foreground-muted hover:text-foreground sm:inline-flex">Cursos</a>
            <Link href="/login" className="inline-flex h-10 items-center rounded-xl border border-line-strong px-4 text-sm font-bold text-foreground hover:bg-background dark:border-white/10">Entrar</Link>
          </nav>
        </div>
      </header>

      {/* Destaque (mesmo gradiente luminoso do login) */}
      <section className="brand-gradient relative overflow-hidden text-white">
        <div aria-hidden className="absolute inset-0 bg-grid opacity-[0.05]" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent,rgba(0,0,0,0.35))]" />
        <div className="relative mx-auto max-w-[1180px] px-4 py-14 lg:px-8 lg:py-20">
          <h1 className="max-w-3xl text-[38px] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Sua aprovação<br /><span className="text-primary">começa aqui.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            Preparação completa para concursos públicos, com aulas objetivas, PDFs de cada aula e material atualizado.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#cursos" className="inline-flex h-12 items-center rounded-xl bg-brand px-6 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(242,106,27,.35)] hover:bg-brand-dark">Ver cursos</a>
            <Link href="/login" className="inline-flex h-12 items-center rounded-xl bg-white/10 px-6 text-[15px] font-bold text-white ring-1 ring-white/20 hover:bg-white/15">Já sou aluno</Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
            {["Acesso imediato após o pagamento", "Garantia de 7 dias", "Estude no celular ou no computador"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Cursos */}
      <section id="cursos" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-12 lg:px-8 lg:py-16">
        <h2 className="text-[26px] font-extrabold text-foreground lg:text-[30px]">Cursos</h2>
        <p className="mt-1 text-sm text-foreground-muted">Escolha o seu concurso. Em cada curso você pode assistir a uma aula grátis antes de comprar.</p>
        {products.length === 0 ? (
          <p className="mt-8 rounded-[14px] border border-dashed border-border p-10 text-center text-sm text-foreground-muted">Novos cursos em breve.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const price = Number(p.price);
              const compare = p.comparePrice ? Number(p.comparePrice) : 0;
              const off = compare > price ? Math.round((1 - price / compare) * 100) : 0;
              return (
                <Link key={p.id} href={`/cursos/${p.slug}`} className="group flex flex-col overflow-hidden rounded-[14px] border border-border bg-card transition-shadow hover:shadow-[0_10px_30px_rgba(31,43,58,.12)]">
                  <div className="relative aspect-video bg-navy">
                    <CdnImg src={p.thumbnail} width={640} aspect="16:9" alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                    {off > 0 && <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">−{off}%</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    {p.category && <span className="text-[11px] font-bold uppercase tracking-wider text-brand">{p.category.name}</span>}
                    <h3 className="mt-1 text-[18px] font-extrabold leading-snug text-foreground">{p.title}</h3>
                    {p.shortDescription && <p className="mt-1.5 line-clamp-2 text-sm text-foreground-muted">{p.shortDescription}</p>}
                    <p className="mb-4 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                      {p.course?._count.modules ? <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {p.course._count.modules} módulos</span> : null}
                      {p.course?.totalLessons ? <span className="flex items-center gap-1"><PlayCircle className="h-3.5 w-3.5" /> {p.course.totalLessons} aulas</span> : null}
                      {p.course?.totalDuration ? <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(p.course.totalDuration)}</span> : null}
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-line-soft pt-4 dark:border-white/10">
                      <span>
                        {off > 0 && <span className="block text-xs text-foreground-muted line-through">{formatCurrency(compare)}</span>}
                        <span className="block text-[22px] font-extrabold text-foreground">{formatCurrency(price)}</span>
                        <span className="block text-[11px] text-foreground-muted">ou até 12x no cartão</span>
                      </span>
                      <span className="inline-flex h-10 shrink-0 items-center rounded-xl bg-brand px-4 text-sm font-bold text-white group-hover:bg-brand-dark">Ver curso</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* O que você encontra */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-[1180px] px-4 py-12 lg:px-8 lg:py-16">
          <h2 className="text-[26px] font-extrabold text-foreground lg:text-[30px]">O que você encontra na LEX</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-[14px] border border-border bg-background p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand dark:bg-brand/15"><Icon className="h-5 w-5" /></span>
                <p className="mt-3 text-[15px] font-bold text-foreground">{title}</p>
                <p className="mt-1 text-sm text-foreground-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-[1180px] px-4 py-12 lg:px-8 lg:py-16">
        <h2 className="text-[26px] font-extrabold text-foreground lg:text-[30px]">Como funciona</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-[14px] border border-border bg-card p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-sm font-extrabold text-brand">{i + 1}</span>
              <p className="mt-3 text-[15px] font-bold text-foreground">{s.title}</p>
              <p className="mt-1 text-sm text-foreground-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 flex items-center gap-2 text-sm text-foreground-muted"><ShieldCheck className="h-4 w-4 text-ok" /> Pagamento seguro pelo Mercado Pago · Garantia de 7 dias com devolução total.</p>
      </section>

      {/* Rodapé */}
      <footer className="bg-navy text-white/70">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center lg:px-8">
          <p>© {new Date().getFullYear()} {settings.general.name}</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:ml-auto">
            <Link href="/termos" className="hover:text-white">Termos de uso</Link>
            <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
            {settings.general.supportEmail && <a href={`mailto:${settings.general.supportEmail}`} className="hover:text-white">{settings.general.supportEmail}</a>}
            {whatsapp && <a href={`https://wa.me/${whatsapp.startsWith("55") ? whatsapp : `55${whatsapp}`}`} target="_blank" rel="noopener" className="hover:text-white">WhatsApp</a>}
            <Link href="/login" className="font-semibold text-white">Entrar</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
