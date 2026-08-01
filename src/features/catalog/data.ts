import type { Category, Product } from './types'

export const CATEGORIES: Category[] = [
  { slug: 'linhos', name: 'Linhos', count: 24, tag: 'linho — puro', colors: ['#eee6d6', '#e0d3b6'] },
  { slug: 'algodoes', name: 'Algodões', count: 38, tag: 'algodão — liso', colors: ['#e3ecec', '#cfe0e0'] },
  { slug: 'sedas', name: 'Sedas', count: 16, tag: 'seda — brilho', colors: ['#efe0e6', '#e0c7d3'] },
  { slug: 'aviamentos', name: 'Aviamentos', count: 52, tag: 'aviamento — misto', colors: ['#e6e4ee', '#d3cfe3'] },
  { slug: 'rendas', name: 'Rendas', count: 9, tag: 'renda — guipure', colors: ['#f2efe8', '#e6e0d0'] },
]

export const PRODUCT_CARE_DEFAULT = 'Lavar a frio, não usar alvejante, secar à sombra.'
export const PRODUCT_DELIVERY_DEFAULT =
  'Envio em até 2 dias úteis. Corte sob medida — sem devolução após o corte.'

export const PRODUCTS: Product[] = [
  {
    id: 1,
    slug: 'linho-belga-natural',
    name: 'Linho Belga Natural',
    material: 'Linho 100%',
    categorySlug: 'linhos',
    price: 128,
    tag: 'Novo',
    colors: ['#eee6d6', '#e0d3b6'],
    description:
      'Linho belga de trama densa, ideal para estofados e cortinas de peso. Toque encorpado e caimento estruturado.',
    colorOptions: [
      { label: 'Natural', hex: '#e0d3b6' },
      { label: 'Verde Oliva', hex: '#8c9a7c' },
      { label: 'Azul Acinzentado', hex: '#4a5a6a' },
      { label: 'Índigo', hex: '#1c1a5e' },
    ],
    composition: 'Linho 100% · Largura 1,40m',
  },
  {
    id: 2,
    slug: 'algodao-percal-200-fios',
    name: 'Algodão Percal 200 Fios',
    material: 'Algodão Egípcio',
    categorySlug: 'algodoes',
    price: 64,
    colors: ['#e3ecec', '#cfe0e0'],
    description:
      'Percal de fio longo com maciez superior, próprio para enxovais de cama de alto padrão.',
    colorOptions: [
      { label: 'Azul Gelo', hex: '#cfe0e0' },
      { label: 'Marfim', hex: '#e8e2d4' },
      { label: 'Vermelho', hex: '#c13a2e' },
      { label: 'Marinho Escuro', hex: '#131047' },
    ],
    composition: 'Algodão Egípcio 100% · Largura 1,40m',
  },
  {
    id: 3,
    slug: 'seda-pura-charmeuse',
    name: 'Seda Pura Charmeuse',
    material: 'Seda 100%',
    categorySlug: 'sedas',
    price: 212,
    tag: 'Premium',
    colors: ['#efe0e6', '#e0c7d3'],
    description:
      'Seda charmeuse com brilho acetinado e caimento fluido, indicada para peças de festa e forros nobres.',
    colorOptions: [
      { label: 'Rosa Antigo', hex: '#e0c7d3' },
      { label: 'Nude', hex: '#d4b8a0' },
      { label: 'Índigo', hex: '#1c1a5e' },
      { label: 'Marinho Escuro', hex: '#131047' },
    ],
    composition: 'Seda 100% · Largura 1,10m',
  },
  {
    id: 4,
    slug: 'vies-de-algodao-25mm',
    name: 'Viés de Algodão 25mm',
    material: 'Aviamento',
    categorySlug: 'aviamentos',
    price: 4.5,
    colors: ['#e6e4ee', '#d3cfe3'],
    description:
      'Viés dobrado em algodão, disponível em diversas cores, ideal para acabamento de bordas.',
    colorOptions: [
      { label: 'Lavanda', hex: '#d3cfe3' },
      { label: 'Vermelho', hex: '#c13a2e' },
      { label: 'Cru', hex: '#eee6d6' },
      { label: 'Preto', hex: '#1a1a1a' },
    ],
    composition: 'Algodão · Largura 25mm',
  },
  {
    id: 5,
    slug: 'tricoline-estampada-floral',
    name: 'Tricoline Estampada Floral',
    material: 'Algodão',
    categorySlug: 'algodoes',
    price: 38,
    colors: ['#f0e3df', '#e3c9c0'],
    description: 'Tricoline 100% algodão com estampa floral exclusiva, leve e de fácil costura.',
    colorOptions: [
      { label: 'Rosa Claro', hex: '#e3c9c0' },
      { label: 'Verde Oliva', hex: '#8c9a7c' },
      { label: 'Natural', hex: '#e0d3b6' },
      { label: 'Marinho Escuro', hex: '#131047' },
    ],
    composition: 'Algodão 100% · Largura 1,40m',
  },
  {
    id: 6,
    slug: 'veludo-molhado-encorpado',
    name: 'Veludo Molhado Encorpado',
    material: 'Poliéster',
    categorySlug: 'aviamentos',
    price: 96,
    tag: 'Novo',
    colors: ['#e6dde9', '#d0bcda'],
    description:
      'Veludo de toque macio e boa cobertura, excelente para estofados e almofadas decorativas.',
    colorOptions: [
      { label: 'Lilás', hex: '#d0bcda' },
      { label: 'Marinho Escuro', hex: '#131047' },
      { label: 'Marrom', hex: '#4a2a2a' },
      { label: 'Preto', hex: '#1a1a1a' },
    ],
    composition: 'Poliéster 100% · Largura 1,40m',
  },
  {
    id: 7,
    slug: 'voil-leve-transparente',
    name: 'Voil Leve Transparente',
    material: 'Poliéster',
    categorySlug: 'algodoes',
    price: 28,
    colors: ['#eceae2', '#dcd8c8'],
    description: 'Voil leve e transparente, indicado para cortinas e sobreposições delicadas.',
    colorOptions: [
      { label: 'Areia', hex: '#dcd8c8' },
      { label: 'Branco', hex: '#ffffff' },
      { label: 'Rosa Claro', hex: '#e3c9c0' },
      { label: 'Azul Gelo', hex: '#cfe0e0' },
    ],
    composition: 'Poliéster 100% · Largura 2,80m',
  },
  {
    id: 8,
    slug: 'ziper-invisivel-20cm',
    name: 'Zíper Invisível 20cm',
    material: 'Aviamento',
    categorySlug: 'aviamentos',
    price: 6.9,
    colors: ['#e4e4e4', '#d0d0d0'],
    description:
      'Zíper invisível de alta durabilidade, disponível em diversas cores para acabamento profissional.',
    colorOptions: [
      { label: 'Cinza', hex: '#d0d0d0' },
      { label: 'Preto', hex: '#1a1a1a' },
      { label: 'Vermelho', hex: '#c13a2e' },
      { label: 'Índigo', hex: '#1c1a5e' },
    ],
    composition: 'Nylon · 20cm',
  },
  {
    id: 9,
    slug: 'renda-guipure-branca',
    name: 'Renda Guipure Branca',
    material: 'Renda',
    categorySlug: 'rendas',
    price: 84,
    tag: 'Premium',
    colors: ['#f2efe8', '#e6e0d0'],
    description:
      'Renda guipure artesanal, delicada e resistente, perfeita para enxovais e vestidos de festa.',
    colorOptions: [
      { label: 'Bege', hex: '#e6e0d0' },
      { label: 'Cru', hex: '#eee6d6' },
      { label: 'Nude', hex: '#d4b8a0' },
      { label: 'Lilás Acinzentado', hex: '#c9c5e2' },
    ],
    composition: 'Poliéster 100% · Largura 90cm',
  },
]
