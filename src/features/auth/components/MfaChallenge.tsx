import { getVerifiedTotpFactorId, verifyTotpCode } from '@/features/auth/mfa'
import { TOTP_CODE_LENGTH } from '@/features/auth/schema'
import { TotpCodeForm } from './TotpCodeForm'

interface MfaChallengeProps {
  onVerified: () => void
}

export function MfaChallenge({ onVerified }: MfaChallengeProps) {
  const handleVerify = async (code: string) => {
    const factorId = await getVerifiedTotpFactorId()
    await verifyTotpCode(factorId, code)
    onVerified()
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-text-body text-sm leading-relaxed">
        Digite o código de {TOTP_CODE_LENGTH} dígitos do seu aplicativo autenticador para acessar o
        painel.
      </p>
      <TotpCodeForm submitLabel="Verificar" onVerify={handleVerify} />
    </div>
  )
}
