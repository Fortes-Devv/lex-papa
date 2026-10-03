import type { Instrumentation } from "next";

export function register() {}

// Todo erro não tratado no servidor (páginas, server actions, API) vai para os Logs do admin.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  // Só no runtime Node (o bloco some do bundle edge) e só em produção.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const e = err as Error & { digest?: string };
    const { reportError } = await import("@/lib/error-report");
    await reportError({
      kind: "server",
      message: e?.message ?? String(err),
      path: request.path,
      digest: e?.digest,
      extra: { method: request.method, route: context.routePath, routeType: context.routeType },
    });
  }
};
