import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { downloadCSV, buildCSV } from '@/lib/csv'
import { toDateOnly } from '@/lib/format'
import { useIntegrationLogs, useIntegrationStats } from '@/features/integration-logs/hooks'
import { ALL_FILTER, INTEGRATION_LOGS_PAGE_SIZE, type IntegrationLogFilters } from '@/features/integration-logs/queries'
import {
  ENVIRONMENT_LABELS,
  INTEGRATION_LABELS,
  INTEGRATION_STATUS_LABELS,
  INTEGRATION_STATUS_STYLES,
  OPERATION_LABELS,
} from '@/features/integration-logs/data'
import type { IntegrationLog } from '@/features/integration-logs/types'

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const percentFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const DEFAULT_FILTERS: IntegrationLogFilters = {
  page: 0,
  integration: ALL_FILTER,
  status: ALL_FILTER,
  environment: ALL_FILTER,
  operation: ALL_FILTER,
  dateFrom: '',
  dateTo: '',
}

function buildIntegrationLogCSV(logs: IntegrationLog[]): string {
  return buildCSV(
    ['Data/Hora', 'Integração', 'Operação', 'Direção', 'Status', 'HTTP', 'Duração (ms)', 'Ambiente', 'Erro'],
    logs.map((log) => [
      new Date(log.createdAt).toLocaleString('pt-BR'),
      INTEGRATION_LABELS[log.integration] ?? log.integration,
      OPERATION_LABELS[log.operation] ?? log.operation,
      log.direction,
      INTEGRATION_STATUS_LABELS[log.status] ?? log.status,
      log.statusHttp != null ? String(log.statusHttp) : '',
      log.durationMs != null ? String(log.durationMs) : '',
      ENVIRONMENT_LABELS[log.environment] ?? log.environment,
      log.errorMessage ?? '',
    ]),
  )
}

