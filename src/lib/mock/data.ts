import type {
  User, Product, Course, Module, Lesson, Order, Enrollment, Certificate,
  Category, Tag, Coupon, AuditLog, MediaFile, Article, Notification,
  Achievement, UserXP, CMSPage, Webhook, Post, Comment,
  RevenueDataPoint, CourseAnalytics, AnalyticsMetric
} from "@/lib/types";

// ─── HELPERS ────────────────────────────────────────────────────────────────

const now = new Date().toISOString();
const ago = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString();

function randId() {
  return Math.random().toString(36).slice(2, 11);
}

export async function delay(ms = 400) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── USERS ──────────────────────────────────────────────────────────────────

export const MOCK_USERS: User[] = [
  {
    id: "usr_admin_1",
    name: "Carlos Mendes",
    email: "carlos@lexconcursos.com.br",
    avatar: "https://i.pravatar.cc/150?img=1",
    role: "admin",
    status: "active",
    bio: "Administrador da plataforma LEX Concursos.",
    twoFactorEnabled: true,
    emailVerified: true,
    oauthProviders: ["google"],
    createdAt: ago(365),
    updatedAt: ago(1),
    lastLoginAt: ago(0),
  },
  {
    id: "usr_teacher_1",
    name: "Prof. Ricardo Nogueira",
    email: "ricardo@lexconcursos.com.br",
    avatar: "https://i.pravatar.cc/150?img=52",
    role: "teacher",
    status: "active",
    bio: "Especialista em Direito Constitucional e Administrativo com 12 anos de experiência em preparação para concursos públicos.",
    twoFactorEnabled: false,
    emailVerified: true,
    oauthProviders: ["google"],
    createdAt: ago(180),
    updatedAt: ago(2),
    lastLoginAt: ago(0),
  },
  {
    id: "usr_teacher_2",
    name: "Prof. John Alesse",
    email: "john@lexconcursos.com.br",
    avatar: "https://i.pravatar.cc/150?img=57",
    role: "teacher",
    status: "active",
    bio: "Delegado de Polícia e especialista em Legislação Penal para concursos de Segurança Pública.",
    twoFactorEnabled: false,
    emailVerified: true,
    oauthProviders: [],
    createdAt: ago(150),
    updatedAt: ago(5),
    lastLoginAt: ago(1),
  },
  {
    id: "usr_student_1",
    name: "Mariana Costa",
    email: "mariana@email.com",
    avatar: "https://i.pravatar.cc/150?img=9",
    role: "student",
    status: "active",
    bio: "Estudando para concurso da PPCE. Foco total!",
    twoFactorEnabled: false,
    emailVerified: true,
    oauthProviders: ["google"],
    createdAt: ago(90),
    updatedAt: ago(3),
    lastLoginAt: ago(0),
  },
  {
    id: "usr_student_2",
    name: "Felipe Santos",
    email: "felipe@email.com",
    avatar: "https://i.pravatar.cc/150?img=15",
    role: "student",
    status: "active",
    bio: "",
    twoFactorEnabled: false,
    emailVerified: true,
    oauthProviders: [],
    createdAt: ago(60),
    updatedAt: ago(7),
    lastLoginAt: ago(2),
  },
  {
    id: "usr_student_3",
    name: "Juliana Ferreira",
    email: "juliana@email.com",
    avatar: "https://i.pravatar.cc/150?img=20",
    role: "student",
    status: "active",
    bio: "",
    twoFactorEnabled: false,
    emailVerified: false,
    oauthProviders: [],
    createdAt: ago(15),
    updatedAt: ago(15),
    lastLoginAt: ago(10),
  },
  {
    id: "usr_student_4",
    name: "Paulo Rodrigues",
    email: "paulo@email.com",
    avatar: "https://i.pravatar.cc/150?img=33",
    role: "student",
    status: "inactive",
    bio: "",
    twoFactorEnabled: false,
    emailVerified: true,
    oauthProviders: [],
    createdAt: ago(200),
    updatedAt: ago(60),
    lastLoginAt: ago(60),
  },
];

export const CURRENT_USER = MOCK_USERS[0];
export const CURRENT_STUDENT = MOCK_USERS[3];
export const CURRENT_TEACHER = MOCK_USERS[1];

// ─── CATEGORIES ─────────────────────────────────────────────────────────────

export const MOCK_CATEGORIES: Category[] = [
  { id: "cat_1", name: "Segurança Pública", slug: "seguranca-publica", icon: "Shield", color: "#E8650A", order: 1, isActive: true, createdAt: ago(200) },
  { id: "cat_2", name: "Poder Judiciário", slug: "poder-judiciario", icon: "Scale", color: "#F59E0B", order: 2, isActive: true, createdAt: ago(200) },
  { id: "cat_3", name: "Direito e Legislação", slug: "direito-legislacao", icon: "BookOpen", color: "#10B981", order: 3, isActive: true, createdAt: ago(180) },
  { id: "cat_4", name: "Guarda Municipal", slug: "guarda-municipal", icon: "Users", color: "#6366F1", order: 4, isActive: true, createdAt: ago(180) },
  { id: "cat_5", name: "Questões e Simulados", slug: "questoes-simulados", icon: "ClipboardList", color: "#EC4899", order: 5, isActive: true, createdAt: ago(150) },
  { id: "cat_6", name: "Reta Final", slug: "reta-final", icon: "Target", color: "#EF4444", order: 6, isActive: true, createdAt: ago(120) },
];

// ─── TAGS ───────────────────────────────────────────────────────────────────

