const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatPriceBRL(value: number) {
  return currencyFormatter.format(value)
}

export function formatDateBR(dateOnly: string) {
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR')
}

// nunca usar toISOString().slice(0,10) pra isso — desloca a data em fuso
// negativo perto da virada do dia (ver _Feedback.md do projeto).
export function toDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
