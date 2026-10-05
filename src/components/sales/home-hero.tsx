import Image from "next/image";
import Link from "next/link";
import { Caveat } from "next/font/google";
import { PlayCircle, FileText, BarChart3, Headset, Rocket, ArrowRight, ShieldCheck, MonitorSmartphone, Lock } from "lucide-react";

const script = Caveat({ subsets: ["latin"], weight: ["600", "700"], display: "swap" });

// Fotos do hero (WebP em public/hero; a versão "-m" é a do celular).
const SLIDES = [
  { name: "guarda-municipal", alt: "Guarda municipal ao lado da viatura" },
  { name: "policia-civil", alt: "Policial civil em patrulha urbana" },
  { name: "policia-federal", alt: "Agente da Polícia Federal ao entardecer" },
  { name: "bepi", alt: "Operador do BEPI em veículo tático" },
];

// Recursos que existem de verdade na plataforma.
const FEATURES = [
  { icon: PlayCircle, title: "Aulas atualizadas", text: "com professores especializados" },
  { icon: FileText, title: "Materiais de apoio", text: "e PDFs de cada aula" },
  { icon: BarChart3, title: "Meta e progresso", text: "estude no seu ritmo" },
  { icon: Headset, title: "Suporte às dúvidas", text: "direto na aula" },
];

function Slides({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      {SLIDES.map((s, i) => (
        <div key={s.name} className="hero-slide absolute inset-0">
          <Image src={`/hero/${s.name}${mobile ? "-m" : ""}.webp`} alt={s.alt} fill unoptimized priority={i === 0}
            sizes={mobile ? "100vw" : "62vw"} className="object-cover object-[70%_center]" />
        </div>
      ))}
    </>
  );
}

