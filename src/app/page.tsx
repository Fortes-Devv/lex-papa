import { redirect } from "next/navigation";

// Root redirect — in real app this checks session/cookie
export default function RootPage() {
  redirect("/admin/dashboard");
}
