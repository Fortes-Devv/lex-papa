import Image from "next/image";
import { Check } from "lucide-react";
import { AosProvider } from "@/components/providers/aos-provider";

const FEATURES = [
  "Videoaulas com professores especialistas em concursos",
  "Suporte e comunidade de estudos ativa",
  "Acesso vitalício ao conteúdo que você comprar",
  "Estude no seu ritmo, de onde e quando quiser",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      <AosProvider />
      {/* Left — branding (painel escuro, gradiente animado da marca) */}
      <div className="brand-gradient relative hidden lg:flex lg:w-1/2 xl:w-[45%] flex-col justify-between overflow-hidden p-10 xl:p-12 text-white">
        <div aria-hidden className="absolute inset-0 bg-grid opacity-[0.05]" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent,rgba(0,0,0,0.35))]" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-lg">
            <Image src="/logo.png" alt="LEX Concursos" width={80} height={68} className="object-contain" priority />
          </div>
        </div>

        {/* Value proposition */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h2 className="font-sans text-4xl xl:text-5xl font-extrabold leading-[1.05] tracking-tight">
              Sua aprovação<br /><span className="text-primary">começa aqui.</span>
            </h2>
            <p className="max-w-md text-base leading-relaxed text-white/70">
              Preparação completa para concursos públicos, com aulas objetivas e material atualizado.
            </p>
          </div>

          <ul className="space-y-3.5">
            {FEATURES.map((text) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Check className="h-4 w-4 text-primary" />
                </span>
                <span className="text-sm leading-snug text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} LEX Concursos. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
