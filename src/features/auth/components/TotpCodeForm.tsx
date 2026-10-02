import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { TOTP_CODE_LENGTH, totpCodeSchema, type TotpCodeInput } from '@/features/auth/schema'

interface TotpCodeFormProps {
  submitLabel: string
  onVerify: (code: string) => Promise<void>
}

export function TotpCodeForm({ submitLabel, onVerify }: TotpCodeFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TotpCodeInput>({ resolver: zodResolver(totpCodeSchema) })

  const onSubmit = async ({ code }: TotpCodeInput) => {
    try {
      await onVerify(code)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível verificar o código')
      reset()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="totp-code">Código do aplicativo autenticador</Label>
        <Input
          id="totp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={TOTP_CODE_LENGTH}
          placeholder="000000"
          autoFocus
          {...register('code')}
        />
        {errors.code && <p className="text-destructive text-xs">{errors.code.message}</p>}
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="h-auto rounded-sm py-4 text-sm"
      >
        {isSubmitting ? 'Verificando…' : submitLabel}
      </Button>
    </form>
  )
}
