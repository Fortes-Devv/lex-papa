"use client";
import { useEffect, useState } from "react";

// Pedido de instalação do navegador (Chrome/Edge/Android). Guardado fora do React
// porque o evento dispara uma vez só, às vezes antes da tela que mostra o botão.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferred: InstallEvent | null = null;
const CHANGE = "lex:pwa-change";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// Registra o service worker (só em produção) e captura o pedido de instalação.
export function PwaRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // mostramos o nosso botão em vez da barra do navegador
      deferred = e as InstallEvent;
      window.dispatchEvent(new Event(CHANGE));
    };
    const onInstalled = () => { deferred = null; window.dispatchEvent(new Event(CHANGE)); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

// "android" = dá para abrir o pedido do navegador; "ios" = mostrar o passo a passo; null = já instalado/indisponível.
export function useInstallApp() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  useEffect(() => {
    const update = () => setMode(isStandalone() ? null : deferred ? "android" : isIos() ? "ios" : null);
    update();
    window.addEventListener(CHANGE, update);
    return () => window.removeEventListener(CHANGE, update);
  }, []);
  async function install() {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") { deferred = null; window.dispatchEvent(new Event(CHANGE)); }
    return outcome === "accepted";
  }
  return { mode, install };
}
