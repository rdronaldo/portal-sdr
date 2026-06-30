'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { gerarCodigoCampanha } from '@/lib/campanhas'
import {
  Plus, MoreVertical, Eye, Copy, Star, Pause, Play, XCircle,
  Megaphone, Users, DollarSign, TrendingUp, Repeat, Clock,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Campanha = {
  id: string
  codigo: string
  nome_descritivo: string | null
  status: string
  is_champion: boolean
  versao: string | null
  total_leads: number
  percentual_conversao: number | null
  valor_total_potencial: number
  comissao_entrada_potencial: number
  comissao_recorrente_potencial: number
  canal: string[] | null
  formatos: string[] | null
  horario_tipo: string | null
  criado_em: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  rascunho:  { label: 'Rascunho',    bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
  ativa:     { label: 'Ativa',       bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  pausada:   { label: 'Pausada',     bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  encerrada: { label: 'Encerrada',   bg: '#F1F5F9', text: '#374151', border: '#9CA3AF' },
  champion:  { label: '⭐ Champion',  bg: '#FEF9C3', text: '#92400E', border: '#FDE68A' },
}

const CANAL_CFG: Record<string, { emoji: string; label: string }> = {
  whatsapp:      { emoji: '📱', label: 'WhatsApp' },
  whatsapp_meta: { emoji: '💼', label: 'WA Meta' },
  sms:           { emoji: '💬', label: 'SMS' },
  telefone:      { emoji: '📞', label: 'Telefone' },
}

const FORMATO_CFG: Record<string, { emoji: string; label: string }> = {
  texto:  { emoji: '📝', label: 'Texto' },
  audio:  { emoji: '🎵', label: 'Áudio' },
  video:  { emoji: '🎬', label: 'Vídeo' },
  imagem: { emoji: '🖼️', label: 'Imagem' },
}

const HORARIO_LABEL: Record<string, string> = {
  todas_horas:  '24h',
  dias_uteis:   'Seg–Sex',
  personalizado: 'Personalizado',
}

const VERSAO_LABEL: Record<string, string> = {
  A: 'A', AB: 'A+B', ABC: 'A+B+C',
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isChampion }: { status: string; isChampion: boolean }) {
  const key = isChampion ? 'champion' : (status in STATUS_CONFIG ? status : 'rascunho')
  const cfg = STATUS_CONFIG[key]
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  )
}

// ─── Actions Dropdown ─────────────────────────────────────────────────────────

function ActionsDropdown({ campanha, onAction }: { campanha: Campanha; onAction: (action: string, id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const actions = [
    { key: 'ver',     label: 'Ver campanha',        icon: Eye },
    { key: 'duplicar',label: 'Duplicar',             icon: Copy },
    ...(!campanha.is_champion ? [{ key: 'champion', label: '⭐ Marcar CHAMPION', icon: Star }] : []),
    ...(campanha.status === 'ativa' ? [{ key: 'pausar', label: 'Pausar', icon: Pause }] : []),
    ...(campanha.status === 'pausada' || campanha.status === 'rascunho' ? [{ key: 'ativar', label: 'Ativar', icon: Play }] : []),
    ...(campanha.status !== 'encerrada' ? [{ key: 'encerrar', label: 'Encerrar', icon: XCircle }] : []),
  ]

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors" aria-label="Ações">
        <MoreVertical size={15} className="text-[#94A3B8]" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 w-48">
          {actions.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setOpen(false); onAction(key, campanha.id) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                key === 'encerrar' ? 'text-[#EF4444] hover:bg-[#FEF2F2]' : 'text-[#0A1628] hover:bg-[#F4F8FB]'
              }`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ title, body, confirmLabel, danger, onConfirm, onCancel, saving }: {
  title: string; body: string; confirmLabel: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void; saving: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="text-base font-bold text-[#0A1628] mb-2">{title}</h3>
        <p className="text-sm text-[#64748B] mb-6">{body}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={saving}
            className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 ${
              danger ? 'bg-[#EF4444] hover:bg-[#DC2626]' : 'bg-[#028090] hover:bg-[#026d7a]'
            }`}>
            {saving ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampanhaCard({ c, onAction }: { c: Campanha; onAction: (action: string, id: string) => void }) {
  const ticketMedio = c.total_leads > 0 ? c.valor_total_potencial / c.total_leads : 0
  const pct = c.percentual_conversao ?? 0
  const comEntradaEsp = c.comissao_entrada_potencial * (pct / 100)
  const recorrenteEsp = c.comissao_recorrente_potencial * (pct / 100)

  return (
    <div className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all ${
      c.is_champion ? 'border-[#FDE68A] bg-[#FFFDF0]' : 'border-[#E2E8F0]'
    }`}>
      {/* ── Linha 1: Identificação ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/campanhas/${c.id}`}
                className="font-mono text-xs font-bold text-[#028090] hover:underline">
                {c.codigo}
              </Link>
              <StatusBadge status={c.status} isChampion={c.is_champion} />
              {c.versao && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                  Versão {VERSAO_LABEL[c.versao] ?? c.versao}
                </span>
              )}
            </div>
            <Link href={`/campanhas/${c.id}`}
              className="text-sm font-semibold text-[#0A1628] hover:text-[#028090] transition-colors block mt-0.5">
              {c.nome_descritivo || '—'}
            </Link>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Criado em {new Date(c.criado_em).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <ActionsDropdown campanha={c} onAction={onAction} />
      </div>

      {/* ── Linha 2: Chips de abordagem ── */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(c.canal ?? []).map(ch => {
          const cfg = CANAL_CFG[ch]
          return cfg ? (
            <span key={ch} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0FDFA] text-[#028090] border border-[#A7F3D0]">
              {cfg.emoji} {cfg.label}
            </span>
          ) : null
        })}
        {(c.formatos ?? []).map(f => {
          const cfg = FORMATO_CFG[f]
          return cfg ? (
            <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]">
              {cfg.emoji} {cfg.label}
            </span>
          ) : null
        })}
        {c.horario_tipo && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
            <Clock size={10} /> {HORARIO_LABEL[c.horario_tipo] ?? c.horario_tipo}
          </span>
        )}
      </div>

      {/* ── Linha 3: Métricas ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-3 border-t border-[#F1F5F9]">
        <div>
          <p className="text-xs text-[#94A3B8] mb-0.5 flex items-center gap-1"><Users size={10} /> Leads</p>
          <p className="text-sm font-bold text-[#0A1628]">{c.total_leads.toLocaleString('pt-BR')}</p>
        </div>
        <div>
          <p className="text-xs text-[#94A3B8] mb-0.5">Conv. est.</p>
          <p className="text-sm font-bold text-[#0A1628]">{pct}%</p>
        </div>
        <div>
          <p className="text-xs text-[#94A3B8] mb-0.5 flex items-center gap-1"><DollarSign size={10} /> Potencial</p>
          <p className="text-sm font-bold text-[#028090]">{fmt(c.valor_total_potencial)}</p>
        </div>
        <div>
          <p className="text-xs text-[#94A3B8] mb-0.5 flex items-center gap-1"><TrendingUp size={10} /> Com. entrada</p>
          <p className="text-sm font-bold text-[#028090]">{fmt(comEntradaEsp)}</p>
        </div>
        <div>
          <p className="text-xs text-[#94A3B8] mb-0.5 flex items-center gap-1"><Repeat size={10} /> Recorrente/mês</p>
          <p className="text-sm font-bold text-[#02C39A]">{fmt(recorrenteEsp)}</p>
        </div>
        <div>
          <p className="text-xs text-[#94A3B8] mb-0.5">Ticket médio</p>
          <p className="text-sm font-bold text-[#0A1628]">{ticketMedio > 0 ? fmt(ticketMedio) : '—'}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CampanhasClient({ campanhas: initial }: { campanhas: Campanha[] }) {
  const router = useRouter()
  const [campanhas, setCampanhas] = useState(initial)
  const [modal, setModal] = useState<{ type: string; id: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setCampanhas(initial) }, [initial])

  const handleAction = (action: string, id: string) => {
    if (action === 'ver') { router.push(`/campanhas/${id}`); return }
    setModal({ type: action, id })
  }

  const executeAction = async () => {
    if (!modal) return
    const { type, id } = modal
    setSaving(true)
    const supabase = createClient()
    try {
      if (type === 'duplicar') {
        const { data: full } = await supabase.from('campanhas').select('*').eq('id', id).single()
        if (!full) return
        const novoCodigo = await gerarCodigoCampanha(supabase, 'A')
        const parts = novoCodigo.split('_')
        const { data: nova } = await supabase.from('campanhas').insert({
          ...full, id: undefined, codigo: novoCodigo,
          signo: parts[1], numero_sequencial: parseInt(parts[2]), versao: 'A',
          status: 'rascunho', is_champion: false,
          total_leads: 0, valor_total_potencial: 0,
          comissao_entrada_potencial: 0, comissao_recorrente_potencial: 0,
          criado_em: undefined, atualizado_em: undefined,
        }).select('id').single()
        if (nova) { toast.success('Campanha duplicada!'); router.push(`/campanhas/${nova.id}`) }
      } else if (type === 'champion') {
        await supabase.from('campanhas').update({ is_champion: true, status: 'champion' }).eq('id', id)
        setCampanhas(prev => prev.map(c => c.id === id ? { ...c, is_champion: true, status: 'champion' } : c))
        toast.success('Campanha marcada como CHAMPION!')
      } else if (type === 'pausar') {
        await supabase.from('campanhas').update({ status: 'pausada' }).eq('id', id)
        setCampanhas(prev => prev.map(c => c.id === id ? { ...c, status: 'pausada' } : c))
        toast.success('Campanha pausada.')
      } else if (type === 'ativar') {
        await supabase.from('campanhas').update({ status: 'ativa' }).eq('id', id)
        setCampanhas(prev => prev.map(c => c.id === id ? { ...c, status: 'ativa' } : c))
        toast.success('Campanha ativada!')
      } else if (type === 'encerrar') {
        await supabase.from('campanhas').update({ status: 'encerrada' }).eq('id', id)
        setCampanhas(prev => prev.map(c => c.id === id ? { ...c, status: 'encerrada' } : c))
        toast.success('Campanha encerrada.')
      }
    } catch {
      toast.error('Erro ao executar ação.')
    } finally {
      setSaving(false)
      setModal(null)
    }
  }

  const modalConfig = modal ? {
    duplicar: { title: 'Duplicar campanha', body: 'Criar uma cópia desta campanha como rascunho?', confirmLabel: 'Duplicar', danger: false },
    champion: { title: 'Marcar como CHAMPION', body: 'Esta campanha será destacada como a melhor versão. Confirmar?', confirmLabel: '⭐ Confirmar', danger: false },
    encerrar: { title: 'Encerrar campanha', body: 'Esta ação encerrará permanentemente a campanha. Continuar?', confirmLabel: 'Encerrar', danger: true },
  }[modal.type] : null

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1628]">Campanhas</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {campanhas.length} campanha{campanhas.length !== 1 ? 's' : ''} cadastrada{campanhas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/campanhas/nova"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] transition-colors">
          <Plus size={16} /> Nova Campanha
        </Link>
      </div>

      {campanhas.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] py-20 text-center">
          <div className="w-14 h-14 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone size={26} className="text-[#94A3B8]" />
          </div>
          <p className="text-base font-semibold text-[#0A1628]">Nenhuma campanha cadastrada ainda</p>
          <p className="text-sm text-[#64748B] mt-1 mb-5">Clique em + Nova Campanha para começar.</p>
          <Link href="/campanhas/nova"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] transition-colors">
            <Plus size={15} /> Nova Campanha
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {campanhas.map(c => (
            <CampanhaCard key={c.id} c={c} onAction={handleAction} />
          ))}
        </div>
      )}

      {modal && modalConfig && (
        <ConfirmModal
          {...modalConfig}
          onConfirm={executeAction}
          onCancel={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}
