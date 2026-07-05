import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const isStaff = ["admin", "moderator", "teacher"].includes(session.user.role);

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { error: "Cloudinary não configurado. Preencha CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET no .env." },
      { status: 500 }
    );
  }

  const { folder } = (await request.json().catch(() => ({}))) as { folder?: string };
  // Aluno só pode enviar para a pasta de avatares; staff pode escolher a pasta.
  const targetFolder = isStaff ? folder ?? "lms" : "lms/avatars";
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: targetFolder,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder: paramsToSign.folder,
  });
}
