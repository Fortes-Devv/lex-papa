// ─────────────────────────────────────────────────────────────────────────────
// CORE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ID = string;
export type ISODate = string;
export type Locale = "pt-BR" | "en-US" | "es-ES";
export type Currency = "BRL" | "USD" | "EUR";

// ─────────────────────────────────────────────────────────────────────────────
// USERS & AUTH
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "teacher" | "student" | "moderator";
export type UserStatus = "active" | "inactive" | "banned" | "pending";
export type OAuthProvider = "google" | "github" | "facebook";

export interface User {
  id: ID;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  oauthProviders: OAuthProvider[];
  createdAt: ISODate;
  updatedAt: ISODate;
  lastLoginAt?: ISODate;
  metadata?: Record<string, unknown>;
}

export interface Session {
  user: User;
  token: string;
  expiresAt: ISODate;
}

export interface Permission {
  id: ID;
  key: string;
  label: string;
  description: string;
  module: string;
}

export interface Role {
  id: ID;
  name: string;
  label: string;
  permissions: Permission[];
  isSystem: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES & TAGS
// ─────────────────────────────────────────────────────────────────────────────

export interface Category {
  id: ID;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  color?: string;
  parentId?: ID;
  children?: Category[];
  order: number;
  isActive: boolean;
  createdAt: ISODate;
}

export interface Tag {
  id: ID;
  name: string;
  slug: string;
  color?: string;
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export type ProductType =
  | "course"
  | "bundle"
  | "subscription"
  | "free"
  | "hidden"
  | "presale"
  | "digital_download"
  | "workshop"
  | "online_event"
  | "mentoring";

export type ProductStatus = "draft" | "published" | "archived" | "scheduled" | "hidden";
export type AccessType = "lifetime" | "subscription" | "timed" | "free" | "manual";
export type ProductLevel = "beginner" | "intermediate" | "advanced" | "all";

export interface Product {
  id: ID;
  type: ProductType;
  status: ProductStatus;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnail: string;
  previewVideo?: string;
  price: number;
  comparePrice?: number;
  currency: Currency;
  accessType: AccessType;
  accessDuration?: number; // days
  level: ProductLevel;
  language: string;
  categoryId: ID;
  category?: Category;
  tags: Tag[];
  instructorIds: ID[];
  instructors?: User[];
  isFeatured: boolean;
  isPublic: boolean;
  requiresEnrollment: boolean;
  maxStudents?: number;
  enrolledCount: number;
  rating: number;
  reviewCount: number;
  publishedAt?: ISODate;
  scheduledAt?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
  seo?: SEOMeta;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────────────────────────────────────

export type LessonType = "video" | "text" | "pdf" | "download" | "audio" | "quiz" | "exercise" | "live";
export type LessonStatus = "draft" | "published" | "scheduled";

export interface Lesson {
  id: ID;
  moduleId: ID;
  title: string;
  description?: string;
  type: LessonType;
  status: LessonStatus;
  order: number;
  duration?: number; // seconds
  videoUrl?: string;
  videoProvider?: "youtube" | "vimeo" | "bunny" | "cloudflare" | "cloudinary" | "upload";
  content?: string; // rich text
  pdfUrl?: string;
  audioUrl?: string;
  downloadUrl?: string;
  isFree: boolean;
  isPreview: boolean;
  hasWatermark: boolean;
  dripDays?: number; // days after enrollment
  prerequisites?: ID[];
  materials: Material[];
  quiz?: Quiz;
  completionCriteria: "watch_80" | "watch_100" | "complete_quiz" | "manual";
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Module {
  id: ID;
  courseId: ID;
  title: string;
  description?: string;
  order: number;
  isPublished: boolean;
  lessons: Lesson[];
  createdAt: ISODate;
}

export interface Course {
  id: ID;
  productId: ID;
  product?: Product;
  modules: Module[];
  totalLessons: number;
  totalDuration: number; // seconds
  completionCertificate: boolean;
  certificateTemplate?: string;
  requirements?: string[];
  whatYouLearn?: string[];
  targetAudience?: string[];
  updatedAt: ISODate;
}

export interface Material {
  id: ID;
  lessonId: ID;
  title: string;
  type: "pdf" | "file" | "link" | "image" | "zip" | "audio";
  url: string;
  size?: number; // bytes
  createdAt: ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ & EXERCISES
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionType = "single_choice" | "multiple_choice" | "true_false" | "text" | "ordering";

export interface QuizQuestion {
  id: ID;
  question: string;
  type: QuestionType;
  options?: { id: ID; text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
  order: number;
}

export interface Quiz {
  id: ID;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore: number; // percentage
  maxAttempts: number;
  timeLimit?: number; // minutes
  showAnswers: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENROLLMENT & PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

export type EnrollmentStatus = "active" | "expired" | "cancelled" | "completed";

export interface Enrollment {
  id: ID;
  userId: ID;
  user?: User;
  productId: ID;
  product?: Product;
  status: EnrollmentStatus;
  accessType: AccessType;
  expiresAt?: ISODate;
  enrolledAt: ISODate;
  completedAt?: ISODate;
  progress: number; // 0-100
  lastAccessedAt?: ISODate;
  orderId?: ID;
}

export interface LessonProgress {
  id: ID;
  userId: ID;
  lessonId: ID;
  courseId: ID;
  isCompleted: boolean;
  watchedSeconds: number;
  totalSeconds: number;
  completedAt?: ISODate;
  updatedAt: ISODate;
}

export interface Certificate {
  id: ID;
  userId: ID;
  user?: User;
  productId: ID;
  product?: Product;
  code: string;
  issueDate: ISODate;
  expiryDate?: ISODate;
  downloadUrl: string;
  isValid: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS & PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "processing" | "paid" | "failed" | "refunded" | "chargeback" | "cancelled";
export type PaymentMethod = "credit_card" | "debit_card" | "pix" | "boleto" | "paypal";

export interface OrderItem {
  id: ID;
  productId: ID;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
}

export interface Order {
  id: ID;
  userId: ID;
  user?: User;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: Currency;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  couponCode?: string;
  coupon?: Coupon;
  notes?: string;
  refundReason?: string;
  paidAt?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Coupon {
  id: ID;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  maxUses?: number;
  usedCount: number;
  minOrderValue?: number;
  productIds?: ID[];
  expiresAt?: ISODate;
  isActive: boolean;
  createdAt: ISODate;
}

export interface Subscription {
  id: ID;
  userId: ID;
  productId: ID;
  planId: ID;
  status: "active" | "cancelled" | "paused" | "past_due" | "trialing";
  currentPeriodStart: ISODate;
  currentPeriodEnd: ISODate;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: ISODate;
  createdAt: ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY
// ─────────────────────────────────────────────────────────────────────────────

export type PostStatus = "published" | "draft" | "flagged" | "removed";

export interface Post {
  id: ID;
  authorId: ID;
  author?: User;
  content: string;
  image?: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isPinned: boolean;
  status: PostStatus;
  tags?: string[];
  courseId?: ID;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Comment {
  id: ID;
  postId?: ID;
  lessonId?: ID;
  parentId?: ID;
  authorId: ID;
  author?: User;
  content: string;
  likesCount: number;
  isLiked: boolean;
  replies?: Comment[];
  status: PostStatus;
  createdAt: ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType = "info" | "success" | "warning" | "error" | "enrollment" | "payment" | "comment" | "achievement";

export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyticsMetric {
  label: string;
  value: number;
  change: number; // percentage vs previous period
  trend: "up" | "down" | "neutral";
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
  refunds: number;
}

export interface CourseAnalytics {
  productId: ID;
  enrollments: number;
  completions: number;
  completionRate: number;
  avgProgress: number;
  avgRating: number;
  revenue: number;
  watchTimeHours: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA & FILES
// ─────────────────────────────────────────────────────────────────────────────

export type MediaType = "image" | "video" | "audio" | "pdf" | "document" | "zip" | "other";

export interface MediaFile {
  id: ID;
  name: string;
  originalName: string;
  type: MediaType;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  size: number; // bytes
  width?: number;
  height?: number;
  duration?: number; // seconds (video/audio)
  folderId?: ID;
  tags?: string[];
  alt?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface MediaFolder {
  id: ID;
  name: string;
  parentId?: ID;
  children?: MediaFolder[];
  filesCount: number;
  createdAt: ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOG
// ─────────────────────────────────────────────────────────────────────────────

export type ArticleStatus = "draft" | "published" | "archived" | "scheduled";

export interface Article {
  id: ID;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnail?: string;
  authorId: ID;
  author?: User;
  categoryId?: ID;
  category?: Category;
  tags: Tag[];
  status: ArticleStatus;
  publishedAt?: ISODate;
  scheduledAt?: ISODate;
  readTime: number; // minutes
  views: number;
  seo?: SEOMeta;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO
// ─────────────────────────────────────────────────────────────────────────────

export interface SEOMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  structuredData?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAMIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface Achievement {
  id: ID;
  title: string;
  description: string;
  icon: string;
  type: "completion" | "streak" | "rating" | "enrollment" | "custom";
  condition: Record<string, unknown>;
  xpReward: number;
  badgeColor: string;
  isSecret: boolean;
  createdAt: ISODate;
}

export interface UserAchievement {
  id: ID;
  userId: ID;
  achievementId: ID;
  achievement?: Achievement;
  unlockedAt: ISODate;
}

export interface UserXP {
  userId: ID;
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  streak: number;
  lastActivityDate?: ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformSettings {
  general: {
    name: string;
    tagline: string;
    description: string;
    logo?: string;
    favicon?: string;
    domain: string;
    supportEmail: string;
    locale: Locale;
    timezone: string;
    currency: Currency;
  };
  appearance: {
    primaryColor: string;
    theme: "light" | "dark" | "system";
    fontFamily: string;
    customCss?: string;
  };
  auth: {
    allowRegistration: boolean;
    requireEmailVerification: boolean;
    require2FA: boolean;
    socialProviders: OAuthProvider[];
    passwordMinLength: number;
  };
  payment: {
    gateways: string[];
    pixEnabled: boolean;
    boletoEnabled: boolean;
    creditCardEnabled: boolean;
    testMode: boolean;
  };
  email: {
    provider: "smtp" | "sendgrid" | "resend" | "ses";
    fromName: string;
    fromEmail: string;
  };
  integrations: {
    googleAnalyticsId?: string;
    metaPixelId?: string;
    gtmId?: string;
    whatsappNumber?: string;
    discordWebhook?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "user.created" | "user.updated" | "user.deleted" | "user.banned"
  | "product.created" | "product.updated" | "product.published"
  | "order.created" | "order.refunded"
  | "settings.updated"
  | "login.success" | "login.failed" | "logout";

export interface AuditLog {
  id: ID;
  actorId: ID;
  actor?: User;
  action: AuditAction;
  resourceType: string;
  resourceId?: ID;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// CMS PAGES
// ─────────────────────────────────────────────────────────────────────────────

export type PageStatus = "published" | "draft" | "scheduled" | "archived";
export type PageType = "home" | "landing" | "course" | "blog" | "about" | "contact" | "faq" | "legal" | "custom";

export interface CMSPage {
  id: ID;
  type: PageType;
  title: string;
  slug: string;
  status: PageStatus;
  blocks: CMSBlock[];
  seo?: SEOMeta;
  publishedAt?: ISODate;
  scheduledAt?: ISODate;
  version: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type CMSBlockType =
  | "hero" | "features" | "testimonials" | "pricing" | "faq"
  | "cta" | "gallery" | "video" | "text" | "banner"
  | "course_grid" | "instructor_grid" | "stats" | "custom";

export interface CMSBlock {
  id: ID;
  type: CMSBlockType;
  order: number;
  isVisible: boolean;
  props: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────

export interface AIRecommendation {
  productId: ID;
  product?: Product;
  score: number;
  reason: string;
}

export interface AIChatMessage {
  id: ID;
  role: "user" | "assistant";
  content: string;
  createdAt: ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOKS & INTEGRATIONS
// ─────────────────────────────────────────────────────────────────────────────

export type WebhookEvent =
  | "order.paid" | "order.refunded"
  | "enrollment.created" | "enrollment.expired"
  | "user.registered" | "user.deleted"
  | "course.completed" | "certificate.issued";

export interface Webhook {
  id: ID;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  lastTriggeredAt?: ISODate;
  successCount: number;
  failCount: number;
  createdAt: ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface FilterOption {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "range" | "boolean";
  options?: SelectOption[];
}

export type SortDirection = "asc" | "desc";
export interface SortConfig {
  key: string;
  direction: SortDirection;
}
