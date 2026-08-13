// Algoritmo oficial de dígito verificador de CPF — pega números com formato
// certo (11 dígitos) mas matematicamente inválidos, ex.: 111.111.111-11.
function calcCheckDigit(base: string, startFactor: number): number {
  let total = 0
  let factor = startFactor
  for (const digit of base) {
    total += Number(digit) * factor
    factor -= 1
  }
  const remainder = total % 11
  return remainder < 2 ? 0 : 11 - remainder
}

export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  const firstNine = digits.slice(0, 9)
  const checkDigit1 = calcCheckDigit(firstNine, 10)
  const checkDigit2 = calcCheckDigit(firstNine + checkDigit1, 11)

  return digits === firstNine + String(checkDigit1) + String(checkDigit2)
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
