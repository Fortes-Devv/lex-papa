import { describe, it, expect } from "vitest";
import { subjectInitials, disciplineName } from "./discipline";

describe("subjectInitials", () => {
  it.each([
    ["Lingua Portuguesa Aulas", "LP"],
    ["Língua Portuguesa PDFs", "LP"],
    ["Raciocinio Lógico Matemático Aulas", "RL"],
    ["Informática PDFs", "IN"],
    ["Conhecimentos Fortaleza", "CF"],
    ["Direito Penal Aulas", "DP"],
    ["Direito Constitucional", "DC"],
    ["Direito Administrativo", "DA"],
    ["Direito Processual Penal", "DP"],
    ["Leis Municipais", "LM"],
    ["Atualidades", "AT"],
    ["Legislação de Trânsito", "LT"],
  ])("%s → %s", (title, expected) => expect(subjectInitials(title)).toBe(expected));
  it("vazio sem letras", () => expect(subjectInitials("—")).toBe(""));
});

it("disciplineName tira o sufixo", () => expect(disciplineName("Informática PDFs")).toBe("Informática"));
