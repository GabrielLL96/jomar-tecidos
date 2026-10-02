import { useEffect, useState } from 'react'
import { startTotpEnrollment, verifyTotpCode, type TotpEnrollment } from '@/features/auth/mfa'
import { TotpCodeForm } from './TotpCodeForm'

interface MfaEnrollProps {
  onVerified: () => void
}

export function MfaEnroll({ onVerified }: MfaEnrollProps) {
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    startTotpEnrollment().then(
      (result) => active && setEnrollment(result),
      (error: unknown) =>
        active &&
        setErrorMessage(error instanceof Error ? error.message : 'Falha ao iniciar o cadastro'),
    )
    return () => {
      active = false
    }
  }, [])

  if (errorMessage) return <p className="text-destructive text-center text-sm">{errorMessage}</p>
  if (!enrollment) return <p className="text-text-body text-center text-sm">Preparando…</p>

  const handleVerify = async (code: string) => {
    await verifyTotpCode(enrollment.factorId, code)
    onVerified()
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-text-body text-sm leading-relaxed">
        Contas da equipe exigem verificação em duas etapas. Escaneie o QR code com um aplicativo
        autenticador (Google Authenticator, Microsoft Authenticator, 1Password…) e digite o código
        gerado.
      </p>
      <img
        src={enrollment.qrCode}
        alt="QR code para cadastrar o autenticador"
        className="mx-auto size-48 bg-white p-2"
      />
      <p className="text-text-body text-center text-xs break-all">
        Sem câmera? Use a chave: <span className="font-mono">{enrollment.secret}</span>
      </p>
      <TotpCodeForm submitLabel="Ativar verificação em duas etapas" onVerify={handleVerify} />
    </div>
  )
}
