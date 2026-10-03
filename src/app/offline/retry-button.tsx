"use client";

export function RetryButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} className="h-11 rounded-xl bg-brand px-6 text-sm font-bold text-white hover:bg-brand-dark">
      Tentar de novo
    </button>
  );
}
