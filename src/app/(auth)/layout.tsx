export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 bg-sidebar border-r border-border flex-col justify-between p-10 relative overflow-hidden">
        {/* Grid bg */}
        <div className="absolute inset-0 bg-grid opacity-40" />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">E</span>
            </div>
            <span className="font-semibold text-foreground">LEX Concursos</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <blockquote className="text-xl font-medium text-foreground leading-relaxed">
            "A plataforma que transformou minha carreira. Os cursos são extremamente práticos e os professores incríveis."
          </blockquote>
          <div className="flex items-center gap-3">
            <img src="https://i.pravatar.cc/40?img=9" className="h-10 w-10 rounded-full border border-border" alt="Mariana" />
            <div>
              <p className="text-sm font-medium text-foreground">Mariana Costa</p>
              <p className="text-xs text-foreground-muted">Desenvolvedora Full-Stack</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-xs text-foreground-muted">
          <div><span className="text-foreground font-semibold text-sm">+12.000</span><br />Alunos</div>
          <div className="w-px h-6 bg-border" />
          <div><span className="text-foreground font-semibold text-sm">+80</span><br />Cursos</div>
          <div className="w-px h-6 bg-border" />
          <div><span className="text-foreground font-semibold text-sm">4.9★</span><br />Avaliação</div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