export const MOCK_TAGS: Tag[] = [
  { id: "tag_1", name: "Direito Constitucional", slug: "direito-constitucional", color: "#E8650A", count: 12 },
  { id: "tag_2", name: "Direito Administrativo", slug: "direito-administrativo", color: "#F59E0B", count: 10 },
  { id: "tag_3", name: "Direito Penal", slug: "direito-penal", color: "#EF4444", count: 9 },
  { id: "tag_4", name: "Legislação Extravagante", slug: "legislacao-extravagante", color: "#8B5CF6", count: 7 },
  { id: "tag_5", name: "Questões FCC", slug: "questoes-fcc", color: "#6366F1", count: 8 },
  { id: "tag_6", name: "Simulados", slug: "simulados", color: "#10B981", count: 6 },
  { id: "tag_7", name: "Videoaulas", slug: "videoaulas", color: "#3B82F6", count: 15 },
  { id: "tag_8", name: "Vade Mecum", slug: "vade-mecum", color: "#EC4899", count: 5 },
];

// ─── PRODUCTS ───────────────────────────────────────────────────────────────

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod_1",
    type: "course",
    status: "published",
    title: "GMF — Guarda Municipal de Fortaleza | Curso Completo",
    slug: "gmf-guarda-municipal-fortaleza-completo",
    shortDescription: "Videoaulas teóricas, PDFs estratégicos, cronograma de estudos, mentoria coletiva e grupo tira-dúvidas. Bônus: Vade Mecum.",
    description: "Curso completo para o concurso da Guarda Municipal de Fortaleza (GMF). Conteúdo 100% alinhado ao edital com videoaulas teóricas gravadas, PDFs estratégicos para cada disciplina, cronograma de estudos personalizado, mentoria coletiva ao vivo e grupo exclusivo de tira-dúvidas. Bônus exclusivo: Vade Mecum digital atualizado.",
    thumbnail: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80",
    price: 327,
    comparePrice: 469,
    currency: "BRL",
    accessType: "lifetime",
    level: "beginner",
    language: "pt-BR",
    categoryId: "cat_4",
    category: MOCK_CATEGORIES[3],
    tags: [MOCK_TAGS[0], MOCK_TAGS[1], MOCK_TAGS[6]],
    instructorIds: ["usr_teacher_1", "usr_teacher_2"],
    isFeatured: true,
    isPublic: true,
    requiresEnrollment: true,
    enrolledCount: 2847,
    rating: 4.9,
    reviewCount: 612,
    publishedAt: ago(60),
    createdAt: ago(90),
    updatedAt: ago(2),
  },
  {
    id: "prod_2",
    type: "course",
    status: "published",
    title: "TJCE Intensivão Reta Final — Tribunal de Justiça do Ceará",
    slug: "tjce-intensivao-reta-final",
    shortDescription: "Mais de 1000 questões em videoaulas, Vademecum 2025, Trilhas Estratégicas, Todo o edital em questões FCC. Combo com simulados e mentoria.",
    description: "Intensivão Reta Final para o concurso do TJCE. Mais de 1000 questões comentadas em videoaulas, Vademecum atualizado 2025, trilhas estratégicas de estudos com foco nos temas mais cobrados pela banca FCC. Todo o edital convertido em questões no estilo FCC. Bônus: Pacote de simulados, Live de revisão de véspera, 02 mentorias individuais e simulados gabaritados comentados estilo FCC.",
    thumbnail: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80",
    price: 187,
    comparePrice: 350,
    currency: "BRL",
    accessType: "lifetime",
    level: "intermediate",
    language: "pt-BR",
    categoryId: "cat_2",
    category: MOCK_CATEGORIES[1],
    tags: [MOCK_TAGS[4], MOCK_TAGS[5], MOCK_TAGS[7]],
    instructorIds: ["usr_teacher_1"],
    isFeatured: true,
    isPublic: true,
    requiresEnrollment: true,
    enrolledCount: 1523,
    rating: 4.8,
    reviewCount: 389,
    publishedAt: ago(45),
    createdAt: ago(70),
    updatedAt: ago(3),
  },
  {
    id: "prod_3",
    type: "course",
    status: "published",
    title: "PPCE — Polícia Penal do Ceará | Curso Completo Online",
    slug: "ppce-policia-penal-ceara-online",
    shortDescription: "Videoaulas teóricas, PDFs estratégicos, cronograma, mentoria coletiva e grupo tira-dúvidas. Bônus exclusivo: Vade Mecum.",
    description: "Curso completo 100% online para o concurso da Polícia Penal do Ceará (PPCE). Todo o conteúdo do edital com videoaulas gravadas, PDFs estratégicos por disciplina, cronograma de estudos detalhado, mentoria coletiva ao vivo e grupo exclusivo de tira-dúvidas no WhatsApp. Bônus exclusivo: Vade Mecum digital atualizado.",
    thumbnail: "https://images.unsplash.com/photo-1617296538902-887900d9b592?w=800&q=80",
    price: 387,
    comparePrice: 697,
    currency: "BRL",
    accessType: "lifetime",
    level: "beginner",
    language: "pt-BR",
    categoryId: "cat_1",
    category: MOCK_CATEGORIES[0],
    tags: [MOCK_TAGS[2], MOCK_TAGS[0], MOCK_TAGS[6]],
    instructorIds: ["usr_teacher_1", "usr_teacher_2"],
    isFeatured: true,
    isPublic: true,
    requiresEnrollment: true,
    enrolledCount: 3102,
    rating: 4.9,
    reviewCount: 741,
    publishedAt: ago(30),
    createdAt: ago(50),
    updatedAt: ago(1),
  },
  {
    id: "prod_4",
    type: "bundle",
    status: "published",
    title: "GCM Aquiraz + Maranguape — Reta Final | Curso de Questões",
    slug: "gcm-aquiraz-maranguape-reta-final",
    shortDescription: "Curso de questões comentadas: Direito Penal, Leg. Extravagante, D. Constitucional e D. Administrativo. Bônus para os 30 primeiros: 2 lives de revisão.",
    description: "Reta Final exclusiva para os concursos de GCM de Aquiraz e Maranguape. Curso focado em resolução de questões comentadas nas disciplinas mais cobradas: Direito Penal, Legislação Extravagante, Direito Constitucional e Direito Administrativo. Para os 30 primeiros inscritos: 2 lives de revisão na semana final do concurso. 100% online.",
    thumbnail: "https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=800&q=80",
    price: 147,
    comparePrice: 297,
    currency: "BRL",
    accessType: "lifetime",
    level: "intermediate",
    language: "pt-BR",
    categoryId: "cat_4",
    category: MOCK_CATEGORIES[3],
    tags: [MOCK_TAGS[2], MOCK_TAGS[3], MOCK_TAGS[0], MOCK_TAGS[1]],
    instructorIds: ["usr_teacher_1", "usr_teacher_2"],
    isFeatured: true,
    isPublic: true,
    requiresEnrollment: true,
    enrolledCount: 894,
    rating: 4.9,
    reviewCount: 198,
    publishedAt: ago(20),
    createdAt: ago(30),
    updatedAt: ago(1),
  },
  {
    id: "prod_5",
    type: "subscription",
    status: "published",
    title: "LEX Premium — Acesso a Todos os Cursos",
    slug: "lex-premium-todos-os-cursos",
    shortDescription: "Acesso ilimitado a todos os cursos, simulados e materiais da LEX Concursos por assinatura mensal.",
    description: "Assine o LEX Premium e tenha acesso irrestrito a todos os cursos, banco de questões, simulados gabaritados, PDFs e mentorias da plataforma. Ideal para quem está se preparando para múltiplos concursos simultaneamente.",
    thumbnail: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
    price: 97,
    currency: "BRL",
    accessType: "subscription",
    level: "all",
    language: "pt-BR",
    categoryId: "cat_5",
    category: MOCK_CATEGORIES[4],
    tags: [MOCK_TAGS[5], MOCK_TAGS[6]],
    instructorIds: [],
    isFeatured: true,
    isPublic: true,
    requiresEnrollment: true,
    enrolledCount: 1248,
    rating: 4.8,
    reviewCount: 312,
    publishedAt: ago(90),
    createdAt: ago(95),
    updatedAt: ago(1),
  },
  {
    id: "prod_6",
    type: "free",
    status: "published",
    title: "Vade Mecum Digital Gratuito 2025",
    slug: "vade-mecum-digital-gratuito-2025",
    shortDescription: "Vade Mecum atualizado e comentado para concursos públicos. Totalmente gratuito.",
    description: "Acesse gratuitamente o Vade Mecum Digital da LEX Concursos, atualizado com as últimas alterações legislativas de 2025. Inclui Constituição Federal comentada, legislação penal, administrativa e extravagante com anotações dos professores.",
    thumbnail: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800&q=80",
    price: 0,
    currency: "BRL",
    accessType: "free",
    level: "beginner",
    language: "pt-BR",
    categoryId: "cat_3",
    category: MOCK_CATEGORIES[2],
    tags: [MOCK_TAGS[7]],
    instructorIds: ["usr_teacher_1"],
    isFeatured: false,
    isPublic: true,
    requiresEnrollment: false,
    enrolledCount: 8732,
    rating: 4.7,
    reviewCount: 2140,
    publishedAt: ago(200),
    createdAt: ago(220),
    updatedAt: ago(15),
  },
  {
    id: "prod_7",
    type: "workshop",
    status: "published",
    title: "Workshop: Técnicas de Resolução de Questões FCC",
    slug: "workshop-tecnicas-questoes-fcc",
    shortDescription: "Workshop intensivo de 1 dia com estratégias para gabaritar questões da banca FCC.",
    description: "Aprenda as principais estratégias para resolver questões da banca FCC com alta taxa de acerto. Workshop prático com análise de padrões de cobrança, técnicas de eliminação e treino cronometrado.",
    thumbnail: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
    price: 97,
    comparePrice: 197,
    currency: "BRL",
    accessType: "lifetime",
    level: "intermediate",
    language: "pt-BR",
    categoryId: "cat_5",
    category: MOCK_CATEGORIES[4],
    tags: [MOCK_TAGS[4], MOCK_TAGS[5]],
    instructorIds: ["usr_teacher_1"],
    isFeatured: false,
    isPublic: true,
    requiresEnrollment: true,
    enrolledCount: 567,
    rating: 4.9,
    reviewCount: 143,
    publishedAt: ago(20),
    createdAt: ago(30),
    updatedAt: ago(2),
  },
  {
    id: "prod_8",
    type: "presale",
    status: "published",
    title: "PRF — Polícia Rodoviária Federal | Pré-venda 2025",
    slug: "prf-policia-rodoviaria-federal-2025",
    shortDescription: "Em breve — garanta sua vaga com 50% de desconto na pré-venda do curso completo para a PRF.",
    description: "Prepare-se com antecedência para o próximo concurso da Polícia Rodoviária Federal. Curso completo com videoaulas, questões comentadas, simulados e mentoria. Garanta na pré-venda com 50% de desconto.",
    thumbnail: "https://images.unsplash.com/photo-1568792923760-d70635a89fdc?w=800&q=80",
    price: 247,
    comparePrice: 497,
    currency: "BRL",
    accessType: "lifetime",
    level: "intermediate",
    language: "pt-BR",
    categoryId: "cat_1",
    category: MOCK_CATEGORIES[0],
    tags: [MOCK_TAGS[0], MOCK_TAGS[2]],
    instructorIds: ["usr_teacher_1"],
    isFeatured: false,
    isPublic: true,
    requiresEnrollment: true,
    enrolledCount: 342,
    rating: 0,
    reviewCount: 0,
    scheduledAt: future(45),
    createdAt: ago(10),
    updatedAt: ago(1),
  },
];

