import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { buildCSV, downloadCSV } from '@/lib/csv'
import { toDateOnly } from '@/lib/format'
import { useUnifiedLogs } from '@/features/logs-overview/hooks'
import { ALL_KINDS, LOGS_PAGE_SIZE, type UnifiedLogFilters } from '@/features/logs-overview/queries'
import type { UnifiedLogEntry } from '@/features/logs-overview/types'
import {
  ACTION_LABELS,
  ACTION_STYLES,
  AUDIT_STATUS_LABELS,
  AUDIT_STATUS_STYLES,
  ENTITY_LABELS,
} from '@/features/audit/data'
import { diffFields, formatDiffValue } from '@/features/audit/utils'
import { SOURCE_LABELS } from '@/features/error-logs/data'

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})
const ORDER_LINKED_ENTITIES = new Set(['orders', 'refunds', 'order_payments'])

const DEFAULT_FILTERS: UnifiedLogFilters = {
  kind: ALL_KINDS,
  search: '',
  dateFrom: '',
  dateTo: '',
}

function summaryFor(entry: UnifiedLogEntry): string {
  if (entry.kind === 'activity') return entry.raw.details ?? '—'
  return entry.raw.message
}

function badgeFor(entry: UnifiedLogEntry): { label: string; style: string } {
  if (entry.kind === 'activity') {
    return {
      label: ACTION_LABELS[entry.raw.action] ?? entry.raw.action,
      style: ACTION_STYLES[entry.raw.action] ?? 'bg-[#ede8de] text-[#5c5648]',
    }
  }
  return {
    label: SOURCE_LABELS[entry.raw.source] ?? entry.raw.source,
    style: 'bg-[#f8dede] text-[#b0362b]',
  }
}

function statusFor(entry: UnifiedLogEntry): { label: string; style: string } {
  if (entry.kind === 'activity') {
    return {
      label: AUDIT_STATUS_LABELS[entry.raw.status] ?? entry.raw.status,
      style: AUDIT_STATUS_STYLES[entry.raw.status] ?? 'bg-[#ede8de] text-[#5c5648]',
    }
  }
  return { label: 'Erro', style: 'bg-[#f8dede] text-[#b0362b]' }
}

function buildUnifiedLogCSV(entries: UnifiedLogEntry[]): string {
  return buildCSV(
    ['Data/Hora', 'Tipo', 'Usuário', 'Categoria', 'Status', 'Resumo'],
    entries.map((entry) => [
      new Date(entry.createdAt).toLocaleString('pt-BR'),
      entry.kind === 'activity' ? 'Atividade' : 'Erro',
      entry.userEmail ?? '—',
      badgeFor(entry).label,
      statusFor(entry).label,
      summaryFor(entry),
    ]),
  )
}

