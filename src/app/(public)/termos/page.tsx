import type { Metadata } from "next";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { LegalPage } from "@/components/legal/legal-page";

export const revalidate = 300;
export const metadata: Metadata = { title: "Termos de Uso" };

// Dados da empresa vêm de Configurações › Empresa; sem preencher, mostra o marcador.
const v = (value: string, placeholder: string) => value || placeholder;

export default async function TermosPage() {
  const c = (await getSettings().catch(() => DEFAULT_SETTINGS)).company;
  return (
    <LegalPage title="Termos de Uso" updatedAt="[DATA]">
      <p>
        Estes Termos regulam o uso da plataforma LEX Concursos (&quot;Plataforma&quot;), mantida por {v(c.legalName, "[RAZÃO SOCIAL]")}, inscrita no
        CNPJ {v(c.cnpj, "[CNPJ]")}, com sede em {v(c.address, "[ENDEREÇO]")} (&quot;LEX&quot;). Ao criar uma conta ou comprar um curso, você concorda com estes Termos.
      </p>

      <h2>1. Conta</h2>
      <ul>
        <li>A conta é pessoal e intransferível. Você é responsável por manter sua senha em sigilo.</li>
        <li>As informações de cadastro devem ser verdadeiras e atualizadas.</li>
        <li>A LEX pode suspender contas usadas em desacordo com estes Termos.</li>
      </ul>

      <h2>2. Cursos e acesso</h2>
      <ul>
        <li>A compra de um curso dá direito ao acesso pessoal ao conteúdo pelo prazo informado na página do curso.</li>
        <li>É proibido compartilhar a conta, gravar, baixar, copiar, revender ou distribuir aulas, vídeos e materiais.</li>
        <li>O conteúdo pode ser atualizado ao longo do tempo para refletir mudanças em editais e legislação.</li>
      </ul>

      <h2>3. Pagamentos</h2>
      <ul>
        <li>Os pagamentos são processados pelo Mercado Pago (cartão, PIX ou boleto). A LEX não armazena dados de cartão.</li>
        <li>O acesso é liberado após a confirmação do pagamento.</li>
      </ul>

      <h2>4. Direito de arrependimento e reembolso</h2>
      <p>
        Conforme o art. 49 do Código de Defesa do Consumidor, você pode desistir da compra em até 7 (sete) dias a partir da
        contratação, com reembolso integral, solicitando pelo e-mail {v(c.contactEmail, "[E-MAIL DE CONTATO]")}. [DESCREVER AQUI QUALQUER POLÍTICA
        ADICIONAL DE REEMBOLSO.]
      </p>

      <h2>5. Propriedade intelectual</h2>
      <p>
        Aulas, vídeos, materiais em PDF, questões, comentários, marca e layout pertencem à LEX ou a seus professores e são
        protegidos pela Lei de Direitos Autorais (Lei 9.610/1998).
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        A LEX se empenha na qualidade do conteúdo, mas não garante aprovação em concursos. A Plataforma pode passar por
        manutenções e instabilidades pontuais.
      </p>

      <h2>7. Alterações</h2>
      <p>Estes Termos podem ser atualizados. A data da última atualização aparece no topo desta página.</p>

      <h2>8. Contato e foro</h2>
      <p>
        Dúvidas: {v(c.contactEmail, "[E-MAIL DE CONTATO]")}. Fica eleito o foro da comarca de {v(c.city, "[CIDADE/UF]")}, sem prejuízo dos direitos do consumidor.
      </p>
    </LegalPage>
  );
}
