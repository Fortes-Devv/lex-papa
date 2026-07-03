import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não está definida. Configure-a em .env (dev) ou nas Environment Variables da Vercel (produção).");
  }
  // Driver WebSocket — necessário para suportar transações (nested writes,
  // $transaction), usadas em várias partes do app (criação de curso,
  // reordenar módulo/aula). O driver HTTP não suporta transações.
  // Consultas com muitas chamadas em paralelo devem rodar sequencialmente
  // (ver src/lib/analytics.ts) para não esgotar o pool de conexões.
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
