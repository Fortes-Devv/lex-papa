import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, PlayCircle, FileText, Smartphone, MessageCircle, ShieldCheck, ArrowRight, Rocket } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { CdnImg } from "@/components/ui/cdn-img";
import { disciplineName, subjectInitials } from "@/lib/discipline";
import { formatCurrency } from "@/lib/utils/cn";
import { HomeHero } from "@/components/sales/home-hero";

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
      course: { select: { totalLessons: true, totalDuration: true, _count: { select: { modules: { where: { section: "aulas" } } } }, modules: { where: { isPublished: true, section: "aulas" }, orderBy: { order: "asc" }, select: { module: { select: { title: true } } } } } },
    },
  });
  // Matérias de cada curso (módulos "X Aulas" + "X PDFs" viram uma só) e números reais da vitrine.
  const subjectsOf = (p: (typeof products)[number]) => [...new Set((p.course?.modules ?? []).map((m) => disciplineName(m.module.title)))];
  const totalLessons = products.reduce((s, p) => s + (p.course?.totalLessons ?? 0), 0);
  const totalHours = Math.round(products.reduce((s, p) => s + (p.course?.totalDuration ?? 0), 0) / 3600);
  const totalSubjects = new Set(products.flatMap(subjectsOf)).size;
  const featured = products[0];
  const support = settings.general.supportEmail;
  const ctaPrimary = "inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-[15px] font-bold uppercase tracking-wide text-white shadow-[0_6px_16px_rgba(242,106,27,.35)] hover:bg-brand-dark";

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar escura e enxuta: o logo grande fica no hero */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b111a]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-end gap-1 px-4 sm:gap-2 lg:px-10">
          <a href="#preparacoes" className="hidden h-10 items-center px-3 text-sm font-semibold text-white/70 hover:text-white sm:inline-flex">Preparações</a>
          <a href="#como-funciona" className="hidden h-10 items-center px-3 text-sm font-semibold text-white/70 hover:text-white md:inline-flex">Como funciona</a>
          <Link href="/login" className="inline-flex h-9 items-center rounded-xl border border-white/25 px-4 text-sm font-bold text-white hover:bg-white/10">Entrar</Link>
        </div>
      </header>

      {/* 1. Hero (modelo do dono) + faixa de confiança */}
      <HomeHero lessons={totalLessons} hours={totalHours} />

      {/* 2. Preparações */}
      <section id="preparacoes" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-16 lg:px-8 lg:py-24">
        <SectionHead kicker="Preparações" title="Encontre sua próxima preparação"
          text="Escolha o concurso que você está buscando e encontre uma preparação completa para começar seus estudos." note="Novas preparações podem entrar na LEX a qualquer momento." />
        {products.length === 0 ? (
          <p className="mt-10 rounded-[14px] border border-dashed border-border p-10 text-center text-sm text-foreground-muted">Novas preparações em breve.</p>
        ) : (
          <div className={products.length === 1 ? "mt-10" : "mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"}>
            {products.map((p) => {
              const price = Number(p.price);
              const compare = p.comparePrice ? Number(p.comparePrice) : 0;
              const off = compare > price ? Math.round((1 - price / compare) * 100) : 0;
              const wide = products.length === 1;
              const subjects = subjectsOf(p);
              const stats = [
                p.course?._count.modules ? `${p.course._count.modules} módulos` : null,
                p.course?.totalLessons ? `${p.course.totalLessons} aulas` : null,
                p.course?.totalDuration ? contentHours(p.course.totalDuration) : null,
              ].filter(Boolean).join(" · ");
              return (
                <Link key={p.id} href={`/cursos/${p.slug}`}
                  className={`group grid overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_6px_24px_rgba(31,43,58,.06)] transition-shadow hover:shadow-[0_16px_40px_rgba(31,43,58,.14)] ${wide ? "lg:grid-cols-[1.15fr_1fr]" : ""}`}>
                  {/* Capa sempre 16:9 e inteira (no card largo fica emoldurada e centralizada) */}
                  <div className={wide ? "bg-navy p-3 lg:flex lg:items-center lg:p-5" : ""}>
                    {/* Capa inteira: no card largo na proporção original; na grade, dentro de 16:9 sem cortar */}
                    <div className={`relative w-full overflow-hidden bg-navy ${wide ? "rounded-[14px]" : "aspect-video"}`}>
                      <CdnImg src={p.thumbnail} width={wide ? 1000 : 640} alt="" className={`transition-transform duration-500 group-hover:scale-[1.02] ${wide ? "block h-auto w-full" : "h-full w-full object-contain"}`} />
                      {off > 0 && <span className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-[12px] font-bold text-white shadow">−{off}%</span>}
                    </div>
                  </div>
                  <div className={`flex flex-col ${wide ? "p-6 lg:p-8" : "p-5"}`}>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand">Concurso{p.category ? ` • ${p.category.name}` : ""}</span>
                    <h3 className={`mt-1 font-extrabold leading-tight text-foreground ${wide ? "text-[26px] lg:text-[30px]" : "text-[19px]"}`}>{p.title}</h3>
                    <p className="mt-2 text-[15px] text-foreground-muted">
                      {p.shortDescription || "Prepare-se com aulas e materiais organizados para você estudar no seu ritmo e aproveitar melhor cada momento da sua preparação."}
                    </p>
                    {stats && <p className="mt-3 text-[13px] font-semibold text-foreground">{stats}</p>}
                    {wide && subjects.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {subjects.map((name) => (
                          <li key={name} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background py-1 pl-1 pr-2.5 text-[12px] font-semibold text-foreground">
                            <span className="grid h-6 min-w-6 place-items-center rounded-md bg-navy px-1 text-[10px] font-extrabold text-brand">{subjectInitials(name)}</span>{name}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto pt-6">
                      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line-soft pt-5 dark:border-white/10">
                        <span>
                          {off > 0 && <span className="block text-[13px] text-foreground-muted line-through">{formatCurrency(compare)}</span>}
                          <span className="block text-[28px] font-extrabold leading-tight text-foreground">{formatCurrency(price)}</span>
                          <span className="block text-[12px] text-foreground-muted">ou até 12x no cartão</span>
                        </span>
                        <span className={`flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold uppercase tracking-wide text-white group-hover:bg-brand-dark ${wide ? "" : "w-full"}`}>
                          Ver preparação <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                      <span className="mt-3 flex items-center gap-1.5 text-[12px] text-foreground-muted"><ShieldCheck className="h-3.5 w-3.5 text-ok" /> Acesso liberado após a confirmação do pagamento.</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. O que a LEX oferece (fundo escuro para dar ritmo) */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-[1180px] px-4 py-16 lg:px-8 lg:py-24">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-primary">O que a LEX oferece</p>
          <h2 className="mt-2 text-[30px] font-extrabold leading-tight lg:text-[40px]">
            Não é só assistir aulas.<br /><span className="text-primary">É ter uma estrutura para estudar.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-[16px] text-white/70">A LEX reúne tudo em um só lugar para deixar sua preparação mais simples, organizada e acessível.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OFFERS.map(({ icon: Icon, title, lead, text }) => (
              <div key={title} className="rounded-[18px] bg-white/[0.04] p-6 ring-1 ring-white/10 transition-colors hover:bg-white/[0.07]">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-[0_8px_20px_rgba(242,106,27,.35)]"><Icon className="h-6 w-6" /></span>
                <p className="mt-5 text-[17px] font-extrabold">{title}</p>
                <p className="mt-1 text-sm font-semibold text-primary">{lead}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-16 lg:px-8 lg:py-24">
        <SectionHead kicker="Como funciona" title={<>Começar é simples. <span className="text-brand">Estudar também pode ser.</span></>} />
        <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <span aria-hidden className="absolute left-[12%] right-[12%] top-6 hidden h-0.5 bg-gradient-to-r from-brand via-brand/40 to-brand/10 lg:block" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative text-center">
              <span className="relative mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand text-[15px] font-extrabold text-white shadow-[0_6px_16px_rgba(242,106,27,.35)] ring-8 ring-background">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-5 text-[17px] font-extrabold text-foreground">{s.title}</p>
              <p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-foreground-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mx-auto mt-12 flex max-w-2xl items-center gap-4 rounded-[18px] border border-ok/30 bg-ok-soft/60 p-5 dark:bg-ok/10">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ok text-white"><ShieldCheck className="h-6 w-6" /></span>
          <p className="text-[15px] text-foreground"><b>Compra segura + 7 dias de garantia.</b><br /><span className="text-foreground-muted">Você tem 7 dias para conhecer sua preparação.</span></p>
        </div>
      </section>

      {/* 5. CTA final */}
      <section className="px-4 pb-16 lg:px-8 lg:pb-24">
        <div className="brand-gradient relative mx-auto max-w-[1180px] overflow-hidden rounded-[28px] px-6 py-14 text-center text-white shadow-[0_30px_80px_rgba(31,43,58,.25)] lg:py-20">
          <div aria-hidden className="absolute inset-0 bg-grid opacity-[0.05]" />
          <div className="relative mx-auto max-w-[820px]">
            <h2 className="text-[28px] font-extrabold leading-tight sm:text-[38px]">O concurso que você quer começa com a preparação que você escolhe <span className="text-primary">hoje.</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">Pare de adiar o primeiro passo. Encontre sua preparação, entre para a LEX e comece a estudar no seu ritmo.</p>
            <a href="#preparacoes" className={`${ctaPrimary} mt-8`}><Rocket className="h-4 w-4" /> Quero começar agora <ArrowRight className="h-4 w-4" /></a>
            <p className="mt-4 text-sm text-white/70">Acesso online · Estude onde estiver · 7 dias de garantia</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white/70">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-12 text-sm sm:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white"><Image src="/logo.png" alt="" width={30} height={26} className="object-contain" /></span>
              <p className="text-[16px] font-extrabold text-white">LEX Concursos</p>
            </div>
            <p className="mt-3 max-w-sm">Preparação para concursos públicos de forma simples, acessível e organizada.</p>
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

function SectionHead({ kicker, title, text, note }: { kicker: string; title: React.ReactNode; text?: string; note?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">{kicker}</p>
      <h2 className="mt-2 text-[30px] font-extrabold leading-tight text-foreground lg:text-[40px]">{title}</h2>
      {text && <p className="mt-3 text-[16px] text-foreground-muted">{text}</p>}
      {note && <p className="mt-1 text-sm text-foreground-muted">{note}</p>}
    </div>
  );
}
