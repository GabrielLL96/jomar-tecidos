export function buildCSV(headers: string[], rows: string[][]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = rows.map((row) => row.map(escape).join(','))
  return [headers.map(escape).join(','), ...lines].join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
