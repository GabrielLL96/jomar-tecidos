import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, KeyRound, Pencil, UserCheck, UserX } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useAdminUsers, useUserAddresses } from '@/features/users/hooks'
import {
  ROLE_LABELS,
  STAFF_ROLES,
  USER_STATUS_LABELS,
  USER_STATUS_STYLES,
} from '@/features/users/data'
import type { UserRole } from '@/features/auth/types'
import type { AdminUser, UserStatus } from '@/features/users/types'

const ALL_ROLES = 'all'
const ALL_STATUSES = 'all'

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

  const [tab, setTab] = useState<'clientes' | 'equipe'>('clientes')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES)
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES)

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('customer')
  const [editStatus, setEditStatus] = useState<UserStatus>('active')
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [isCreating, setIsCreating] = useState(false)

  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isSettingPassword, setIsSettingPassword] = useState(false)

  const [deactivateUser, setDeactivateUser] = useState<AdminUser | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const [detailUser, setDetailUser] = useState<AdminUser | null>(null)
  const { data: addresses = [], isLoading: isLoadingAddresses } = useUserAddresses(
    detailUser?.id ?? '',
    !!detailUser,
  )

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      const inTab = tab === 'clientes' ? user.role === 'customer' : user.role !== 'customer'
      if (!inTab) return false
      if (query) {
        const matches =
          user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
        if (!matches) return false
      }
      if (roleFilter !== ALL_ROLES && user.role !== roleFilter) return false
      if (statusFilter !== ALL_STATUSES && user.status !== statusFilter) return false
      return true
    })
  }, [users, tab, search, roleFilter, statusFilter])

  const openEdit = (user: AdminUser) => {
    setEditingUser(user)
    setEditRole(user.role)
    setEditStatus(user.status)
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: editRole, status: editStatus })
        .eq('id', editingUser.id)
      if (error) throw new Error(error.message)
      toast.success(`${editingUser.name} atualizado`)
      setEditingUser(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o usuário')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendPasswordReset = async (email: string) => {
    setIsSendingReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw new Error(error.message)
      toast.success(`E-mail de redefinição enviado para ${email}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o e-mail')
    } finally {
      setIsSendingReset(false)
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
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as typeof tab)}
        className="mb-[18px]"
      >
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="equipe">Equipe interna</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-[18px] flex flex-col gap-2.5 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-white sm:w-[260px]"
          />
          {tab === 'equipe' && (
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full bg-white sm:w-[160px]">
                <SelectValue placeholder="Papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ROLES}>Todos papéis</SelectItem>
                {STAFF_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              filteredUsers.map((user) => {
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
                        {tab === 'clientes' && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => setDetailUser(user)}
                            title="Ver detalhes"
                          >
                            <Eye className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => openEdit(user)}
                          title="Editar"
                        >
                          <Pencil className="size-4" />
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

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar — {editingUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Papel</Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as UserRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['customer', ...STAFF_ROLES] as UserRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select
                value={editStatus}
                onValueChange={(value) => setEditStatus(value as UserStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 border-t border-[#ede8de] pt-4">
              <Label>Senha</Label>
              <p className="text-text-meta text-xs">
                Envia um e-mail de redefinição real via Supabase Auth — não existe senha temporária
                configurável por aqui.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => editingUser && handleSendPasswordReset(editingUser.email)}
                disabled={isSendingReset}
              >
                {isSendingReset ? 'Enviando…' : 'Enviar redefinição de senha'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Salvando…' : 'Salvar'}
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

      <AlertDialog open={!!deactivateUser} onOpenChange={(open) => !open && setDeactivateUser(null)}>
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

      <Dialog open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-text-meta text-[11.5px]">E-mail</div>
              <div className="text-[13.5px]">{detailUser?.email}</div>
            </div>
            {detailUser?.phone && (
              <div>
                <div className="text-text-meta text-[11.5px]">Telefone</div>
                <div className="text-[13.5px]">{detailUser.phone}</div>
              </div>
            )}

            <div>
              <div className="text-navy-dark mb-2 text-[13.5px] font-semibold">Endereços</div>
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

            <div>
              <div className="text-navy-dark mb-2 text-[13.5px] font-semibold">
                Pedidos e favoritos
              </div>
              <p className="text-text-meta text-sm">
                Sem dado real disponível — pedidos e favoritos hoje são simulados localmente no
                navegador de cada cliente, não chegam ao servidor.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
