import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { useAdminCompositions } from '@/features/catalog/hooks'
import type { AdminComposition } from '@/features/catalog/queries'

export function AdminCompositionsPage() {
  const { data: compositions = [], isLoading } = useAdminCompositions()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editingComposition, setEditingComposition] = useState<AdminComposition | null>(null)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingComposition, setDeletingComposition] = useState<AdminComposition | null>(null)
  const [reassignTargetId, setReassignTargetId] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['compositions'] })

  const openCreate = () => {
    setEditingComposition(null)
    setName('')
    setFormOpen(true)
  }

  const openEdit = (composition: AdminComposition) => {
    setEditingComposition(composition)
    setName(composition.name)
    setFormOpen(true)
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    setIsSaving(true)
    try {
      const { error } = editingComposition
        ? await supabase.from('compositions').update({ name: trimmed }).eq('id', editingComposition.id)
        : await supabase.from('compositions').insert({
            name: trimmed,
            // novo item sempre vai pro fim da lista — sem isso, o default 0 da coluna
            // faria toda composição criada pular pro topo da ordenação.
            sort_order:
              compositions.length > 0 ? Math.max(...compositions.map((c) => c.sortOrder)) + 1 : 1,
          })

      if (error) {
        toast.error(
          error.code === '23505' ? 'Já existe uma composição com esse nome.' : error.message,
        )
        return
      }

      toast.success(editingComposition ? 'Composição atualizada' : 'Composição criada')
      setFormOpen(false)
      await invalidate()
    } finally {
      setIsSaving(false)
    }
  }

  const openDelete = (composition: AdminComposition) => {
    setDeletingComposition(composition)
    setReassignTargetId('')
  }

  const handleDelete = async () => {
    if (!deletingComposition) return
    const needsReassign = deletingComposition.products.length > 0
    if (needsReassign && !reassignTargetId) return

    setIsDeleting(true)
    try {
      if (needsReassign) {
        for (const product of deletingComposition.products) {
          const { data: existingTarget, error: fetchError } = await supabase
            .from('product_compositions')
            .select('percentage')
            .eq('product_id', product.id)
            .eq('composition_id', reassignTargetId)
            .maybeSingle()
          if (fetchError) throw new Error(fetchError.message)

          if (existingTarget) {
            // produto já usa a composição destino também — soma os percentuais numa
            // linha só em vez de duplicar a referência (o total do produto não muda).
            const { error: updateError } = await supabase
              .from('product_compositions')
              .update({ percentage: existingTarget.percentage + product.percentage })
              .eq('product_id', product.id)
              .eq('composition_id', reassignTargetId)
            if (updateError) throw new Error(updateError.message)

            const { error: deleteOldError } = await supabase
              .from('product_compositions')
              .delete()
              .eq('product_id', product.id)
              .eq('composition_id', deletingComposition.id)
            if (deleteOldError) throw new Error(deleteOldError.message)
          } else {
            const { error: repointError } = await supabase
              .from('product_compositions')
              .update({ composition_id: reassignTargetId })
              .eq('product_id', product.id)
              .eq('composition_id', deletingComposition.id)
            if (repointError) throw new Error(repointError.message)
          }
        }
      }

      const { error } = await supabase.from('compositions').delete().eq('id', deletingComposition.id)
      if (error) throw new Error(error.message)

      toast.success(
        needsReassign ? 'Composição excluída e produtos reatribuídos' : 'Composição excluída',
      )
      setDeletingComposition(null)
      await invalidate()
      if (needsReassign) await queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir a composição')
    } finally {
      setIsDeleting(false)
    }
  }

  const reassignOptions = compositions.filter((c) => c.id !== deletingComposition?.id)

  return (
    <div>
      <div className="mb-[18px] flex justify-end">
        <Button onClick={openCreate}>+ Nova composição</Button>
      </div>

      {isLoading ? (
        <p className="text-text-meta text-sm">Carregando…</p>
      ) : compositions.length === 0 ? (
        <p className="text-text-meta text-sm">Nenhuma composição cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {compositions.map((composition) => (
            <div
              key={composition.id}
              className="flex items-center justify-between rounded-md border border-[#e4ddd0] bg-white p-5"
            >
              <div>
                <div className="text-navy-dark text-[14.5px] font-semibold">{composition.name}</div>
                <div className="mt-1 text-[12.5px] text-[#8c8375]">
                  {composition.products.length}{' '}
                  {composition.products.length === 1 ? 'produto' : 'produtos'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => openEdit(composition)}
                  className="text-navy text-[12.5px] hover:text-primary"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => openDelete(composition)}
                  className="text-destructive text-[12.5px] hover:opacity-80"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComposition ? 'Editar composição' : 'Nova composição'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="compositionName">Nome</Label>
            <Input
              id="compositionName"
              placeholder="Ex: Viscose"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleSave()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingComposition}
        onOpenChange={(open) => !open && setDeletingComposition(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deletingComposition?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingComposition && deletingComposition.products.length > 0
                ? `Essa composição está em uso por ${deletingComposition.products.length} produto(s). Escolha outra composição pra reatribuí-los antes de excluir.`
                : 'Essa ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deletingComposition && deletingComposition.products.length > 0 && (
            <Select value={reassignTargetId} onValueChange={setReassignTargetId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Reatribuir produtos para…" />
              </SelectTrigger>
              <SelectContent>
                {reassignOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                isDeleting || (!!deletingComposition?.products.length && !reassignTargetId)
              }
            >
              {isDeleting
                ? 'Excluindo…'
                : deletingComposition && deletingComposition.products.length > 0
                  ? 'Reatribuir e excluir'
                  : 'Excluir'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