// ─── COURSE CONTENT ──────────────────────────────────────────────────────────

export const MOCK_MODULES: Module[] = [
  {
    id: "mod_1",
    courseId: "prod_1",
    title: "Direito Constitucional",
    description: "Princípios fundamentais, direitos e garantias individuais, organização do Estado",
    order: 1,
    isPublished: true,
    lessons: [
      { id: "les_1", moduleId: "mod_1", title: "Princípios Fundamentais da CF/88 — Teoria e Questões", type: "video", status: "published", order: 1, duration: 3240, videoUrl: "https://example.com/video1", videoProvider: "bunny", isFree: true, isPreview: true, hasWatermark: false, materials: [], completionCriteria: "watch_80", createdAt: ago(60), updatedAt: ago(2) },
      { id: "les_2", moduleId: "mod_1", title: "Direitos e Garantias Fundamentais — Art. 5º completo", type: "video", status: "published", order: 2, duration: 5400, videoUrl: "https://example.com/video2", videoProvider: "bunny", isFree: false, isPreview: false, hasWatermark: true, materials: [], completionCriteria: "watch_80", createdAt: ago(60), updatedAt: ago(2) },
      { id: "les_3", moduleId: "mod_1", title: "Organização do Estado e Poderes da República", type: "video", status: "published", order: 3, duration: 4200, videoUrl: "https://example.com/video3", videoProvider: "bunny", isFree: false, isPreview: false, hasWatermark: true, materials: [], completionCriteria: "watch_80", createdAt: ago(58), updatedAt: ago(2) },
      { id: "les_4", moduleId: "mod_1", title: "Quiz — 50 Questões de Direito Constitucional", type: "quiz", status: "published", order: 4, isFree: false, isPreview: false, hasWatermark: false, materials: [], completionCriteria: "complete_quiz", createdAt: ago(55), updatedAt: ago(2) },
    ],
    createdAt: ago(90),
  },
  {
    id: "mod_2",
    courseId: "prod_1",
    title: "Direito Administrativo",
    description: "Princípios, atos administrativos, licitação, contratos e agentes públicos",
    order: 2,
    isPublished: true,
    lessons: [
      { id: "les_5", moduleId: "mod_2", title: "Princípios do Direito Administrativo — LIMPE e mais", type: "video", status: "published", order: 1, duration: 3600, videoUrl: "https://example.com/video5", videoProvider: "bunny", isFree: false, isPreview: false, hasWatermark: true, materials: [], completionCriteria: "watch_80", createdAt: ago(55), updatedAt: ago(2) },
      { id: "les_6", moduleId: "mod_2", title: "Atos Administrativos — Elementos, Atributos e Espécies", type: "video", status: "published", order: 2, duration: 4800, videoUrl: "https://example.com/video6", videoProvider: "bunny", isFree: false, isPreview: false, hasWatermark: true, materials: [], completionCriteria: "watch_80", createdAt: ago(54), updatedAt: ago(2) },
      { id: "les_7", moduleId: "mod_2", title: "PDF — Mapa Mental: Atos Administrativos", type: "pdf", status: "published", order: 3, isFree: false, isPreview: false, hasWatermark: false, pdfUrl: "https://example.com/mapa-atos.pdf", materials: [], completionCriteria: "manual", createdAt: ago(53), updatedAt: ago(2) },
    ],
    createdAt: ago(85),
  },
  {
    id: "mod_3",
    courseId: "prod_1",
    title: "Direito Penal",
    description: "Teoria do crime, punibilidade, crimes em espécie e legislação especial",
    order: 3,
    isPublished: true,
    lessons: [
      { id: "les_8", moduleId: "mod_3", title: "Teoria do Crime — Tipicidade, Ilicitude e Culpabilidade", type: "video", status: "published", order: 1, duration: 4200, videoUrl: "https://example.com/video8", videoProvider: "bunny", isFree: false, isPreview: false, hasWatermark: true, materials: [], completionCriteria: "watch_80", createdAt: ago(50), updatedAt: ago(2) },
      { id: "les_9", moduleId: "mod_3", title: "Crimes contra a Pessoa e Patrimônio", type: "video", status: "published", order: 2, duration: 3900, videoUrl: "https://example.com/video9", videoProvider: "bunny", isFree: false, isPreview: false, hasWatermark: true, materials: [], completionCriteria: "watch_80", createdAt: ago(49), updatedAt: ago(2) },
    ],
    createdAt: ago(80),
  },
  {
    id: "mod_4",
    courseId: "prod_1",
    title: "Legislação Específica do Edital",
    description: "Estatuto da GMF, Lei Orgânica do Município e legislação correlata",
    order: 4,
    isPublished: true,
    lessons: [
      { id: "les_10", moduleId: "mod_4", title: "Estatuto da Guarda Municipal de Fortaleza — Comentado", type: "video", status: "published", order: 1, duration: 5400, videoUrl: "https://example.com/video10", videoProvider: "bunny", isFree: false, isPreview: false, hasWatermark: true, materials: [], completionCriteria: "watch_80", createdAt: ago(45), updatedAt: ago(2) },
      { id: "les_11", moduleId: "mod_4", title: "Simulado Final — 100 Questões Estilo Banca", type: "quiz", status: "published", order: 2, isFree: false, isPreview: false, hasWatermark: false, materials: [], completionCriteria: "complete_quiz", createdAt: ago(44), updatedAt: ago(2) },
    ],
    createdAt: ago(75),
  },
];

