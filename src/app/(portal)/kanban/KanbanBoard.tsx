'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'

type StatusParceiro = 'recebido' | 'trabalhando' | 'convertido' | 'nao_convertido'

type TransferenciaComLead = {
  id: string
  lead_id: string
  status_parceiro: StatusParceiro
  notas_parceiro: string | null
  transferido_em: string
  leads: {
    nome: string | null
    telefone: string
    criado_em: string
    percentual_renda: number | null
    renda_estimada: number | null
  } | null
}

const COLUNAS: { key: StatusParceiro; label: string; color: string }[] = [
  { key: 'recebido', label: 'Recebido', color: '#3B82F6' },
  { key: 'trabalhando', label: 'Em andamento', color: '#F59E0B' },
  { key: 'convertido', label: 'Convertido', color: '#10B981' },
  { key: 'nao_convertido', label: 'Não convertido', color: '#EF4444' },
]

function LeadCard({ item }: { item: TransferenciaComLead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  })

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-[#028090]/30 transition-all select-none"
    >
      <Link
        href={`/leads/${item.lead_id}`}
        onClick={e => e.stopPropagation()}
        className="font-semibold text-sm text-[#028090] hover:underline truncate block"
      >
        {item.leads?.nome || 'Sem nome'}
      </Link>
      <p className="text-xs text-[#64748B] mt-1 font-medium">{item.leads?.telefone || '—'}</p>
      <p className="text-xs text-[#94A3B8] mt-1.5">
        {new Date(item.transferido_em).toLocaleDateString('pt-BR')}
      </p>
      {item.leads?.percentual_renda != null && item.leads?.renda_estimada ? (() => {
        const p = item.leads.percentual_renda!
        const color = p <= 10 ? '#065F46' : p <= 20 ? '#92400E' : '#991B1B'
        const bg    = p <= 10 ? '#ECFDF5' : p <= 20 ? '#FFFBEB' : '#FEF2F2'
        const pStr  = p.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        return (
          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: bg, color }}>
            💰 {pStr}% da renda
          </span>
        )
      })() : null}
    </div>
  )
}

function Column({
  col,
  items,
  isOver,
}: {
  col: (typeof COLUNAS)[0]
  items: TransferenciaComLead[]
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id: col.key })

  return (
    <div className="flex-shrink-0 w-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
          <span className="text-sm font-semibold text-[#0A1628]">{col.label}</span>
        </div>
        <span className="text-xs bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-full font-medium">
          {items.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[200px] rounded-xl p-2 transition-colors ${
          isOver
            ? 'bg-[#F0FDFA] ring-2 ring-[#028090] ring-dashed'
            : 'bg-[#F4F8FB]'
        }`}
      >
        {items.length > 0 ? (
          items.map((item) => <LeadCard key={item.id} item={item} />)
        ) : (
          <div className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-4 text-center">
            <p className="text-xs text-[#94A3B8]">Nenhum lead</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({
  initialData,
}: {
  initialData: TransferenciaComLead[]
}) {
  const [items, setItems] = useState(initialData)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeItem = items.find((i) => i.id === activeId)

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId((over?.id as string) ?? null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    setOverId(null)

    if (!over) return
    const newStatus = over.id as StatusParceiro
    const item = items.find((i) => i.id === active.id)
    if (!item || item.status_parceiro === newStatus) return

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === active.id ? { ...i, status_parceiro: newStatus } : i
      )
    )

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transferencias')
      .update({ status_parceiro: newStatus })
      .eq('id', active.id)
    setSaving(false)

    if (error) {
      // Revert on error
      setItems((prev) =>
        prev.map((i) =>
          i.id === active.id ? { ...i, status_parceiro: item.status_parceiro } : i
        )
      )
      console.error('Erro ao atualizar status:', error)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1628]">Kanban</h1>
          <p className="text-[#64748B] mt-1">
            Arraste os cards para atualizar o status do lead
          </p>
        </div>
        {saving && (
          <span className="text-xs text-[#028090] animate-pulse">Salvando...</span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUNAS.map((col) => (
            <Column
              key={col.key}
              col={col}
              items={items.filter((i) => i.status_parceiro === col.key)}
              isOver={overId === col.key}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="bg-white rounded-lg border-2 border-[#028090] p-3 shadow-2xl w-60 rotate-2">
              <p className="font-medium text-sm text-[#0A1628] truncate">
                {activeItem.leads?.nome || 'Sem nome'}
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                {activeItem.leads?.telefone || '—'}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {items.length === 0 && (
        <div className="mt-8 text-center text-[#64748B] text-sm">
          Nenhum lead transferido ainda. Os leads aparecerão aqui após a transferência via WhatsApp + n8n.
        </div>
      )}
    </div>
  )
}
