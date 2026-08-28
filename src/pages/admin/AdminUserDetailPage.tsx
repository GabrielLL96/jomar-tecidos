import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { formatPriceBRL } from '@/lib/format'
import { formatCPF } from '@/lib/cpf'
import { useAdminUser, useAdminUserOrders, useUserAddresses } from '@/features/users/hooks'
import {
  ROLE_LABELS,
  STAFF_ROLES,
  USER_STATUS_LABELS,
  USER_STATUS_STYLES,
} from '@/features/users/data'
import { adminUserEditSchema, type AdminUserEditInput } from '@/features/users/schema'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/features/orders/data'
import type { UserRole } from '@/features/auth/types'
import type { OrderStatus } from '@/features/orders/types'
import type { AdminUser, UserStatus } from '@/features/users/types'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

// Componente à parte (não inline na página) — os valores iniciais do
// formulário e do papel/status vêm direto de `user` no useState, sem
// useEffect. `user` só existe de verdade depois do isLoading/not-found da
// página, então aqui ele já chega garantido — nada pra sincronizar depois.
function UserEditForm({ user }: { user: AdminUser }) {
  const queryClient = useQueryClient()
  const [role, setRole] = useState<UserRole>(user.role)
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminUserEditInput>({
    resolver: zodResolver(adminUserEditSchema),
    defaultValues: { name: user.name, phone: user.phone ?? '' },
  })

  const onSubmit = async (input: AdminUserEditInput) => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: input.name,
          phone: input.phone || null,
          role,
          status,
        })
        .eq('id', user.id)
      if (error) throw new Error(error.message)
      toast.success('Usuário atualizado')
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o usuário')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-md border border-[#e4ddd0] bg-white p-5"
    >
      <div className="flex items-center gap-2.5">
        <h1 className="text-navy-dark font-serif text-xl font-semibold">{user.name}</h1>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
            USER_STATUS_STYLES[status],
          )}
        >
          {USER_STATUS_LABELS[status]}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>E-mail</Label>
        <Input value={user.email} disabled />
        <p className="text-text-meta text-xs">
          E-mail é gerenciado pelo login (Auth) — edição aqui ainda não está disponível.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" placeholder="(35) 99999-0000" {...register('phone')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>CPF</Label>
          <Input value={user.cpf ? formatCPF(user.cpf) : '—'} disabled />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-[#ede8de] pt-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Papel</Label>
          <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['customer', ...STAFF_ROLES] as UserRole[]).map((roleOption) => (
                <SelectItem key={roleOption} value={roleOption}>
                  {ROLE_LABELS[roleOption]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as UserStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(USER_STATUS_LABELS) as UserStatus[]).map((statusOption) => (
                <SelectItem key={statusOption} value={statusOption}>
                  {USER_STATUS_LABELS[statusOption]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-[#ede8de] pt-4 text-xs">
        <span className="text-text-meta">
          Cadastrado em {dateFormatter.format(new Date(user.createdAt))}
          {user.lastLoginAt &&
            ` · último login em ${dateFormatter.format(new Date(user.lastLoginAt))}`}
        </span>
      </div>

      <Button
        type="submit"
        disabled={isSaving}
        className="mt-1.5 h-auto w-fit rounded-sm px-6 py-3 text-sm"
      >
        {isSaving ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  )
}

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const userId = id ?? ''

  const { data: user, isLoading } = useAdminUser(userId)
  const { data: addresses = [], isLoading: isLoadingAddresses } = useUserAddresses(userId, !!userId)
  const { data: orders = [], isLoading: isLoadingOrders } = useAdminUserOrders(userId, !!userId)

  if (isLoading) {
    return <p className="text-text-meta text-sm">Carregando…</p>
  }

  if (!user) {
    return (
      <div>
        <p className="text-text-meta text-sm">Usuário não encontrado.</p>
        <Link to="/admin/usuarios" className="text-navy mt-2 inline-block text-sm hover:underline">
          ← Voltar para Usuários
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/admin/usuarios"
        className="text-navy mb-4 inline-flex items-center gap-1.5 rounded-md border border-[#e4ddd0] bg-white px-3 py-2 text-sm hover:underline"
      >
        <ArrowLeft className="size-3.5" /> Voltar para Usuários
      </Link>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_320px]">
        <UserEditForm key={user.id} user={user} />

        <div className="flex flex-col gap-[18px]">
          <div className="rounded-md border border-[#e4ddd0] bg-white p-5">
            <div className="text-navy-dark mb-3 text-[13.5px] font-semibold">Endereços</div>
            {isLoadingAddresses ? (
              <p className="text-text-meta text-sm">Carregando…</p>
            ) : addresses.length === 0 ? (
              <p className="text-text-meta text-sm">Nenhum endereço cadastrado.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {addresses.map((address) => (
                  <li
                    key={address.id}
                    className="rounded-md border border-[#ede8de] p-3 text-[13px]"
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      {address.label}
                      {address.isDefault && (
                        <span className="rounded-full bg-[#e6e4f5] px-2 py-0.5 text-[10.5px] font-semibold text-[#1c1a5e]">
                          Padrão
                        </span>
                      )}
                    </div>
                    <div className="text-text-meta mt-0.5">
                      {address.street}, {address.city} - {address.state}, {address.zipCode}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border border-[#e4ddd0] bg-white p-5">
            <div className="text-navy-dark mb-3 text-[13.5px] font-semibold">Pedidos</div>
            {isLoadingOrders ? (
              <p className="text-text-meta text-sm">Carregando…</p>
            ) : orders.length === 0 ? (
              <p className="text-text-meta text-sm">Nenhum pedido.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      to={`/admin/vendas/${order.id}`}
                      className="flex items-center justify-between rounded-md border border-[#ede8de] p-3 text-[13px] hover:border-[#d8d0c0]"
                    >
                      <div>
                        <div className="font-medium">#{order.orderNumber}</div>
                        <div className="text-text-meta mt-0.5">
                          {dateFormatter.format(new Date(order.createdAt))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-medium">{formatPriceBRL(order.total)}</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                            ORDER_STATUS_STYLES[order.status as OrderStatus],
                          )}
                        >
                          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