export const MOCK_COURSES: Course[] = [
  {
    id: "course_1",
    productId: "prod_1",
    product: MOCK_PRODUCTS[0],
    modules: MOCK_MODULES,
    totalLessons: 58,
    totalDuration: 129600,
    completionCertificate: true,
    requirements: [
      "Ensino Médio Completo",
      "Dedicação mínima de 2 horas por dia",
    ],
    whatYouLearn: [
      "Todo o edital da GMF coberto com profundidade",
      "Técnicas de resolução de questões de múltipla escolha",
      "Mapas mentais e PDFs estratégicos por disciplina",
      "Simulados no estilo da banca examinadora",
      "Acesso ao grupo exclusivo de tira-dúvidas",
    ],
    targetAudience: [
      "Candidatos inscritos no concurso da GMF",
      "Candidatos que desejam se preparar com antecedência",
    ],
    updatedAt: ago(2),
  },
];

// ─── ENROLLMENTS ─────────────────────────────────────────────────────────────

export const MOCK_ENROLLMENTS: Enrollment[] = [
  { id: "enr_1", userId: "usr_student_1", user: MOCK_USERS[3], productId: "prod_1", product: MOCK_PRODUCTS[0], status: "active", accessType: "lifetime", enrolledAt: ago(30), progress: 68, lastAccessedAt: ago(0), orderId: "ord_1" },
  { id: "enr_2", userId: "usr_student_1", user: MOCK_USERS[3], productId: "prod_3", product: MOCK_PRODUCTS[2], status: "active", accessType: "lifetime", enrolledAt: ago(20), progress: 35, lastAccessedAt: ago(2), orderId: "ord_2" },
  { id: "enr_3", userId: "usr_student_1", user: MOCK_USERS[3], productId: "prod_6", product: MOCK_PRODUCTS[5], status: "completed", accessType: "free", enrolledAt: ago(60), completedAt: ago(45), progress: 100, lastAccessedAt: ago(45) },
  { id: "enr_4", userId: "usr_student_2", user: MOCK_USERS[4], productId: "prod_1", product: MOCK_PRODUCTS[0], status: "active", accessType: "lifetime", enrolledAt: ago(25), progress: 42, lastAccessedAt: ago(1), orderId: "ord_3" },
  { id: "enr_5", userId: "usr_student_2", user: MOCK_USERS[4], productId: "prod_2", product: MOCK_PRODUCTS[1], status: "active", accessType: "lifetime", enrolledAt: ago(15), progress: 10, lastAccessedAt: ago(5) },
  { id: "enr_6", userId: "usr_student_3", user: MOCK_USERS[5], productId: "prod_5", product: MOCK_PRODUCTS[4], status: "active", accessType: "subscription", enrolledAt: ago(10), progress: 25, lastAccessedAt: ago(1) },
];

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export const MOCK_ORDERS: Order[] = [
  {
    id: "ord_1", userId: "usr_student_1", user: MOCK_USERS[3],
    items: [{ id: "oi_1", productId: "prod_1", product: MOCK_PRODUCTS[0], quantity: 1, unitPrice: 327, totalPrice: 327, discount: 142 }],
    subtotal: 469, discount: 142, total: 327, currency: "BRL",
    status: "paid", paymentMethod: "credit_card", paidAt: ago(30),
    createdAt: ago(30), updatedAt: ago(30),
  },
  {
    id: "ord_2", userId: "usr_student_1", user: MOCK_USERS[3],
    items: [{ id: "oi_2", productId: "prod_3", product: MOCK_PRODUCTS[2], quantity: 1, unitPrice: 310, totalPrice: 310, discount: 77 }],
    subtotal: 387, discount: 77, total: 310, currency: "BRL",
    status: "paid", paymentMethod: "pix", couponCode: "LEX20", paidAt: ago(20),
    createdAt: ago(20), updatedAt: ago(20),
  },
  {
    id: "ord_3", userId: "usr_student_2", user: MOCK_USERS[4],
    items: [{ id: "oi_3", productId: "prod_1", product: MOCK_PRODUCTS[0], quantity: 1, unitPrice: 327, totalPrice: 327, discount: 0 }],
    subtotal: 327, discount: 0, total: 327, currency: "BRL",
    status: "paid", paymentMethod: "boleto", paidAt: ago(25),
    createdAt: ago(25), updatedAt: ago(25),
  },
  {
    id: "ord_4", userId: "usr_student_3", user: MOCK_USERS[5],
    items: [{ id: "oi_4", productId: "prod_4", product: MOCK_PRODUCTS[3], quantity: 1, unitPrice: 147, totalPrice: 147, discount: 0 }],
    subtotal: 147, discount: 0, total: 147, currency: "BRL",
    status: "pending", paymentMethod: "pix",
    createdAt: ago(1), updatedAt: ago(1),
  },
  {
    id: "ord_5", userId: "usr_student_4", user: MOCK_USERS[6],
    items: [{ id: "oi_5", productId: "prod_2", product: MOCK_PRODUCTS[1], quantity: 1, unitPrice: 187, totalPrice: 187, discount: 0 }],
    subtotal: 187, discount: 0, total: 187, currency: "BRL",
    status: "refunded", paymentMethod: "credit_card", refundReason: "Troca por outro curso",
    paidAt: ago(15), createdAt: ago(15), updatedAt: ago(10),
  },
];

