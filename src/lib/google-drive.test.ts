import { describe, it, expect } from "vitest";
import { parseDriveLink, titleFromFileName, driveDownloadUrl } from "./google-drive";

describe("parseDriveLink", () => {
  it("reconhece pasta", () => {
    expect(parseDriveLink("https://drive.google.com/drive/folders/1L1AVLfyL4RBAFMnpZK1h85lJ5YNYeoRZ?usp=sharing")).toEqual({ kind: "folder", id: "1L1AVLfyL4RBAFMnpZK1h85lJ5YNYeoRZ" });
    expect(parseDriveLink("https://drive.google.com/drive/u/0/folders/1L1AVLfyL4RBAFMnpZK1h85lJ5YNYeoRZ")?.kind).toBe("folder");
  });
  it("reconhece arquivo nos formatos comuns", () => {
    const id = "1O_FHdXC87oP4e7RuLXhJ1Fl7W2DBkuXj";
    for (const url of [`https://drive.google.com/file/d/${id}/view?usp=sharing`, `https://drive.google.com/open?id=${id}`, `https://drive.google.com/uc?export=download&id=${id}`, id]) {
      expect(parseDriveLink(url)).toEqual({ kind: "file", id });
    }
  });
  it("recusa links que não são do Drive", () => {
    expect(parseDriveLink("https://youtube.com/watch?v=abc")).toBeNull();
    expect(parseDriveLink("")).toBeNull();
  });
});

describe("titleFromFileName", () => {
  it("tira a extensão (inclusive dupla)", () => {
    expect(titleFromFileName("01 - Introdução.mp4")).toBe("01 - Introdução");
    expect(titleFromFileName("aula.mp4.mov")).toBe("aula");
    expect(titleFromFileName(".mp4")).toBe("Aula");
  });
});

it("monta o link de download direto", () => {
  expect(driveDownloadUrl("abc123")).toContain("id=abc123&export=download&confirm=t");
});
