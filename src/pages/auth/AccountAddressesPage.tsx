import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAddresses } from '@/features/account/AddressesContext'
import { addressSchema, type AddressInput } from '@/features/account/schema'

export function AccountAddressesPage() {
  const { addresses, addOrFindAddress } = useAddresses()
  const [showForm, setShowForm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressInput>({ resolver: zodResolver(addressSchema) })

  const onSubmit = (input: AddressInput) => {
    addOrFindAddress(input)
    reset()
    setShowForm(false)
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="h-auto rounded-sm px-5 py-2.5 text-[13px]"
        >
          {showForm ? 'Cancelar' : '+ Novo endereço'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="border-border mb-4 grid grid-cols-1 gap-3.5 rounded-md border bg-white p-5 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Nome do endereço</Label>
            <Input id="label" placeholder="Casa, Trabalho..." {...register('label')} />
            {errors.label && <p className="text-destructive text-xs">{errors.label.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="street">Endereço</Label>
            <Input id="street" {...register('street')} />
            {errors.street && <p className="text-destructive text-xs">{errors.street.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" {...register('city')} />
            {errors.city && <p className="text-destructive text-xs">{errors.city.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="state">UF</Label>
            <Input id="state" maxLength={2} {...register('state')} />
            {errors.state && <p className="text-destructive text-xs">{errors.state.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zipCode">CEP</Label>
            <Input id="zipCode" {...register('zipCode')} />
            {errors.zipCode && <p className="text-destructive text-xs">{errors.zipCode.message}</p>}
          </div>
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" className="h-auto w-full rounded-sm py-2.5 text-[13px] sm:w-fit">
              Salvar endereço
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {addresses.map((address) => (
          <div key={address.id} className="border-border rounded-md border bg-white p-5">
            <div className="text-navy-dark mb-1.5 flex items-center gap-2 text-[13.5px] font-semibold">
              {address.label}
              {address.isDefault && (
                <span className="bg-cream-secondary text-text-meta rounded-sm px-1.5 py-0.5 text-[10px] uppercase">
                  Padrão
                </span>
              )}
            </div>
            <div className="text-text-body text-[13px] leading-relaxed">
              {address.street}
              <br />
              {address.city} - {address.state}, {address.zipCode}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
