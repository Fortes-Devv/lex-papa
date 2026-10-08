import { describe, it, expect } from "vitest";
import { classifyUser, kindFromParam, type EnrollmentLite } from "./user-kinds";

const enr = (status: string, type = "course", expiresAt: Date | null = null): EnrollmentLite => ({ status, expiresAt, product: { id: type, title: type, type } });
const past = new Date(Date.now() - 86_400_000);

describe("classifyUser", () => {
  it("sem matrícula = cadastrado", () => expect(classifyUser("student", []).kind).toBe("cadastrado"));
  it("curso ativo = aluno", () => expect(classifyUser("student", [enr("active")]).kind).toBe("aluno"));
  it("assinatura ativa = assinante", () => expect(classifyUser("student", [enr("active"), enr("active", "subscription")]).kind).toBe("assinante"));
  it("só acessos vencidos/cancelados = encerrado", () => {
    expect(classifyUser("student", [enr("cancelled")]).kind).toBe("encerrado");
    expect(classifyUser("student", [enr("active", "course", past)]).kind).toBe("encerrado");
  });
  it("papéis da equipe", () => {
    expect(classifyUser("moderator", []).kind).toBe("equipe");
  });
});

it("aceita os filtros antigos", () => {
  expect(kindFromParam("student")).toBe("contas");
  expect(kindFromParam("aluno")).toBe("aluno");
  expect(kindFromParam("xyz")).toBeNull();
});