// ─── CERTIFICATES ────────────────────────────────────────────────────────────

export const MOCK_CERTIFICATES: Certificate[] = [
  {
    id: "cert_1",
    userId: "usr_student_1",
    user: MOCK_USERS[3],
    productId: "prod_6",
    product: MOCK_PRODUCTS[5],
    code: "LEX-2025-0001-VMD",
    issueDate: ago(45),
    downloadUrl: "/certificates/cert_1.pdf",
    isValid: true,
  },
];

// ─── COUPONS ─────────────────────────────────────────────────────────────────

export const MOCK_COUPONS: Coupon[] = [
  { id: "cpn_1", code: "LEX20", type: "percentage", value: 20, maxUses: 200, usedCount: 87, isActive: true, expiresAt: future(30), createdAt: ago(30) },
  { id: "cpn_2", code: "RETAFINAL50", type: "percentage", value: 50, maxUses: 50, usedCount: 50, isActive: false, expiresAt: ago(5), createdAt: ago(40) },
  { id: "cpn_3", code: "PRIMEIROSMIL", type: "fixed", value: 100, usedCount: 43, isActive: true, minOrderValue: 200, createdAt: ago(20) },
];

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "notif_1", userId: "usr_student_1", type: "enrollment", title: "Nova aula disponível", message: "A videoaula 'Crimes contra o Patrimônio' foi publicada no curso PPCE Online.", link: "/student/player", isRead: false, createdAt: ago(0.1) },
  { id: "notif_2", userId: "usr_student_1", type: "achievement", title: "Conquista desbloqueada!", message: "Você completou 5 aulas seguidas. Conquista 'Maratonista' desbloqueada! +150 XP", link: "/student/profile#achievements", isRead: false, createdAt: ago(0.5) },
  { id: "notif_3", userId: "usr_student_1", type: "payment", title: "Pagamento confirmado", message: "Seu pagamento do GMF — Curso Completo foi confirmado. Bons estudos!", isRead: true, createdAt: ago(30) },
  { id: "notif_4", userId: "usr_student_1", type: "enrollment", title: "Simulado liberado!", message: "O Simulado Final — 100 Questões Estilo Banca já está disponível para você.", link: "/student/player", isRead: false, createdAt: ago(2) },
];

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: "ach_1", title: "Primeira Aula", description: "Assistiu à primeira videoaula", icon: "Play", type: "completion", condition: { lessons: 1 }, xpReward: 50, badgeColor: "#E8650A", isSecret: false, createdAt: ago(200) },
  { id: "ach_2", title: "Maratonista", description: "Completou 5 aulas seguidas", icon: "Zap", type: "streak", condition: { streak: 5 }, xpReward: 150, badgeColor: "#F59E0B", isSecret: false, createdAt: ago(200) },
  { id: "ach_3", title: "Aprovado!", description: "Concluiu um curso completo", icon: "Award", type: "completion", condition: { courses: 1 }, xpReward: 500, badgeColor: "#10B981", isSecret: false, createdAt: ago(200) },
  { id: "ach_4", title: "Concurseiro Dedicado", description: "Matriculado em 3 ou mais cursos", icon: "BookOpen", type: "enrollment", condition: { enrollments: 3 }, xpReward: 300, badgeColor: "#6366F1", isSecret: false, createdAt: ago(200) },
  { id: "ach_5", title: "Mestre das Questões", description: "Acertou 90%+ em um simulado", icon: "Target", type: "rating", condition: { score: 90 }, xpReward: 400, badgeColor: "#EF4444", isSecret: false, createdAt: ago(200) },
];

