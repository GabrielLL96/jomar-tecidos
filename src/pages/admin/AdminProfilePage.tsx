import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { useAuth } from '@/features/auth/AuthContext'
import { disableTotp, totpFactorQueryOptions } from '@/features/auth/mfa'
import { MfaEnroll } from '@/features/auth/components/MfaEnroll'
import { SettingsCard } from './SettingsCard'

function useTotpFactor(userId: string) {
  const queryClient = useQueryClient()
  const query = useQuery(totpFactorQueryOptions(userId))
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['mfa-totp-factor', userId] }),
      queryClient.invalidateQueries({ queryKey: ['mfa-step', userId] }),
    ])
  return { ...query, refresh }
}

interface DisableMfaDialogProps {
  factorId: string
  onDisabled: () => Promise<unknown>
}

function DisableMfaDialog({ factorId, onDisabled }: DisableMfaDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)

  const handleDisable = async () => {
    setIsDisabling(true)
    try {
      await disableTotp(factorId)
      await onDisabled()
      toast.success('Verificação em duas etapas desativada')
      setIsOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível desativar')
    } finally {
      setIsDisabling(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="outline" onClick={() => setIsOpen(true)} className="self-start">
        Desativar
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar verificação em duas etapas?</AlertDialogTitle>
          <AlertDialogDescription>
            O acesso ao painel passa a depender só da senha. Quem descobrir sua senha terá acesso
            total à loja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisabling}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDisable} disabled={isDisabling}>
            {isDisabling ? 'Desativando…' : 'Desativar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function MfaSettings({ userId }: { userId: string }) {
  const { data: factorId, isLoading, error, refresh } = useTotpFactor(userId)
  const [isEnrolling, setIsEnrolling] = useState(false)

  const handleEnrolled = async () => {
    await refresh()
    setIsEnrolling(false)
    toast.success('Verificação em duas etapas ativada')
  }

  if (isLoading) return <p className="text-text-body text-sm">Carregando…</p>
  if (error) return <p className="text-destructive text-sm">{error.message}</p>

  if (factorId) {
    return (
      <>
        <p className="text-text-body text-sm">
          <span className="font-medium text-green-700">Ativa.</span> O painel pede o código do
          aplicativo autenticador a cada login.
        </p>
        <DisableMfaDialog factorId={factorId} onDisabled={refresh} />
      </>
    )
  }

  if (isEnrolling) {
    return (
      <>
        <MfaEnroll onVerified={handleEnrolled} />
        <Button variant="link" onClick={() => setIsEnrolling(false)} className="self-center">
          Cancelar
        </Button>
      </>
    )
  }

  return (
    <>
      <p className="text-text-body text-sm">
        Desativada. Recomendado: com ela ativa, a senha sozinha não dá acesso ao painel.
      </p>
      <Button onClick={() => setIsEnrolling(true)} className="self-start">
        Ativar
      </Button>
    </>
  )
}

export function AdminProfilePage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <SettingsCard title="Dados">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-[#706657]">Nome</dt>
          <dd>{user.name}</dd>
          <dt className="text-[#706657]">E-mail</dt>
          <dd className="break-all">{user.email}</dd>
        </dl>
      </SettingsCard>
      <SettingsCard title="Verificação em duas etapas">
        <MfaSettings userId={user.id} />
      </SettingsCard>
    </div>
  )
}
