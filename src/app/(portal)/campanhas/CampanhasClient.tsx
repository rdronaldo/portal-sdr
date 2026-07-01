'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { gerarCodigoCampanha } from '@/lib/campanhas'
import {
  Plus, MoreVertical, Eye, Copy, Star, Pause, Play, XCircle,
  Megaphone, Users, DollarSign, TrendingUp, Repeat, Target,
  MessageCircle, Phone, MessageSquare, FileText, Mic, Video, Image,
  Clock, ChevronRight,
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

function fmtShort(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function fmtFull(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v)
}

const STATUS_CFG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  rascunho:  { label: 'Rascunho',  dot: '#94A3B8', bg: 'rgba(148,163,184,0.2)',  text: '#94A3B8' },
  ativa:     { label: 'Ativa',     dot: '#02C39A', bg: 'rgba(2,195,154,0.18)',   text: '#02C39A' },
  pausada:   { label: 'Pausada',   dot: '#F59E0B', bg: 'rgba(245,158,11,0.18)',  text: '#F59E0B' },
  encerrada: { label: 'Encerrada', dot: '#94A3B8', bg: 'rgba(148,163,184,0.2)',  text: '#94A3B8' },
  champion:  { label: 'Champion',  dot: '#F59E0B', bg: 'rgba(245,158,11,0.18)',  text: '#F59E0B' },
}

const CANAL_META: Record<string, { icon: any; label: string }> = {
  whatsapp:      { icon: MessageCircle, label: 'WhatsApp' },
  whatsapp_meta: { icon: MessageCircle, label: 'WA Meta' },
  sms:           { icon: MessageSquare, label: 'SMS' },
  telefone:      { icon: Phone,         label: 'Telefone' },
}

const FORMATO_META: Record<string, { icon: any; label: string }> = {
  texto:  { icon: FileText, label: 'Texto' },
  audio:  { icon: Mic,      label: 'Áudio' },
  video:  { icon: Video,    label: 'Vídeo' },
  imagem: { icon: Image,    label: 'Imagem' },
}

const HORARIO_LABEL: Record<string, string> = {
  todas_horas:   '24h',
  dias_uteis:    'Seg–Sex',
  personalizado: 'Personalizado',
}

