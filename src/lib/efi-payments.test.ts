import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/mercadopago", () => ({ getMpOrderClient: vi.fn(), isMercadoPagoConfigured: () => false }));

import { cardStatus, EfiCardDeclined, efiCardErrorMessage } from "./efi-payments";
import { isValidCpf, isValidPhone } from "./documents";

describe("cardStatus (cobrança no cartão da Efí)", () => {
  it.each([
    ["approved", "paid"],
    ["paid", "paid"],
    ["settled", "paid"],
    ["waiting", "processing"],
    ["new", "processing"],
    ["unpaid", "failed"],
    ["refunded", "refunded"],
    ["contested", "chargeback"],
    ["canceled", "cancelled"],
  ])("%s → %s", (efi, ours) => {
    expect(cardStatus(efi)).toBe(ours);
  });
});

describe("efiCardErrorMessage", () => {
  it("antifraude da Efí não culpa o banco", () => {
    expect(efiCardErrorMessage(new EfiCardDeclined("AF - Transação não autorizada"))).toContain("análise de segurança");
  });
  it("recusa do banco", () => {
    expect(efiCardErrorMessage(new EfiCardDeclined("Transação não autorizada pelo emissor"))).toContain("banco recusou");
  });
});

describe("documentos", () => {
  it("CPF com dígito verificador", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-26")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });
  it("celular com DDD", () => {
    expect(isValidPhone("(85) 99999-9999")).toBe(true);
    expect(isValidPhone("99999-9999")).toBe(false);
  });
});
