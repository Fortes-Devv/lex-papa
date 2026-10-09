import { describe, expect, it } from "vitest";
import { NEW_STATE, intervalLabel, schedule } from "./srs";
import { clozeParts, parseBulk } from "./format";

describe("schedule", () => {
  it("cartão novo: errei volta na sessão; bom em 2 dias; fácil em 4", () => {
    expect(schedule(NEW_STATE, 1).interval).toBe(0);
    expect(schedule(NEW_STATE, 3).interval).toBe(2);
    expect(schedule(NEW_STATE, 4).interval).toBe(4);
  });
  it("acertos seguidos espaçam cada vez mais", () => {
    let s = schedule(NEW_STATE, 3);
    const seen = [s.interval];
    for (let i = 0; i < 4; i++) { s = schedule(s, 3); seen.push(s.interval); }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
  });
  it("errar um cartão aprendido conta lapso e derruba a facilidade", () => {
    const learned = { ease: 2.5, interval: 10, reps: 3, lapses: 0 };
    const s = schedule(learned, 1);
    expect(s).toMatchObject({ interval: 0, reps: 0, lapses: 1 });
    expect(s.ease).toBeLessThan(2.5);
  });
  it("difícil < bom < fácil", () => {
    const st = { ease: 2.5, interval: 5, reps: 2, lapses: 0 };
    const [h, g, e] = ([2, 3, 4] as const).map((r) => schedule(st, r).interval);
    expect(h).toBeLessThan(g);
    expect(g).toBeLessThan(e);
  });
  it("rótulos", () => {
    expect(intervalLabel(0)).toBe("agora");
    expect(intervalLabel(1)).toBe("1 dia");
    expect(intervalLabel(21)).toBe("3 sem");
  });
});

describe("format", () => {
  it("lacunas", () => {
    expect(clozeParts("A casa é {{asilo inviolável}} do indivíduo")).toEqual([
      { text: "A casa é ", hidden: false }, { text: "asilo inviolável", hidden: true }, { text: " do indivíduo", hidden: false },
    ]);
  });
  it("importação: pergunta, certo/errado, lacuna e erros", () => {
    const { cards, errors } = parseBulk([
      "# comentário",
      "Prazo do HC? ;; Não há prazo ;; Pode ser impetrado a qualquer tempo",
      "E ;; O STF é composto por 13 ministros ;; São 11",
      "Certo\tA CF/88 é rígida",
      "Todos são {{iguais perante a lei}} ;; ;; Art. 5º, caput",
      "Só a pergunta",
    ].join("\n"));
    expect(cards.map((c) => c.type)).toEqual(["basic", "certo_errado", "certo_errado", "lacuna"]);
    expect(cards[1]).toMatchObject({ back: "errado", explanation: "São 11" });
    expect(cards[3].source).toBe("Art. 5º, caput");
    expect(errors).toEqual(["Linha 6: Preencha a resposta (verso)."]);
  });
});
