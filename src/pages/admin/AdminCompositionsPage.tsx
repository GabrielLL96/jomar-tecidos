import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { useAdminCompositions } from '@/features/catalog/hooks'
import type { Composition } from '@/features/catalog/types'

type CompositionWithCount = Composition & { productCount: number }

export function AdminCompositionsPage() {
  const { data: compositions = [], isLoading } = useAdminCompositions()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editingComposition, setEditingComposition] = useState<CompositionWithCount | null>(null)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingComposition, setDeletingComposition] = useState<CompositionWithCount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['compositions'] })

  const openCreate = () => {
    setEditingComposition(null)
    setName('')
    setFormOpen(true)
  }

  const openEdit = (composition: CompositionWithCount) => {
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
        : await supabase.from('compositions').insert({ name: trimmed })

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

  const handleDelete = async () => {
    if (!deletingComposition) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from('compositions').delete().eq('id', deletingComposition.id)
      if (error) {
        toast.error(
          error.code === '23503'
            ? 'Essa composição está em uso por produtos e não pode ser excluída.'
            : error.message,
        )
        return
      }
      toast.success('Composição excluída')
      setDeletingComposition(null)
      await invalidate()
    } finally {
      setIsDeleting(false)
    }
  }

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
                  {composition.productCount} {composition.productCount === 1 ? 'produto' : 'produtos'}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => openEdit(composition)}>
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeletingComposition(composition)}>
                  Excluir
                </Button>
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

      <AlertDialog open={!!deletingComposition} onOpenChange={(open) => !open && setDeletingComposition(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deletingComposition?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingComposition && deletingComposition.productCount > 0
                ? `Essa composição está em uso por ${deletingComposition.productCount} produto(s) e não poderá ser excluída até que eles deixem de usá-la.`
                : 'Essa ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || (deletingComposition?.productCount ?? 0) > 0}
            >
              {isDeleting ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
