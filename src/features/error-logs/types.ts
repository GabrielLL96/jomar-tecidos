export interface ErrorLog {
  id: string
  userId: string | null
  userEmail: string | null
  message: string
  stack: string | null
  source: string
  url: string | null
  userAgent: string | null
  context: Record<string, unknown> | null
  createdAt: string
}
