export const ACTION_LABELS: Record<string, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  login: 'Login',
  logout: 'Logout',
}

export const ACTION_STYLES: Record<string, string> = {
  create: 'bg-[#e2f2e6] text-[#1e7a44]',
  update: 'bg-[#e4e8fb] text-[#1c1a5e]',
  delete: 'bg-[#f8dede] text-[#b0362b]',
  login: 'bg-[#ede8de] text-[#5c5648]',
  logout: 'bg-[#ede8de] text-[#5c5648]',
}

export const ENTITY_LABELS: Record<string, string> = {
  products: 'Produtos',
  orders: 'Pedidos',
  order_items: 'Itens de pedido',
  users: 'Usuários',
  compositions: 'Composições',
  coupons: 'Cupons',
  deliveries: 'Entregas',
  stock_movements: 'Estoque',
  refunds: 'Reembolsos',
  order_payments: 'Cobranças',
  usuarios_admin: 'Usuários admin',
}

export const AUDIT_STATUS_LABELS: Record<string, string> = {
  success: 'Sucesso',
  failure: 'Falha',
}

export const AUDIT_STATUS_STYLES: Record<string, string> = {
  success: 'bg-[#e2f2e6] text-[#1e7a44]',
  failure: 'bg-[#f8dede] text-[#b0362b]',
}
