import { createServiceClient } from './melhor-envio.ts'

// Complementa fn_audit_log() (trigger no banco) — usado só onde a escrita
// real acontece via service_role dentro de uma Edge Function, cenário em
// que o trigger nunca consegue recuperar auth.uid() (não há JWT no contexto
// da conexão service_role). Aqui o chamador é resolvido explicitamente
// (createCallerClient + auth.getUser()) ANTES de chamar isto, e passado como
// parâmetro — a única forma de não perder "quem fez" pra essas ações.
export interface LogActivityInput {
  userId: string | null
  userEmail: string | null
  action: 'create' | 'update' | 'delete'
  entity: string
  entityId: string | null
  dataAfter?: Record<string, unknown> | null
  details?: string | null
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('activity_logs').insert({
      user_id: input.userId,
      user_email: input.userEmail,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId,
      data_after: input.dataAfter ?? null,
      details: input.details ?? null,
    })
    if (error) console.error('[activity-logger] falha ao gravar log:', error.message)
  } catch (error) {
    console.error('[activity-logger] falha ao gravar log:', error)
  }
}
