import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Carimba o PDF baixado pelo aluno com o código da conta (rodapé de cada página e nos
// metadados do arquivo). Se o PDF vazar, dá para saber de qual conta saiu.
// PDF protegido, grande demais ou com erro: devolve null e o arquivo vai sem carimbo.

const MAX_BYTES = 40 * 1024 * 1024;

// A fonte padrão do PDF só tem os caracteres latinos (acentos do português incluídos).
const latin = (s: string) => s.replace(/[^\x20-\x7E -ÿ—·]/g, "");

export async function stampPdf(bytes: Uint8Array, mark: string): Promise<Uint8Array | null> {
  if (bytes.byteLength > MAX_BYTES) return null;
  try {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    if (pdf.isEncrypted) return null;
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const date = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
    const text = latin(`${mark} · baixado em ${date} · uso pessoal e intransferível — LEX Concursos`);
    for (const page of pdf.getPages()) {
      const { width } = page.getSize();
      const size = 7;
      const w = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: Math.max(12, (width - w) / 2), y: 10, size, font, color: rgb(0.45, 0.45, 0.45), opacity: 0.85 });
    }
    pdf.setSubject(latin(`Cópia de ${mark}`));
    pdf.setKeywords([latin(mark)]);
    return await pdf.save();
  } catch (err) {
    console.error("[pdf-stamp] PDF sem carimbo:", err instanceof Error ? err.message : err);
    return null;
  }
}
