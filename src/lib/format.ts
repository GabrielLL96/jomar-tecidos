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
