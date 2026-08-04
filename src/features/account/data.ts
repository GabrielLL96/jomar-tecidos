import type { Address } from './types'

export const MOCK_ADDRESSES: Address[] = [
  {
    id: 'addr-1',
    label: 'Casa',
    street: 'Tv Joaquim Bernardes, 25 - Centro',
    city: 'Pouso Alegre',
    state: 'MG',
    zipCode: '37550-106',
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'Ateliê',
    street: 'Rua das Costureiras, 140 - Centro',
    city: 'Pouso Alegre',
    state: 'MG',
    zipCode: '37550-020',
    isDefault: false,
  },
]
