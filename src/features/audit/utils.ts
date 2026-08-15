import { buildCSV } from '@/lib/csv'
import { ACTION_LABELS, AUDIT_STATUS_LABELS, ENTITY_LABELS } from './data'
import type { ActivityLog } from './types'

export function buildActivityLogCSV(logs: ActivityLog[]): string {
  return buildCSV(
    ['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'Status', 'Detalhes'],
    logs.map((log) => [
      new Date(log.createdAt).toLocaleString('pt-BR'),
      log.userEmail ?? '—',
      ACTION_LABELS[log.action] ?? log.action,
      log.entity ? (ENTITY_LABELS[log.entity] ?? log.entity) : '—',
      AUDIT_STATUS_LABELS[log.status] ?? log.status,
      log.details ?? '',
    ]),
  )
}

export interface DiffField {
  key: string
  before: unknown
  after: unknown
  changed: boolean
}

export function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): DiffField[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  return Array.from(keys)
    .sort()
    .map((key) => {
      const b = before?.[key]
      const a = after?.[key]
      return { key, before: b, after: a, changed: JSON.stringify(b) !== JSON.stringify(a) }
    })
}

export function formatDiffValue(value: unknown): string {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
