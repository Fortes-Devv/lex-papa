"use client";
import { Award, Download, ExternalLink, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MOCK_CERTIFICATES } from "@/lib/mock/data";
import { useCurrentUser } from "@/lib/store/hooks";
import { formatDate } from "@/lib/utils/cn";

export default function StudentCertificatesPage() {
  const user = useCurrentUser();
  const certs = MOCK_CERTIFICATES.filter((c) => c.userId === user.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Certificados</h1>
        <p className="text-sm text-foreground-muted mt-0.5">{certs.length} certificado{certs.length !== 1 ? "s" : ""} emitido{certs.length !== 1 ? "s" : ""}</p>
      </div>

      {certs.length === 0 ? (
        <EmptyState icon={<Award className="h-5 w-5" />} title="Nenhum certificado ainda" description="Conclua um curso para receber seu certificado." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map((cert) => (
            <div key={cert.id} className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 transition-all group">
              {/* Certificate preview */}
              <div className="aspect-[4/3] bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center p-6 border-b border-border relative">
                <div className="absolute top-3 right-3">
                  <Badge variant="success"><CheckCircle className="h-3 w-3" />Válido</Badge>
                </div>
                <Award className="h-12 w-12 text-primary mb-3" />
                <p className="text-center text-sm font-semibold text-foreground line-clamp-2">{cert.product?.title}</p>
                <p className="text-xs text-foreground-muted mt-1">Certificado de Conclusão</p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-foreground-muted">Código</p>
                  <p className="font-mono text-xs text-foreground font-medium">{cert.code}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">Emitido em</p>
                  <p className="text-sm text-foreground font-medium">{formatDate(cert.issueDate)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" leftIcon={<Download className="h-3.5 w-3.5" />}>Baixar PDF</Button>
                  <Button size="sm" variant="outline" leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>Verificar</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
