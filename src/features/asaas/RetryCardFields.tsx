import { useState } from 'react'
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CardChargeInput } from './cardChargeSchema'

// Par de CreditCardFields.tsx (checkout) tipado em CardChargeInput em vez de
// CheckoutInput — usado só na retentativa de cobrança da ConfirmationPage,
// onde não existem os campos de entrega do checkout. JSX/máscaras
// deliberadamente duplicados: react-hook-form não generaliza bem entre dois
// schemas distintos sem ginástica de tipos (`Path<T>`) que custa mais do que
// vale pra ~90 linhas idênticas. Ver CreditCardFields.tsx pro par do checkout.
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

interface RetryCardFieldsProps {
  register: UseFormRegister<CardChargeInput>
  setValue: UseFormSetValue<CardChargeInput>
  errors: FieldErrors<CardChargeInput>
}

export function RetryCardFields({ register, setValue, errors }: RetryCardFieldsProps) {
  const [numberDisplay, setNumberDisplay] = useState('')
  const [expiryDisplay, setExpiryDisplay] = useState('')

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="retry-cardHolderName">Nome no cartão</Label>
        <Input
          id="retry-cardHolderName"
          placeholder="Como está no cartão"
          {...register('cardHolderName')}
        />
        {errors.cardHolderName && (
          <p className="text-destructive text-xs">{errors.cardHolderName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="retry-cardNumber">Número do cartão</Label>
        <Input
          id="retry-cardNumber"
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
        {errors.cardNumber && (
          <p className="text-destructive text-xs">{errors.cardNumber.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="retry-cardExpiry">Validade</Label>
          <Input
            id="retry-cardExpiry"
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
          {errors.cardExpiry && (
            <p className="text-destructive text-xs">{errors.cardExpiry.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="retry-cardCvv">CVV</Label>
          <Input
            id="retry-cardCvv"
            inputMode="numeric"
            placeholder="123"
            maxLength={4}
            {...register('cardCvv')}
          />
          {errors.cardCvv && <p className="text-destructive text-xs">{errors.cardCvv.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="retry-cardPostalCode">CEP do titular</Label>
          <Input
            id="retry-cardPostalCode"
            inputMode="numeric"
            placeholder="00000-000"
            {...register('cardPostalCode')}
          />
          {errors.cardPostalCode && (
            <p className="text-destructive text-xs">{errors.cardPostalCode.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="retry-cardAddressNumber">Número</Label>
          <Input id="retry-cardAddressNumber" {...register('cardAddressNumber')} />
          {errors.cardAddressNumber && (
            <p className="text-destructive text-xs">{errors.cardAddressNumber.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="retry-cardAddressComplement">Complemento (opcional)</Label>
        <Input id="retry-cardAddressComplement" {...register('cardAddressComplement')} />
      </div>

      <label className="text-text-body flex items-center gap-2 text-sm">
        <input type="checkbox" className="accent-navy" {...register('saveCard')} />
        Salvar este cartão pra próximas compras
      </label>
    </div>
  )
}