const VERSAO_LABEL: Record<string, string> = {
  A: 'A', AB: 'A+B', ABC: 'A+B+C',
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ title, body, confirmLabel, danger, onConfirm, onCancel, saving }: {
  title: string; body: string; confirmLabel: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void; saving: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
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

// ─── Actions Menu (3 pontos) ──────────────────────────────────────────────────

function ActionsMenu({ campanha, onAction }: { campanha: Campanha; onAction: (a: string, id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const items = [
    { key: 'ver',      label: 'Ver campanha',         icon: Eye },
    { key: 'duplicar', label: 'Duplicar campanha',    icon: Copy },
    ...(!campanha.is_champion ? [{ key: 'champion', label: '⭐ Marcar CHAMPION', icon: Star }] : []),
    ...(campanha.status === 'ativa'   ? [{ key: 'pausar',   label: 'Pausar',   icon: Pause   }] : []),
    ...((campanha.status === 'pausada' || campanha.status === 'rascunho') ? [{ key: 'ativar', label: 'Ativar', icon: Play }] : []),
    ...(campanha.status !== 'encerrada' ? [{ key: 'encerrar', label: 'Encerrar', icon: XCircle }] : []),
  ]

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} aria-label="Mais opções"
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
        <MoreVertical size={18} className="text-white/60" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-30 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl py-1.5 w-52">
          {items.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setOpen(false); onAction(key, campanha.id) }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                key === 'encerrar' ? 'text-[#EF4444] hover:bg-[#FEF2F2]' : 'text-[#0A1628] hover:bg-[#F4F8FB]'
              }`}>
              <Icon size={14} className="flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Metric Mini-Card ─────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon: Icon, iconColor, accent }: {
  label: string; value: string; sub?: string; icon: any; iconColor: string; accent?: boolean
}) {
  if (accent) {
    return (
      <div className="rounded-xl p-4 flex flex-col gap-2 flex-1"
        style={{ background: 'linear-gradient(135deg, #028090 0%, #02C39A 100%)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{label}</span>
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <Icon size={14} className="text-white" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        {sub && <p className="text-[11px] text-white/60 leading-tight">{sub}</p>}
      </div>
    )
  }
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2 flex-1 bg-[#F4F8FB]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm">
          <Icon size={14} style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#0A1628] leading-none">{value}</p>
      {sub && <p className="text-[11px] text-[#94A3B8] leading-tight">{sub}</p>}
    </div>
  )
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampanhaCard({ c, onAction }: { c: Campanha; onAction: (a: string, id: string) => void }) {
  const pct = c.percentual_conversao ?? 0
  const ticketMedio = c.total_leads > 0 ? c.valor_total_potencial / c.total_leads : 0
  const comEntrada  = c.comissao_entrada_potencial  * (pct / 100)
  const recorrente  = c.comissao_recorrente_potencial * (pct / 100)

  const statusKey = c.is_champion ? 'champion' : (c.status in STATUS_CFG ? c.status : 'rascunho')
  const sc = STATUS_CFG[statusKey]

  // Metadata chips for header
  const canais  = (c.canal    ?? []).map(k => CANAL_META[k]?.label).filter(Boolean).join(' · ')
  const formatos= (c.formatos ?? []).map(k => FORMATO_META[k]?.label).filter(Boolean).join(' · ')
  const horario = c.horario_tipo ? (HORARIO_LABEL[c.horario_tipo] ?? c.horario_tipo) : null
  const metaParts = [canais, formatos, horario].filter(Boolean).join(' · ')

  const showPausar   = c.status === 'ativa'
  const showAtivar   = c.status === 'pausada' || c.status === 'rascunho'
  const showEncerrar = c.status !== 'encerrada'

  return (
    <div className={`rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_24px_rgba(0,0,0,0.14)] ${
      c.is_champion ? 'ring-2 ring-[#F59E0B]' : ''
    }`}>

      {/* ── HEADER: navy ── */}
      <div className="px-6 py-5 flex items-start justify-between gap-4"
        style={{
          background: c.is_champion
            ? 'linear-gradient(135deg, #0A1628 0%, #1a1200 100%)'
            : '#0A1628',
        }}>
        <div className="min-w-0 flex-1">
          {/* Código + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="font-mono text-[13px] font-bold text-white tracking-wide">
              {c.codigo}
            </span>

            {/* Status badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ backgroundColor: sc.bg, color: sc.text }}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.is_champion || c.status === 'ativa' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: sc.dot }} />
              {c.is_champion ? '⭐ ' : ''}{sc.label}
            </span>

            {/* Versão badge */}
            {c.versao && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-white/70">
                Versão {VERSAO_LABEL[c.versao] ?? c.versao}
              </span>
            )}
          </div>

          {/* Nome */}
          <Link href={`/campanhas/${c.id}`}
            className="text-lg font-bold text-white hover:text-[#02C39A] transition-colors block leading-tight">
            {c.nome_descritivo || '—'}
          </Link>

          {/* Metadados */}
          <p className="text-[12px] text-[#64748B] mt-1.5 flex items-center gap-1 flex-wrap">
            <Clock size={11} className="text-[#475569] flex-shrink-0" />
            Criado em {new Date(c.criado_em).toLocaleDateString('pt-BR')}
            {metaParts && <><span className="text-[#374151]">·</span><span>{metaParts}</span></>}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href={`/campanhas/${c.id}`}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[12px] font-medium transition-colors">
            Ver <ChevronRight size={13} />
          </Link>
          <ActionsMenu campanha={c} onAction={onAction} />
        </div>
      </div>

      {/* ── CORPO: métricas ── */}
      <div className="bg-white px-6 py-5">
        <div className="flex gap-3 flex-wrap sm:flex-nowrap">
          <MetricCard
            label="Leads"
            value={c.total_leads.toLocaleString('pt-BR')}
            sub="na base"
            icon={Users}
            iconColor="#0A1628"
          />
          <MetricCard
            label="Conversão est."
            value={`${pct}%`}
            sub="taxa esperada"
            icon={TrendingUp}
            iconColor="#028090"
          />
          <MetricCard
            label="Potencial total"
            value={fmtShort(c.valor_total_potencial)}
            sub={fmtFull(c.valor_total_potencial)}
            icon={DollarSign}
            iconColor="#02C39A"
            accent
          />
          <MetricCard
            label="Recorrente/mês"
            value={fmtShort(recorrente)}
            sub={`com ${pct}% conv.`}
            icon={Repeat}
            iconColor="#0A1628"
          />
          <MetricCard
            label="Ticket médio"
            value={ticketMedio > 0 ? fmtShort(ticketMedio) : '—'}
            sub={ticketMedio > 0 ? 'por lead' : undefined}
            icon={Target}
            iconColor="#F59E0B"
          />
        </div>
      </div>

      {/* ── RODAPÉ: ações ── */}
      <div className="bg-white border-t border-[#F1F5F9] px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <Link href={`/campanhas/${c.id}`}
          className="text-[13px] font-semibold text-[#028090] hover:text-[#026d7a] flex items-center gap-1 transition-colors">
          Ver campanha completa <ChevronRight size={13} />
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selecionar Propensos */}
          <button onClick={() => onAction('ver', c.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#028090] text-white text-[12px] font-semibold hover:bg-[#026d7a] transition-colors">
            <Target size={13} /> Selecionar Propensos
          </button>

          {/* Champion */}
          {!c.is_champion && (
            <button onClick={() => onAction('champion', c.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#F59E0B] text-[#92400E] text-[12px] font-semibold hover:bg-[#FFFBEB] transition-colors">
              <Star size={13} /> Champion
            </button>
          )}

          {/* Pausar */}
          {showPausar && (
            <button onClick={() => onAction('pausar', c.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-[#64748B] text-[12px] font-semibold hover:bg-[#F8FAFC] transition-colors">
              <Pause size={13} /> Pausar
            </button>
          )}

          {/* Ativar */}
          {showAtivar && (
            <button onClick={() => onAction('ativar', c.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#A7F3D0] text-[#065F46] text-[12px] font-semibold hover:bg-[#ECFDF5] transition-colors">
              <Play size={13} /> Ativar
            </button>
          )}

          {/* Encerrar */}
          {showEncerrar && (
            <button onClick={() => onAction('encerrar', c.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#FECACA] text-[#EF4444] text-[12px] font-semibold hover:bg-[#FEF2F2] transition-colors">
              <XCircle size={13} /> Encerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, iconBg, icon: Icon }: {
  label: string; value: string; sub: string; iconBg: string; icon: any
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex-1"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg }}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <p className="text-[13px] font-semibold text-[#64748B] mb-1">{label}</p>
      <p className="text-[40px] font-bold text-[#0A1628] leading-none mb-2">{value}</p>
      <p className="text-[13px] text-[#94A3B8]">{sub}</p>
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
    duplicar: { title: 'Duplicar campanha',   body: 'Criar uma cópia como rascunho?',                           confirmLabel: 'Duplicar',  danger: false },
    champion: { title: 'Marcar como CHAMPION',body: 'Esta campanha será a versão de destaque. Confirmar?',       confirmLabel: '⭐ Confirmar', danger: false },
    pausar:   { title: 'Pausar campanha',     body: 'A campanha ficará pausada. Você pode reativar depois.',     confirmLabel: 'Pausar',    danger: false },
    ativar:   { title: 'Ativar campanha',     body: 'A campanha voltará a ficar ativa.',                         confirmLabel: 'Ativar',    danger: false },
    encerrar: { title: 'Encerrar campanha',   body: 'Encerrará permanentemente. Esta ação não pode ser desfeita.', confirmLabel: 'Encerrar', danger: true  },
  } as any)[modal.type] : null

  // ── Computed totals ──────────────────────────────────────────────────────────
  const ativas       = campanhas.filter(c => c.status === 'ativa' || c.is_champion).length
  const totalLeads   = campanhas.reduce((s, c) => s + c.total_leads, 0)
  const totalPot     = campanhas.reduce((s, c) => s + c.valor_total_potencial, 0)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* ══ PARTE 1 — HEADER ══════════════════════════════════════════════ */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-[#0A1628] leading-tight">Campanhas</h1>
            <p className="text-[14px] text-[#64748B] mt-1">
              {ativas} campanha{ativas !== 1 ? 's' : ''} ativa{ativas !== 1 ? 's' : ''}
              {' · '}{totalLeads.toLocaleString('pt-BR')} leads no total
            </p>
          </div>
          <Link href="/campanhas/nova"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#028090] text-white text-[14px] font-bold hover:bg-[#026d7a] transition-colors shadow-sm flex-shrink-0">
            <Plus size={16} /> Nova Campanha
          </Link>
        </div>

        {/* ══ PARTE 2 — CARDS RESUMO ════════════════════════════════════════ */}
        {campanhas.length > 0 && (
          <div className="flex gap-5 mb-8">
            <SummaryCard
              label="Campanhas ativas"
              value={String(ativas)}
              sub={`de ${campanhas.length} campanha${campanhas.length !== 1 ? 's' : ''} total`}
              iconBg="#028090"
              icon={Megaphone}
            />
            <SummaryCard
              label="Total de leads"
              value={totalLeads.toLocaleString('pt-BR')}
              sub="em todas as campanhas"
              iconBg="#0A1628"
              icon={Users}
            />
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex-1"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-[#02C39A] flex items-center justify-center flex-shrink-0">
                  <DollarSign size={20} className="text-white" />
                </div>
              </div>
              <p className="text-[13px] font-semibold text-[#64748B] mb-1">Potencial total</p>
              <p className="text-[32px] font-bold text-[#0A1628] leading-none mb-2">{fmtFull(totalPot)}</p>
              <p className="text-[13px] text-[#94A3B8]">em mensalidades</p>
            </div>
          </div>
        )}

        {/* ══ PARTE 3/4 — LISTA / EMPTY STATE ══════════════════════════════ */}
        {campanhas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] py-24 text-center"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="w-20 h-20 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-6">
              <Megaphone size={36} className="text-[#CBD5E1]" />
            </div>
            <h2 className="text-[20px] font-bold text-[#0A1628] mb-2">Nenhuma campanha ainda</h2>
            <p className="text-[14px] text-[#64748B] mb-8 max-w-sm mx-auto">
              Crie sua primeira campanha e comece a qualificar leads automaticamente.
            </p>
            <Link href="/campanhas/nova"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#028090] text-white text-[14px] font-bold hover:bg-[#026d7a] transition-colors">
              <Plus size={16} /> Criar primeira campanha
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {campanhas.map(c => (
              <CampanhaCard key={c.id} c={c} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal de confirmação ── */}
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
