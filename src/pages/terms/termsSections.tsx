// RASCUNHO — revisar com jurídico antes de considerar definitivo (marcadores [..] pendentes)
import type { ReactNode } from 'react'

interface TermsSection {
  title: string
  content: ReactNode
}

interface BusinessContact {
  name: string
  city: string
  phone: string
  email: string
}

export function getTermsSections(business: BusinessContact): TermsSection[] {
  return [
    {
      title: '1. Quem somos',
      content: (
        <>
          <p>
            Estes termos regem o uso do site {business.name} e as compras feitas por ele. Ao usar o
            site ou fazer um pedido, você concorda com estas regras.
          </p>
          <p>
            Razão social: Jomar Comércio de Tecidos Ltda
            <br />
            CNPJ: 09.115.885/0001-49
            <br />
            Endereço: [endereço completo]
            <br />
            E-mail de contato: {business.email}
            <br />
            Telefone: {business.phone}
          </p>
        </>
      ),
    },
    {
      title: '2. Cadastro e conta',
      content: (
        <>
          <p>
            Para comprar, você cria uma conta com dados verdadeiros e atualizados. Você é
            responsável por manter sua senha em segurança e por tudo o que for feito com a sua
            conta.
          </p>
          <p>
            Se perceber uso indevido da sua conta, avise a loja o quanto antes. Só podem comprar
            pessoas com capacidade legal para contratar.
          </p>
        </>
      ),
    },
    {
      title: '3. Produtos',
      content: (
        <>
          <p>
            Os tecidos são vendidos por metro, com metragem mínima de corte [confirmar metragem
            mínima com a loja]. O corte é feito conforme a metragem escolhida no pedido.
          </p>
          <p>
            As cores vistas na tela podem variar do produto real, por causa do brilho e da
            calibragem de cada monitor e também entre lotes de tecido. Em caso de dúvida, fale com a
            loja antes de comprar.
          </p>
        </>
      ),
    },
    {
      title: '4. Preços e disponibilidade',
      content: (
        <>
          <p>
            Os preços podem mudar sem aviso prévio. Vale o preço exibido no momento em que o pedido
            é feito.
          </p>
          <p>
            A disponibilidade em estoque é confirmada no pedido. Se algum item acabar antes da
            confirmação, entraremos em contato para oferecer alternativa ou reembolso.
          </p>
        </>
      ),
    },
    {
      title: '5. Pagamento',
      content: (
        <p>
          O pagamento é processado pelo Asaas e pode ser feito por Pix, boleto ou cartão de crédito.
          Os dados do cartão são enviados direto ao processador de pagamentos. O pedido só é
          processado depois da confirmação do pagamento.
        </p>
      ),
    },
    {
      title: '6. Entrega',
      content: (
        <p>
          O frete é calculado pelo Melhor Envio. O prazo de entrega é uma estimativa da
          transportadora, contado a partir da confirmação do pagamento, e pode variar por motivos
          fora do nosso controle. Confira o endereço informado: dados errados podem atrasar ou
          impedir a entrega.
        </p>
      ),
    },
    {
      title: '7. Direito de arrependimento',
      content: (
        <>
          <p>
            Em compras feitas pelo site, você pode desistir da compra em até 7 dias corridos a
            partir do recebimento, sem precisar justificar (Código de Defesa do Consumidor, art.
            49). O produto deve estar sem uso e na embalagem original.
          </p>
          <p>
            [confirmar com a loja: tecido cortado sob medida] — a situação do tecido cortado sob
            medida ainda precisa ser definida pela loja.
          </p>
        </>
      ),
    },
    {
      title: '8. Trocas e defeitos',
      content: (
        <p>
          Se o produto chegar com defeito, você tem 30 dias (produto não durável) ou 90 dias
          (produto durável) para reclamar, contados da entrega ou de quando o defeito aparecer
          (Código de Defesa do Consumidor, art. 26). [confirmar: tecido é considerado produto
          durável?]
        </p>
      ),
    },
    {
      title: '9. Propriedade intelectual',
      content: (
        <p>
          Textos, imagens, logotipo e demais conteúdos do site pertencem à {business.name} ou são
          usados com autorização. Não é permitido copiar ou reutilizar sem permissão.
        </p>
      ),
    },
    {
      title: '10. Limitação de responsabilidade',
      content: (
        <p>
          Trabalhamos para manter o site no ar e as informações corretas, mas não garantimos
          funcionamento sem interrupções. Não respondemos por falhas de serviços de terceiros
          (internet, transportadora, meios de pagamento), nem por erros causados por dados
          informados incorretamente por você, sem prejuízo dos seus direitos como consumidor.
        </p>
      ),
    },
    {
      title: '11. Alterações dos termos',
      content: (
        <p>
          Podemos atualizar estes termos. A data de atualização fica no topo da página, e vale a
          versão vigente no momento do pedido.
        </p>
      ),
    },
    {
      title: '12. Foro',
      content: (
        <p>
          Fica eleito o foro da comarca de {business.city}, ressalvado o direito do consumidor de
          ajuizar a ação no foro do seu domicílio.
        </p>
      ),
    },
  ]
}