export const MOCK_USER_XP: UserXP = {
  userId: "usr_student_1",
  totalXp: 1250,
  level: 5,
  currentLevelXp: 250,
  nextLevelXp: 600,
  streak: 12,
  lastActivityDate: ago(0),
};

// ─── MEDIA ───────────────────────────────────────────────────────────────────

export const MOCK_MEDIA: MediaFile[] = [
  { id: "med_1", name: "thumb-gmf.jpg", originalName: "thumb-gmf.jpg", type: "image", mimeType: "image/jpeg", url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=300", size: 245000, width: 1920, height: 1080, createdAt: ago(90), updatedAt: ago(90) },
  { id: "med_2", name: "thumb-ppce.jpg", originalName: "thumb-ppce.jpg", type: "image", mimeType: "image/jpeg", url: "https://images.unsplash.com/photo-1617296538902-887900d9b592?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1617296538902-887900d9b592?w=300", size: 198000, width: 1920, height: 1080, createdAt: ago(70), updatedAt: ago(70) },
  { id: "med_3", name: "mapa-mental-direito-constitucional.pdf", originalName: "Mapa Mental — Direito Constitucional.pdf", type: "pdf", mimeType: "application/pdf", url: "/files/mapa-constitucional.pdf", size: 1240000, createdAt: ago(55), updatedAt: ago(55) },
  { id: "med_4", name: "aula-intro-gmf.mp4", originalName: "Aula 01 — Introdução GMF.mp4", type: "video", mimeType: "video/mp4", url: "/videos/aula-intro-gmf.mp4", size: 248000000, duration: 3240, createdAt: ago(60), updatedAt: ago(60) },
];

// ─── BLOG ────────────────────────────────────────────────────────────────────

export const MOCK_ARTICLES: Article[] = [
  {
    id: "art_1",
    title: "Concurso GMF 2025: Tudo o que você precisa saber",
    slug: "concurso-gmf-2025-tudo-que-precisa-saber",
    excerpt: "O concurso da Guarda Municipal de Fortaleza (GMF) está com inscrições abertas. Veja o edital completo, datas, matérias cobradas e como se preparar.",
    content: "<h2>O Concurso da GMF</h2><p>A Guarda Municipal de Fortaleza publicou edital com vagas para os cargos de Guarda Municipal...</p>",
    thumbnail: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
    authorId: "usr_teacher_1",
    author: MOCK_USERS[1],
    categoryId: "cat_4",
    category: MOCK_CATEGORIES[3],
    tags: [MOCK_TAGS[0], MOCK_TAGS[1]],
    status: "published",
    publishedAt: ago(10),
    readTime: 8,
    views: 12430,
    seo: { title: "Concurso GMF 2025 — Edital e Preparação", description: "Tudo sobre o concurso da GMF 2025", keywords: ["GMF", "concurso", "guarda municipal"] },
    createdAt: ago(12),
    updatedAt: ago(10),
  },
  {
    id: "art_2",
    title: "PPCE 2025: Matérias mais cobradas e como estudar",
    slug: "ppce-2025-materias-mais-cobradas",
    excerpt: "Análise das últimas provas da Polícia Penal do Ceará revelam quais disciplinas têm maior peso. Veja o que estudar primeiro.",
    content: "<h2>O que cai na prova da PPCE?</h2><p>Analisando os últimos concursos da Polícia Penal do Ceará...</p>",
    thumbnail: "https://images.unsplash.com/photo-1617296538902-887900d9b592?w=800",
    authorId: "usr_teacher_2",
    author: MOCK_USERS[2],
    categoryId: "cat_1",
    category: MOCK_CATEGORIES[0],
    tags: [MOCK_TAGS[2], MOCK_TAGS[3]],
    status: "published",
    publishedAt: ago(5),
    readTime: 10,
    views: 8921,
    createdAt: ago(7),
    updatedAt: ago(5),
  },
];

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: "log_1", actorId: "usr_admin_1", actor: MOCK_USERS[0], action: "product.published", resourceType: "product", resourceId: "prod_1", metadata: { title: "GMF — Guarda Municipal de Fortaleza" }, ipAddress: "192.168.1.1", createdAt: ago(2) },
  { id: "log_2", actorId: "usr_admin_1", actor: MOCK_USERS[0], action: "user.banned", resourceType: "user", resourceId: "usr_student_4", metadata: { reason: "Compartilhamento indevido de acesso" }, ipAddress: "192.168.1.1", createdAt: ago(3) },
  { id: "log_3", actorId: "usr_student_1", actor: MOCK_USERS[3], action: "login.success", resourceType: "session", ipAddress: "177.92.43.12", createdAt: ago(0) },
  { id: "log_4", actorId: "usr_admin_1", actor: MOCK_USERS[0], action: "settings.updated", resourceType: "settings", metadata: { changed: ["payment.pixEnabled"] }, ipAddress: "192.168.1.1", createdAt: ago(5) },
  { id: "log_5", actorId: "usr_student_2", actor: MOCK_USERS[4], action: "login.failed", resourceType: "session", ipAddress: "200.160.0.1", createdAt: ago(1) },
];

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

