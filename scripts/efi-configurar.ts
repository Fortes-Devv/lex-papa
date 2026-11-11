// Confere a configuração da Efí e cadastra a URL dos avisos de Pix na chave da LEX.
//
//   npx tsx --env-file=.env scripts/efi-configurar.ts              confere credenciais, certificado e o aviso atual
//   npx tsx --env-file=.env scripts/efi-configurar.ts --aplicar    cadastra (ou troca) a URL do aviso de Pix
//
// Usa as variáveis do .env (EFI_*). Com EFI_SANDBOX=true fala com a homologação. A URL do aviso sai de APP_URL:
// rode com o endereço do site no ar (https), não com localhost.
//
// ATENÇÃO: o aviso de Pix é por CHAVE. Se a chave já avisa outro site (ex.: o plataforma-de-questoes na mesma conta
// Efí), trocar quebra os Pix de lá. Por isso o script recusa sem --forcar. Use uma chave aleatória só da LEX.
import { EfiError, efiWebhookUrls, getPixWebhook, isEfiCardConfigured, isEfiPixConfigured, listPlans, registerPixWebhook } from "../src/lib/efi";

const APPLY = process.argv.includes("--aplicar");
const FORCE = process.argv.includes("--forcar");
const hide = (url: string) => url.replace(/hmac=[^&]+/, "hmac=***");

async function main() {
  console.log(`Ambiente: ${process.env.EFI_SANDBOX === "true" ? "homologação" : "PRODUÇÃO"}`);
  // Só os nomes (nunca os valores): o que está preenchido e o que falta.
  for (const name of ["EFI_CLIENT_ID", "EFI_CLIENT_SECRET", "EFI_CERTIFICADO", "EFI_CHAVE_PIX", "NEXT_PUBLIC_EFI_CONTA", "EFI_WEBHOOK_SEGREDO", "APP_URL"]) {
    console.log(`  ${process.env[name]?.trim() ? "ok   " : "FALTA"} ${name}`);
  }
  console.log(`Pix na Efí: ${isEfiPixConfigured() ? "configurado" : "falta EFI_CLIENT_ID, EFI_CLIENT_SECRET, EFI_CERTIFICADO ou EFI_CHAVE_PIX"}`);
  console.log(`Cartão na Efí: ${isEfiCardConfigured() ? "configurado" : "falta NEXT_PUBLIC_EFI_CONTA (identificador de conta)"}`);
  if (!process.env.EFI_WEBHOOK_SEGREDO) {
    console.log("Falta EFI_WEBHOOK_SEGREDO (um texto aleatório longo, só letras e números).");
    process.exit(1);
  }
  if (!isEfiPixConfigured()) process.exit(1);

  const urls = efiWebhookUrls();
  console.log(`Aviso de Pix:      ${hide(urls.pix)}`);
  console.log(`Aviso de cobrança: ${hide(urls.cobrancas)} (vai em cada pagamento no cartão)`);

  let current: string | undefined;
  try {
    current = (await getPixWebhook())?.webhookUrl;
    console.log(`Aviso cadastrado hoje na chave: ${current ? hide(current) : "(nenhum)"}`);
  } catch (err) {
    // 404 = nenhum aviso cadastrado; outro erro costuma ser credencial ou certificado.
    if (err instanceof EfiError && err.status === 404) console.log("Aviso cadastrado hoje na chave: (nenhum)");
    else throw err;
  }

  try {
    await listPlans();
    console.log("API Cobranças (cartão): credenciais OK");
  } catch (err) {
    console.log("API Cobranças (cartão) recusou:", err instanceof Error ? err.message : err, "\nConfira se a API Cobranças está ativada na aplicação.");
  }

  if (!APPLY) {
    console.log("\nCredenciais e certificado OK. Para cadastrar o aviso de Pix, rode de novo com --aplicar.");
    return;
  }
  if (!urls.pix.startsWith("https://")) {
    console.log("A URL do aviso precisa ser https (confira APP_URL).");
    process.exit(1);
  }
  const ourHost = new URL(urls.pix).host;
  if (current && new URL(current).host !== ourHost && !FORCE) {
    console.log(`\nNÃO cadastrado: esta chave já avisa outro site (${new URL(current).host}).`);
    console.log("Trocar faria os Pix de lá pararem de confirmar sozinhos. Crie uma chave aleatória só para a LEX,");
    console.log("coloque em EFI_CHAVE_PIX e rode de novo. (Para trocar mesmo assim: --aplicar --forcar.)");
    process.exit(1);
  }
  await registerPixWebhook(urls.pix);
  console.log("Aviso de Pix cadastrado.");
}

main().catch((err) => {
  console.error("Falhou:", err instanceof Error ? err.message : err);
  process.exit(1);
});
