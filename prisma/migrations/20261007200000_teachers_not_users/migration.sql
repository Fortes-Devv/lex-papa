-- Professores deixam de ser usuários: viram um cadastro só de crédito (nome, foto, minibio).

-- 1. Tabela de professores.
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- 2. Copia quem é professor e quem é dono de algum módulo (mesmo id: os módulos
--    continuam apontando para a mesma pessoa, sem perder o crédito).
INSERT INTO "teachers" ("id", "name", "avatar", "bio", "createdAt", "updatedAt")
SELECT u."id", u."name", u."avatar", u."bio", u."createdAt", CURRENT_TIMESTAMP
FROM "users" u
WHERE u."role" = 'teacher'
   OR u."id" IN (SELECT DISTINCT "instructorId" FROM "modules" WHERE "instructorId" IS NOT NULL);

-- 3. Módulos passam a apontar para a tabela de professores.
ALTER TABLE "modules" DROP CONSTRAINT "modules_instructorId_fkey";
ALTER TABLE "modules" ADD CONSTRAINT "modules_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Repasses a professores foram removidos do Financeiro.
ALTER TABLE "payouts" DROP CONSTRAINT "payouts_teacherId_fkey";
DROP TABLE "payouts";

-- 5. Contas de usuário dos professores saem (não tinham acesso; o crédito ficou em "teachers").
DELETE FROM "users" WHERE "role" = 'teacher';
