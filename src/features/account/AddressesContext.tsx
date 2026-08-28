import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import type { Address } from './types'
import type { AddressInput } from './schema'

interface AddressesContextValue {
  addresses: Address[]
  addOrFindAddress: (input: AddressInput) => Promise<Address>
  setDefaultAddress: (addressId: string) => Promise<void>
}

const AddressesContext = createContext<AddressesContextValue | null>(null)

function adaptAddress(row: {
  id: string
  label: string
  street: string
  city: string
  state: string
  zip_code: string
  is_default: boolean
}): Address {
  return {
    id: row.id,
    label: row.label,
    street: row.street,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    isDefault: row.is_default,
  }
}

export function AddressesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('addresses')
        .select('id, label, street, city, state, zip_code, is_default')
        .eq('user_id', user.id)
      if (error || !data) return []
      return data.map(adaptAddress)
    }

    load().then((result) => {
      if (active) setAddresses(result)
    })

    return () => {
      active = false
    }
  }, [user])

  const addOrFindAddress: AddressesContextValue['addOrFindAddress'] = async (input) => {
    if (!user) throw new Error('Usuário não autenticado')

    const existing = addresses.find(
      (address) => address.street === input.street && address.zipCode === input.zipCode,
    )
    if (existing) return existing

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: user.id,
        label: input.label,
        street: input.street,
        city: input.city,
        state: input.state,
        zip_code: input.zipCode,
        is_default: addresses.length === 0,
      })
      .select('id, label, street, city, state, zip_code, is_default')
      .single()
    if (error) throw new Error(error.message)

    const newAddress = adaptAddress(data)
    setAddresses((current) => [...current, newAddress])
    return newAddress
  }

  // Servidor (trigger fn_enforce_single_default_address) garante que só um
  // endereço fica com is_default=true por usuário — aqui só precisa marcar
  // o escolhido, o resto é desmarcado atomicamente do lado de lá.
  const setDefaultAddress: AddressesContextValue['setDefaultAddress'] = async (addressId) => {
    if (!user) throw new Error('Usuário não autenticado')
    const { error } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', addressId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
    setAddresses((current) =>
      current.map((address) => ({ ...address, isDefault: address.id === addressId })),
    )
  }

  return (
    <AddressesContext.Provider value={{ addresses, addOrFindAddress, setDefaultAddress }}>
      {children}
    </AddressesContext.Provider>
  )
}

export function useAddresses() {
  const context = useContext(AddressesContext)
  if (!context) throw new Error('useAddresses deve ser usado dentro de um AddressesProvider')
  return context
}
