import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Política de Privacidade — LEX Concursos" };

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="[DATA]">
      <p>
        Esta Política explica como [RAZÃO SOCIAL], CNPJ [CNPJ] (&quot;LEX&quot;), trata seus dados pessoais na plataforma LEX
        Concursos, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><b>Cadastro:</b> nome, e-mail e senha (guardada de forma criptografada).</li>
        <li><b>Compra:</b> CPF, nome e e-mail do pagador, enviados ao Mercado Pago para processar o pagamento. Dados de cartão são tratados apenas pelo Mercado Pago.</li>
        <li><b>Uso da plataforma:</b> aulas assistidas, progresso, respostas a questões, anotações e data do último acesso.</li>
        <li><b>Técnicos:</b> endereço IP e dados do navegador, usados para segurança (por exemplo, limite de tentativas de login).</li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Criar e manter sua conta e liberar os cursos comprados (execução de contrato).</li>
        <li>Processar pagamentos e emitir comprovantes (execução de contrato e obrigação legal).</li>
        <li>Mostrar seu progresso, desempenho e certificados.</li>
        <li>Enviar e-mails de serviço, como redefinição de senha.</li>
        <li>Proteger a plataforma contra fraudes e acessos indevidos (legítimo interesse).</li>
        <li>[SE HOUVER MARKETING: descrever aqui, com opção de descadastro.]</li>
      </ul>

      <h2>3. Com quem compartilhamos</h2>
      <ul>
        <li><b>Mercado Pago:</b> pagamentos.</li>
        <li><b>Vercel e Neon:</b> hospedagem do site e do banco de dados.</li>
        <li><b>Bunny.net e Cloudinary:</b> entrega de vídeos, imagens e materiais.</li>
        <li><b>Resend:</b> envio de e-mails.</li>
        <li>[INCLUIR GOOGLE ANALYTICS / META PIXEL SE FOREM ATIVADOS.]</li>
      </ul>
      <p>Não vendemos seus dados pessoais.</p>

      <h2>4. Por quanto tempo guardamos</h2>
      <p>
        Enquanto sua conta estiver ativa e, depois, pelo prazo exigido por lei (por exemplo, registros fiscais de compras).
        [DEFINIR PRAZOS.]
      </p>

      <h2>5. Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, e revogar consentimentos, pelo e-mail
        [E-MAIL DO ENCARREGADO/DPO]. Responderemos no prazo previsto na LGPD.
      </p>

      <h2>6. Segurança</h2>
      <p>
        Usamos conexão criptografada (HTTPS), senhas com hash, controle de acesso por perfil e links de vídeo temporários.
        Nenhum sistema é totalmente imune a incidentes; se algum ocorrer, você e a ANPD serão comunicados conforme a lei.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Usamos cookies essenciais para manter você conectado. [SE ATIVAR GA4/META PIXEL: descrever os cookies de medição e o
        banner de consentimento.]
      </p>

      <h2>8. Contato</h2>
      <p>Encarregado de dados (DPO): [NOME] — [E-MAIL]. Endereço: [ENDEREÇO].</p>
    </LegalPage>
  );
}
