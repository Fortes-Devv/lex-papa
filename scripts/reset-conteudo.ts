// Reset de conteúdo pré-lançamento (01/10/2026).
// Apaga TODOS os cursos (produtos, módulos, aulas, quizzes) e TODOS os pedidos,
// e remove as capas dos cursos no Cloudinary. Usuários são mantidos.
// Antes de apagar, salva um backup JSON em scripts/backup-antes-limpeza-<data>.json.
//
// Uso:  npx tsx scripts/reset-conteudo.ts --confirmar
import "dotenv/config";
import { writeFileSync } from "fs";
import { db } from "../src/lib/db";
import { deleteCloudinaryImageByUrl } from "../src/lib/cloudinary";

async function main() {
  if (!process.argv.includes("--confirmar")) {
    console.log("Nada foi feito. Rode com --confirmar para apagar cursos e pedidos.");
    return;
  }

  // 1) Backup de tudo que será apagado
  const products = await db.product.findMany({
    include: {
      course: { include: { modules: { include: { lessons: { include: { quiz: { include: { questions: true } }, materials: true } } } } } },
      instructors: { select: { id: true, email: true } },
      tags: true,
    },
  });
  const orders = await db.order.findMany({ include: { items: true } });
  const file = `scripts/backup-antes-limpeza-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(file, JSON.stringify({ products, orders }, null, 2));
  console.log("Backup salvo:", file);

  // 2) Pedidos primeiro (OrderItem -> Product é Restrict), depois produtos (cascade: curso, módulos, aulas)
  const result = await db.$transaction(async (tx) => {
    const o = await tx.order.deleteMany({ where: { id: { in: orders.map((x) => x.id) } } });
    const p = await tx.product.deleteMany({ where: { id: { in: products.map((x) => x.id) } } });
    return { pedidos: o.count, produtos: p.count };
  });
  console.log("Apagados:", JSON.stringify(result));

  // 3) Capas no Cloudinary
  for (const p of products) await deleteCloudinaryImageByUrl(p.thumbnail);
  console.log("Capas removidas do Cloudinary:", products.filter((p) => p.thumbnail).length);

  await db.auditLog.create({
    data: { action: "maintenance.reset_content", resourceType: "system", metadata: { ...result, motivo: "Reset pré-lançamento: vídeos do Bunny perdidos (trial expirado)" } },
  });

  // 4) Conferência
  const after = {
    produtos: await db.product.count(),
    aulas: await db.lesson.count(),
    pedidos: await db.order.count(),
    usuarios: await db.user.count(),
  };
  console.log("Depois:", JSON.stringify(after));
}

main()
  .catch((e) => {
    console.error("ERRO:", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
