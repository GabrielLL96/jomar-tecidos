import { corsHeaders, createCallerClient, createServiceClient } from '../_shared/melhor-envio.ts'
import { enforceRateLimit } from '../_shared/rate-limit.ts'
import { logActivity } from '../_shared/activity-logger.ts'

// Direito de eliminação/anonimização (LGPD art. 18, IV e VI) — self-service,
// achado da auditoria (docs/lgpd/auditoria-2026-08-15.md). NUNCA apaga a
// linha de `users` de verdade: orders.user_id ... on delete restrict
// impediria de qualquer jeito, e o pedido em si precisa sobreviver por
// obrigação fiscal (mesmo raciocínio já usado pro soft-delete de orders,
// ADR-012). Anonimiza os campos que identificam a pessoa, mantém pedido e
// endereço intactos (registro de venda/entrega), e bloqueia o login de
// verdade via Admin API — sem isso, a conta continuaria acessível com a
// mesma sessão mesmo com o cadastro anonimizado.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autenticado')
    const caller = createCallerClient(authHeader)
    const { data: callerData, error: callerError } = await caller.auth.getUser()
    if (callerError || !callerData.user) throw new Error('Sessão inválida')
    const userId = callerData.user.id

    await enforceRateLimit(userId, 'account-delete', 3, 3600)

    const supabase = createServiceClient()

    const placeholderEmail = `removido-${userId}@jomartecidos.invalid`
    const { error: userError } = await supabase
      .from('users')
      .update({ name: 'Usuário removido', email: placeholderEmail, phone: null, cpf: null, status: 'inactive' })
      .eq('id', userId)
    if (userError) throw new Error(`Falha ao anonimizar cadastro: ${userError.message}`)

    // Avaliação em si continua pública (valor legítimo pra outros
    // clientes decidirem a compra) — só o nome do autor é apagado.
    const { error: reviewsError } = await supabase
      .from('reviews')
      .update({ author_name: 'Usuário removido' })
      .eq('user_id', userId)
    if (reviewsError) console.error('[account-delete] falha ao anonimizar reviews:', reviewsError.message)

    // Token de cartão salvo não tem motivo pra sobreviver ao encerramento
    // da conta.
    const { error: cardsError } = await supabase.from('saved_credit_cards').delete().eq('user_id', userId)
    if (cardsError) console.error('[account-delete] falha ao remover cartões salvos:', cardsError.message)

    // Bloqueia autenticação de verdade — banimento bem longo em vez de
    // exclusão da conta no GoTrue (excluir auth.users derrubaria o próprio
    // FK que estamos preservando de propósito em public.users/orders).
    const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: '876600h',
    })
    if (banError) throw new Error(`Falha ao desativar login: ${banError.message}`)

    // fn_audit_log() (trigger) já registra o UPDATE em users (anonimização
    // muda name/email/phone/status), mas com user_id null — a escrita real
    // acontece via service_role, sem JWT no contexto da conexão. Aqui o
    // chamador é conhecido (é o próprio dono da conta, fluxo self-service),
    // então grava explicitamente pra não perder o "quem".
    await logActivity({
      userId,
      userEmail: callerData.user.email ?? null,
      action: 'delete',
      entity: 'users',
      entityId: userId,
      details: 'excluiu a própria conta (anonimização + bloqueio de login)',
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
