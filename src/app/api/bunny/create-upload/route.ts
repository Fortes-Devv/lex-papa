import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBunnyVideo, buildUploadCredentials, isBunnyConfigured } from "@/lib/bunny";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !["admin", "moderator", "teacher"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  if (!isBunnyConfigured()) {
    return NextResponse.json({ error: "Bunny Stream não configurado. Preencha BUNNY_STREAM_* no ambiente." }, { status: 500 });
  }

  const { title } = (await request.json().catch(() => ({}))) as { title?: string };

  try {
    const { videoId } = await createBunnyVideo(title || "Aula");
    const creds = buildUploadCredentials(videoId);
    return NextResponse.json(creds);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao preparar upload." }, { status: 502 });
  }
}
