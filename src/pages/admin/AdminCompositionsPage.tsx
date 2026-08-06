import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAdminCompositions } from '@/features/catalog/hooks'
import { SWATCH_COLOR_OPTIONS } from '@/features/catalog/data'
import type { AdminComposition } from '@/features/catalog/queries'

export function AdminCompositionsPage() {
  const { data: compositions = [], isLoading } = useAdminCompositions()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingComposition, setEditingComposition] = useState<AdminComposition | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingComposition, setDeletingComposition] = useState<AdminComposition | null>(null)
  const [reassignTargetId, setReassignTargetId] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredCompositions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return compositions
    return compositions.filter((composition) => composition.name.toLowerCase().includes(query))
  }, [compositions, search])
  const isFiltered = search.trim().length > 0

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['compositions'] })

  const openCreate = () => {
    setEditingComposition(null)
    setName('')
    setColor(null)
    setFormOpen(true)
  }

  const openEdit = (composition: AdminComposition) => {
    setEditingComposition(composition)
    setName(composition.name)
    setColor(composition.color)
    setFormOpen(true)
  }

  const toggleExpanded = (id: string) => {
    setExpandedId((current) => (current === id ? null : id))
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    setIsSaving(true)
    try {
      const { error } = editingComposition
        ? await supabase.from('compositions').update({ name: trimmed, color }).eq('id', editingComposition.id)
        : await supabase.from('compositions').insert({
            name: trimmed,
            color,
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

  const handleMove = async (composition: AdminComposition, direction: 'up' | 'down') => {
    const index = compositions.findIndex((c) => c.id === composition.id)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= compositions.length) return
    const target = compositions[targetIndex]

    const [{ error: errorA }, { error: errorB }] = await Promise.all([
      supabase.from('compositions').update({ sort_order: target.sortOrder }).eq('id', composition.id),
      supabase.from('compositions').update({ sort_order: composition.sortOrder }).eq('id', target.id),
    ])
    if (errorA || errorB) {
      toast.error('Não foi possível reordenar')
      return
    }
    await invalidate()
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
      <div className="mb-[18px] flex flex-col gap-2.5 sm:flex-row sm:justify-between">
        <Input
          placeholder="Buscar composição…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full sm:w-[260px]"
        />
        <Button onClick={openCreate} className="sm:self-start">
          + Nova composição
        </Button>
      </div>

      {isLoading ? (
        <p className="text-text-meta text-sm">Carregando…</p>
      ) : compositions.length === 0 ? (
        <p className="text-text-meta text-sm">Nenhuma composição cadastrada ainda.</p>
      ) : filteredCompositions.length === 0 ? (
        <p className="text-text-meta text-sm">Nenhuma composição encontrada para "{search}".</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredCompositions.map((composition) => {
            const isExpanded = expandedId === composition.id
            const hasProducts = composition.products.length > 0
            const index = compositions.findIndex((c) => c.id === composition.id)
            return (
              <div key={composition.id} className="rounded-md border border-[#e4ddd0] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label="Mover para cima"
                      disabled={isFiltered || index === 0}
                      onClick={() => handleMove(composition, 'up')}
                      className="text-[#a39a8c] disabled:opacity-30"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Mover para baixo"
                      disabled={isFiltered || index === compositions.length - 1}
                      onClick={() => handleMove(composition, 'down')}
                      className="text-[#a39a8c] disabled:opacity-30"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>

                  <span
                    className="size-4 shrink-0 rounded-full ring-1 ring-[#d8d0c0]"
                    style={{ backgroundColor: composition.color ?? 'transparent' }}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="text-navy-dark text-[14.5px] font-semibold">{composition.name}</div>
                    <button
                      type="button"
                      onClick={() => hasProducts && toggleExpanded(composition.id)}
                      disabled={!hasProducts}
                      className={cn(
                        'mt-0.5 flex items-center gap-1 text-[12.5px] text-[#8c8375]',
                        hasProducts && 'cursor-pointer hover:text-navy-dark',
                      )}
                    >
                      {composition.products.length}{' '}
                      {composition.products.length === 1 ? 'produto' : 'produtos'}
                      {hasProducts &&
                        (isExpanded ? (
                          <ChevronUp className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        ))}
                    </button>
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => openEdit(composition)}>
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openDelete(composition)}>
                      Excluir
                    </Button>
                  </div>
                </div>
                {isExpanded && (
                  <ul className="mt-3 flex flex-col gap-1 border-t border-[#ede8de] pt-3 pl-[46px]">
                    {composition.products.map((product) => (
                      <li key={product.id} className="flex justify-between text-[13px] text-[#3a352b]">
                        <span>
                          {product.name}
                          {product.status === 'draft' && (
                            <span className="ml-1.5 text-[11.5px] text-[#a3660a]">(inativo)</span>
                          )}
                        </span>
                        <span className="text-[#8c8375]">{product.percentage}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComposition ? 'Editar composição' : 'Nova composição'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
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
            <div className="flex flex-col gap-2">
              <Label>Cor de identificação (opcional)</Label>
              <div className="flex flex-wrap gap-2">
                {SWATCH_COLOR_OPTIONS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColor((current) => (current === hex ? null : hex))}
                    style={{ backgroundColor: hex }}
                    className={cn(
                      'size-[26px] rounded-full',
                      color === hex ? 'ring-navy ring-2 ring-offset-2' : 'ring-1 ring-[#d8d0c0]',
                    )}
                  />
                ))}
              </div>
            </div>
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
