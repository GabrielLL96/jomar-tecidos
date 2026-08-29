import { useBusinessInfo } from '@/features/site-settings/hooks'
import { useSeoMeta } from '@/lib/seo'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-navy-dark font-serif text-xl font-medium">{title}</h2>
      <div className="text-text-body flex flex-col gap-3 text-sm leading-relaxed">{children}</div>
    </section>
  )
}

export function PrivacyPolicyPage() {
  const business = useBusinessInfo()

  useSeoMeta({
    title: 'Política de Privacidade',
    description: 'Como a Jomar Tecidos e Enxovais coleta, usa e protege seus dados pessoais.',
    path: '/politica-de-privacidade',
  })

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-md) px-6 py-16 md:px-12">
      <h1 className="text-navy-dark mb-3 font-serif text-3xl font-medium">
        Política de Privacidade
      </h1>
      <p className="text-text-meta mb-10 text-xs">Última atualização: 15 de agosto de 2026</p>

      <div className="flex flex-col gap-10">
        <Section title="1. Quem somos">
          <p>
            Esta política se aplica ao site {business.name}, loja física em {business.city}, e ao
            controlador dos dados pessoais tratados aqui.
          </p>
          <p>
            Razão social: Jomar Comércio de Tecidos Ltda
            <br />
            CNPJ: 09.115.885/0001-49
            <br />
            Inscrição estadual: 0010452180040
            <br />
            Encarregado de dados (DPO): não há encarregado formalmente designado — como pequena
            empresa, atendemos a Resolução CD/ANPD nº 2/2022. Pedidos sobre dados pessoais podem ser
            feitos pelos canais de contato do item 10 abaixo.
          </p>
        </Section>

        <Section title="2. Quais dados coletamos">
          <p>Cadastro e conta: nome, e-mail, CPF, telefone e endereço, informados no cadastro.</p>
          <p>Pedido e entrega: itens comprados, endereço de entrega, histórico de pedidos.</p>
          <p>
            Pagamento: dados de cartão de crédito são transmitidos diretamente ao nosso processador
            de pagamentos (Asaas) e <strong>não ficam armazenados nos nossos servidores</strong> —
            só um token de referência é guardado, quando o cliente opta por salvar o cartão pra
            próximas compras.
          </p>
          <p>
            Navegação: cookies e identificadores de sessão, coletados via Google Tag Manager/Google
            Analytics — apenas com consentimento explícito (banner de cookies).
          </p>
        </Section>

        <Section title="3. Para que usamos seus dados">
          <p>
            Processar e entregar pedidos, calcular frete (via Melhor Envio) e processar pagamento
            (via Asaas).
          </p>
          <p>Comunicar sobre status de pedido, entrega e questões de suporte.</p>
          <p>Enviar comunicação de marketing promocional (novidades, ofertas).</p>
          <p>
            Métricas de uso do site e desempenho de campanhas, quando há consentimento de cookies.
          </p>
        </Section>

        <Section title="4. Com quem compartilhamos">
          <p>
            <strong>Asaas</strong> (processamento de pagamento — Pix, boleto e cartão de crédito).
          </p>
          <p>
            <strong>Melhor Envio</strong> (cotação e, quando aplicável, geração de etiqueta de
            frete).
          </p>
          <p>
            <strong>Google (Analytics/Tag Manager)</strong> (métricas de uso do site, só com
            consentimento).
          </p>
          <p>
            <strong>Resend</strong> (envio de e-mails transacionais — confirmação de pedido,
            boas-vindas e contato).
          </p>
          <p>Não compartilhamos seus dados com nenhum outro terceiro além dos listados acima.</p>
        </Section>

        <Section title="5. Cookies">
          <p>
            Usamos cookies pra manter sua sessão logada e, com seu consentimento, medir uso do site
            via Google Analytics. Você pode revisar sua escolha a qualquer momento pelo link
            "Preferências de Cookies" no rodapé.
          </p>
        </Section>

        <Section title="6. Seus direitos (LGPD, art. 18)">
          <p>
            Você pode solicitar acesso, correção, exclusão, portabilidade dos seus dados, ou revogar
            consentimento já dado, a qualquer momento.
          </p>
          <p>
            Pra exercer esses direitos, entre em contato por telefone {business.phone} ou e-mail{' '}
            {business.email}.
          </p>
        </Section>

        <Section title="7. Retenção de dados">
          <p>
            Seus dados de cadastro e pedido ficam guardados pelo tempo exigido pela legislação
            aplicável: a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) permite reter dado
            pessoal enquanto necessário pra cumprir obrigação legal ou regulatória; documentos
            fiscais de venda (nota fiscal, comprovante) seguem o prazo de 5 anos do Código
            Tributário Nacional (Lei nº 5.172/1966, art. 173); e reclamações relacionadas à compra
            seguem o prazo de 5 anos do Código de Defesa do Consumidor (Lei nº 8.078/1990, art. 27).
          </p>
        </Section>

        <Section title="8. Segurança">
          <p>
            Dados sensíveis de autenticação/sessão são armazenados de forma criptografada no
            navegador. O acesso a dados de cliente no painel administrativo é restrito ao papel de
            administrador.
          </p>
        </Section>

        <Section title="9. Alterações nesta política">
          <p>
            Podemos atualizar esta política — mudanças relevantes serão indicadas pela data no topo
            desta página.
          </p>
        </Section>

        <Section title="10. Contato">
          <p>
            {business.name} — {business.phone} — {business.email}
          </p>
        </Section>
      </div>
    </main>
  )
}
