export const APP_NAME = "LEX Concursos";

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

  ADMIN: {
    DASHBOARD:       "/admin/dashboard",
    USERS:           "/admin/users",
    PRODUCTS:        "/admin/products",
    COURSES:         "/admin/courses",
    ORDERS:          "/admin/orders",
    FINANCIAL:       "/admin/financial",
    ANALYTICS:       "/admin/analytics",
    INTEGRATIONS:    "/admin/integrations",
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
