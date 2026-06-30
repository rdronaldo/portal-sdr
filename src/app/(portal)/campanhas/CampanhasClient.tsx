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
  MessageCircle, Phone, Smartphone, MessageSquare,
  FileText, Mic, Video, Image,
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
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function fmtFull(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  rascunho:  { label: 'Rascunho',   dot: '#94A3B8', bg: '#F8FAFC', text: '#64748B', border: '#CBD5E1' },
  ativa:     { label: 'Ativa',      dot: '#02C39A', bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7' },
  pausada:   { label: 'Pausada',    dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  encerrada: { label: 'Encerrada',  dot: '#9CA3AF', bg: '#F1F5F9', text: '#374151', border: '#9CA3AF' },
  champion:  { label: 'Champion',   dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
}

const CANAL_CFG: Record<string, { icon: any; label: string; bg: string; color: string; border: string }> = {
  whatsapp:      { icon: MessageCircle, label: 'WhatsApp',  bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  whatsapp_meta: { icon: MessageCircle, label: 'WA Meta',   bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  sms:           { icon: MessageSquare, label: 'SMS',        bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  telefone:      { icon: Phone,         label: 'Telefone',  bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
}

const FORMATO_CFG: Record<string, { icon: any; label: string; bg: string; color: string; border: string }> = {
  texto:  { icon: FileText, label: 'Texto',  bg: '#F0FDFA', color: '#028090', border: '#A7F3D0' },
  audio:  { icon: Mic,      label: 'Áudio',  bg: '#FDF4FF', color: '#9333EA', border: '#E9D5FF' },
  video:  { icon: Video,    label: 'Vídeo',  bg: '#FFF1F2', color: '#E11D48', border: '#FECDD3' },
  imagem: { icon: Image,    label: 'Imagem', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
}

const HORARIO_LABEL: Record<string, string> = {
  todas_horas:  '24 horas',
  dias_uteis:   'Seg – Sex',
  personalizado: 'Personalizado',
}

const VERSAO_LABEL: Record<string, { label: string; desc: string }> = {
  A:   { label: 'Versão A',     desc: 'Teste único' },
  AB:  { label: 'Versão A+B',   desc: 'Teste A/B' },
  ABC: { label: 'Versão A+B+C', desc: 'Multi-variante' },
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────

function StatBox({ label, value, sub, accent, icon: Icon, iconBg, iconColor }: {
  label: string; value: string; sub?: string; accent?: boolean
  icon: any; iconBg: string; iconColor: string
}) {
  return (
    <div className={`rounded-xl p-4 flex items-center gap-3 ${
      accent ? 'bg-gradient-to-br from-[#028090] to-[#026d7a]' : 'bg-[#F8FAFC] border border-[#EEF2F7]'
    }`}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: accent ? 'rgba(255,255,255,0.15)' : iconBg }}>
        <Icon size={18} style={{ color: accent ? '#ffffff' : iconColor }} />
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-medium mb-0.5 ${accent ? 'text-white/70' : 'text-[#94A3B8]'}`}>{label}</p>
        <p className={`text-base font-bold leading-none ${accent ? 'text-white' : 'text-[#0A1628]'}`}>{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${accent ? 'text-white/60' : 'text-[#CBD5E1]'}`}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isChampion }: { status: string; isChampion: boolean }) {
  const key = isChampion ? 'champion' : (status in STATUS_CONFIG ? status : 'rascunho')
  const cfg = STATUS_CONFIG[key]
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      {isChampion ? '⭐ ' : ''}{cfg.label}
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
    { key: 'ver',      label: 'Ver campanha',        icon: Eye },
    { key: 'duplicar', label: 'Duplicar',             icon: Copy },
    ...(!campanha.is_champion ? [{ key: 'champion', label: '⭐ Marcar CHAMPION', icon: Star }] : []),
    ...(campanha.status === 'ativa'    ? [{ key: 'pausar',  label: 'Pausar',  icon: Pause }] : []),
    ...(campanha.status === 'pausada'  || campanha.status === 'rascunho'
                                       ? [{ key: 'ativar',  label: 'Ativar',  icon: Play  }] : []),
    ...(campanha.status !== 'encerrada'? [{ key: 'encerrar',label: 'Encerrar',icon: XCircle }] : []),
  ]

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} aria-label="Ações"
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F1F5F9] transition-colors">
        <MoreVertical size={16} className="text-[#94A3B8]" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 bg-white border border-[#E2E8F0] rounded-xl shadow-xl py-1.5 w-52">
          {actions.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setOpen(false); onAction(key, campanha.id) }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors ${
                key === 'encerrar' ? 'text-[#EF4444] hover:bg-[#FEF2F2]' : 'text-[#0A1628] hover:bg-[#F4F8FB]'
              }`}>
              <Icon size={14} className="flex-shrink-0" />{label}
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
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={saving}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 ${
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
  const versaoCfg = c.versao ? VERSAO_LABEL[c.versao] : null

  return (
    <div className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden hover:shadow-lg ${
      c.is_champion
        ? 'border-[#F59E0B] shadow-[0_0_0_1px_#F59E0B20]'
        : 'border-[#E2E8F0] hover:border-[#028090]/30'
    }`}>

      {/* ── Barra de acento superior ── */}
      <div className={`h-1 w-full ${
        c.is_champion ? 'bg-gradient-to-r from-[#F59E0B] to-[#FDE68A]' :
        c.status === 'ativa' ? 'bg-gradient-to-r from-[#028090] to-[#02C39A]' :
        c.status === 'pausada' ? 'bg-[#F59E0B]' : 'bg-[#E2E8F0]'
      }`} />

      <div className="p-5">
        {/* ── Linha 1: Identificação + ações ── */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">

            {/* Ícone avatar */}
            <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${
              c.is_champion ? 'bg-gradient-to-br from-[#F59E0B] to-[#EF4444]' :
              c.status === 'ativa' ? 'bg-gradient-to-br from-[#028090] to-[#02C39A]' :
              'bg-gradient-to-br from-[#94A3B8] to-[#CBD5E1]'
            }`}>
              {c.is_champion ? '⭐' : (c.nome_descritivo?.[0] ?? '?')}
            </div>

            <div className="min-w-0 flex-1">
              {/* Código + badges */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-[11px] font-bold text-[#94A3B8] tracking-wider uppercase">
                  {c.codigo}
                </span>
                <StatusBadge status={c.status} isChampion={c.is_champion} />
                {versaoCfg && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                    {versaoCfg.label}
                  </span>
                )}
              </div>
              {/* Nome */}
              <Link href={`/campanhas/${c.id}`}
                className="text-base font-bold text-[#0A1628] hover:text-[#028090] transition-colors block leading-tight">
                {c.nome_descritivo || '—'}
              </Link>
              <p className="text-xs text-[#CBD5E1] mt-0.5">
                Criado em {new Date(c.criado_em).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <ActionsDropdown campanha={c} onAction={onAction} />
        </div>

        {/* ── Linha 2: Chips canal + formato + horário ── */}
        <div className="flex flex-wrap gap-2 mb-5">
          {(c.canal ?? []).map(ch => {
            const cfg = CANAL_CFG[ch]
            if (!cfg) return null
            const Icon = cfg.icon
            return (
              <span key={ch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                <Icon size={12} /> {cfg.label}
              </span>
            )
          })}
          {(c.formatos ?? []).map(f => {
            const cfg = FORMATO_CFG[f]
            if (!cfg) return null
            const Icon = cfg.icon
            return (
              <span key={f}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                <Icon size={12} /> {cfg.label}
              </span>
            )
          })}
          {c.horario_tipo && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
              <Clock size={12} /> {HORARIO_LABEL[c.horario_tipo] ?? c.horario_tipo}
            </span>
          )}
        </div>

        {/* ── Linha 3: Métricas ── */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          <StatBox
            label="Leads"
            value={c.total_leads.toLocaleString('pt-BR')}
            icon={Users}
            iconBg="#EFF6FF"
            iconColor="#2563EB"
          />
          <StatBox
            label="Conversão est."
            value={`${pct}%`}
            icon={TrendingUp}
            iconBg="#F0FDF4"
            iconColor="#16A34A"
          />
          <StatBox
            label="Potencial total"
            value={fmt(c.valor_total_potencial)}
            sub={fmtFull(c.valor_total_potencial)}
            icon={DollarSign}
            iconBg="#F0FDFA"
            iconColor="#028090"
            accent
          />
          <StatBox
            label="Com. entrada"
            value={fmt(comEntradaEsp)}
            sub={fmtFull(comEntradaEsp)}
            icon={DollarSign}
            iconBg="#F0FDFA"
            iconColor="#028090"
          />
          <StatBox
            label="Recorrente/mês"
            value={fmt(recorrenteEsp)}
            sub={fmtFull(recorrenteEsp)}
            icon={Repeat}
            iconBg="#ECFDF5"
            iconColor="#02C39A"
          />
          <StatBox
            label="Ticket médio"
            value={ticketMedio > 0 ? fmt(ticketMedio) : '—'}
            sub={ticketMedio > 0 ? fmtFull(ticketMedio) : undefined}
            icon={DollarSign}
            iconBg="#FFF7ED"
            iconColor="#EA580C"
          />
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

  const modalConfig = modal ? ({
    duplicar: { title: 'Duplicar campanha', body: 'Criar uma cópia desta campanha como rascunho?', confirmLabel: 'Duplicar', danger: false },
    champion: { title: 'Marcar como CHAMPION', body: 'Esta campanha será destacada como a melhor versão. Confirmar?', confirmLabel: '⭐ Confirmar', danger: false },
    encerrar: { title: 'Encerrar campanha', body: 'Esta ação encerrará permanentemente a campanha. Continuar?', confirmLabel: 'Encerrar', danger: true },
  } as any)[modal.type] : null

  const ativas = campanhas.filter(c => c.status === 'ativa' || c.is_champion).length
  const totalLeads = campanhas.reduce((s, c) => s + c.total_leads, 0)
  const totalPotencial = campanhas.reduce((s, c) => s + c.valor_total_potencial, 0)

  return (
    <div className="p-8 min-h-screen bg-[#F8FAFC]">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1628]">Campanhas</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            {campanhas.length} campanha{campanhas.length !== 1 ? 's' : ''} · {ativas} ativa{ativas !== 1 ? 's' : ''} · {totalLeads.toLocaleString('pt-BR')} leads
          </p>
        </div>
        <Link href="/campanhas/nova"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#028090] text-white text-sm font-semibold hover:bg-[#026d7a] transition-colors shadow-sm">
          <Plus size={16} /> Nova Campanha
        </Link>
      </div>

      {/* ── Resumo rápido ── */}
      {campanhas.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              <Megaphone size={18} className="text-[#2563EB]" />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8] font-medium">Campanhas ativas</p>
              <p className="text-xl font-bold text-[#0A1628]">{ativas}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center">
              <Users size={18} className="text-[#028090]" />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8] font-medium">Total de leads</p>
              <p className="text-xl font-bold text-[#0A1628]">{totalLeads.toLocaleString('pt-BR')}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#028090] to-[#02C39A] rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <DollarSign size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-white/70 font-medium">Potencial total</p>
              <p className="text-xl font-bold text-white">{fmt(totalPotencial)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Lista ── */}
      {campanhas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] py-20 text-center">
          <div className="w-16 h-16 bg-[#F1F5F9] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Megaphone size={28} className="text-[#94A3B8]" />
          </div>
          <p className="text-base font-semibold text-[#0A1628]">Nenhuma campanha ainda</p>
          <p className="text-sm text-[#94A3B8] mt-1 mb-6">Clique em + Nova Campanha para começar.</p>
          <Link href="/campanhas/nova"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#028090] text-white text-sm font-semibold hover:bg-[#026d7a] transition-colors">
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
