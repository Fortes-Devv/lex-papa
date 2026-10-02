import { describe, expect, it } from "vitest";
import { cloudinaryUrl } from "./cdn-img";

describe("cloudinaryUrl", () => {
  const raw = "https://res.cloudinary.com/demo/image/upload/v1712/lms/thumbnails/capa.jpg";

  it("pede formato/qualidade automáticos e largura 2x", () => {
    expect(cloudinaryUrl(raw, 400)).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/v1712/lms/thumbnails/capa.jpg");
  });

  it("não mexe em URL que já tem transformação", () => {
    const t = "https://res.cloudinary.com/demo/image/upload/c_fill,w_300/v1712/a.jpg";
    expect(cloudinaryUrl(t, 400)).toBe(t);
  });

  it("não mexe em URL fora do Cloudinary nem em vazio", () => {
    expect(cloudinaryUrl("/logo.png", 400)).toBe("/logo.png");
    expect(cloudinaryUrl(null, 400)).toBe("");
  });
});
