"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelativeDate } from "@/lib/utils/cn";

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  courseTitle: string;
  progress: number;
  status: string;
  lastAccessedAt: string | null;
}

export function StudentsClient({ rows }: { rows: StudentRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Alunos</h1>
        <p className="text-sm text-foreground-muted mt-0.5">{rows.length} matrículas nos seus cursos</p>
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
            {filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar src={e.avatar} name={e.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.name}</p>
                      <p className="text-xs text-foreground-muted">{e.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-foreground max-w-[180px] truncate">{e.courseTitle}</TableCell>
                <TableCell>
                  <div className="space-y-1 w-32">
                    <Progress value={e.progress} size="xs" />
                    <p className="text-xs text-foreground-muted">{e.progress}%</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={e.status === "active" ? "success" : e.status === "completed" ? "default" : "secondary"} dot>
                    {e.status === "active" ? "Ativo" : e.status === "completed" ? "Concluído" : e.status === "cancelled" ? "Cancelado" : "Expirado"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-foreground-muted">{e.lastAccessedAt ? formatRelativeDate(e.lastAccessedAt) : "—"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-foreground-muted py-8">Nenhum aluno matriculado ainda.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
