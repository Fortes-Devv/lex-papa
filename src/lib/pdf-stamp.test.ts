import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { stampPdf } from "./pdf-stamp";

describe("stampPdf", () => {
  it("carimba o código do aluno e grava nos metadados", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    doc.addPage([595, 842]);
    const stamped = await stampPdf(await doc.save(), "Ana · #K3F9QZ");
    expect(stamped).not.toBeNull();
    const back = await PDFDocument.load(stamped!);
    expect(back.getPageCount()).toBe(2);
    expect(back.getKeywords()).toContain("#K3F9QZ");
  });
  it("arquivo que não é PDF volta null (vai sem carimbo)", async () => {
    expect(await stampPdf(new TextEncoder().encode("não é pdf"), "Ana · #K3F9QZ")).toBeNull();
  });
});
