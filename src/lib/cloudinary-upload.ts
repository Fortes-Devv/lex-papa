// Upload direto do navegador para o Cloudinary, com assinatura do nosso servidor.
// "raw" é o tipo do Cloudinary para arquivos (PDF, zip, etc.).
export type CloudinaryResourceType = "image" | "video" | "raw";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  duration?: number;
}

export async function uploadToCloudinary(
  file: File,
  { resourceType, folder = "lms", onProgress }: { resourceType: CloudinaryResourceType; folder?: string; onProgress?: (pct: number) => void },
): Promise<CloudinaryUploadResult> {
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

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
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
}
