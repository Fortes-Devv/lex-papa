"use client";
import { useRef, useState } from "react";
import { Upload, X, Loader2, CheckCircle2, ImageIcon, Video, FileText } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { uploadToCloudinary, type CloudinaryResourceType, type CloudinaryUploadResult } from "@/lib/cloudinary-upload";

type UploadResult = CloudinaryUploadResult;
type ResourceType = CloudinaryResourceType;

interface MediaUploaderProps {
  resourceType: ResourceType;
  folder?: string;
  value?: string;
  onUploaded: (result: UploadResult) => void;
  onRemove?: () => void;
  className?: string;
}

const ACCEPT: Record<ResourceType, string> = {
  image: "image/*",
  video: "video/*",
  raw: "application/pdf,.pdf",
};
const LABEL: Record<ResourceType, string> = {
  image: "Enviar imagem",
  video: "Enviar vídeo",
  raw: "Enviar PDF",
};

export function MediaUploader({ resourceType, folder = "lms", value, onUploaded, onRemove, className }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, { resourceType, folder, onProgress: setProgress });
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
        accept={ACCEPT[resourceType]}
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
          ) : resourceType === "raw" ? (
            <FileText className="h-4 w-4 text-success shrink-0" />
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
              <span>{LABEL[resourceType]}</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