export const MOCK_REVENUE_DATA: RevenueDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  revenue: Math.floor(Math.random() * 15000) + 5000,
  orders: Math.floor(Math.random() * 60) + 10,
  refunds: Math.floor(Math.random() * 3),
}));

export const MOCK_ANALYTICS_METRICS: AnalyticsMetric[] = [
  { label: "Receita Total", value: 284750, change: 18.5, trend: "up" },
  { label: "Novos Alunos", value: 742, change: 22.3, trend: "up" },
  { label: "Matrículas Ativas", value: 12847, change: 9.1, trend: "up" },
  { label: "Taxa de Conclusão", value: 71.4, change: 3.2, trend: "up" },
  { label: "Ticket Médio", value: 284, change: -1.8, trend: "down" },
  { label: "Reembolsos", value: 1.4, change: -0.6, trend: "down" },
];

export const MOCK_COURSE_ANALYTICS: CourseAnalytics[] = [
  { productId: "prod_1", enrollments: 2847, completions: 1623, completionRate: 57.0, avgProgress: 71, avgRating: 4.9, revenue: 930969, watchTimeHours: 78420 },
  { productId: "prod_2", enrollments: 1523, completions: 892, completionRate: 58.6, avgProgress: 63, avgRating: 4.8, revenue: 284801, watchTimeHours: 42140 },
  { productId: "prod_3", enrollments: 3102, completions: 1980, completionRate: 63.8, avgProgress: 74, avgRating: 4.9, revenue: 1200474, watchTimeHours: 89100 },
];

// ─── WEBHOOKS ────────────────────────────────────────────────────────────────

