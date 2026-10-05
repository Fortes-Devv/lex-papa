import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, PlayCircle, FileText, Smartphone, MessageCircle, ShieldCheck, ArrowRight, Rocket } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { CdnImg } from "@/components/ui/cdn-img";
import { formatCurrency } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "LEX Concursos — Seu próximo concurso. Sua preparação começa aqui." },
  description: "Aulas, materiais de apoio e uma plataforma feita para você estudar com mais organização, praticidade e foco — de onde estiver.",
  alternates: { canonical: "/" },
};

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  moderator: "/admin/dashboard",
  teacher: "/sem-acesso",
  student: "/student/dashboard",
};

const OFFERS = [
  { icon: PlayCircle, title: "Aulas online", lead: "Aprenda de onde estiver.", text: "Assista às aulas diretamente pela plataforma e continue sua preparação no seu ritmo." },
  { icon: FileText, title: "Material de apoio", lead: "Estude. Revise. Volte quando precisar.", text: "Tenha PDFs e materiais complementares para acompanhar suas aulas e reforçar seus estudos." },
  { icon: MessageCircle, title: "Suporte para suas dúvidas", lead: "Você não precisa estudar sozinho.", text: "Ficou com alguma dúvida durante a preparação? Envie sua pergunta e tenha suporte quando precisar." },
  { icon: Smartphone, title: "Estude onde estiver", lead: "Seu estudo acompanha sua rotina.", text: "Acesse pelo computador, tablet ou celular e aproveite o tempo que você tem disponível." },
];
const STEPS = [
  { title: "Escolha sua preparação", text: "Encontre o concurso que você está buscando e conheça todo o conteúdo disponível." },
  { title: "Faça sua inscrição", text: "Escolha a forma de pagamento que preferir e finalize sua compra com segurança." },
  { title: "Acesse a plataforma", text: "Após a confirmação do pagamento, seu acesso é liberado e você já pode começar." },
  { title: "Estude no seu ritmo", text: "Assista às aulas, acompanhe os materiais e avance na sua preparação de onde estiver." },
];
const TRUST = ["Acesso online", "Estude pelo celular ou computador", "Conteúdo organizado", "7 dias de garantia"];

