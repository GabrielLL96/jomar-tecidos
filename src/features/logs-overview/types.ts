import type { ActivityLog } from '@/features/audit/types'
import type { ErrorLog } from '@/features/error-logs/types'

export type UnifiedLogEntry =
  | { kind: 'activity'; id: string; createdAt: string; userEmail: string | null; raw: ActivityLog }
  | { kind: 'error'; id: string; createdAt: string; userEmail: string | null; raw: ErrorLog }