// Hero da vitrine (modelo enviado pelo dono): copy à esquerda, fotos se alternando à direita
// e faixa de confiança embaixo. No celular as fotos viram uma faixa no topo.
export function HomeHero({ lessons, hours }: { lessons: number; hours: number }) {
  const strip = [
    { icon: PlayCircle, a: lessons ? `${lessons} aulas` : "Aulas em vídeo", b: hours ? `${hours}h de conteúdo` : "sempre atualizadas" },
    { icon: ShieldCheck, a: "7 dias de garantia", b: "devolução total" },
    { icon: MonitorSmartphone, a: "Plataforma 100% online", b: "e acessível em qualquer lugar" },
    { icon: Lock, a: "Ambiente seguro", b: "e confiável" },
  ];

  return (
    <section className="relative overflow-hidden bg-[#0b111a] text-white">
      {/* Fotos — desktop: lado direito, fundindo no escuro */}
      <div className="absolute inset-y-0 right-0 hidden w-[64%] [-webkit-mask-image:linear-gradient(90deg,transparent_0%,#000_38%)] [mask-image:linear-gradient(90deg,transparent_0%,#000_38%)] lg:block">
        <Slides />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#0b111a_0%,rgba(11,17,26,0)_28%),linear-gradient(90deg,rgba(11,17,26,.35)_0%,rgba(11,17,26,0)_60%)]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-brand/20 blur-3xl" />

      <div className="relative mx-auto max-w-[1240px] px-4 lg:px-10">
        {/* Marca */}
        <div className="flex items-center gap-4 pt-6 lg:gap-6 lg:pt-12">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white shadow-[0_10px_30px_rgba(0,0,0,.4)] lg:h-20 lg:w-20">
            <Image src="/icons/icon-512.png" alt="LEX Concursos" width={72} height={72} className="h-[92%] w-[92%] object-contain" priority />
          </span>
          <span className="h-10 w-px bg-white/20" aria-hidden />
          <p className="text-[11px] font-semibold uppercase leading-snug tracking-[0.18em] text-white/65 lg:text-[12.5px]">
            Sua aprovação<br />começa com<br />o preparo certo.
          </p>
        </div>

        {/* Fotos — celular: faixa com as fotos e a frase manuscrita */}
        <div className="relative -mx-4 mt-6 aspect-[4/3] overflow-hidden sm:aspect-[16/9] lg:hidden">
          <Slides mobile />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,#0b111a_0%,rgba(11,17,26,.15)_45%,rgba(11,17,26,.35)_100%)]" />
          <p className={`${script.className} absolute bottom-5 left-5 -rotate-6 text-[30px] leading-[0.95] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.6)]`}>
            Disciplina hoje,<br />sua vaga amanhã.
            <svg aria-hidden viewBox="0 0 220 14" className="mt-1 h-3 w-[200px] text-brand"><path d="M2 10 C 60 2, 140 2, 218 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
          </p>
        </div>

        <div className="relative grid lg:min-h-[640px] lg:grid-cols-[minmax(0,640px)_1fr] lg:items-center">
          <div className="pb-8 pt-6 lg:pb-14 lg:pt-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/90 lg:text-[12px]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Preparação para concursos públicos
            </p>
            <h1 className="mt-5 text-[38px] font-extrabold leading-[1.02] tracking-tight sm:text-[50px] lg:text-[60px]">
              Mais que aulas,<br /><span className="text-brand">uma estratégia</span><br />para a sua aprovação.
            </h1>
            <p className="mt-5 max-w-[540px] text-[16px] leading-relaxed text-white/80 lg:text-[18px]">
              Na <b className="text-white">Lex Concursos</b> você estuda com foco, aulas objetivas e todo o suporte necessário para conquistar sua vaga na <b className="text-brand">área policial</b> e muito mais.
            </p>

            <ul className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 lg:flex lg:gap-0 lg:divide-x lg:divide-white/15">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3 lg:px-4 lg:first:pl-0">
                  <Icon className="mt-0.5 h-7 w-7 shrink-0 text-brand" strokeWidth={1.6} />
                  <span>
                    <span className="block text-[12.5px] font-extrabold uppercase leading-tight tracking-wide lg:whitespace-nowrap">{title}</span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-white/60">{text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
              <a href="#preparacoes" className="inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-brand px-7 text-[15px] font-extrabold uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(242,106,27,.4)] hover:bg-brand-dark">
                <Rocket className="h-5 w-5" /> Quero começar a estudar <ArrowRight className="h-5 w-5" />
              </a>
              <Link href="/login" className="inline-flex items-center justify-center gap-1.5 text-[15px] font-bold text-white/90 hover:text-white">Já sou aluno <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>

          {/* Frase manuscrita (desktop) */}
          <p aria-hidden className={`${script.className} pointer-events-none absolute left-[640px] top-24 hidden -rotate-12 text-[40px] leading-[0.95] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,.6)] xl:block`}>
            Disciplina hoje,<br />sua vaga amanhã.
            <svg viewBox="0 0 260 16" className="mt-1 h-4 w-[250px] text-brand"><path d="M2 12 C 80 2, 170 2, 258 7" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg>
          </p>
        </div>
      </div>

      {/* Faixa de confiança (dados reais) */}
      <div className="relative border-t border-white/10 bg-[#0b111a]/80 backdrop-blur">
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 lg:flex lg:items-center lg:gap-0 lg:px-10">
          {strip.map(({ icon: Icon, a, b }) => (
            <div key={a} className="flex items-center gap-3 lg:shrink-0 lg:border-r lg:border-white/10 lg:px-6 lg:first:pl-0 lg:last:border-0">
              <Icon className="h-7 w-7 shrink-0 text-white/80" strokeWidth={1.5} />
              <span className="text-[12.5px] leading-tight text-white/60 lg:whitespace-nowrap lg:text-[13px]"><b className="block font-bold text-white">{a}</b>{b}</span>
            </div>
          ))}
          <p className="col-span-2 hidden whitespace-nowrap text-[11.5px] font-semibold uppercase tracking-[0.2em] text-white/50 xl:ml-auto xl:block">
            Concursos <span className="mx-2 text-brand">•</span> Carreiras <span className="mx-2 text-brand">•</span> Seu futuro
          </p>
        </div>
      </div>
    </section>
  );
}