export function AdminLogsPage() {
  const [filters, setFilters] = useState<UnifiedLogFilters>(DEFAULT_FILTERS)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<UnifiedLogEntry | null>(null)

  const { data: entries = [], isLoading } = useUnifiedLogs(filters)

  const totalPages = Math.max(1, Math.ceil(entries.length / LOGS_PAGE_SIZE))
  const pageRows = useMemo(
    () => entries.slice(page * LOGS_PAGE_SIZE, page * LOGS_PAGE_SIZE + LOGS_PAGE_SIZE),
    [entries, page],
  )

  const updateFilter = <K extends keyof UnifiedLogFilters>(key: K, value: UnifiedLogFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(0)
  }

  const hasActiveFilters =
    filters.kind !== ALL_KINDS ||
    filters.search !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== ''

  return (
    <div>
      <div className="mb-[18px] flex flex-col gap-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <Select
            value={filters.kind}
            onValueChange={(value) => updateFilter('kind', value as UnifiedLogFilters['kind'])}
          >
            <SelectTrigger className="w-full bg-white sm:w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_KINDS}>Todos os tipos</SelectItem>
              <SelectItem value="activity">Atividade</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Buscar por e-mail ou mensagem…"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            className="w-full bg-white sm:w-[240px]"
          />
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
            className="w-full bg-white sm:w-[150px]"
            aria-label="De"
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
            className="w-full bg-white sm:w-[150px]"
            aria-label="Até"
          />
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() =>
              downloadCSV(buildUnifiedLogCSV(pageRows), `logs-${toDateOnly(new Date())}.csv`)
            }
            disabled={pageRows.length === 0}
          >
            <Download className="size-4" />
            Exportar CSV (página atual)
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-[#e4ddd0] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resumo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>Carregando…</TableCell>
              </TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <p className="text-text-meta text-sm">
                    {hasActiveFilters
                      ? 'Nenhum registro para os filtros aplicados.'
                      : 'Nenhum registro ainda.'}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setFilters(DEFAULT_FILTERS)
                        setPage(0)
                      }}
                    >
                      Limpar filtros
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((entry) => {
                const badge = badgeFor(entry)
                const status = statusFor(entry)
                const entityId = entry.kind === 'activity' ? entry.raw.entityId : null
                const entity = entry.kind === 'activity' ? entry.raw.entity : null
                return (
                  <TableRow
                    key={`${entry.kind}-${entry.id}`}
                    className="cursor-pointer"
                    onClick={() => setSelected(entry)}
                  >
                    <TableCell className="whitespace-nowrap">
                      {dateTimeFormatter.format(new Date(entry.createdAt))}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                          entry.kind === 'activity'
                            ? 'bg-[#e4e8fb] text-[#1c1a5e]'
                            : 'bg-[#fbeed4] text-[#8c5a0a]',
                        )}
                      >
                        {entry.kind === 'activity' ? 'Atividade' : 'Erro'}
                      </span>
                    </TableCell>
                    <TableCell>{entry.userEmail ?? '—'}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                          badge.style,
                        )}
                      >
                        {badge.label}
                      </span>
                      {entry.kind === 'activity' && entity && (
                        <div className="text-text-meta mt-0.5 text-[11px]">
                          {ENTITY_LABELS[entity] ?? entity}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                          status.style,
                        )}
                      >
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-meta max-w-[320px] truncate">
                      {summaryFor(entry)}
                      {entity && ORDER_LINKED_ENTITIES.has(entity) && entityId && (
                        <Link
                          to={`/admin/vendas/${entityId}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-brand-red mt-0.5 block underline"
                        >
                          Ver pedido
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {entries.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-[13px] text-[#5c5648]">
          <span>
            {entries.length} {entries.length === 1 ? 'registro' : 'registros'} — página {page + 1}{' '}
            de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selected && badgeFor(selected).label}</DialogTitle>
          </DialogHeader>
          {selected && selected.kind === 'activity' && (
            <div className="flex flex-col gap-3">
              <p className="text-text-meta text-[12.5px]">
                {selected.userEmail ?? 'Sistema'} ·{' '}
                {dateTimeFormatter.format(new Date(selected.createdAt))} · ID{' '}
                <span className="font-mono">{selected.raw.entityId}</span>
              </p>
              {selected.raw.entity &&
                ORDER_LINKED_ENTITIES.has(selected.raw.entity) &&
                selected.raw.entityId && (
                  <Link
                    to={`/admin/vendas/${selected.raw.entityId}`}
                    className="text-brand-red text-[12.5px] underline"
                  >
                    Ver pedido relacionado
                  </Link>
                )}
              <div className="rounded-md border border-[#e4ddd0]">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#e4ddd0] text-left text-[11px] tracking-wide text-[#706657] uppercase">
                      <th className="px-3 py-2 font-semibold">Campo</th>
                      <th className="px-3 py-2 font-semibold">Antes</th>
                      <th className="px-3 py-2 font-semibold">Depois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffFields(selected.raw.dataBefore, selected.raw.dataAfter).map((field) => (
                      <tr
                        key={field.key}
                        className={cn(
                          'border-b border-[#ede8de] last:border-0',
                          field.changed && 'bg-[#fbeed4]',
                        )}
                      >
                        <td className="px-3 py-2 font-medium text-[#5c5648]">{field.key}</td>
                        <td className="px-3 py-2 text-[#706657]">
                          {formatDiffValue(field.before)}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2',
                            field.changed && 'font-semibold text-[#1c1a5e]',
                          )}
                        >
                          {formatDiffValue(field.after)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {selected && selected.kind === 'error' && (
            <div className="flex flex-col gap-3 text-[13px]">
              <p className="text-text-meta text-[12.5px]">
                {selected.userEmail ?? 'Visitante'} ·{' '}
                {dateTimeFormatter.format(new Date(selected.createdAt))}
              </p>
              <div>
                <p className="mb-1 font-semibold text-[#5c5648]">Mensagem</p>
                <p className="rounded-md border border-[#e4ddd0] bg-[#faf8f3] p-3 break-words">
                  {selected.raw.message}
                </p>
              </div>
              {selected.raw.url && (
                <div>
                  <p className="mb-1 font-semibold text-[#5c5648]">Página</p>
                  <p className="text-text-meta break-all">{selected.raw.url}</p>
                </div>
              )}
              {selected.raw.stack && (
                <div>
                  <p className="mb-1 font-semibold text-[#5c5648]">Stack</p>
                  <pre className="overflow-x-auto rounded-md border border-[#e4ddd0] bg-[#faf8f3] p-3 text-[11.5px] whitespace-pre-wrap">
                    {selected.raw.stack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