export function AdminIntegrationLogPage() {
  const [filters, setFilters] = useState<IntegrationLogFilters>(DEFAULT_FILTERS)
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null)

  const { data: stats = [] } = useIntegrationStats()
  const { data, isLoading, isFetching } = useIntegrationLogs(filters)
  const rows = data?.rows ?? []
  const count = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(count / INTEGRATION_LOGS_PAGE_SIZE))

  const updateFilter = <K extends keyof IntegrationLogFilters>(key: K, value: IntegrationLogFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? (value as number) : 0 }))
  }

  const hasActiveFilters =
    filters.integration !== ALL_FILTER ||
    filters.status !== ALL_FILTER ||
    filters.environment !== ALL_FILTER ||
    filters.operation !== ALL_FILTER ||
    filters.dateFrom !== '' ||
    filters.dateTo !== ''

  return (
    <div>
      {stats.length > 0 && (
        <div className="mb-[22px] grid grid-cols-1 gap-[18px] sm:grid-cols-2">
          {stats.map((stat) => (
            <div key={stat.integration} className="rounded-md border border-[#e4ddd0] bg-white p-5">
              <div className="text-xs text-[#8c8375]">
                {INTEGRATION_LABELS[stat.integration] ?? stat.integration} — últimas 24h
              </div>
              <div className="mt-1.5 flex items-baseline gap-4">
                <div>
                  <div
                    className={cn(
                      'font-serif text-2xl font-semibold',
                      stat.errorRatePct > 0 ? 'text-[#b0362b]' : 'text-navy-dark',
                    )}
                  >
                    {percentFormatter.format(stat.errorRatePct)}%
                  </div>
                  <div className="text-[11px] text-[#8c8375]">
                    taxa de erro ({stat.failureCountLast24h}/{stat.totalLast24h})
                  </div>
                </div>
                <div>
                  <div className="text-navy-dark font-serif text-2xl font-semibold">
                    {stat.avgDurationMs != null ? `${stat.avgDurationMs}ms` : '—'}
                  </div>
                  <div className="text-[11px] text-[#8c8375]">tempo médio</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-[18px] flex flex-col gap-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <Select value={filters.integration} onValueChange={(value) => updateFilter('integration', value)}>
            <SelectTrigger className="w-full bg-white sm:w-[170px]">
              <SelectValue placeholder="Integração" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>Todas integrações</SelectItem>
              {Object.entries(INTEGRATION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.operation} onValueChange={(value) => updateFilter('operation', value)}>
            <SelectTrigger className="w-full bg-white sm:w-[190px]">
              <SelectValue placeholder="Operação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>Todas operações</SelectItem>
              {Object.entries(OPERATION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
            <SelectTrigger className="w-full bg-white sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>Todos status</SelectItem>
              {Object.entries(INTEGRATION_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.environment} onValueChange={(value) => updateFilter('environment', value)}>
            <SelectTrigger className="w-full bg-white sm:w-[140px]">
              <SelectValue placeholder="Ambiente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>Todos ambientes</SelectItem>
              {Object.entries(ENVIRONMENT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              downloadCSV(buildIntegrationLogCSV(rows), `logs-integracao-${toDateOnly(new Date())}.csv`)
            }
            disabled={rows.length === 0}
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
              <TableHead>Integração</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Entidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>Carregando…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <p className="text-text-meta text-sm">
                    {hasActiveFilters
                      ? 'Nenhum log encontrado para os filtros aplicados.'
                      : 'Nenhuma chamada registrada ainda.'}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setFilters(DEFAULT_FILTERS)}>
                      Limpar filtros
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((log) => (
                <TableRow key={log.id} className="cursor-pointer" onClick={() => setSelectedLog(log)}>
                  <TableCell className="whitespace-nowrap">
                    {dateTimeFormatter.format(new Date(log.createdAt))}
                  </TableCell>
                  <TableCell>{INTEGRATION_LABELS[log.integration] ?? log.integration}</TableCell>
                  <TableCell>{OPERATION_LABELS[log.operation] ?? log.operation}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                        INTEGRATION_STATUS_STYLES[log.status] ?? 'bg-[#ede8de] text-[#5c5648]',
                      )}
                    >
                      {INTEGRATION_STATUS_LABELS[log.status] ?? log.status}
                    </span>
                  </TableCell>
                  <TableCell>{log.durationMs != null ? `${log.durationMs}ms` : '—'}</TableCell>
                  <TableCell onClick={(event) => log.relatedEntity === 'orders' && event.stopPropagation()}>
                    {log.relatedEntity === 'orders' && log.relatedEntityId ? (
                      <Link to={`/admin/vendas/${log.relatedEntityId}`} className="text-brand-red underline">
                        Ver pedido
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {count > 0 && (
        <div className="mt-4 flex items-center justify-between text-[13px] text-[#5c5648]">
          <span>
            {count} {count === 1 ? 'registro' : 'registros'} — página {filters.page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === 0 || isFetching}
              onClick={() => updateFilter('page', filters.page - 1)}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page + 1 >= totalPages || isFetching}
              onClick={() => updateFilter('page', filters.page + 1)}
            >
              Próxima
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {selectedLog && (INTEGRATION_LABELS[selectedLog.integration] ?? selectedLog.integration)} —{' '}
              {selectedLog && (OPERATION_LABELS[selectedLog.operation] ?? selectedLog.operation)}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="flex flex-col gap-3 text-[13px]">
              <p className="text-text-meta text-[12.5px]">
                {dateTimeFormatter.format(new Date(selectedLog.createdAt))} ·{' '}
                {ENVIRONMENT_LABELS[selectedLog.environment] ?? selectedLog.environment} ·{' '}
                {selectedLog.direction === 'inbound' ? 'recebido' : 'enviado'}
                {selectedLog.statusHttp != null ? ` · HTTP ${selectedLog.statusHttp}` : ''}
                {selectedLog.durationMs != null ? ` · ${selectedLog.durationMs}ms` : ''}
              </p>
              {selectedLog.relatedEntity === 'orders' && selectedLog.relatedEntityId && (
                <Link
                  to={`/admin/vendas/${selectedLog.relatedEntityId}`}
                  className="text-brand-red text-[12.5px] underline"
                >
                  Ver pedido relacionado
                </Link>
              )}
              {selectedLog.errorMessage && (
                <div>
                  <p className="mb-1 font-semibold text-[#b0362b]">Erro</p>
                  <p className="rounded-md border border-[#f0c9a8] bg-[#fbeed4] p-3 break-words">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}
              {selectedLog.requestSummary && (
                <div>
                  <p className="mb-1 font-semibold text-[#5c5648]">Requisição (resumo)</p>
                  <pre className="overflow-x-auto rounded-md border border-[#e4ddd0] bg-[#faf8f3] p-3 text-[11.5px] whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.requestSummary, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.responseSummary && (
                <div>
                  <p className="mb-1 font-semibold text-[#5c5648]">Resposta (resumo)</p>
                  <pre className="overflow-x-auto rounded-md border border-[#e4ddd0] bg-[#faf8f3] p-3 text-[11.5px] whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.responseSummary, null, 2)}
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
