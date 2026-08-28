// supabase-js só devolve a mensagem genérica ("non-2xx status code") em
// `error.message` — o corpo real ({error: "..."}) que as Edge Functions
// devolvem fica em `error.context`, uma Response que precisa ser lida à
// parte.
export async function unwrapFunctionError(error: {
  message: string
  context?: Response
}): Promise<never> {
  let specificMessage: string | undefined
  if (error.context) {
    try {
      const body = (await error.context.json()) as { error?: string }
      specificMessage = body.error
    } catch {
      // corpo não era JSON — cai no throw genérico abaixo
    }
  }
  throw new Error(specificMessage ?? error.message)
}
