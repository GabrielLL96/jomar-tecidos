export interface IntegrationLog {
  id: string
  integration: string
  operation: string
  direction: string
  relatedEntity: string | null
  relatedEntityId: string | null
  requestSummary: Record<string, unknown> | null
  responseSummary: Record<string, unknown> | null
  statusHttp: number | null
  status: string
  errorMessage: string | null
  durationMs: number | null
  environment: string
  createdAt: string
}
