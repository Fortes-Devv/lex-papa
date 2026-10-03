import { describe, it, expect } from "vitest";
import { safeCallbackUrl } from "./safe-redirect";

describe("safeCallbackUrl", () => {
  it("aceita caminho interno", () => {
    expect(safeCallbackUrl("/checkout?productId=abc")).toBe("/checkout?productId=abc");
    expect(safeCallbackUrl("/cursos/guarda")).toBe("/cursos/guarda");
  });
  it("recusa outros sites e valores vazios", () => {
    for (const v of ["https://evil.com", "//evil.com", "/\\evil.com", "evil.com", "", null, undefined]) expect(safeCallbackUrl(v)).toBeNull();
  });
});
