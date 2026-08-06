import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Clock, MapPin, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useBusinessInfo } from '@/features/site-settings/hooks'
import { contactSchema, type ContactInput } from './schema'

export function ContactPage() {
  const business = useBusinessInfo()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) })

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    toast.success('Mensagem enviada! Retornaremos em breve.')
    reset()
  }

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-lg) px-6 py-16 md:px-12">
      <h1 className="text-navy-dark mb-10 font-serif text-3xl font-medium">Fale com a gente</h1>

      <div className="grid grid-cols-1 gap-14 md:grid-cols-2">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Input placeholder="Nome" {...register('name')} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Input placeholder="E-mail" {...register('email')} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Textarea placeholder="Mensagem" rows={5} {...register('message')} />
            {errors.message && <p className="text-destructive text-xs">{errors.message.message}</p>}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="h-auto w-fit rounded-sm px-8 py-4 text-sm"
          >
            Enviar mensagem
          </Button>
        </form>

        <div className="flex flex-col gap-5">
          <div>
            <div className="text-navy-dark mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-[0.06em] uppercase">
              <Phone className="size-3.5" /> Telefone
            </div>
            <div className="text-base text-[#3a352b]">{business.phone}</div>
          </div>
          <div>
            <div className="text-navy-dark mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-[0.06em] uppercase">
              <MapPin className="size-3.5" /> Endereço
            </div>
            <div className="text-base text-[#3a352b]">{business.address}</div>
          </div>
          <div>
            <div className="text-navy-dark mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-[0.06em] uppercase">
              <Clock className="size-3.5" /> Horário
            </div>
            <div className="text-base text-[#3a352b]">{business.hours}</div>
          </div>
          <ImagePlaceholder
            colors={['#e9e2d2', '#ded4bb']}
            label="mapa — localização da loja"
            className="h-[180px] rounded-sm"
          />
        </div>
      </div>
    </main>
  )
}