export const MOCK_WEBHOOKS: Webhook[] = [
  { id: "wh_1", url: "https://n8n.myserver.com/webhook/lex", events: ["order.paid", "enrollment.created"], secret: "whsec_lex_abc123", isActive: true, lastTriggeredAt: ago(1), successCount: 312, failCount: 2, createdAt: ago(60) },
  { id: "wh_2", url: "https://hooks.zapier.com/hooks/catch/lex/xyz", events: ["user.registered"], secret: "whsec_lex_def456", isActive: true, lastTriggeredAt: ago(0.5), successCount: 189, failCount: 0, createdAt: ago(45) },
];

// ─── COMMUNITY POSTS ─────────────────────────────────────────────────────────

export const MOCK_POSTS: Post[] = [
  {
    id: "post_1",
    authorId: "usr_student_1",
    author: MOCK_USERS[3],
    content: "Acabei de gabaritar o simulado de Direito Constitucional! 47/50 questões certas! O método do Prof. Ricardo de resolver questões pela eliminação é incrível. Alguém mais está fazendo o curso da PPCE? 🚀🔥",
    likesCount: 67,
    commentsCount: 19,
    isLiked: false,
    isPinned: false,
    status: "published",
    courseId: "prod_3",
    createdAt: ago(0.5),
    updatedAt: ago(0.5),
  },
  {
    id: "post_2",
    authorId: "usr_teacher_1",
    author: MOCK_USERS[1],
    content: "📢 ATENÇÃO TURMA PPCE! Publiquei o módulo de Legislação Específica com o Estatuto da Polícia Penal comentado artigo por artigo. Esse módulo cai MUITO na prova. Acesse agora e tire suas dúvidas no grupo!",
    likesCount: 214,
    commentsCount: 53,
    isLiked: true,
    isPinned: true,
    status: "published",
    courseId: "prod_3",
    createdAt: ago(1),
    updatedAt: ago(1),
  },
  {
    id: "post_3",
    authorId: "usr_student_2",
    author: MOCK_USERS[4],
    content: "Dica para quem está no TJCE Intensivão: assistam as videoaulas já resolvendo as questões no papel. Meu aproveitamento foi de 60% para 82% nas últimas duas semanas usando essa técnica!",
    likesCount: 43,
    commentsCount: 12,
    isLiked: false,
    isPinned: false,
    status: "published",
    courseId: "prod_2",
    createdAt: ago(3),
    updatedAt: ago(3),
  },
];

// ─── MOCK API FUNCTIONS ──────────────────────────────────────────────────────

export const api = {
  login: async (email: string, _password: string) => {
    await delay(600);
    const user = MOCK_USERS.find((u) => u.email === email);
    if (!user) throw new Error("Credenciais inválidas");
    return { user, token: `mock_token_${user.id}` };
  },
  register: async (name: string, email: string, _password: string) => {
    await delay(800);
    return { user: { ...MOCK_USERS[3], id: randId(), name, email }, token: "mock_token_new" };
  },

  getUsers: async () => { await delay(); return { data: MOCK_USERS, total: MOCK_USERS.length, page: 1, perPage: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false }; },
  getUserById: async (id: string) => { await delay(); return MOCK_USERS.find((u) => u.id === id) ?? null; },

  getProducts: async () => { await delay(); return { data: MOCK_PRODUCTS, total: MOCK_PRODUCTS.length, page: 1, perPage: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false }; },
  getProductById: async (id: string) => { await delay(); return MOCK_PRODUCTS.find((p) => p.id === id) ?? null; },
  getProductBySlug: async (slug: string) => { await delay(); return MOCK_PRODUCTS.find((p) => p.slug === slug) ?? null; },

  getCourseByProductId: async (productId: string) => { await delay(); return MOCK_COURSES.find((c) => c.productId === productId) ?? null; },

  getUserEnrollments: async (userId: string) => { await delay(); return MOCK_ENROLLMENTS.filter((e) => e.userId === userId); },

  getOrders: async () => { await delay(); return { data: MOCK_ORDERS, total: MOCK_ORDERS.length, page: 1, perPage: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false }; },
  getUserOrders: async (userId: string) => { await delay(); return MOCK_ORDERS.filter((o) => o.userId === userId); },

  getAnalyticsMetrics: async () => { await delay(); return MOCK_ANALYTICS_METRICS; },
  getRevenueData: async () => { await delay(); return MOCK_REVENUE_DATA; },
  getCourseAnalytics: async () => { await delay(); return MOCK_COURSE_ANALYTICS; },

  getCategories: async () => { await delay(); return MOCK_CATEGORIES; },
  getMedia: async () => { await delay(); return MOCK_MEDIA; },
  getArticles: async () => { await delay(); return MOCK_ARTICLES; },

  getNotifications: async (userId: string) => { await delay(200); return MOCK_NOTIFICATIONS.filter((n) => n.userId === userId); },
  getUserCertificates: async (userId: string) => { await delay(); return MOCK_CERTIFICATES.filter((c) => c.userId === userId); },

  getCoupons: async () => { await delay(); return MOCK_COUPONS; },
  validateCoupon: async (code: string) => { await delay(300); return MOCK_COUPONS.find((c) => c.code === code && c.isActive) ?? null; },

  getAuditLogs: async () => { await delay(); return MOCK_AUDIT_LOGS; },
  getWebhooks: async () => { await delay(); return MOCK_WEBHOOKS; },

  getAchievements: async () => { await delay(); return MOCK_ACHIEVEMENTS; },
  getUserXP: async (userId: string) => { await delay(); return userId === "usr_student_1" ? MOCK_USER_XP : null; },
};
