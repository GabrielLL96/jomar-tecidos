import { useState } from 'react'
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CheckoutInput } from '@/pages/checkout/schema'

// Campos de cartão embutidos no form único do checkout (não é um <form>
// próprio — nested forms não são válidos em HTML). Dado cru só existe no
// state deste form em memória, nunca persistido — vai direto pro body da
// invocação de asaas-charge-card no submit do checkout. Ver decisão que
// reabriu escopo PCI-DSS (SAQ A-EP) em ADR-016.
function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

interface CreditCardFieldsProps {
  register: UseFormRegister<CheckoutInput>
  setValue: UseFormSetValue<CheckoutInput>
  errors: FieldErrors<CheckoutInput>
}

export function CreditCardFields({ register, setValue, errors }: CreditCardFieldsProps) {
  const [numberDisplay, setNumberDisplay] = useState('')
  const [expiryDisplay, setExpiryDisplay] = useState('')

  return (
    <div className="mt-3.5 flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cardHolderName">Nome no cartão</Label>
        <Input id="cardHolderName" placeholder="Como está no cartão" {...register('cardHolderName')} />
        {errors.cardHolderName && <p className="text-destructive text-xs">{errors.cardHolderName.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cardNumber">Número do cartão</Label>
        <Input
          id="cardNumber"
          inputMode="numeric"
          placeholder="0000 0000 0000 0000"
          value={numberDisplay}
          {...register('cardNumber')}
          onChange={(event) => {
            const formatted = formatCardNumber(event.target.value)
            setNumberDisplay(formatted)
            setValue('cardNumber', formatted, { shouldValidate: true })
          }}
        />
        {errors.cardNumber && <p className="text-destructive text-xs">{errors.cardNumber.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cardExpiry">Validade</Label>
          <Input
            id="cardExpiry"
            inputMode="numeric"
            placeholder="MM/AA"
            value={expiryDisplay}
            {...register('cardExpiry')}
            onChange={(event) => {
              const formatted = formatExpiry(event.target.value)
              setExpiryDisplay(formatted)
              setValue('cardExpiry', formatted, { shouldValidate: true })
            }}
          />
          {errors.cardExpiry && <p className="text-destructive text-xs">{errors.cardExpiry.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cardCvv">CVV</Label>
          <Input id="cardCvv" inputMode="numeric" placeholder="123" maxLength={4} {...register('cardCvv')} />
          {errors.cardCvv && <p className="text-destructive text-xs">{errors.cardCvv.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cardPostalCode">CEP do titular</Label>
          <Input id="cardPostalCode" inputMode="numeric" placeholder="00000-000" {...register('cardPostalCode')} />
          {errors.cardPostalCode && <p className="text-destructive text-xs">{errors.cardPostalCode.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cardAddressNumber">Número</Label>
          <Input id="cardAddressNumber" {...register('cardAddressNumber')} />
          {errors.cardAddressNumber && (
            <p className="text-destructive text-xs">{errors.cardAddressNumber.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cardAddressComplement">Complemento (opcional)</Label>
        <Input id="cardAddressComplement" {...register('cardAddressComplement')} />
      </div>

      <label className="text-text-body flex items-center gap-2 text-sm">
        <input type="checkbox" className="accent-navy" {...register('saveCard')} />
        Salvar este cartão pra próximas compras
      </label>
    </div>
  )
}
