import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { accountDataSchema, type AccountDataInput } from '@/features/auth/schema'

export function AccountDataPage() {
  const { user, updateProfile } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountDataInput>({
    resolver: zodResolver(accountDataSchema),
    defaultValues: { name: user?.name, email: user?.email, phone: user?.phone ?? '', password: '' },
  })

  if (!user) return null

  const onSubmit = ({ name, email, phone }: AccountDataInput) => {
    updateProfile({ name, email, phone })
    toast.success('Dados atualizados com sucesso')
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-border flex max-w-(--breakpoint-sm) flex-col gap-4 rounded-md border bg-white p-7"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" placeholder="(35) 99999-0000" {...register('phone')} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
        {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="mt-1.5 h-auto w-fit rounded-sm px-6 py-3 text-[13.5px]">
        Salvar alterações
      </Button>
    </form>
  )
}
