// Templates de e-mail em HTML (tabelas + estilos inline, padrão para máxima
// compatibilidade com clientes de e-mail). Tema claro com a marca LEX Concursos.

const ORANGE = "#EA580C";
const ORANGE_LIGHT = "#FEE9D9";
const CREAM = "#FAF6F1";

function logoUrl(): string {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloud}/image/upload/w_220/lms/brand/logo.png`;
}

interface BrandedEmailOptions {
  preheader?: string;
  icon?: string; // emoji do ícone central (ex: 🔒)
  heading: string;
  bodyHtml: string; // HTML do corpo (centralizado)
  ctaText?: string;
  ctaUrl?: string;
  ctaIcon?: string; // emoji no botão
  security?: { title: string; lines: string[] }; // bloco de rodapé de segurança
}

export function renderBrandedEmail(opts: BrandedEmailOptions): string {
  const { preheader = "", icon, heading, bodyHtml, ctaText, ctaUrl, ctaIcon, security } = opts;

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding:8px 0 22px;">
          <img src="${logoUrl()}" alt="LEX Concursos" width="130" style="display:block;border:0;outline:none;max-width:130px;height:auto;" />
        </td></tr>

        <!-- Card -->
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <!-- barra superior laranja -->
            <tr><td style="height:6px;background:${ORANGE};line-height:6px;font-size:6px;">&nbsp;</td></tr>

            <!-- conteúdo -->
            <tr><td align="center" style="padding:36px 36px 32px;">
              ${icon ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;"><tr>
                <td align="center" valign="middle" width="72" height="72" style="width:72px;height:72px;background:${ORANGE_LIGHT};border-radius:50%;font-size:30px;line-height:72px;">${icon}</td>
              </tr></table>` : ""}

              <h1 style="margin:0 0 14px;font-size:24px;font-weight:800;color:#1f2937;text-align:center;">${heading}</h1>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;"><tr>
                <td style="width:56px;height:3px;background:${ORANGE};line-height:3px;font-size:3px;border-radius:2px;">&nbsp;</td>
              </tr></table>

              <div style="font-size:15px;line-height:1.7;color:#6b7280;text-align:center;">${bodyHtml}</div>

              ${ctaText && ctaUrl ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto 4px;"><tr>
                <td align="center" style="border-radius:10px;background:${ORANGE};box-shadow:0 4px 12px rgba(234,88,12,0.35);">
                  <a href="${ctaUrl}" style="display:inline-block;padding:15px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${ctaIcon ? ctaIcon + "&nbsp;&nbsp;" : ""}${ctaText}</a>
                </td>
              </tr></table>` : ""}
            </td></tr>

            <!-- rodapé de segurança -->
            ${security ? `
            <tr><td style="background:#f7f7f6;border-top:1px solid #eeeeee;padding:20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td valign="top" width="44" style="width:44px;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td align="center" valign="middle" width="36" height="36" style="width:36px;height:36px;background:${ORANGE_LIGHT};border-radius:50%;font-size:18px;line-height:36px;">🛡️</td>
                  </tr></table>
                </td>
                <td valign="top" style="padding-left:10px;">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#374151;">${security.title}</p>
                  ${security.lines.map((l) => `<p style="margin:0;font-size:13px;line-height:1.5;color:#9ca3af;">${l}</p>`).join("")}
                </td>
              </tr></table>
            </td></tr>` : ""}

            <!-- barra inferior laranja -->
            <tr><td style="height:6px;background:${ORANGE};line-height:6px;font-size:6px;">&nbsp;</td></tr>
          </table>
        </td></tr>

        <!-- rodapé -->
        <tr><td align="center" style="padding:22px 12px 4px;">
          <p style="margin:0;font-size:12px;color:#b4a89c;">© ${new Date().getFullYear()} LEX Concursos. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function passwordResetEmailHtml(resetLink: string): string {
  return renderBrandedEmail({
    preheader: "Redefina sua senha da LEX Concursos.",
    icon: "🔒",
    heading: "Redefinição de senha",
    bodyHtml: `Você solicitou a redefinição da sua senha.<br>Clique no botão abaixo para criar uma nova senha.<br><strong style="color:${ORANGE};">(válido por 1h).</strong>`,
    ctaText: "Redefinir minha senha",
    ctaUrl: resetLink,
    ctaIcon: "🔒",
    security: {
      title: "Sua segurança é importante",
      lines: [
        "Este link é válido por 1 hora.",
        "Se você não solicitou essa alteração, ignore este e-mail.",
      ],
    },
  });
}
