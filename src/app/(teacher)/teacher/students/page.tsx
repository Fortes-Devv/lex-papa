"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MOCK_ENROLLMENTS, MOCK_PRODUCTS } from "@/lib/mock/data";
import { useCurrentUser } from "@/lib/store/hooks";
import { formatRelativeDate } from "@/lib/utils/cn";

export default function TeacherStudentsPage() {
  const user = useCurrentUser();
  const [search, setSearch] = useState("");
  const myProductIds = MOCK_PRODUCTS.filter((p) => p.instructorIds.includes(user.id)).map((p) => p.id);
  const enrollments = MOCK_ENROLLMENTS.filter((e) => myProductIds.includes(e.productId));

  const filtered = enrollments.filter((e) =>
    !search || e.user?.name.toLowerCase().includes(search.toLowerCase()) || e.user?.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Alunos</h1>
        <p className="text-sm text-foreground-muted mt-0.5">{enrollments.length} matrículas nos seus cursos</p>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Buscar aluno..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último acesso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar src={enrollment.user?.avatar} name={enrollment.user?.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{enrollment.user?.name}</p>
                      <p className="text-xs text-foreground-muted">{enrollment.user?.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-foreground max-w-[180px] truncate">
                  {enrollment.product?.title}
                </TableCell>
                <TableCell>
                  <div className="space-y-1 w-32">
                    <Progress value={enrollment.progress} size="xs" />
                    <p className="text-xs text-foreground-muted">{enrollment.progress}%</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={enrollment.status === "active" ? "success" : enrollment.status === "completed" ? "default" : "secondary"} dot>
                    {enrollment.status === "active" ? "Ativo" : enrollment.status === "completed" ? "Concluído" : "Expirado"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-foreground-muted">
                  {enrollment.lastAccessedAt ? formatRelativeDate(enrollment.lastAccessedAt) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
