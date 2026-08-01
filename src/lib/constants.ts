export const BUSINESS = {
  name: 'Jomar Tecidos e Enxovais',
  foundedYear: 1987,
  phone: '(35) 3421-7521',
  phoneHref: '+553534217521',
  whatsappHref: 'https://wa.me/553534217521',
  email: 'contato@jomartecidos.com.br',
  address: 'Rua Principal, Centro — MG',
  city: 'Pouso Alegre, MG',
  zip: '37550-000',
  hours: 'Seg–Sáb, 9h às 18h',
  freeShippingThreshold: 350,
  flatShippingFee: 25,
  instagramHref: 'https://instagram.com',
} as const

export const NAV_ITEMS = [
  { to: '/', label: 'Início' },
  { to: '/tecidos', label: 'Tecidos' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/contato', label: 'Contato' },
] as const

export const TRUST_BADGES = [
  { title: 'Envio Rápido', subtitle: 'Para todo o Brasil' },
  { title: 'Parcele em até 3x', subtitle: 'Sem juros' },
  { title: 'Pix com 5% OFF', subtitle: 'Pagamento instantâneo' },
  { title: 'Compra Segura', subtitle: 'Privacidade garantida' },
] as const
