import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, KeyRound, UserCheck, UserX } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { unwrapFunctionError } from '@/lib/edge-functions'
import { useAdminUsers } from '@/features/users/hooks'
import {
  ROLE_LABELS,
  STAFF_ROLES,
  USER_STATUS_LABELS,
  USER_STATUS_STYLES,
} from '@/features/users/data'
import type { AdminUser } from '@/features/users/types'

const ALL_ROLES = 'all'
// Bucket "Equipe interna" = qualquer papel != customer, de uma vez — sem
// isso, achar alguém da equipe exige saber o papel exato dele de antemão
// (Vendas? Estoque?) só pra filtrar. Convive com os papéis individuais no
// mesmo dropdown, não é uma segunda dimensão de filtro.
const STAFF_GROUP = 'staff'
const ALL_STATUSES = 'all'
// Paginação client-side — achado da auditoria LGPD (item de listagem de
// dado pessoal sem limite): useAdminUsers() já busca tudo de uma vez, isso
// só corta o que é renderizado na tabela por página.
const PAGE_SIZE = 20

type CreatableRole = 'customer' | 'admin'

const EMPTY_CREATE_FORM = {
  name: '',
  email: '',
  role: 'customer' as CreatableRole,
  password: '',
  confirmPassword: '',
}

const lastLoginFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function AdminUsersPage() {
  const { data: users = [], isLoading } = useAdminUsers()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES)
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES)
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [isCreating, setIsCreating] = useState(false)

  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isSettingPassword, setIsSettingPassword] = useState(false)

  const [deactivateUser, setDeactivateUser] = useState<AdminUser | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      if (roleFilter === STAFF_GROUP) {
        if (user.role === 'customer') return false
      } else if (roleFilter !== ALL_ROLES && user.role !== roleFilter) {
        return false
      }
      if (query) {
        const matches =
          user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
        if (!matches) return false
      }
      if (statusFilter !== ALL_STATUSES && user.status !== statusFilter) return false
      return true
    })
  }, [users, search, roleFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  // Guarda por identidade (padrão já usado no projeto pra ajustar state
  // durante o render) — se o filtro mudou e a página atual ficou fora do
  // intervalo válido, volta pra página 1 sem precisar de useEffect.
  if (page > totalPages) setPage(totalPages)
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/conta/redefinir-senha`,
      })
      if (error) throw new Error(error.message)
      toast.success(`E-mail de redefinição enviado para ${email}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o e-mail')
    }
  }

  // Cliente sempre recebe por e-mail (não existe senha temporária
  // configurável) — equipe/staff pode ter a senha definida direto pelo
  // admin, exceção deliberada só pra contas internas. Mesmo ícone/posição
  // na tabela, comportamento diferente por papel.
  const openPasswordAction = (user: AdminUser) => {
    if (user.role === 'customer') {
      void handleSendPasswordReset(user.email)
      return
    }
    setPasswordUser(user)
    setNewPassword('')
    setConfirmNewPassword('')
  }

  const handleSetPassword = async () => {
    if (!passwordUser) return
    if (newPassword.length < 6) {
      toast.error('A senha deve ter ao menos 6 caracteres')
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setIsSettingPassword(true)
    try {
      const { error } = await supabase.functions.invoke('admin-set-password', {
        body: { userId: passwordUser.id, password: newPassword },
      })
      if (error) await unwrapFunctionError(error)

      toast.success(`Senha de ${passwordUser.name} atualizada`)
      setPasswordUser(null)
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar a senha')
    } finally {
      setIsSettingPassword(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateUser) return
    setIsDeactivating(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'inactive' })
        .eq('id', deactivateUser.id)
      if (error) throw new Error(error.message)
      toast.success(`${deactivateUser.name} desativado`)
      setDeactivateUser(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível desativar')
    } finally {
      setIsDeactivating(false)
    }
  }

  const handleActivate = async (user: AdminUser) => {
    try {
      const { error } = await supabase.from('users').update({ status: 'active' }).eq('id', user.id)
      if (error) throw new Error(error.message)
      toast.success(`${user.name} ativado`)
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível ativar')
    }
  }

  const setCreateField = <K extends keyof typeof EMPTY_CREATE_FORM>(
    key: K,
    value: (typeof EMPTY_CREATE_FORM)[K],
  ) => setCreateForm((current) => ({ ...current, [key]: value }))

  const handleCreateUser = async () => {
    const name = createForm.name.trim()
    if (!name) {
      toast.error('Informe o nome')
      return
    }
    const email = createForm.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Informe um e-mail válido')
      return
    }
    if (createForm.role === 'admin') {
      if (createForm.password.length < 6) {
        toast.error('A senha deve ter ao menos 6 caracteres')
        return
      }
      if (createForm.password !== createForm.confirmPassword) {
        toast.error('As senhas não coincidem')
        return
      }
    }

    setIsCreating(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          name,
          email,
          role: createForm.role,
          ...(createForm.role === 'admin' ? { password: createForm.password } : {}),
        },
      })
      if (error) await unwrapFunctionError(error)

      toast.success(`${name} criado com sucesso`)
      if (data?.warning) toast.error(data.warning)

      setCreateOpen(false)
      setCreateForm(EMPTY_CREATE_FORM)
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o usuário')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div>
      <div className="mb-[18px] flex flex-col gap-2.5 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="w-full bg-white sm:w-[260px]"
          />
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full bg-white sm:w-[180px]">
              <SelectValue placeholder="Papel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ROLES}>Todos papéis</SelectItem>
              <SelectItem value="customer">{ROLE_LABELS.customer}</SelectItem>
              <SelectItem value={STAFF_GROUP}>Equipe interna (todos)</SelectItem>
              {STAFF_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full bg-white sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>Todos status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="sm:self-start">
          + Novo usuário
        </Button>
      </div>

      <div className="rounded-md border border-[#e4ddd0] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-full">E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último login</TableHead>
              <TableHead className="w-px whitespace-nowrap"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>Carregando…</TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <p className="text-text-meta text-sm">
                    Nenhum usuário encontrado para os filtros aplicados.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => {
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{ROLE_LABELS[user.role]}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                          USER_STATUS_STYLES[user.status],
                        )}
                      >
                        {USER_STATUS_LABELS[user.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt
                        ? lastLoginFormatter.format(new Date(user.lastLoginAt))
                        : 'Nunca'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="icon-sm" asChild title="Ver detalhes">
                          <Link to={`/admin/usuarios/${user.id}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => openPasswordAction(user)}
                          title={
                            user.role === 'customer'
                              ? 'Enviar redefinição de senha por e-mail'
                              : 'Alterar senha'
                          }
                        >
                          <KeyRound className="size-4" />
                        </Button>
                        {user.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => setDeactivateUser(user)}
                            title="Desativar"
                          >
                            <UserX className="size-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => handleActivate(user)}
                            title="Ativar"
                          >
                            <UserCheck className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filteredUsers.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-text-meta">
            {filteredUsers.length} usuário{filteredUsers.length === 1 ? '' : 's'} — página {page} de{' '}
            {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setCreateForm(EMPTY_CREATE_FORM)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="createName">Nome</Label>
              <Input
                id="createName"
                value={createForm.name}
                onChange={(event) => setCreateField('name', event.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="createEmail">E-mail</Label>
              <Input
                id="createEmail"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateField('email', event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Papel</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) => setCreateField('role', value as CreatableRole)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">{ROLE_LABELS.customer}</SelectItem>
                  <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createForm.role === 'admin' ? (
              <div className="flex flex-col gap-2 border-t border-[#ede8de] pt-4">
                <Label htmlFor="createPassword">Senha</Label>
                <Input
                  id="createPassword"
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateField('password', event.target.value)}
                />
                <Label htmlFor="createConfirmPassword">Confirmar senha</Label>
                <Input
                  id="createConfirmPassword"
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(event) => setCreateField('confirmPassword', event.target.value)}
                />
              </div>
            ) : (
              <p className="text-text-meta border-t border-[#ede8de] pt-4 text-xs">
                Um e-mail para definir a senha será enviado automaticamente.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>
              {isCreating ? 'Criando…' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!passwordUser}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordUser(null)
            setNewPassword('')
            setConfirmNewPassword('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar senha — {passwordUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmNewPassword">Confirmar nova senha</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSetPassword} disabled={isSettingPassword}>
              {isSettingPassword ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deactivateUser}
        onOpenChange={(open) => !open && setDeactivateUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar {deactivateUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O status vira "Inativo" nas listagens do admin. Pode reverter a qualquer momento pelo
              botão "Ativar" na mesma linha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleDeactivate()
              }}
              disabled={isDeactivating}
              variant="destructive"
            >
              {isDeactivating ? 'Desativando…' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
