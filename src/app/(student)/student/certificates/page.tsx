import { redirect } from "next/navigation";

// Função de certificado desativada por hora.
// A UI/consulta original foi preservada no histórico do git para religar depois.
export default async function StudentCertificatesPage() {
  redirect("/student/library");
}
