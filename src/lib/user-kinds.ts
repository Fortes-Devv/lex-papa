import { isEnrollmentActive } from "@/lib/access";

// Classificação de pessoas na tela de Usuários, em termos que o dono entende:
// - cadastrado: criou conta, mas nunca teve acesso a curso;
// - aluno: tem acesso válido a pelo menos um curso;
// - assinante: tem uma assinatura ativa (produto do tipo "assinatura");
// - encerrado: já teve acesso, mas venceu, foi cancelado ou reembolsado;
// - professor: só o nome, para os créditos dos módulos (não entra na plataforma);
// - equipe: admin/moderador.
export type UserKind = "cadastrado" | "aluno" | "assinante" | "encerrado" | "professor" | "equipe";

export const KIND_LABEL: Record<UserKind, string> = {
  cadastrado: "Cadastrado",
  aluno: "Aluno",
  assinante: "Assinante",
  encerrado: "Acesso encerrado",
  professor: "Professor",
  equipe: "Equipe",
};

export interface EnrollmentLite {
  status: string;
  expiresAt: Date | null;
  product: { id: string; title: string; type: string };
}

export function classifyUser(role: string, enrollments: EnrollmentLite[]): { kind: UserKind; active: EnrollmentLite[] } {
  if (role === "admin" || role === "moderator") return { kind: "equipe", active: [] };
  if (role === "teacher") return { kind: "professor", active: [] };
  const active = enrollments.filter((e) => isEnrollmentActive({ status: e.status as never, expiresAt: e.expiresAt }));
  if (active.some((e) => e.product.type === "subscription")) return { kind: "assinante", active };
  if (active.length > 0) return { kind: "aluno", active };
  return { kind: enrollments.length > 0 ? "encerrado" : "cadastrado", active };
}

// Valores antigos do filtro (?papel=student|teacher|admin) continuam funcionando.
export function kindFromParam(value: string | null): UserKind | "contas" | null {
  if (!value) return null;
  if (value === "student") return "contas";
  if (value === "teacher") return "professor";
  if (value === "admin") return "equipe";
  return (["cadastrado", "aluno", "assinante", "encerrado", "professor", "equipe"] as const).find((k) => k === value) ?? null;
}

// Professores cadastrados só para créditos recebem um e-mail interno (o banco exige um).
export const NO_LOGIN_EMAIL_DOMAIN = "@sem-acesso.lexcursos.site";
export const isNoLoginEmail = (email: string) => email.endsWith(NO_LOGIN_EMAIL_DOMAIN);
