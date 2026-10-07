import { describe, it, expect } from "vitest";
import { invalidEmailReason, suggestEmail } from "./email-check";

describe("invalidEmailReason", () => {
  it("recusa domínio com ç ou acento", () => {
    expect(invalidEmailReason("ariely@gmaiç.com")).toMatch(/digitado errado/);
    expect(invalidEmailReason("ana@gmaíl.com")).toMatch(/digitado errado/);
    expect(invalidEmailReason("ana@gmail")).toMatch(/digitado errado/);
    expect(invalidEmailReason("ariely@xn--gmai-3oa.com")).toMatch(/digitado errado/);
  });
  it("aceita e-mails normais", () => {
    expect(invalidEmailReason("ana@gmail.com")).toBeNull();
    expect(invalidEmailReason("jose@empresa.com.br")).toBeNull();
  });
});

describe("suggestEmail", () => {
  it.each([
    ["maria@gmial.com", "maria@gmail.com"],
    ["maria@gmail.con", "maria@gmail.com"],
    ["joao@hotmial.com", "joao@hotmail.com"],
    ["joao@outlok.com", "joao@outlook.com"],
  ])("%s → %s", (input, out) => expect(suggestEmail(input)).toBe(out));
  it("não sugere para domínios certos ou diferentes", () => {
    expect(suggestEmail("ana@gmail.com")).toBeNull();
    expect(suggestEmail("jose@lexcursos.site")).toBeNull();
  });
});
