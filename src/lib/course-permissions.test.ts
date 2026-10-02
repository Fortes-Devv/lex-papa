import { describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  course: { count: vi.fn() },
  product: { count: vi.fn() },
  module: { count: vi.fn() },
  lesson: { findUnique: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db }));

import { canEditCourse, canEditLesson, canEditModule, canEditProduct } from "./course-permissions";

const admin = { id: "a", role: "admin" as const };
const moderator = { id: "m", role: "moderator" as const };
const teacherA = { id: "tA", role: "teacher" as const };
const student = { id: "s", role: "student" as const };

describe("permissões de conteúdo (F0-5)", () => {
  it("admin e moderador editam qualquer curso e módulo sem consultar o banco", async () => {
    for (const u of [admin, moderator]) {
      expect(await canEditCourse(u, "c1")).toBe(true);
      expect(await canEditModule(u, "m1")).toBe(true);
    }
    expect(db.course.count).not.toHaveBeenCalled();
  });

  it("aluno nunca edita", async () => {
    expect(await canEditCourse(student, "c1")).toBe(false);
    expect(await canEditProduct(student, "p1")).toBe(false);
    expect(await canEditModule(student, "m1")).toBe(false);
  });

  it("professor só edita curso do qual é instrutor", async () => {
    db.course.count.mockResolvedValueOnce(1);
    expect(await canEditCourse(teacherA, "do-A")).toBe(true);
    db.course.count.mockResolvedValueOnce(0);
    expect(await canEditCourse(teacherA, "do-B")).toBe(false);
    expect(db.course.count).toHaveBeenLastCalledWith({ where: { id: "do-B", product: { instructors: { some: { id: "tA" } } } } });
  });

  it("professor só edita módulo do qual é dono", async () => {
    db.module.count.mockResolvedValueOnce(0);
    expect(await canEditModule(teacherA, "modulo-do-B")).toBe(false);
    expect(db.module.count).toHaveBeenCalledWith({ where: { id: "modulo-do-B", instructorId: "tA" } });
  });

  it("aula herda a permissão do módulo; aula inexistente é negada", async () => {
    db.lesson.findUnique.mockResolvedValueOnce({ moduleId: "m1" });
    db.module.count.mockResolvedValueOnce(1);
    expect(await canEditLesson(teacherA, "l1")).toBe(true);
    db.lesson.findUnique.mockResolvedValueOnce(null);
    expect(await canEditLesson(teacherA, "nao-existe")).toBe(false);
  });
});
