export const APP_NAME = "LEX Concursos";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

export const ROLES = {
  ADMIN:     "admin",
  TEACHER:   "teacher",
  STUDENT:   "student",
  MODERATOR: "moderator",
} as const;

export const ROUTES = {
  HOME:             "/",
  LOGIN:            "/login",
  REGISTER:         "/register",
  FORGOT_PASSWORD:  "/forgot-password",
  TWO_FACTOR:       "/two-factor",

  ADMIN: {
    DASHBOARD:       "/admin/dashboard",
    USERS:           "/admin/users",
    PRODUCTS:        "/admin/products",
    COURSES:         "/admin/courses",
    ORDERS:          "/admin/orders",
    FINANCIAL:       "/admin/financial",
    ANALYTICS:       "/admin/analytics",
    CMS:             "/admin/cms",
    CONTENT_STUDIO:  "/admin/content-studio",
    INTEGRATIONS:    "/admin/integrations",
    GAMIFICATION:    "/admin/gamification",
    LOGS:            "/admin/logs",
    SETTINGS:        "/admin/settings",
  },

  TEACHER: {
    DASHBOARD: "/teacher/dashboard",
    COURSES:   "/teacher/courses",
    CONTENT:   "/teacher/content",
    STUDENTS:  "/teacher/students",
    ANALYTICS: "/teacher/analytics",
  },

  STUDENT: {
    DASHBOARD:    "/student/dashboard",
    LIBRARY:      "/student/library",
    PLAYER:       "/student/player",
    CERTIFICATES: "/student/certificates",
    COMMUNITY:    "/student/community",
    PROFILE:      "/student/profile",
  },

  CHECKOUT:   "/checkout",
  SUCCESS:    "/checkout/success",
  COURSE:     "/course",
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE:     1,
  PER_PAGE: 20,
  MAX:      100,
};

// When backend is ready, replace MOCK_DELAY with real fetch()
export const MOCK_DELAY = process.env.NODE_ENV === "test" ? 0 : 400;
