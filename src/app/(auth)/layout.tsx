import Image from "next/image";
import { PlayCircle, MessageSquare, Infinity, Clock } from "lucide-react";

const FEATURES = [
  { icon: PlayCircle, text: "Videoaulas com professores especialistas em concursos" },
  { icon: MessageSquare, text: "Suporte e comunidade de estudos ativa" },
  { icon: Infinity, text: "Acesso vitalício ao conteúdo que você comprar" },
  { icon: Clock, text: "Estude no seu ritmo, de onde e quando quiser" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 bg-sidebar border-r border-border flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <Image src="/logo.png" alt="LEX Concursos" width={94} height={80} className="object-contain" priority />
        </div>

        {/* Value proposition */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-foreground leading-tight">
              Sua aprovação<br />começa aqui.
            </h2>
            <p className="text-sm text-foreground-muted max-w-sm">
              Preparação completa para concursos públicos, com aulas objetivas e material atualizado.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-3">
                <span className="mt-0.5 h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <f.icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-foreground-muted leading-snug">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer tagline */}
        <div className="relative z-10">
          <p className="text-xs text-foreground-subtle">© {new Date().getFullYear()} LEX Concursos. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
