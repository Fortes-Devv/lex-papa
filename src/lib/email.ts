// Envio de e-mail via Resend (opcional). Sem RESEND_API_KEY configurada,
// isEmailConfigured() é falso e o app degrada graciosamente.
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  if (!isEmailConfigured()) {
    return { sent: false as const, reason: "Serviço de e-mail não configurado (RESEND_API_KEY)." };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: input.to, subject: input.subject, html: input.html }),
  });
  if (!res.ok) {
    return { sent: false as const, reason: "Falha ao enviar e-mail." };
  }
  return { sent: true as const };
}
