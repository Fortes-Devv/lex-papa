"use client";
import { useRef, useState } from "react";
import { Upload, X, Loader2, CheckCircle2, ImageIcon, Video } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface UploadResult {
  url: string;
  publicId: string;
  duration?: number;
}

interface MediaUploaderProps {
  resourceType: "image" | "video";
  folder?: string;
  value?: string;
  onUploaded: (result: UploadResult) => void;
  onRemove?: () => void;
  className?: string;
}

export function MediaUploader({ resourceType, folder = "lms", value, onUploaded, onRemove, className }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setProgress(0);
    try {
      const signRes = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      if (!signRes.ok) {
        const body = await signRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Não foi possível autorizar o upload.");
      }
      const { signature, timestamp, apiKey, cloudName, folder: signedFolder } = await signRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", signedFolder);

      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve({ url: data.secure_url, publicId: data.public_id, duration: data.duration ? Math.round(data.duration) : undefined });
          } else {
            reject(new Error("Falha no upload para o Cloudinary."));
          }
        };
        xhr.onerror = () => reject(new Error("Falha de rede durante o upload."));
        xhr.send(formData);
      });

      onUploaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar arquivo.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={resourceType === "image" ? "image/*" : "video/*"}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
          {resourceType === "image" ? (
            <ImageIcon className="h-4 w-4 text-success shrink-0" />
          ) : (
            <Video className="h-4 w-4 text-success shrink-0" />
          )}
          <span className="flex-1 truncate text-xs text-foreground-muted">{value}</span>
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
              <span>Enviando... {progress}%</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>{resourceType === "image" ? "Enviar imagem" : "Enviar vídeo"}</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
