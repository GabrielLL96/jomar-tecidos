import { corsHeaders, createServiceClient, requireAdmin } from '../_shared/melhor-envio.ts'

interface SetPasswordRequestBody {
  userId: string
  password: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    await requireAdmin(req.headers.get('Authorization'))

    const { userId, password } = (await req.json()) as SetPasswordRequestBody
    if (!userId) throw new Error('Usuário não informado')
    if (!password || password.length < 6) throw new Error('Senha deve ter ao menos 6 caracteres')

    const supabase = createServiceClient()

    // Cliente só troca senha via e-mail de redefinição (fluxo já existente,
    // resetPasswordForEmail) — admin definir a senha direto é exceção
    // deliberada só pra contas internas/staff, confirmada explicitamente
    // nesta sessão. Não confia só na UI escondendo o botão pra cliente:
    // reforça no servidor, mesmo padrão já usado no resto do projeto.
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) throw new Error(profileError.message)
    if (!profile) throw new Error('Usuário não encontrado')
    if (profile.role === 'customer') {
      throw new Error('Cliente só troca senha por e-mail de redefinição, não direto pelo admin')
    }

    const { error } = await supabase.auth.admin.updateUserById(userId, { password })
    if (error) throw new Error(error.message)

    return new Response(JSON.stringify({ ok: true }), {
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
