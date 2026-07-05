"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import "aos/dist/aos.css";

// Inicializa o AOS (Animate On Scroll) só no cliente (import dinâmico para
// não rodar no SSR) e reprocessa a cada navegação. Respeita prefers-reduced-motion.
// Usado nos layouts não-admin.
export function AosProvider() {
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    import("aos").then((mod) => {
      if (!active) return;
      mod.default.init({
        duration: 500,
        easing: "ease-out-cubic",
        once: true,
        offset: 40,
        disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    import("aos").then((mod) => mod.default.refreshHard());
  }, [pathname]);

  return null;
}
