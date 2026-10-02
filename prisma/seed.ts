import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  // Trava: não roda em produção sem confirmação explícita (cria/promove um admin).
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
    console.error("\nSeed bloqueado em produção. Se for intencional, rode com ALLOW_PROD_SEED=1.\n");
    process.exit(1);
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.error(
      "\nDefina ADMIN_EMAIL e ADMIN_PASSWORD antes de rodar o seed. Exemplo (PowerShell):\n" +
        '  $env:ADMIN_EMAIL="voce@email.com"; $env:ADMIN_PASSWORD="uma-senha-forte"; npm run db:seed\n'
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: "admin", status: "active" },
    create: {
      name,
      email,
      passwordHash,
      role: "admin",
      status: "active",
      emailVerified: true,
    },
  });

  console.log(`Admin pronto: ${user.email} (role: ${user.role})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
