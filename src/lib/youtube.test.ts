import { describe, it, expect } from "vitest";
import { parseIsoDuration, parsePlaylistId, parseYoutubeId } from "./youtube";
import { matchByOrder, matchByTitle, normalizeTitle } from "./youtube-match";

describe("parseYoutubeId", () => {
  it("aceita os formatos comuns de link e o ID puro", () => {
    for (const input of [
      "dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    ]) expect(parseYoutubeId(input)).toBe("dQw4w9WgXcQ");
  });
  it("recusa o que não é vídeo do YouTube", () => {
    expect(parseYoutubeId("https://vimeo.com/123")).toBeNull();
    expect(parseYoutubeId("abc")).toBeNull();
  });
});

describe("parsePlaylistId", () => {
  it("lê o list= do link", () => {
    expect(parsePlaylistId("https://www.youtube.com/playlist?list=PLabcdefghijKLMN")).toBe("PLabcdefghijKLMN");
    expect(parsePlaylistId("https://youtube.com/watch?v=dQw4w9WgXcQ&list=PLabcdefghijKLMN")).toBe("PLabcdefghijKLMN");
    expect(parsePlaylistId("sem playlist")).toBeNull();
  });
});

describe("parseIsoDuration", () => {
  it("converte para segundos", () => {
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
    expect(parseIsoDuration("PT45M")).toBe(2700);
    expect(parseIsoDuration("PT30S")).toBe(30);
  });
});

describe("ligar vídeos às aulas", () => {
  const lessons = [
    { id: "a", title: "Aula 01 - Introdução" },
    { id: "b", title: "Aula 02 – Lógica de Argumentação" },
    { id: "c", title: "Aula 03 - Exercícios" },
  ];
  const videos = [
    { id: "v2", title: "aula 02 - logica de argumentacao.mp4", duration: 600 },
    { id: "v1", title: "Aula 01 - Introducao", duration: 300 },
    { id: "v9", title: "Bônus", duration: 60 },
  ];
  it("normaliza acento, travessão, maiúsculas e extensão", () => {
    expect(normalizeTitle("Aula 02 – Lógica.mp4")).toBe(normalizeTitle("aula 02 - logica"));
  });
  it("pelo título liga mesmo fora de ordem e lista o que sobrou", () => {
    const r = matchByTitle(lessons, videos);
    expect(r.pairs.map((p) => [p.lesson.id, p.video.id])).toEqual([["a", "v1"], ["b", "v2"]]);
    expect(r.lessonsWithout.map((l) => l.id)).toEqual(["c"]);
    expect(r.videosUnused.map((v) => v.id)).toEqual(["v9"]);
  });
  it("pela ordem liga 1 com 1", () => {
    const r = matchByOrder(lessons, videos.slice(0, 2));
    expect(r.pairs.map((p) => [p.lesson.id, p.video.id])).toEqual([["a", "v2"], ["b", "v1"]]);
    expect(r.lessonsWithout.map((l) => l.id)).toEqual(["c"]);
  });
});

import { codeFromSearch, viewerCode, viewerMark } from "./viewer-mark";
describe("marca-d'água do aluno", () => {
  it("usa o primeiro nome e o código da conta, sem e-mail", () => {
    expect(viewerCode("cmabc123xyz9k3f9qz")).toBe("K3F9QZ");
    expect(viewerMark({ id: "cmabc123xyz9k3f9qz", name: "Ana Kelly de Sousa" })).toBe("Ana · #K3F9QZ");
  });
  it("a busca do admin entende #CÓDIGO", () => {
    expect(codeFromSearch("#k3f9qz")).toBe("K3F9QZ");
    expect(codeFromSearch("ana")).toBeNull();
  });
});
