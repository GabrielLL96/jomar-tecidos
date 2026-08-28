import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { unwrapFunctionError } from '@/lib/edge-functions'
import { useAuth } from '@/features/auth/AuthContext'
import { useCart } from '@/features/cart/CartContext'
import { useFavorites } from '@/features/favorites/FavoritesContext'
import { useAddresses } from '@/features/account/AddressesContext'
import { useMyOrders } from '@/features/orders/hooks'
import { fetchSavedCards } from '@/features/asaas/service'
import { accountDataSchema, type AccountDataInput } from '@/features/auth/schema'

// Direitos LGPD art. 18 (acesso/portabilidade e eliminação) — achado da
// auditoria (docs/lgpd/auditoria-2026-08-15.md): antes dessa feature, os dois
// direitos só podiam ser atendidos manualmente, direto no banco.
export function AccountDataPage() {
  const navigate = useNavigate()
  const { user, updateProfile, logout } = useAuth()
  const { clear: clearCart } = useCart()
  const { clearFavorites } = useFavorites()
  const { addresses } = useAddresses()
  const { data: orders = [] } = useMyOrders(user?.id)

  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountDataInput>({
    resolver: zodResolver(accountDataSchema),
    defaultValues: { name: user?.name, email: user?.email, phone: user?.phone ?? '', password: '' },
  })

  if (!user) return null

  const onSubmit = async ({ name, email, phone, password }: AccountDataInput) => {
    try {
      await updateProfile({ name, email, phone, ...(password ? { password } : {}) })
      toast.success('Dados atualizados com sucesso')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar os dados')
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const savedCards = await fetchSavedCards()
      const payload = {
        exportadoEm: new Date().toISOString(),
        perfil: { nome: user.name, email: user.email, telefone: user.phone },
        enderecos: addresses,
        pedidos: orders,
        cartoesSalvos: savedCards.map((card) => ({
          ultimosDigitos: card.lastFourDigits,
          bandeira: card.brand,
          salvoEm: card.createdAt,
        })),
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `jomar-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Download iniciado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível exportar os dados')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const { error } = await supabase.functions.invoke('account-delete')
      if (error) await unwrapFunctionError(error)

      clearCart()
      clearFavorites()
      await logout()
      toast.success('Conta encerrada. Seus dados de identificação foram removidos.')
      navigate('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir a conta')
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="flex max-w-(--breakpoint-sm) flex-col gap-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="border-border flex flex-col gap-4 rounded-md border bg-white p-7"
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
        <Button type="submit" className="mt-1.5 h-auto w-fit rounded-sm px-6 py-3 text-sm">
          Salvar alterações
        </Button>
      </form>

      <div className="border-border flex flex-col gap-3 rounded-md border bg-white p-7">
        <div className="text-navy-dark text-sm font-semibold">Seus dados (LGPD)</div>
        <p className="text-text-meta text-xs leading-relaxed">
          Baixe uma cópia de tudo que temos sobre você (cadastro, endereços, pedidos) em formato
          estruturado, conforme o art. 18 da LGPD.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={handleExportData}
          disabled={isExporting}
          className="h-auto w-fit rounded-sm px-6 py-3 text-sm"
        >
          {isExporting ? 'Gerando…' : 'Exportar meus dados'}
        </Button>
      </div>

      <div className="border-destructive/30 flex flex-col gap-3 rounded-md border bg-white p-7">
        <div className="text-destructive text-sm font-semibold">Excluir conta</div>
        <p className="text-text-meta text-xs leading-relaxed">
          Seu nome, e-mail, telefone e CPF são removidos e o login é desativado permanentemente.
          Pedidos já feitos são mantidos (obrigação fiscal), mas deixam de estar associados à sua
          identidade. Essa ação não pode ser desfeita.
        </p>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
          className="h-auto w-fit rounded-sm px-6 py-3 text-sm"
        >
          Excluir minha conta
        </Button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Nome, e-mail, telefone e CPF serão apagados e o login será desativado permanentemente.
              Não é possível desfazer essa ação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleDeleteAccount()
              }}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Excluindo…' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
