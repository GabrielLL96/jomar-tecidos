export const BUSINESS = {
  name: 'Jomar Tecidos e Enxovais',
  foundedYear: 1987,
  phone: '(35) 3421-7521',
  phoneHref: '+553534217521',
  whatsappHref: 'https://wa.me/553534217521',
  email: 'contato@jomartecidos.com.br',
  address: 'Tv Joaquim Bernardes, 25, Praça Senador José Bento, 85 - Centro',
  city: 'Pouso Alegre, MG',
  zip: '37550-106',
  hours: 'Seg–Sáb, 9h às 18h',
  freeShippingThreshold: 350,
  flatShippingFee: 25,
  instagramHref: 'https://instagram.com',
} as const

// Largura máxima aplicada por resizeImageFile antes do upload — site-images são elementos
// decorativos (hero/banner/categorias); product-images precisa de mais resolução por causa do
// zoom-with-pan da PDP.
export const SITE_IMAGE_MAX_WIDTH = 1600
export const PRODUCT_IMAGE_MAX_WIDTH = 2000

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
