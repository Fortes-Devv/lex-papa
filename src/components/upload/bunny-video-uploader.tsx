"use client";
import { useRef, useState } from "react";
import * as tus from "tus-js-client";
import { Upload, X, Loader2, CheckCircle2, Film } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface BunnyUploadResult {
  videoId: string;
  playbackUrl: string;
}

interface BunnyVideoUploaderProps {
  value?: string; // videoId atual (se já enviado)
  onUploaded: (result: BunnyUploadResult) => void;
  onRemove?: () => void;
  className?: string;
}

export function BunnyVideoUploader({ value, onUploaded, onRemove, className }: BunnyVideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setProgress(0);
    try {
      // 1) pede ao backend a criação do vídeo + assinatura de upload
      const res = await fetch("/api/bunny/create-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: file.name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Não foi possível preparar o upload.");
      }
      const creds = await res.json();

      // 2) upload direto do navegador pro Bunny via TUS (resumível, aguenta arquivos grandes)
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: creds.endpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            AuthorizationSignature: creds.signature,
            AuthorizationExpire: String(creds.expireTime),
            VideoId: creds.videoId,
            LibraryId: String(creds.libraryId),
          },
          metadata: { filetype: file.type, title: file.name },
          onError: (err) => reject(err),
          onProgress: (uploaded, total) => setProgress(Math.round((uploaded / total) * 100)),
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      const playbackUrl = `https://${creds.cdnHostname}/${creds.videoId}/playlist.m3u8`;
      onUploaded({ videoId: creds.videoId, playbackUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar vídeo.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
          <Film className="h-4 w-4 text-success shrink-0" />
          <span className="flex-1 truncate text-xs text-foreground-muted">Vídeo enviado ({value.slice(0, 8)}…)</span>
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-foreground-muted hover:text-destructive shrink-0">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-xs text-foreground-muted transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
        >
          {progress !== null ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Enviando vídeo... {progress}%</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Enviar vídeo (Bunny Stream)</span>
            </>
          )}
        </button>
      )}

      {progress !== null && (
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value && <p className="text-2xs text-foreground-subtle">O vídeo pode levar alguns minutos processando no Bunny antes de ficar disponível para os alunos.</p>}
    </div>
  );
}
