import { createClient } from 'npm:@supabase/supabase-js@2.112.0'
import { corsHeaders, createCallerClient, createServiceClient, requireAdmin } from '../_shared/melhor-envio.ts'
import { logActivity } from '../_shared/activity-logger.ts'

type CreatableRole = 'customer' | 'admin'

interface CreateUserRequestBody {
  name: string
  email: string
  role: CreatableRole
  password?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Único gate de autorização — cria conta comum e admin (ambos fluxos só
    // acessíveis de dentro do painel admin, requireAdmin cobre os dois).
    const authHeader = req.headers.get('Authorization')
    await requireAdmin(authHeader)

    // fn_audit_log() (trigger) não recupera auth.uid() aqui — o insert real
    // em public.users acontece via service_role, sem JWT no contexto da
    // conexão. Resolve o chamador explicitamente pra não perder "quem criou".
    const caller = createCallerClient(authHeader!)
    const { data: callerData } = await caller.auth.getUser()

    const { name, email, role, password } = (await req.json()) as CreateUserRequestBody

    if (!name?.trim()) throw new Error('Nome é obrigatório')
    if (!email || !EMAIL_PATTERN.test(email)) throw new Error('E-mail inválido')
    if (role !== 'customer' && role !== 'admin') throw new Error('Papel inválido')
    if (role === 'admin' && (!password || password.length < 6)) {
      throw new Error('Senha deve ter ao menos 6 caracteres')
    }

    const supabase = createServiceClient()

    // Cliente comum nasce com senha aleatória (nunca exposta/logada) — define
    // a própria via e-mail de reset, mesma convenção já usada no modal de
    // Editar ("não existe senha temporária configurável por aqui"). Admin
    // define a senha na hora — exceção deliberada, confirmada com o usuário.
    const finalPassword = role === 'admin' ? (password as string) : crypto.randomUUID() + crypto.randomUUID()

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { name: name.trim() },
    })

    if (error) {
      const message = error.code === 'email_exists' ? 'Este e-mail já está cadastrado' : error.message
      throw new Error(message)
    }

    // handle_new_user() sempre cria a linha como 'customer' (default da
    // coluna) — testado e confirmado que o trigger AFTER INSERT não vê
    // app_metadata a tempo (GoTrue popula isso numa operação separada,
    // depois do INSERT base). Promover pra admin é um UPDATE explícito
    // aqui, usando o resultado já confirmado da Admin API. Se falhar, desfaz
    // a conta inteira — nunca deixar um "admin" pedido virar customer
    // silencioso, nem um usuário órfão.
    if (role === 'admin') {
      const { error: roleError } = await supabase.from('users').update({ role: 'admin' }).eq('id', data.user.id)
      if (roleError) {
        await supabase.auth.admin.deleteUser(data.user.id)
        throw new Error('Não foi possível definir o papel de administrador — operação revertida, tente novamente')
      }
      await logActivity({
        userId: callerData.user?.id ?? null,
        userEmail: callerData.user?.email ?? null,
        action: 'create',
        entity: 'usuarios_admin',
        entityId: data.user.id,
        dataAfter: { email, name: name.trim() },
        details: `criou o usuário admin ${email}`,
      })
    }

    let warning: string | null = null
    if (role === 'customer') {
      const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
      const { error: resetError } = await anon.auth.resetPasswordForEmail(email)
      if (resetError) {
        // Não fatal — a conta já existe corretamente (atômico via trigger).
        // Admin pode reenviar depois pelo botão já existente no modal de Editar.
        warning =
          'Usuário criado, mas não foi possível enviar o e-mail de senha automaticamente — use "Editar > Enviar redefinição" pra reenviar.'
      }
    }

    return new Response(JSON.stringify({ id: data.user.id, warning }), {
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