// "46h 18min" → "46h18 de conteúdo"
function contentHours(seconds: number) {
  const m = Math.round(seconds / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h${String(m % 60).padStart(2, "0")} de conteúdo` : `${m} min de conteúdo`;
}

// Vitrine pública (raiz do domínio). Quem já está logado vai direto para o seu painel.
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
  const support = settings.general.supportEmail;
  const ctaPrimary = "inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-[15px] font-bold uppercase tracking-wide text-white shadow-[0_6px_16px_rgba(242,106,27,.35)] hover:bg-brand-dark";

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-3 px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="LEX Concursos">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-border"><Image src="/logo.png" alt="" width={30} height={26} className="object-contain" priority /></span>
            <span className="text-[16px] font-extrabold text-foreground">LEX Concursos</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <a href="#preparacoes" className="hidden h-10 items-center px-3 text-sm font-semibold text-foreground-muted hover:text-foreground sm:inline-flex">Preparações</a>
            <a href="#como-funciona" className="hidden h-10 items-center px-3 text-sm font-semibold text-foreground-muted hover:text-foreground md:inline-flex">Como funciona</a>
            <Link href="/login" className="inline-flex h-10 items-center rounded-xl border border-line-strong px-4 text-sm font-bold text-foreground hover:bg-background dark:border-white/10">Entrar</Link>
          </nav>
        </div>
      </header>

      {/* 1. Hero */}
      <section className="brand-gradient relative overflow-hidden text-white">
        <div aria-hidden className="absolute inset-0 bg-grid opacity-[0.05]" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent,rgba(0,0,0,0.35))]" />
        <div className="relative mx-auto max-w-[1180px] px-4 py-14 lg:px-8 lg:py-20">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary">Preparação para concursos públicos</p>
          <h1 className="mt-3 max-w-3xl text-[36px] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Seu próximo concurso.<br /><span className="text-primary">Sua preparação começa aqui.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            Tenha aulas, materiais de apoio e uma plataforma feita para você estudar com mais organização, praticidade e foco — de onde estiver.
          </p>
          <p className="mt-2 max-w-2xl text-base text-white/65">Escolha sua preparação, acesse o conteúdo e comece a estudar no seu ritmo.</p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <a href="#preparacoes" className={ctaPrimary}>Quero começar a estudar <ArrowRight className="h-4 w-4" /></a>
            <Link href="/login" className="inline-flex items-center gap-1.5 text-[15px] font-bold text-white/90 hover:text-white">Já sou aluno <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
            {TRUST.map((t) => <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {t}</li>)}
          </ul>
        </div>
      </section>

      {/* 2. Preparações (cursos da plataforma) */}
      <section id="preparacoes" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-14 lg:px-8 lg:py-20">
        <h2 className="text-[26px] font-extrabold text-foreground lg:text-[32px]">Encontre sua próxima preparação</h2>
        <p className="mt-2 max-w-2xl text-[15px] text-foreground-muted">Escolha o concurso que você está buscando e encontre uma preparação completa para começar seus estudos.</p>
        <p className="mt-1 text-sm text-foreground-muted">Novas preparações podem entrar na LEX a qualquer momento.</p>
        {products.length === 0 ? (
          <p className="mt-8 rounded-[14px] border border-dashed border-border p-10 text-center text-sm text-foreground-muted">Novas preparações em breve.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const price = Number(p.price);
              const compare = p.comparePrice ? Number(p.comparePrice) : 0;
              const off = compare > price ? Math.round((1 - price / compare) * 100) : 0;
              const stats = [
                p.course?._count.modules ? `${p.course._count.modules} módulos` : null,
                p.course?.totalLessons ? `${p.course.totalLessons} aulas` : null,
                p.course?.totalDuration ? contentHours(p.course.totalDuration) : null,
              ].filter(Boolean).join(" · ");
              return (
                <Link key={p.id} href={`/cursos/${p.slug}`} className="group flex flex-col overflow-hidden rounded-[14px] border border-border bg-card transition-shadow hover:shadow-[0_10px_30px_rgba(31,43,58,.12)]">
                  <div className="relative aspect-video bg-navy">
                    <CdnImg src={p.thumbnail} width={640} aspect="16:9" alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                    {off > 0 && <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">−{off}%</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand">Concurso{p.category ? ` • ${p.category.name}` : ""}</span>
                    <h3 className="mt-1 text-[19px] font-extrabold leading-snug text-foreground">{p.title}</h3>
                    <p className="mt-1.5 line-clamp-3 text-sm text-foreground-muted">
                      {p.shortDescription || "Prepare-se com aulas e materiais organizados para você estudar no seu ritmo e aproveitar melhor cada momento da sua preparação."}
                    </p>
                    {stats && <p className="mb-4 mt-3 text-xs font-semibold text-foreground-muted">{stats}</p>}
                    <div className="mt-auto border-t border-line-soft pt-4 dark:border-white/10">
                      {off > 0 && <span className="block text-xs text-foreground-muted line-through">{formatCurrency(compare)}</span>}
                      <span className="block text-[24px] font-extrabold leading-tight text-foreground">{formatCurrency(price)}</span>
                      <span className="block text-[12px] text-foreground-muted">ou até 12x no cartão</span>
                      <span className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold uppercase tracking-wide text-white group-hover:bg-brand-dark">
                        Ver preparação <ArrowRight className="h-4 w-4" />
                      </span>
                      <span className="mt-2 block text-center text-[11.5px] text-foreground-muted">Acesso liberado após a confirmação do pagamento.</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. O que a LEX oferece */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-[1180px] px-4 py-14 lg:px-8 lg:py-20">
          <h2 className="text-[26px] font-extrabold leading-tight text-foreground lg:text-[32px]">
            Não é só assistir aulas.<br /><span className="text-brand">É ter uma estrutura para estudar.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] text-foreground-muted">A LEX reúne tudo em um só lugar para deixar sua preparação mais simples, organizada e acessível.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OFFERS.map(({ icon: Icon, title, lead, text }) => (
              <div key={title} className="rounded-[14px] border border-border bg-background p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand dark:bg-brand/15"><Icon className="h-5 w-5" /></span>
                <p className="mt-4 text-[16px] font-extrabold text-foreground">{title}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{lead}</p>
                <p className="mt-1.5 text-sm text-foreground-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-14 lg:px-8 lg:py-20">
        <h2 className="text-[26px] font-extrabold leading-tight text-foreground lg:text-[32px]">Começar é simples. <span className="text-brand">Estudar também pode ser.</span></h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-[14px] border border-border bg-card p-5">
              <span className="text-[28px] font-extrabold leading-none text-brand">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-3 text-[16px] font-extrabold text-foreground">{s.title}</p>
              <p className="mt-1.5 text-sm text-foreground-muted">{s.text}</p>
              {i < STEPS.length - 1 && <ArrowRight aria-hidden className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-line-strong lg:block" />}
            </li>
          ))}
        </ol>
        <div className="mt-6 flex items-center gap-3 rounded-[14px] border border-ok/30 bg-ok-soft/60 p-4 dark:bg-ok/10">
          <ShieldCheck className="h-6 w-6 shrink-0 text-ok" />
          <p className="text-sm text-foreground"><b>Compra segura + 7 dias de garantia.</b> Você tem 7 dias para conhecer sua preparação.</p>
        </div>
      </section>

      {/* 5. CTA final */}
      <section className="brand-gradient relative overflow-hidden text-white">
        <div aria-hidden className="absolute inset-0 bg-grid opacity-[0.05]" />
        <div className="relative mx-auto max-w-[900px] px-4 py-16 text-center lg:py-20">
          <h2 className="text-[28px] font-extrabold leading-tight sm:text-[36px]">O concurso que você quer começa com a preparação que você escolhe <span className="text-primary">hoje.</span></h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">Pare de adiar o primeiro passo. Encontre sua preparação, entre para a LEX e comece a estudar no seu ritmo.</p>
          <a href="#preparacoes" className={`${ctaPrimary} mt-8`}><Rocket className="h-4 w-4" /> Quero começar agora <ArrowRight className="h-4 w-4" /></a>
          <p className="mt-4 text-sm text-white/70">Acesso online · Estude onde estiver · 7 dias de garantia</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white/70">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 text-sm sm:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <p className="text-[16px] font-extrabold text-white">LEX Concursos</p>
            <p className="mt-2 max-w-sm">Preparação para concursos públicos de forma simples, acessível e organizada.</p>
          </div>
          <nav className="flex flex-col gap-2 sm:items-end" aria-label="Rodapé">
            <a href="#preparacoes" className="hover:text-white">Preparações</a>
            <a href="#como-funciona" className="hover:text-white">Como funciona</a>
            <Link href="/login" className="font-semibold text-white">Entrar</Link>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-4 py-5 text-xs sm:flex-row sm:items-center lg:px-8">
            <p className="flex flex-wrap gap-x-3">
              <Link href="/termos" className="hover:text-white">Termos de uso</Link> ·
              <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
              {support && <> · <a href={`mailto:${support}`} className="hover:text-white">Suporte</a></>}
            </p>
            <p className="sm:ml-auto">© {new Date().getFullYear()} LEX Concursos. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
