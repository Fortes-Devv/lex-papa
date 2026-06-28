import { useAuthStore } from "./auth";
import { MOCK_USERS } from "@/lib/mock/data";

export function useCurrentUser() {
  const user = useAuthStore((s) => s.user);
  // fallback to admin for SSR / before login
  return user ?? MOCK_USERS[0];
}
