"use client";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Rota do nosso servidor: valida acesso e força o download com nome correto. */
export function pdfDownloadHref(lessonId: string): string {
  return `/api/lessons/${lessonId}/pdf`;
}

export function PdfViewer({ lessonId, title }: { lessonId: string; title: string }) {
  return (
    <div className="bg-neutral-900">
      <div className="mx-auto w-full max-w-3xl px-6 py-14">
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FileText className="h-7 w-7" />
          </div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-white/50">Material em PDF desta aula</p>

          <a href={pdfDownloadHref(lessonId)} download className="mt-5 inline-block">
            <Button size="lg" leftIcon={<Download className="h-4 w-4" />}>Baixar PDF</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
