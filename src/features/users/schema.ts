import { z } from 'zod'

// CPF fica de fora — GRANT UPDATE em users.cpf só existe pra service_role
// (ver migrations), o próprio cliente/admin não pode alterar via update()
// direto. Provavelmente proposital: campo alimenta asaas_customer_id, mudar
// CPF depois do cadastro desalinharia a identidade no gateway de pagamento.
export const adminUserEditSchema = z.object({
  name: z.string().min(3, 'Informe o nome completo'),
  phone: z.string().optional(),
})

export type AdminUserEditInput = z.infer<typeof adminUserEditSchema>
