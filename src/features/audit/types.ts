export interface ActivityLog {
  id: string
  userId: string | null
  userEmail: string | null
  action: string
  entity: string | null
  entityId: string | null
  dataBefore: Record<string, unknown> | null
  dataAfter: Record<string, unknown> | null
  status: string
  errorMessage: string | null
  details: string | null
  createdAt: string
}
