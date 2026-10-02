import type { LessonType } from "@/lib/types";

// Dados que a área de módulos do curso recebe do servidor (ver src/lib/editor-modules.ts).

export interface EditorLesson {
  id: string;
  title: string;
  type: LessonType;
  status: string;
  order: number;
  duration: number | null;
  videoUrl: string | null; // URL base: é o que o formulário devolve ao salvar
  previewUrl: string | null; // URL assinada, só para o player do preview (nunca salvar)
  thumbUrl: string | null; // miniatura do vídeo (Bunny), assinada
  videoPublicId: string | null;
  pdfUrl: string | null;
  description: string | null;
  isFree: boolean;
  isPreview: boolean;
  completionCriteria: string;
  materials: { id: string; title: string }[]; // PDFs anexados (o aluno baixa embaixo do vídeo)
}

export interface EditorModule {
  id: string;
  title: string;
  order: number; // ordem NESTE curso
  isPublished: boolean; // publicado NESTE curso
  instructorId: string | null;
  instructorName: string | null;
  instructorAvatar: string | null;
  coverImage: string | null; // null → capa automática
  canEdit: boolean; // pode editar o conteúdo (dono do módulo ou admin)
  usedIn: string[]; // outros cursos que usam este módulo
  lessons: EditorLesson[];
}

export interface TeacherOption {
  id: string;
  name: string;
}

export interface CourseHeaderInfo {
  courseId: string;
  productId: string;
  title: string;
  thumbnail: string;
  status: string;
  price: number;
  enrolledCount: number;
}
