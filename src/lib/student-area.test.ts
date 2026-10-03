import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
import { dayKey, weekStart, disciplineName, pickNextUp, type CourseOutline, type OutlineLesson } from "./student-area";

describe("disciplineName", () => {
  it("junta módulos de aulas e de PDFs da mesma disciplina", () => {
    expect(disciplineName("Lingua Portuguesa Aulas")).toBe("Lingua Portuguesa");
    expect(disciplineName("Lingua Portuguesa PDFs")).toBe("Lingua Portuguesa");
    expect(disciplineName("Informática - Vídeos")).toBe("Informática");
    expect(disciplineName("Raciocínio Lógico Matemático Material")).toBe("Raciocínio Lógico Matemático");
  });
  it("mantém o título quando não há sufixo", () => {
    expect(disciplineName("Direito Penal")).toBe("Direito Penal");
    expect(disciplineName("Aulas")).toBe("Aulas");
  });
});

describe("dayKey / weekStart", () => {
  it("usa o dia de Fortaleza (UTC-3)", () => {
    // 01:00 UTC de 3/out = 22:00 de 2/out em Fortaleza
    expect(dayKey(new Date("2026-10-03T01:00:00Z")).toISOString()).toBe("2026-10-02T00:00:00.000Z");
  });
  it("semana começa na segunda", () => {
    expect(weekStart(new Date("2026-10-04T00:00:00Z")).toISOString()).toBe("2026-09-28T00:00:00.000Z"); // domingo
    expect(weekStart(new Date("2026-09-28T00:00:00Z")).toISOString()).toBe("2026-09-28T00:00:00.000Z"); // segunda
  });
});

const lesson = (id: string, done = false, position = 0): OutlineLesson => ({
  id, title: id, type: "video", duration: 600, isCompleted: done, position, hasVideo: true, isPdf: false, materials: 0, downloaded: false,
});
const outline = (lessons: OutlineLesson[][]): CourseOutline => ({
  courseId: "c", productId: "p", title: "Curso", slug: "curso", thumbnail: "", examDate: null, enrolled: true, progress: 0, disciplines: [],
  modules: lessons.map((ls, i) => ({ id: `m${i}`, number: i + 1, title: `M${i}`, coverImage: null, instructorName: null, kind: "aula", lessons: ls, done: 0, total: ls.length })),
});

describe("pickNextUp", () => {
  it("continua a aula parada no meio", () => {
    const o = outline([[lesson("a", true), lesson("b", false, 120), lesson("c")]]);
    const { current, upcoming } = pickNextUp(o, "b");
    expect(current?.lessonId).toBe("b");
    expect(current?.lessonIndex).toBe(2);
    expect(upcoming.map((u) => u.lessonId)).toEqual(["c"]);
  });
  it("sem aula parada, pega a primeira não concluída", () => {
    const o = outline([[lesson("a", true)], [lesson("b"), lesson("c")]]);
    expect(pickNextUp(o, null).current?.lessonId).toBe("b");
  });
  it("aula parada já concluída é ignorada", () => {
    const o = outline([[lesson("a", true, 300), lesson("b")]]);
    expect(pickNextUp(o, "a").current?.lessonId).toBe("b");
  });
  it("curso concluído não tem próxima", () => {
    expect(pickNextUp(outline([[lesson("a", true)]]), null).current).toBeNull();
  });
});
