import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSecureStorage } from '@/hooks/useSecureStorage'
import { MOCK_ADDRESSES } from './data'
import type { Address } from './types'
import type { AddressInput } from './schema'

const ADDRESSES_STORAGE_KEY = 'jomar:addresses'

interface AddressesContextValue {
  addresses: Address[]
  addOrFindAddress: (input: AddressInput) => Address
}

const AddressesContext = createContext<AddressesContextValue | null>(null)

export function AddressesProvider({ children }: { children: ReactNode }) {
  const { getItem, setItem } = useSecureStorage()
  const [addresses, setAddresses] = useState<Address[]>(
    () => getItem<Address[]>(ADDRESSES_STORAGE_KEY, null) ?? MOCK_ADDRESSES,
  )

  const persist = (next: Address[]) => {
    setAddresses(next)
    setItem(ADDRESSES_STORAGE_KEY, next)
  }

  const addOrFindAddress: AddressesContextValue['addOrFindAddress'] = (input) => {
    const existing = addresses.find(
      (address) => address.street === input.street && address.zipCode === input.zipCode,
    )
    if (existing) return existing

    const newAddress: Address = { ...input, id: crypto.randomUUID(), isDefault: addresses.length === 0 }
    persist([...addresses, newAddress])
    return newAddress
  }

  return (
    <AddressesContext.Provider value={{ addresses, addOrFindAddress }}>{children}</AddressesContext.Provider>
  )
}

export function useAddresses() {
  const context = useContext(AddressesContext)
  if (!context) throw new Error('useAddresses deve ser usado dentro de um AddressesProvider')
  return context
}
