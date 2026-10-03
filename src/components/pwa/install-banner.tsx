"use client";
import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useInstallApp } from "./pwa";

const KEY = "pwaBannerHiddenUntil";

// Convite para instalar o app (área do aluno). Some por 14 dias ao fechar.
export function InstallBanner() {
  const { mode, install } = useInstallApp();
  const [hidden, setHidden] = useState(true);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    try { setHidden(Number(localStorage.getItem(KEY) ?? 0) > Date.now()); } catch { setHidden(false); }
  }, []);
  function dismiss() {
    setHidden(true);
    try { localStorage.setItem(KEY, String(Date.now() + 14 * 24 * 60 * 60 * 1000)); } catch { /* sem storage */ }
  }

  if (!mode || hidden) return <InstallHelp open={iosHelp} onClose={() => setIosHelp(false)} />;

  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded-[14px] bg-navy p-3.5 pr-2 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- ícone do app */}
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Instale o app da LEX</p>
          <p className="text-xs text-white/70">Abra suas aulas direto da tela inicial, em tela cheia.</p>
        </div>
        <button type="button" onClick={() => (mode === "android" ? install() : setIosHelp(true))}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-bold hover:bg-brand-dark">
          <Download className="h-4 w-4" /> Instalar
        </button>
        <button type="button" onClick={dismiss} aria-label="Agora não" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <InstallHelp open={iosHelp} onClose={() => setIosHelp(false)} />
    </>
  );
}

// Passo a passo do iPhone/iPad (o Safari não tem botão de instalar).
export function InstallHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Instalar no iPhone" description="Leva 10 segundos, pelo Safari.">
      <ol className="space-y-3 text-sm text-foreground">
        <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand dark:bg-brand/15"><Share className="h-4 w-4" /></span> Toque em <b>Compartilhar</b> (na barra do Safari).</li>
        <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand dark:bg-brand/15"><SquarePlus className="h-4 w-4" /></span> Escolha <b>Adicionar à Tela de Início</b>.</li>
        <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand dark:bg-brand/15"><Download className="h-4 w-4" /></span> Toque em <b>Adicionar</b>. O ícone da LEX aparece na tela inicial.</li>
      </ol>
      <p className="mt-4 text-xs text-foreground-muted">Se estiver em outro navegador (Chrome, Instagram), abra lexcursos.site no Safari primeiro.</p>
    </Dialog>
  );
}
